import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useProgressStore } from '../store/progressStore';
import { useQuestStore } from '../store/questStore';
import { IfFeatureEnabled } from './PremiumGate';
import { Quest } from '../api/quests';

// Compact quest card for grid layout (auto-claim - no claim button needed)
function QuestGridCard({ quest, colors }: {
  quest: Quest;
  colors: any;
}) {
  const progress = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
  const isCompleted = quest.completed;

  return (
    <View style={[
      gridStyles.card,
      { backgroundColor: colors.surfaceAlt },
      isCompleted && { backgroundColor: colors.successLight }
    ]}>
      <Text style={[gridStyles.title, { color: colors.text }]} numberOfLines={2}>
        {quest.title}
      </Text>

      <View style={gridStyles.progressRow}>
        <View style={[gridStyles.progressBg, { backgroundColor: colors.background }]}>
          <View style={[
            gridStyles.progressFill,
            { backgroundColor: isCompleted ? colors.success : colors.primary, width: `${progress * 100}%` }
          ]} />
        </View>
        <Text style={[gridStyles.progressText, { color: colors.textMuted }]}>
          {quest.progress}/{quest.target}
        </Text>
      </View>

      <View style={gridStyles.footer}>
        <Text style={[gridStyles.xpReward, { color: colors.primary }]}>+{quest.xpReward} XP</Text>
        {isCompleted && (
          <View style={[gridStyles.doneBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[gridStyles.doneText, { color: colors.success }]}>Done</Text>
          </View>
        )}
      </View>
    </View>
  );
}

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

  const { quests, loading, loadQuests } = useQuestStore();

  const [showInfo, setShowInfo] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpGainAnim = useRef(new Animated.Value(0)).current;
  const xpGainOpacity = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(1)).current;
  const starRotate = useRef(new Animated.Value(0)).current;

  const progress = xpNeededForLevel > 0 ? xpInCurrentLevel / xpNeededForLevel : 0;

  // Load quests when component mounts
  useFocusEffect(
    useCallback(() => {
      loadQuests();
    }, [])
  );

  // Calculate if there are new quests (unclaimed completed ones)
  const unclaimedCount = quests.filter(q => q.completed && !q.claimed).length;
  const hasNewQuests = unclaimedCount > 0;

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

  // Animated star when there are new quests
  useEffect(() => {
    if (hasNewQuests) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(starAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(starAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

      const rotate = Animated.loop(
        Animated.sequence([
          Animated.timing(starRotate, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(starRotate, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      rotate.start();

      return () => {
        pulse.stop();
        rotate.stop();
      };
    }
  }, [hasNewQuests, starAnim, starRotate]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const starRotation = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '15deg'],
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

  // Group quests
  const dailyQuests = quests.filter(q => q.type === 'daily').slice(0, 3);
  const weeklyQuests = quests.filter(q => q.type === 'weekly').slice(0, 3);
  const achievementQuests = quests.filter(q => q.type === 'achievement');
  const onboardingQuests = quests.filter(q => q.type === 'onboarding');

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

        {/* Quests button row */}
        <TouchableOpacity
          style={[styles.questsButton, { borderTopColor: colors.border }]}
          onPress={() => setShowQuests(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.questsButtonText, { color: colors.text }]}>Quests</Text>
          {hasNewQuests ? (
            <Animated.Text style={[
              styles.questsStar,
              { transform: [{ scale: starAnim }, { rotate: starRotation }] }
            ]}>
              ✨
            </Animated.Text>
          ) : (
            <Text style={[styles.questsArrow, { color: colors.textMuted }]}>›</Text>
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

      {/* Quests Modal */}
      <Modal
        visible={showQuests}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuests(false)}
      >
        <View style={[questStyles.container, { backgroundColor: colors.background }]}>
          <View style={[questStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[questStyles.title, { color: colors.text }]}>Quests</Text>
            <TouchableOpacity onPress={() => setShowQuests(false)}>
              <Text style={[questStyles.doneBtn, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={questStyles.content} showsVerticalScrollIndicator={false}>
            {/* Onboarding */}
            {onboardingQuests.length > 0 && (
              <View style={questStyles.section}>
                <Text style={[questStyles.sectionTitle, { color: colors.textSecondary }]}>GET STARTED</Text>
                <View style={questStyles.grid}>
                  {onboardingQuests.map((quest) => (
                    <QuestGridCard key={quest.id} quest={quest} colors={colors} />
                  ))}
                </View>
              </View>
            )}

            {/* Daily Quests - Row of 3 */}
            {dailyQuests.length > 0 && (
              <View style={questStyles.section}>
                <Text style={[questStyles.sectionTitle, { color: colors.textSecondary }]}>DAILY</Text>
                <View style={questStyles.grid}>
                  {dailyQuests.map((quest) => (
                    <QuestGridCard key={quest.id} quest={quest} colors={colors} />
                  ))}
                </View>
              </View>
            )}

            {/* Weekly Quests - Row of 3 */}
            {weeklyQuests.length > 0 && (
              <View style={questStyles.section}>
                <Text style={[questStyles.sectionTitle, { color: colors.textSecondary }]}>WEEKLY</Text>
                <View style={questStyles.grid}>
                  {weeklyQuests.map((quest) => (
                    <QuestGridCard key={quest.id} quest={quest} colors={colors} />
                  ))}
                </View>
              </View>
            )}

            {/* Achievements */}
            {achievementQuests.length > 0 && (
              <View style={questStyles.section}>
                <Text style={[questStyles.sectionTitle, { color: colors.textSecondary }]}>ACHIEVEMENTS</Text>
                <View style={questStyles.grid}>
                  {achievementQuests.map((quest) => (
                    <QuestGridCard key={quest.id} quest={quest} colors={colors} />
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
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
  questsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  questsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  questsStar: {
    fontSize: 18,
  },
  questsArrow: {
    fontSize: 20,
    fontWeight: '300',
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

// Quest Modal styles
const questStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  doneBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});

// Grid card styles
const gridStyles = StyleSheet.create({
  card: {
    width: '31%',
    minWidth: 100,
    borderRadius: 12,
    padding: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    minHeight: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpReward: {
    fontSize: 11,
    fontWeight: '700',
  },
  doneBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  doneText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
