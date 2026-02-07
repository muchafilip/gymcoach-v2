import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useProgressStore } from '../store/progressStore';
import { IfFeatureEnabled } from './PremiumGate';

function XPBarContent() {
  const { colors, isDarkMode } = useThemeStore();
  const {
    level,
    xpInCurrentLevel,
    xpNeededForLevel,
    currentStreak,
    workoutsThisWeek,
    weeklyGoal,
    lastXpGain,
    resetLastXpGain,
    totalXp,
    nextUnlockLevel,
    unlockedPlansCount,
  } = useProgressStore();

  const [showInfo, setShowInfo] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpGainAnim = useRef(new Animated.Value(0)).current;
  const xpGainOpacity = useRef(new Animated.Value(0)).current;

  const progress = xpNeededForLevel > 0 ? xpInCurrentLevel / xpNeededForLevel : 0;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Animate XP gain popup
  useEffect(() => {
    if (lastXpGain > 0) {
      xpGainAnim.setValue(0);
      xpGainOpacity.setValue(1);

      Animated.parallel([
        Animated.timing(xpGainAnim, {
          toValue: -20,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(xpGainOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        resetLastXpGain();
      });
    }
  }, [lastXpGain, xpGainAnim, xpGainOpacity, resetLastXpGain]);

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
    shadowRadius: 12,
    elevation: 2,
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface }, cardShadow]}>
        {/* Main XP row */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowInfo(true)}
          style={styles.row}
        >
          {/* Level */}
          <View style={[styles.levelBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.levelText, { color: colors.primary }]}>Lv.{level}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBackground, { backgroundColor: colors.surfaceAlt }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: progressWidth },
                ]}
              />
            </View>
          </View>

          {/* XP Text */}
          <Text style={[styles.xpText, { color: colors.textSecondary }]}>
            {xpInCurrentLevel}/{xpNeededForLevel} XP
          </Text>

          {/* Streak */}
          {currentStreak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.warningLight }]}>
              <Text style={styles.streakText}>🔥{currentStreak}w</Text>
            </View>
          )}

          {/* XP Gain Popup */}
          {lastXpGain > 0 && (
            <Animated.View
              style={[
                styles.xpGainPopup,
                {
                  transform: [{ translateY: xpGainAnim }],
                  opacity: xpGainOpacity,
                },
              ]}
            >
              <Text style={[styles.xpGainText, { color: colors.success }]}>+{lastXpGain} XP</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Modal */}
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfo(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Your Progress</Text>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Level</Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>{level}</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Total XP</Text>
              <Text style={[styles.modalValue, { color: colors.primary }]}>{totalXp || 0}</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Next Level</Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>{xpNeededForLevel - xpInCurrentLevel} XP to go</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Streak</Text>
              <Text style={[styles.modalValue, { color: colors.warning }]}>🔥 {currentStreak} weeks</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>This Week</Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>{workoutsThisWeek}/{weeklyGoal} workouts</Text>
            </View>

            <View style={[styles.unlockSection, { backgroundColor: colors.primaryLight, marginTop: 12 }]}>
              <Text style={[styles.unlockTitle, { color: colors.primary }]}>
                {unlockedPlansCount > 0 ? `${unlockedPlansCount} Plans Unlocked` : 'Unlock Premium Plans'}
              </Text>
              {nextUnlockLevel > 0 && (
                <Text style={[styles.unlockText, { color: colors.textSecondary }]}>
                  Next unlock at Level {nextUnlockLevel}
                </Text>
              )}
            </View>

            <Text style={[styles.modalHint, { color: colors.textMuted }]}>
              Earn XP by completing workouts. Level up to unlock premium workout plans for free!
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowInfo(false)}
            >
              <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function XPBar() {
  return (
    <IfFeatureEnabled feature="xpSystem">
      <XPBarContent />
    </IfFeatureEnabled>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  levelBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    flex: 1,
  },
  progressBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '500',
  },
  streakBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 11,
  },
  xpGainPopup: {
    position: 'absolute',
    right: 40,
    top: -5,
  },
  xpGainText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Info Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  unlockSection: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  unlockTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  unlockText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
