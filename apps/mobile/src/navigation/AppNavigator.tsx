import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import WorkoutPlanScreen from '../screens/WorkoutPlanScreen';
import WorkoutDayScreen from '../screens/WorkoutDayScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Auth & Theme
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getUserEquipment } from '../api/equipment';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Templates: undefined;
  History: undefined;
  Settings: undefined;
};

export type TemplatesStackParamList = {
  TemplatesList: undefined;
  WorkoutPlan: { planId: number };
  WorkoutDay: { dayId: number };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const TemplatesStack = createNativeStackNavigator<TemplatesStackParamList>();

function TemplatesNavigator() {
  const { colors } = useThemeStore();

  return (
    <TemplatesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <TemplatesStack.Screen
        name="TemplatesList"
        component={TemplatesScreen}
        options={{ title: 'Workout Templates' }}
      />
      <TemplatesStack.Screen
        name="WorkoutPlan"
        component={WorkoutPlanScreen}
        options={{ title: 'My Workout Plan' }}
      />
      <TemplatesStack.Screen
        name="WorkoutDay"
        component={WorkoutDayScreen}
        options={{ title: 'Workout' }}
      />
    </TemplatesStack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDarkMode } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Templates"
        component={TemplatesNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
  const { colors, isDarkMode, initialize: initializeTheme } = useThemeStore();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Initialize auth and theme on mount
  useEffect(() => {
    initialize();
    initializeTheme();
  }, [initialize, initializeTheme]);

  // Check onboarding status when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      checkOnboardingStatus();
    }
  }, [isAuthenticated]);

  const checkOnboardingStatus = async () => {
    setIsCheckingOnboarding(true);
    try {
      const equipment = await getUserEquipment();
      setHasCompletedOnboarding(equipment.length > 0);
    } catch (error) {
      console.warn('Could not check onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  if (authLoading || isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Determine initial route based on auth and onboarding status
  const getInitialRoute = (): keyof RootStackParamList => {
    if (!isAuthenticated) return 'Login';
    if (!hasCompletedOnboarding) return 'Onboarding';
    return 'MainTabs';
  };

  const navigationTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRoute()}
      >
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
