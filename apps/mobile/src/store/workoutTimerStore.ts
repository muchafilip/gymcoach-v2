import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkoutTimerState {
  activeDayId: number | null;
  startTime: number | null; // timestamp when timer started
  pausedAt: number | null;  // timestamp when paused
  accumulatedTime: number;  // seconds accumulated before current session
  isPaused: boolean;

  // Actions
  startTimer: (dayId: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => number; // returns total seconds
  resetTimer: () => void;

  // Utilities
  getElapsedSeconds: () => number;
  isActive: (dayId: number) => boolean;
}

export const useWorkoutTimerStore = create<WorkoutTimerState>()(
  persist(
    (set, get) => ({
      activeDayId: null,
      startTime: null,
      pausedAt: null,
      accumulatedTime: 0,
      isPaused: false,

      startTimer: (dayId: number) => {
        const state = get();

        // If already active for this day (running or paused), don't restart
        if (state.activeDayId === dayId) {
          return;
        }

        set({
          activeDayId: dayId,
          startTime: Date.now(),
          pausedAt: null,
          accumulatedTime: 0,
          isPaused: false,
        });
      },

      pauseTimer: () => {
        const state = get();
        if (!state.startTime || state.isPaused) return;

        const currentElapsed = Math.floor((Date.now() - state.startTime) / 1000);
        set({
          isPaused: true,
          pausedAt: Date.now(),
          accumulatedTime: state.accumulatedTime + currentElapsed,
          startTime: null,
        });
      },

      resumeTimer: () => {
        const state = get();
        if (!state.isPaused) return;

        set({
          isPaused: false,
          pausedAt: null,
          startTime: Date.now(),
        });
      },

      stopTimer: (): number => {
        const state = get();
        const elapsed = state.getElapsedSeconds();

        set({
          activeDayId: null,
          startTime: null,
          pausedAt: null,
          accumulatedTime: 0,
          isPaused: false,
        });

        return elapsed;
      },

      resetTimer: () => {
        set({
          activeDayId: null,
          startTime: null,
          pausedAt: null,
          accumulatedTime: 0,
          isPaused: false,
        });
      },

      getElapsedSeconds: (): number => {
        const state = get();

        if (state.isPaused) {
          return state.accumulatedTime;
        }

        if (!state.startTime) {
          return state.accumulatedTime;
        }

        const currentElapsed = Math.floor((Date.now() - state.startTime) / 1000);
        return state.accumulatedTime + currentElapsed;
      },

      isActive: (dayId: number): boolean => {
        const state = get();
        return state.activeDayId === dayId;
      },
    }),
    {
      name: 'workout-timer',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeDayId: state.activeDayId,
        startTime: state.startTime,
        pausedAt: state.pausedAt,
        accumulatedTime: state.accumulatedTime,
        isPaused: state.isPaused,
      }),
    }
  )
);

// Helper to format seconds to MM:SS or HH:MM:SS
export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
