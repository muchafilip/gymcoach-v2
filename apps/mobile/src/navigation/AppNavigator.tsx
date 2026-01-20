import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// Components
import GlassTabBar from '../components/GlassTabBar';
import FloatingActionButton from '../components/FloatingActionButton';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import MyTemplatesScreen from '../screens/MyTemplatesScreen';
import TemplateBuilderScreen from '../screens/TemplateBuilderScreen';
import DayBuilderScreen from '../screens/DayBuilderScreen';
import WorkoutPlanScreen from '../screens/WorkoutPlanScreen';
import WorkoutDayScreen from '../screens/WorkoutDayScreen';
import PlanScreen from '../screens/PlanScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { CustomTemplateExercise } from '../types';

// Auth & Theme
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getUserEquipment } from '../api/equipment';
import { navigationRef } from './navigationRef';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Paywall: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Plan: undefined;
  Stats: undefined;
  Templates: undefined;
  Settings: undefined;
};

export type TemplatesStackParamList = {
  TemplatesList: undefined;
  MyTemplates: undefined;
  TemplateBuilder: { templateId: number };
  DayBuilder: { dayId: number; dayName: string; exercises?: CustomTemplateExercise[] };
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
        name="MyTemplates"
        component={MyTemplatesScreen}
        options={{ title: 'My Templates' }}
      />
      <TemplatesStack.Screen
        name="TemplateBuilder"
        component={TemplateBuilderScreen}
        options={{ title: 'Edit Template' }}
      />
      <TemplatesStack.Screen
        name="DayBuilder"
        component={DayBuilderScreen}
        options={{ title: 'Edit Day' }}
      />
      <TemplatesStack.Screen
        name="WorkoutPlan"
        component={WorkoutPlanScreen}
        options={{ title: 'My Workout Plan' }}
      />
      <TemplatesStack.Screen
        name="WorkoutDay"
        component={WorkoutDayScreen}
        options={{ headerShown: false }}
      />
    </TemplatesStack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDarkMode } = useThemeStore();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Plan" component={PlanScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen
          name="Templates"
          component={TemplatesNavigator}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Templates' }],
                })
              );
            },
          })}
        />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <FloatingActionButton />
    </View>
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
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={getInitialRoute()}
      >
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
