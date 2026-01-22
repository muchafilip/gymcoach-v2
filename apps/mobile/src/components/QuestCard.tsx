import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { Quest } from '../api/quests';

interface QuestCardProps {
  quest: Quest;
  onClaim: () => void;
  isClaiming: boolean;
}

export default function QuestCard({ quest, onClaim, isClaiming }: QuestCardProps) {
  const { colors, isDarkMode } = useThemeStore();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const claimAnim = useRef(new Animated.Value(1)).current;

  const progress = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Animate claim button when completed
  useEffect(() => {
    if (quest.completed && !quest.claimed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(claimAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(claimAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [quest.completed, quest.claimed, claimAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const cardShadow = isDarkMode ? {
    borderWidth: 1,
    borderColor: colors.border,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  };

  const typeColors: Record<string, string> = {
    daily: colors.primary,
    weekly: colors.warning,
    onboarding: colors.success,
    achievement: '#9333EA', // Purple for achievements
  };

  const progressBarColor = quest.completed ? colors.success : typeColors[quest.type] || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, cardShadow]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{quest.icon}</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {quest.title}
          </Text>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.xpText, { color: colors.primary }]}>+{quest.xpReward}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBackground, { backgroundColor: colors.surfaceAlt }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: progressBarColor, width: progressWidth },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {quest.progress}/{quest.target}
        </Text>
      </View>

      {quest.completed && !quest.claimed && (
        <Animated.View style={{ transform: [{ scale: claimAnim }] }}>
          <TouchableOpacity
            style={[styles.claimButton, { backgroundColor: colors.success }]}
            onPress={onClaim}
            disabled={isClaiming}
            activeOpacity={0.8}
          >
            <Text style={[styles.claimText, { color: '#fff' }]}>
              {isClaiming ? 'Claiming...' : 'CLAIM'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  xpBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  claimButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
