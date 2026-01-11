import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Feature definitions
export type FeatureFlag =
  | 'supersets'
  | 'repSchemes'
  | 'exerciseSwap'
  | 'advancedStats'
  | 'workoutHistory';

interface FeatureConfig {
  enabled: boolean;
  requiresPremium: boolean;
  description: string;
}

// Default feature configuration
const DEFAULT_FEATURES: Record<FeatureFlag, FeatureConfig> = {
  supersets: {
    enabled: true,
    requiresPremium: true,
    description: 'Create supersets with antagonist muscle groups',
  },
  repSchemes: {
    enabled: true,
    requiresPremium: true,
    description: 'Custom rep schemes (EMOM, AMRAP, etc.)',
  },
  exerciseSwap: {
    enabled: true,
    requiresPremium: false,
    description: 'Swap exercises for alternatives',
  },
  advancedStats: {
    enabled: true,
    requiresPremium: true,
    description: 'Detailed workout analytics and charts',
  },
  workoutHistory: {
    enabled: true,
    requiresPremium: false,
    description: 'View past workout history',
  },
};

interface FeatureState {
  // Feature configs (can be updated from remote config later)
  features: Record<FeatureFlag, FeatureConfig>;

  // User's premium status
  isPremium: boolean;

  // Dev mode - bypass premium checks
  devModeEnabled: boolean;

  // Actions
  isFeatureEnabled: (feature: FeatureFlag) => boolean;
  isFeatureAvailable: (feature: FeatureFlag) => boolean;
  requiresPremium: (feature: FeatureFlag) => boolean;
  setPremiumStatus: (isPremium: boolean) => void;
  toggleDevMode: () => void;
  setFeatureEnabled: (feature: FeatureFlag, enabled: boolean) => void;
  updateFeaturesFromRemote: (features: Partial<Record<FeatureFlag, FeatureConfig>>) => void;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
      features: DEFAULT_FEATURES,
      isPremium: false,
      devModeEnabled: __DEV__ || false, // Enable dev mode in development builds

      // Check if feature is enabled in config
      isFeatureEnabled: (feature: FeatureFlag) => {
        const config = get().features[feature];
        return config?.enabled ?? false;
      },

      // Check if feature is available to current user (considers premium)
      isFeatureAvailable: (feature: FeatureFlag) => {
        const state = get();
        const config = state.features[feature];

        if (!config?.enabled) return false;
        if (state.devModeEnabled) return true; // Dev mode bypasses premium
        if (!config.requiresPremium) return true;

        return state.isPremium;
      },

      // Check if feature requires premium
      requiresPremium: (feature: FeatureFlag) => {
        const config = get().features[feature];
        return config?.requiresPremium ?? false;
      },

      // Update premium status (call when user subscription changes)
      setPremiumStatus: (isPremium: boolean) => {
        set({ isPremium });
      },

      // Toggle dev mode (for testing premium features)
      toggleDevMode: () => {
        set((state) => ({ devModeEnabled: !state.devModeEnabled }));
      },

      // Enable/disable a specific feature (for A/B testing or gradual rollout)
      setFeatureEnabled: (feature: FeatureFlag, enabled: boolean) => {
        set((state) => ({
          features: {
            ...state.features,
            [feature]: {
              ...state.features[feature],
              enabled,
            },
          },
        }));
      },

      // Update features from remote config (Firebase Remote Config, etc.)
      updateFeaturesFromRemote: (remoteFeatures) => {
        set((state) => ({
          features: {
            ...state.features,
            ...Object.fromEntries(
              Object.entries(remoteFeatures).map(([key, value]) => [
                key,
                { ...state.features[key as FeatureFlag], ...value },
              ])
            ),
          },
        }));
      },
    }),
    {
      name: 'feature-flags',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPremium: state.isPremium,
        devModeEnabled: state.devModeEnabled,
        // Don't persist features - always use defaults or remote config
      }),
    }
  )
);

// Helper hook for checking feature availability with premium gate
export const useFeature = (feature: FeatureFlag) => {
  const { isFeatureAvailable, requiresPremium, isPremium, devModeEnabled } = useFeatureStore();

  return {
    isAvailable: isFeatureAvailable(feature),
    requiresPremium: requiresPremium(feature),
    isPremium,
    isDevMode: devModeEnabled,
    showPremiumGate: requiresPremium(feature) && !isPremium && !devModeEnabled,
  };
};
