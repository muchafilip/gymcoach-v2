import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import WorkoutPlanScreen from '../screens/WorkoutPlanScreen';
import WorkoutDayScreen from '../screens/WorkoutDayScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// API
import { getUserEquipment } from '../api/equipment';
import { MOCK_USER_ID } from '../utils/constants';

export type RootStackParamList = {
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
  return (
    <TemplatesStack.Navigator>
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
  return (
    <Tab.Navigator>
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const equipment = await getUserEquipment(MOCK_USER_ID);
      setHasCompletedOnboarding(equipment.length > 0);
    } catch (error) {
      console.warn('Could not check onboarding status:', error);
      // Default to showing onboarding if we can't check
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={hasCompletedOnboarding ? "MainTabs" : "Onboarding"}
      >
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
