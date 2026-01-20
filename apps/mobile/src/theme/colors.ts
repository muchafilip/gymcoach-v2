export const lightColors = {
  // Base
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',
  card: '#FFFFFF',

  // Primary - vibrant blue
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.12)',

  // Status colors
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.12)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  // Text hierarchy
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  buttonText: '#FFFFFF',

  // Input
  inputBackground: '#F1F5F9',

  // Glass effect
  tabBarBackground: 'rgba(255, 255, 255, 0.95)',
  tabBarBorder: 'rgba(0, 0, 0, 0.05)',
};

export const darkColors = {
  // Base
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  card: '#1E293B',

  // Primary - bright blue for dark mode
  primary: '#c10000ff',
  primaryLight: 'rgba(96, 165, 250, 0.15)',

  // Status colors
  success: '#e00000ee',
  successLight: 'rgba(52, 211, 153, 0.15)',
  error: '#F87171',
  errorLight: 'rgba(192, 10, 0, 0.89)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.15)',

  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.06)',

  // Text
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  buttonText: '#FFFFFF',

  // Input
  inputBackground: '#334155',

  // Glass effect
  tabBarBackground: 'rgba(30, 41, 59, 0.95)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
};

export type ThemeColors = typeof lightColors;
