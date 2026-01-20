import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function navigateToWorkoutDay(dayId: number) {
  if (navigationRef.isReady()) {
    // Navigate to Templates tab with WorkoutDay screen using nested navigation
    navigationRef.navigate('MainTabs', {
      screen: 'Templates',
      params: {
        screen: 'WorkoutDay',
        params: { dayId },
      },
    });
  }
}
