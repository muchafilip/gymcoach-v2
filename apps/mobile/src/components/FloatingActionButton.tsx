import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigationState } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { getHomeData } from '../api/workouts';
import { navigateToWorkoutDay, navigate } from '../navigation/navigationRef';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FAB_SIZE = 56;
const MARGIN = 16;
const STORAGE_KEY = '@fab_position';

// Dumbbell icon as emoji (SVG doesn't render properly on all devices)
const DUMBBELL_ICON = '🏋️';

export default function FloatingActionButton() {
  const { colors } = useThemeStore();
  const { setTargetMeasurement } = useOnboardingStore();
  const [isOnLeft, setIsOnLeft] = useState(false);
  const fabRef = useRef<View>(null);

  // Position values - must be called before any conditional returns (React hooks rule)
  const translateX = useSharedValue(SCREEN_WIDTH - FAB_SIZE - MARGIN);
  const translateY = useSharedValue(SCREEN_HEIGHT - FAB_SIZE - 180); // Above tab bar

  // Context for drag gesture
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // Animation values for bouncy press
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Track current route to hide FAB on WorkoutDay screen
  const currentRoute = useNavigationState(state => {
    if (!state) return null;
    let route = state.routes[state.index];
    while (route.state) {
      const nested = route.state as any;
      route = nested.routes[nested.index];
    }
    return route.name;
  });

  // Load saved position
  useEffect(() => {
    loadPosition();
  }, []);

  // Measure and report FAB position for tour
  useEffect(() => {
    const measureFab = () => {
      if (fabRef.current) {
        fabRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setTargetMeasurement('fab', { x, y, width, height });
          }
        });
      }
    };
    // Measure after a short delay to ensure position is loaded
    const timer = setTimeout(measureFab, 300);
    return () => clearTimeout(timer);
  }, [isOnLeft, setTargetMeasurement]);

  const loadPosition = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        translateX.value = x;
        translateY.value = y;
        setIsOnLeft(x < SCREEN_WIDTH / 2);
      }
    } catch (e) {
      console.log('Failed to load FAB position');
    }
  };

  const savePosition = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y }));
      setIsOnLeft(x < SCREEN_WIDTH / 2);
    } catch (e) {
      console.log('Failed to save FAB position');
    }
  };

  // Clamp position within bounds
  const clamp = (val: number, min: number, max: number) => {
    'worklet';
    return Math.min(Math.max(val, min), max);
  };

  // Navigate to current workout
  const goToCurrentWorkout = async () => {
    try {
      // Get home data which includes the next workout
      const homeData = await getHomeData();

      if (homeData.nextWorkout?.dayId) {
        // Use the global navigation ref to navigate to workout day
        navigateToWorkoutDay(homeData.nextWorkout.dayId);
      } else {
        // No active workout - navigate to Plan tab
        navigate('MainTabs', { screen: 'Plan' });
      }
    } catch (error) {
      console.error('Error navigating to workout:', error);
      // Fallback: go to Plan tab
      navigate('MainTabs', { screen: 'Plan' });
    }
  };

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = clamp(
        contextX.value + event.translationX,
        MARGIN,
        SCREEN_WIDTH - FAB_SIZE - MARGIN
      );
      translateY.value = clamp(
        contextY.value + event.translationY,
        MARGIN + 60, // Below status bar
        SCREEN_HEIGHT - FAB_SIZE - 120 // Above tab bar
      );
    })
    .onEnd(() => {
      // Snap to nearest edge
      const snapToLeft = translateX.value < SCREEN_WIDTH / 2;
      const finalX = snapToLeft ? MARGIN : SCREEN_WIDTH - FAB_SIZE - MARGIN;
      translateX.value = withSpring(finalX);
      runOnJS(savePosition)(finalX, translateY.value);
    });

  // Tap gesture for action with bouncy press animation
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      // Squish down and rotate slightly on press
      scale.value = withSpring(0.85, {
        damping: 10,
        stiffness: 400,
        mass: 0.5,
      });
      rotate.value = withSpring(-8, { damping: 10, stiffness: 300 });
    })
    .onFinalize(() => {
      // Bounce back with overshoot for satisfying feel
      scale.value = withSequence(
        withSpring(1.2, { damping: 4, stiffness: 300, mass: 0.5 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      );
      rotate.value = withSequence(
        withSpring(5, { damping: 4, stiffness: 300 }),
        withSpring(0, { damping: 8, stiffness: 200 })
      );
    })
    .onEnd(() => {
      runOnJS(goToCurrentWorkout)();
    });

  const composed = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Don't render if on WorkoutDay screen (after all hooks are called)
  if (currentRoute === 'WorkoutDay') {
    return null;
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          ref={fabRef}
          collapsable={false}
          style={[
            styles.fab,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text style={styles.icon}>{DUMBBELL_ICON}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    fontSize: 24,
  },
});
