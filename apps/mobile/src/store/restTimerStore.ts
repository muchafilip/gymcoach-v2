import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RestTimerState {
  // Timer state
  isActive: boolean;
  remainingSeconds: number;
  totalSeconds: number;

  // Preferences
  defaultDuration: number; // in seconds
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoStart: boolean; // auto-start on set complete

  // Internal
  intervalId: ReturnType<typeof setInterval> | null;

  // Actions
  startTimer: (duration?: number) => void;
  stopTimer: () => void;
  skipTimer: () => void;
  tick: () => void;

  // Settings
  setDefaultDuration: (seconds: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setAutoStart: (enabled: boolean) => void;
}

// Duration presets in seconds
export const REST_DURATIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
  { label: '5min', value: 300 },
];

export const formatRestTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
};

export const useRestTimerStore = create<RestTimerState>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      remainingSeconds: 0,
      totalSeconds: 0,
      defaultDuration: 90, // 90 seconds default
      soundEnabled: true,
      vibrationEnabled: true,
      autoStart: true,
      intervalId: null,

      startTimer: (duration?: number) => {
        const state = get();

        // Clear any existing timer
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }

        const timerDuration = duration ?? state.defaultDuration;

        // Start the interval
        const intervalId = setInterval(() => {
          get().tick();
        }, 1000);

        set({
          isActive: true,
          remainingSeconds: timerDuration,
          totalSeconds: timerDuration,
          intervalId,
        });
      },

      stopTimer: () => {
        const state = get();
        if (state.intervalId) {
          clearInterval(state.intervalId);
        }
        set({
          isActive: false,
          remainingSeconds: 0,
          totalSeconds: 0,
          intervalId: null,
        });
      },

      skipTimer: () => {
        get().stopTimer();
      },

      tick: () => {
        const state = get();
        if (state.remainingSeconds <= 1) {
          // Timer complete
          if (state.intervalId) {
            clearInterval(state.intervalId);
          }
          set({
            isActive: false,
            remainingSeconds: 0,
            intervalId: null,
          });
          // Note: Sound/vibration will be handled by the component
        } else {
          set({
            remainingSeconds: state.remainingSeconds - 1,
          });
        }
      },

      setDefaultDuration: (seconds: number) => {
        set({ defaultDuration: seconds });
      },

      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled });
      },

      setVibrationEnabled: (enabled: boolean) => {
        set({ vibrationEnabled: enabled });
      },

      setAutoStart: (enabled: boolean) => {
        set({ autoStart: enabled });
      },
    }),
    {
      name: 'rest-timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist preferences, not active timer state
        defaultDuration: state.defaultDuration,
        soundEnabled: state.soundEnabled,
        vibrationEnabled: state.vibrationEnabled,
        autoStart: state.autoStart,
      }),
    }
  )
);
