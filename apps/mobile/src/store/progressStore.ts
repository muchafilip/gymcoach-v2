import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressSummary, WorkoutCompleteResponse, UnlockedPlan } from '../types';
import { getProgress } from '../api/progress';

interface ProgressState {
  // Progress data
  totalXp: number;
  level: number;
  xpInCurrentLevel: number;
  xpNeededForLevel: number;
  xpToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  workoutsThisWeek: number;
  weeklyGoal: number;

  // Unlock progress
  nextUnlockLevel: number;
  unlockedPlansCount: number;

  // UI state
  showLevelUpModal: boolean;
  newLevel: number | null;
  lastXpGain: number;
  isLoading: boolean;

  // Unlocked plan (shown in level up modal)
  unlockedPlan: UnlockedPlan | null;

  // Actions
  loadProgress: () => Promise<void>;
  updateFromWorkoutComplete: (response: WorkoutCompleteResponse) => void;
  dismissLevelUpModal: () => void;
  resetLastXpGain: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      // Initial state
      totalXp: 0,
      level: 1,
      xpInCurrentLevel: 0,
      xpNeededForLevel: 100,
      xpToNextLevel: 100,
      currentStreak: 0,
      longestStreak: 0,
      workoutsThisWeek: 0,
      weeklyGoal: 3,
      nextUnlockLevel: 5,
      unlockedPlansCount: 0,
      showLevelUpModal: false,
      newLevel: null,
      lastXpGain: 0,
      isLoading: false,
      unlockedPlan: null,

      loadProgress: async () => {
        set({ isLoading: true });
        try {
          const progress = await getProgress();
          if (progress) {
            set({
              totalXp: progress.totalXp,
              level: progress.level,
              xpInCurrentLevel: progress.xpInCurrentLevel,
              xpNeededForLevel: progress.xpNeededForLevel,
              xpToNextLevel: progress.xpToNextLevel,
              currentStreak: progress.currentStreak,
              longestStreak: progress.longestStreak,
              workoutsThisWeek: progress.workoutsThisWeek,
              weeklyGoal: progress.weeklyGoal,
              nextUnlockLevel: progress.nextUnlockLevel || 5,
              unlockedPlansCount: progress.unlockedPlansCount || 0,
            });
          }
        } catch (error) {
          console.error('Error loading progress:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      updateFromWorkoutComplete: (response: WorkoutCompleteResponse) => {
        const previousLevel = get().level;
        set({
          totalXp: response.totalXp,
          level: response.level,
          xpToNextLevel: response.xpToNextLevel,
          currentStreak: response.currentStreak,
          workoutsThisWeek: response.workoutsThisWeek,
          lastXpGain: response.xpAwarded,
          showLevelUpModal: response.leveledUp,
          newLevel: response.leveledUp ? response.level : null,
          nextUnlockLevel: response.nextUnlockLevel || get().nextUnlockLevel,
          unlockedPlan: response.unlockedPlan || null,
        });

        // Update unlocked plans count if a plan was unlocked
        if (response.unlockedPlan) {
          set((state) => ({
            unlockedPlansCount: state.unlockedPlansCount + 1,
          }));
        }

        // Recalculate xpInCurrentLevel and xpNeededForLevel
        // Using formula: level = floor(sqrt(xp / 100)) + 1
        // Inverse: xpForLevel = (level - 1)^2 * 100
        const xpForCurrentLevel = (response.level - 1) * (response.level - 1) * 100;
        const xpForNextLevel = response.level * response.level * 100;
        set({
          xpInCurrentLevel: response.totalXp - xpForCurrentLevel,
          xpNeededForLevel: xpForNextLevel - xpForCurrentLevel,
        });
      },

      dismissLevelUpModal: () => {
        set({ showLevelUpModal: false, newLevel: null, unlockedPlan: null });
      },

      resetLastXpGain: () => {
        set({ lastXpGain: 0 });
      },
    }),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist the main progress data for offline display
        totalXp: state.totalXp,
        level: state.level,
        xpInCurrentLevel: state.xpInCurrentLevel,
        xpNeededForLevel: state.xpNeededForLevel,
        xpToNextLevel: state.xpToNextLevel,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        workoutsThisWeek: state.workoutsThisWeek,
        weeklyGoal: state.weeklyGoal,
        nextUnlockLevel: state.nextUnlockLevel,
        unlockedPlansCount: state.unlockedPlansCount,
      }),
    }
  )
);
