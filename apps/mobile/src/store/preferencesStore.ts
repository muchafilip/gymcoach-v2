import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export type WeightUnit = 'kg' | 'lbs';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

interface PreferencesState {
  weightUnit: WeightUnit;
  compactMode: boolean;
  isLoading: boolean;

  // Actions
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setCompactMode: (enabled: boolean) => void;
  loadPreferences: () => Promise<void>;

  // Conversion utilities
  displayWeight: (kgValue: number) => number;
  toKg: (displayValue: number) => number;
  formatWeight: (kgValue: number) => string;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      weightUnit: 'kg',
      compactMode: false,
      isLoading: false,

      setWeightUnit: async (unit: WeightUnit) => {
        try {
          set({ weightUnit: unit });
          await apiClient.put('/users/preferences', { weightUnit: unit });
        } catch (error) {
          console.error('Failed to save weight unit preference:', error);
        }
      },

      setCompactMode: (enabled: boolean) => {
        set({ compactMode: enabled });
      },

      loadPreferences: async () => {
        try {
          set({ isLoading: true });
          const response = await apiClient.get<{ weightUnit: WeightUnit }>('/users/preferences');
          set({ weightUnit: response.data.weightUnit || 'kg' });
        } catch (error) {
          console.error('Failed to load preferences:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      displayWeight: (kgValue: number): number => {
        if (kgValue === 0) return 0;
        const { weightUnit } = get();
        if (weightUnit === 'lbs') {
          return Math.round(kgValue * KG_TO_LBS * 10) / 10;
        }
        return Math.round(kgValue * 10) / 10;
      },

      toKg: (displayValue: number): number => {
        if (displayValue === 0) return 0;
        const { weightUnit } = get();
        if (weightUnit === 'lbs') {
          return Math.round(displayValue * LBS_TO_KG * 100) / 100;
        }
        return displayValue;
      },

      formatWeight: (kgValue: number): string => {
        const { weightUnit, displayWeight } = get();
        const displayValue = displayWeight(kgValue);
        return `${displayValue}${weightUnit}`;
      },
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weightUnit: state.weightUnit,
        compactMode: state.compactMode,
      }),
    }
  )
);
