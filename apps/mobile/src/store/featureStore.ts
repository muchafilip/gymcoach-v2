import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkPremiumStatus, addPurchaseListener } from '../services/purchases';
import { apiClient } from '../api/client';

// Feature definitions
export type FeatureFlag =
  | 'supersets'
  | 'repSchemes'
  | 'exerciseSwap'
  | 'advancedStats'
  | 'workoutHistory'
  | 'workoutTimer'
  | 'exerciseHistory'
  | 'progressCharts'
  | 'unitSwitching'
  | 'restTimer'
  | 'smartProgression'
  | 'xpSystem'
  | 'insights';

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
  workoutTimer: {
    enabled: true,
    requiresPremium: false,
    description: 'Track workout duration with pause/resume',
  },
  exerciseHistory: {
    enabled: true,
    requiresPremium: false,
    description: 'View past performance per exercise',
  },
  progressCharts: {
    enabled: true,
    requiresPremium: true,
    description: 'Visual graphs showing progress over time',
  },
  unitSwitching: {
    enabled: true,
    requiresPremium: false,
    description: 'Toggle between kg and lbs globally',
  },
  restTimer: {
    enabled: true,
    requiresPremium: false,
    description: 'Countdown timer between sets with sound/vibration alerts',
  },
  smartProgression: {
    enabled: true,
    requiresPremium: true,
    description: 'Smart weight and rep suggestions based on past performance',
  },
  xpSystem: {
    enabled: true,
    requiresPremium: false,
    description: 'Earn XP, level up, and unlock premium plans',
  },
  insights: {
    enabled: true,
    requiresPremium: true,
    description: 'Weekly personalized workout insights and recommendations',
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
  setPremiumStatus: (isPremium: boolean) => Promise<void>;
  syncPremiumStatus: () => Promise<void>;
  toggleDevMode: () => Promise<void>;
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
      setPremiumStatus: async (isPremium: boolean) => {
        console.log('[PremiumStatus] Setting to:', isPremium);
        set({ isPremium });

        // Sync to backend so server-side checks also work
        try {
          console.log('[PremiumStatus] Syncing to backend...');
          const response = await apiClient.put('/users/subscription', { isPremium });
          console.log('[PremiumStatus] API response:', response.data);
        } catch (error) {
          console.warn('[PremiumStatus] Failed to sync to backend:', error);
        }
      },

      // Sync premium status from RevenueCat
      syncPremiumStatus: async () => {
        try {
          const isPremium = await checkPremiumStatus();
          set({ isPremium });

          // Set up listener for future changes
          addPurchaseListener((customerInfo) => {
            const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
            set({ isPremium: hasPremium });
          });
        } catch (error) {
          console.warn('Failed to sync premium status:', error);
        }
      },

      // Toggle dev mode (for testing premium features)
      toggleDevMode: async () => {
        const newState = !get().devModeEnabled;
        console.log('[DevMode] Toggling to:', newState);
        set({ devModeEnabled: newState });

        // Sync to backend so server-side checks also work
        try {
          console.log('[DevMode] Calling API to set isPremium:', newState);
          const response = await apiClient.put('/users/subscription', { isPremium: newState });
          console.log('[DevMode] API response:', response.data);
        } catch (error) {
          console.warn('[DevMode] Failed to sync dev mode to backend:', error);
        }
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
