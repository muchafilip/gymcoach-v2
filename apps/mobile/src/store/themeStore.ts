import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

const THEME_KEY = 'gymcoach_theme';

interface ThemeState {
  isDarkMode: boolean;
  colors: ThemeColors;
  initialize: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,
  colors: lightColors,

  initialize: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'dark') {
        set({ isDarkMode: true, colors: darkColors });
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  },

  toggleTheme: async () => {
    const { isDarkMode } = get();
    const newIsDark = !isDarkMode;

    set({
      isDarkMode: newIsDark,
      colors: newIsDark ? darkColors : lightColors,
    });

    try {
      await SecureStore.setItemAsync(THEME_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  },
}));
