import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useWorkoutTimerStore, formatDuration } from '../store/workoutTimerStore';
import { IfFeatureEnabled } from './PremiumGate';

interface WorkoutTimerProps {
  dayId: number;
  onStart?: () => void;
  inline?: boolean;
}

function WorkoutTimerContent({ dayId, onStart, inline }: WorkoutTimerProps) {
  const { colors } = useThemeStore();
  const {
    startTimer,
    pauseTimer,
    resumeTimer,
    getElapsedSeconds,
    isActive,
    isPaused,
    activeDayId,
  } = useWorkoutTimerStore();

  const [elapsed, setElapsed] = useState(0);

  // Start timer when component mounts for this day (only if not already active)
  useEffect(() => {
    if (!isActive(dayId)) {
      startTimer(dayId);
      onStart?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, isActive]);

  // Update display every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  const handleTogglePause = () => {
    if (isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  // Only show timer for the active day
  if (activeDayId !== dayId) {
    return null;
  }

  if (inline) {
    return (
      <TouchableOpacity
        onPress={handleTogglePause}
        style={[styles.inlineContainer, { backgroundColor: colors.surfaceAlt }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.inlineTime, { color: isPaused ? colors.warning : colors.text }]}>
          {formatDuration(elapsed)}
        </Text>
        <Text style={[styles.inlinePauseIcon, { color: isPaused ? colors.warning : colors.textMuted }]}>
          {isPaused ? '▶' : '⏸'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.timerIcon, { color: isPaused ? colors.warning : colors.textMuted }]}>
        ⏱
      </Text>
      <Text style={[styles.time, { color: isPaused ? colors.warning : colors.text }]}>
        {formatDuration(elapsed)}
      </Text>
      <TouchableOpacity
        onPress={handleTogglePause}
        style={[styles.pauseButton, { backgroundColor: isPaused ? colors.success : colors.surfaceAlt }]}
      >
        <Text style={[styles.pauseIcon, { color: isPaused ? '#FFF' : colors.text }]}>
          {isPaused ? '▶' : '⏸'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WorkoutTimer(props: WorkoutTimerProps) {
  return (
    <IfFeatureEnabled feature="workoutTimer">
      <WorkoutTimerContent {...props} />
    </IfFeatureEnabled>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timerIcon: {
    fontSize: 14,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'center',
  },
  pauseButton: {
    padding: 4,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    fontSize: 10,
  },
  // Inline styles for header placement
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  inlineTime: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  inlinePauseIcon: {
    fontSize: 10,
  },
});
