import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import { useRestTimerStore, formatRestTime, REST_DURATIONS } from '../store/restTimerStore';
import { IfFeatureEnabled } from './PremiumGate';

function FloatingRestTimer() {
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const {
    isActive,
    remainingSeconds,
    totalSeconds,
    vibrationEnabled,
    skipTimer,
    setDefaultDuration,
    defaultDuration,
  } = useRestTimerStore();

  const slideAnim = useRef(new Animated.Value(100)).current;
  const prevRemaining = useRef(remainingSeconds);

  // Slide in/out animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isActive ? 0 : 100,
      useNativeDriver: true,
      tension: 100,
      friction: 15,
    }).start();
  }, [isActive, slideAnim]);

  // Vibrate when timer completes
  useEffect(() => {
    if (prevRemaining.current > 0 && remainingSeconds === 0 && !isActive) {
      if (vibrationEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    prevRemaining.current = remainingSeconds;
  }, [remainingSeconds, isActive, vibrationEnabled]);

  // Light haptic on last 5 seconds
  useEffect(() => {
    if (isActive && remainingSeconds <= 5 && remainingSeconds > 0 && vibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [remainingSeconds, isActive, vibrationEnabled]);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const progressWidth = (1 - progress) * 100; // Invert progress for filling left to right

  if (!isActive && remainingSeconds === 0) {
    return null;
  }

  const bottomOffset = 56 + (insets.bottom > 0 ? insets.bottom - 14 : 2);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          backgroundColor: isDarkMode ? 'rgba(40, 40, 44, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: colors.border,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Progress bar background */}
      <View style={[styles.progressBackground, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressWidth}%`,
              backgroundColor: remainingSeconds <= 5 ? colors.warning : colors.primary,
            },
          ]}
        />
      </View>

      <View style={styles.content}>
        {/* Timer display */}
        <View style={styles.timerSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>REST</Text>
          <Text style={[styles.time, { color: remainingSeconds <= 5 ? colors.warning : colors.text }]}>
            {formatRestTime(remainingSeconds)}
          </Text>
        </View>

        {/* Duration quick select */}
        <View style={styles.durationsRow}>
          {REST_DURATIONS.slice(0, 4).map((duration) => (
            <TouchableOpacity
              key={duration.value}
              style={[
                styles.durationButton,
                {
                  backgroundColor:
                    defaultDuration === duration.value
                      ? colors.primary
                      : colors.surfaceAlt,
                },
              ]}
              onPress={() => setDefaultDuration(duration.value)}
            >
              <Text
                style={[
                  styles.durationText,
                  {
                    color:
                      defaultDuration === duration.value
                        ? colors.buttonText
                        : colors.textSecondary,
                  },
                ]}
              >
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip button */}
        <TouchableOpacity
          style={[styles.skipButton, { backgroundColor: colors.surfaceAlt }]}
          onPress={skipTimer}
        >
          <Text style={[styles.skipText, { color: colors.text }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function RestTimer() {
  return (
    <IfFeatureEnabled feature="restTimer">
      <FloatingRestTimer />
    </IfFeatureEnabled>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  progressBackground: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  time: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
  },
  durationsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  durationButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
