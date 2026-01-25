import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Quest, QuestClaimResult, getQuests, claimQuest, logRestDay } from '../api/quests';
import { useProgressStore } from './progressStore';

interface QuestState {
  quests: Quest[];
  loading: boolean;
  claiming: number | null; // ID of quest being claimed

  // Actions
  loadQuests: () => Promise<void>;
  claimQuest: (userQuestId: number) => Promise<QuestClaimResult | null>;
  logRestDay: () => Promise<void>;

  // Computed
  unclaimedCount: () => number;
  dailyQuests: () => Quest[];
  weeklyQuests: () => Quest[];
  onboardingQuests: () => Quest[];
  achievementQuests: () => Quest[];
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      quests: [],
      loading: false,
      claiming: null,

      loadQuests: async () => {
        set({ loading: true });
        try {
          const quests = await getQuests();
          set({ quests });
        } catch (error) {
          console.error('Error loading quests:', error);
        } finally {
          set({ loading: false });
        }
      },

      claimQuest: async (userQuestId: number) => {
        set({ claiming: userQuestId });
        try {
          const result = await claimQuest(userQuestId);

          // Update quest state to claimed
          set((state) => ({
            quests: state.quests.filter((q) => q.id !== userQuestId),
          }));

          // Update progress store with new XP/level
          if (result.leveledUp) {
            useProgressStore.getState().updateFromWorkoutComplete({
              xpAwarded: result.xpAwarded,
              totalXp: result.totalXp,
              level: result.level,
              leveledUp: result.leveledUp,
              xpToNextLevel: result.xpToNextLevel,
              currentStreak: useProgressStore.getState().currentStreak,
              workoutsThisWeek: useProgressStore.getState().workoutsThisWeek,
              weeklyGoalReached: false,
              nextUnlockLevel: useProgressStore.getState().nextUnlockLevel,
              weekComplete: false,
              weeksCompleted: 0,
              isMilestone: false,
              milestoneWeeks: 0,
            });
          } else {
            // Just update XP without triggering level up modal
            const progressStore = useProgressStore.getState();
            const xpForCurrentLevel = (result.level - 1) * (result.level - 1) * 100;
            const xpForNextLevel = result.level * result.level * 100;

            useProgressStore.setState({
              totalXp: result.totalXp,
              level: result.level,
              xpToNextLevel: result.xpToNextLevel,
              xpInCurrentLevel: result.totalXp - xpForCurrentLevel,
              xpNeededForLevel: xpForNextLevel - xpForCurrentLevel,
              lastXpGain: result.xpAwarded,
            });
          }

          return result;
        } catch (error) {
          console.error('Error claiming quest:', error);
          return null;
        } finally {
          set({ claiming: null });
        }
      },

      logRestDay: async () => {
        try {
          await logRestDay();
          // Reload quests to get updated progress
          await get().loadQuests();
        } catch (error) {
          console.error('Error logging rest day:', error);
        }
      },

      // Computed helpers
      unclaimedCount: () => {
        return get().quests.filter((q) => q.completed && !q.claimed).length;
      },

      dailyQuests: () => {
        return get().quests.filter((q) => q.type === 'daily');
      },

      weeklyQuests: () => {
        return get().quests.filter((q) => q.type === 'weekly');
      },

      onboardingQuests: () => {
        return get().quests.filter((q) => q.type === 'onboarding');
      },

      achievementQuests: () => {
        return get().quests.filter((q) => q.type === 'achievement');
      },
    }),
    {
      name: 'quest-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Cache quests for offline display
        quests: state.quests,
      }),
    }
  )
);
