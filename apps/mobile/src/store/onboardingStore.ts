import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetRef: string; // Key to identify the target component
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'fab',
    title: 'Quick Start Workout',
    description: 'Tap to jump directly to your next workout. You can drag this button anywhere on screen!',
    targetRef: 'fab',
  },
  {
    id: 'xp-bar',
    title: 'Track Your Progress',
    description: 'Earn XP by completing workouts. Level up to unlock premium plans for free!',
    targetRef: 'xp-bar',
  },
  {
    id: 'next-workout',
    title: 'Your Next Workout',
    description: 'See what\'s coming up next. Tap to start your training session!',
    targetRef: 'next-workout',
  },
  {
    id: 'plan-tab',
    title: 'Create Workout Plans',
    description: 'Browse templates and create your own personalized workout plans. Tap the Plan tab to get started!',
    targetRef: 'plan-tab',
  },
];

interface OnboardingState {
  // Persisted state
  hasSeenTour: boolean;

  // Transient state
  isTourActive: boolean;
  currentStepIndex: number;

  // Target measurements for spotlight
  targetMeasurements: Record<string, { x: number; y: number; width: number; height: number }>;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
  setTargetMeasurement: (key: string, measurement: { x: number; y: number; width: number; height: number }) => void;

  // Getters
  getCurrentStep: () => TourStep | null;
  isLastStep: () => boolean;
  isFirstStep: () => boolean;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasSeenTour: false,
      isTourActive: false,
      currentStepIndex: 0,
      targetMeasurements: {},

      startTour: () => {
        set({ isTourActive: true, currentStepIndex: 0 });
      },

      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          get().completeTour();
        }
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      skipTour: () => {
        set({ isTourActive: false, hasSeenTour: true, currentStepIndex: 0 });
      },

      completeTour: () => {
        set({ isTourActive: false, hasSeenTour: true, currentStepIndex: 0 });
      },

      resetTour: () => {
        set({ hasSeenTour: false, isTourActive: false, currentStepIndex: 0 });
      },

      setTargetMeasurement: (key, measurement) => {
        set((state) => ({
          targetMeasurements: {
            ...state.targetMeasurements,
            [key]: measurement,
          },
        }));
      },

      getCurrentStep: () => {
        const { currentStepIndex } = get();
        return TOUR_STEPS[currentStepIndex] || null;
      },

      isLastStep: () => {
        return get().currentStepIndex === TOUR_STEPS.length - 1;
      },

      isFirstStep: () => {
        return get().currentStepIndex === 0;
      },
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenTour: state.hasSeenTour,
      }),
    }
  )
);
