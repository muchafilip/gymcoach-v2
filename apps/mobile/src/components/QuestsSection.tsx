import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useQuestStore } from '../store/questStore';
import QuestCard from './QuestCard';
import { IfFeatureEnabled } from './PremiumGate';
import { Quest } from '../api/quests';

// Mini quest indicator (icon only)
function QuestMini({ quest, colors }: { quest: Quest; colors: any }) {
  const isCompleted = quest.completed && !quest.claimed;
  const progress = quest.target > 0 ? quest.progress / quest.target : 0;

  return (
    <View style={styles.questMini}>
      <View style={[
        styles.questMiniCircle,
        { backgroundColor: colors.surfaceAlt },
        isCompleted && { backgroundColor: colors.successLight }
      ]}>
        <Text style={styles.questMiniIcon}>{quest.icon}</Text>
        {/* Progress ring */}
        {!isCompleted && progress > 0 && (
          <View style={[
            styles.progressRing,
            { borderColor: colors.primary, borderRightColor: 'transparent' },
            { transform: [{ rotate: `${progress * 360}deg` }] }
          ]} />
        )}
      </View>
      {isCompleted && (
        <View style={[styles.completedDot, { backgroundColor: colors.success }]} />
      )}
    </View>
  );
}

function QuestsSectionContent() {
  const { colors, isDarkMode } = useThemeStore();
  const { quests, loading, claiming, loadQuests, claimQuest, logRestDay } = useQuestStore();
  const [showModal, setShowModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Load quests when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadQuests();
    }, [])
  );

  // Calculate unclaimed count
  const unclaimedCount = quests.filter(q => q.completed && !q.claimed).length;
  const dailyQuests = quests.filter(q => q.type === 'daily').slice(0, 3);
  const weeklyQuests = quests.filter(q => q.type === 'weekly').slice(0, 3);

  // Pulsing animation when there are unclaimed quests
  useEffect(() => {
    if (unclaimedCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
      };
    }
  }, [unclaimedCount, pulseAnim, glowAnim]);

  const handleClaim = async (questId: number) => {
    await claimQuest(questId);
  };

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

  if (loading && quests.length === 0) {
    return null;
  }

  // Calculate time until next quest refresh (midnight local time)
  const getNextRefreshTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const hoursUntil = Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursUntil <= 1 ? 'in about an hour' : `in ${hoursUntil} hours`;
  };

  if (quests.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.emptyStateIcon}>🎯</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          New daily quests {getNextRefreshTime()}
        </Text>
      </View>
    );
  }

  // Group all quests by type for modal
  const onboardingQuests = quests.filter(q => q.type === 'onboarding');
  const achievementQuests = quests.filter(q => q.type === 'achievement');
  const allDailyQuests = quests.filter(q => q.type === 'daily');
  const allWeeklyQuests = quests.filter(q => q.type === 'weekly');

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }, cardShadow]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Quests</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {unclaimedCount > 0 ? `${unclaimedCount} ready to claim!` : 'Tap to view'}
            </Text>
          </View>

          {/* Pulsing notification badge */}
          {unclaimedCount > 0 && (
            <Animated.View style={[
              styles.notificationBadge,
              { backgroundColor: colors.success },
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Animated.View style={[
                styles.glowRing,
                { borderColor: colors.success, opacity: glowAnim }
              ]} />
              <Text style={styles.badgeText}>{unclaimedCount}</Text>
            </Animated.View>
          )}

          <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
        </View>

        {/* Quest mini icons */}
        <View style={styles.questRows}>
          {/* Daily row */}
          {dailyQuests.length > 0 && (
            <View style={styles.questRow}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Daily</Text>
              <View style={styles.questMinis}>
                {dailyQuests.map((quest) => (
                  <QuestMini key={quest.id} quest={quest} colors={colors} />
                ))}
                {/* Placeholder slots if less than 3 */}
                {Array(Math.max(0, 3 - dailyQuests.length)).fill(0).map((_, i) => (
                  <View key={`empty-d-${i}`} style={styles.questMini}>
                    <View style={[styles.questMiniCircle, styles.emptySlot, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>+</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Weekly row */}
          {weeklyQuests.length > 0 && (
            <View style={styles.questRow}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>Weekly</Text>
              <View style={styles.questMinis}>
                {weeklyQuests.map((quest) => (
                  <QuestMini key={quest.id} quest={quest} colors={colors} />
                ))}
                {/* Placeholder slots if less than 3 */}
                {Array(Math.max(0, 3 - weeklyQuests.length)).fill(0).map((_, i) => (
                  <View key={`empty-w-${i}`} style={styles.questMini}>
                    <View style={[styles.questMiniCircle, styles.emptySlot, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>+</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Full Quest Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Quests</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Onboarding quests */}
            {onboardingQuests.length > 0 && (
              <View style={styles.questSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Get Started</Text>
                {onboardingQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={() => handleClaim(quest.id)}
                    isClaiming={claiming === quest.id}
                  />
                ))}
              </View>
            )}

            {/* Daily quests */}
            {allDailyQuests.length > 0 && (
              <View style={styles.questSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Quests</Text>
                {allDailyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={() => handleClaim(quest.id)}
                    isClaiming={claiming === quest.id}
                  />
                ))}
              </View>
            )}

            {/* Weekly quests */}
            {allWeeklyQuests.length > 0 && (
              <View style={styles.questSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Quests</Text>
                {allWeeklyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={() => handleClaim(quest.id)}
                    isClaiming={claiming === quest.id}
                  />
                ))}
              </View>
            )}

            {/* Achievement quests */}
            {achievementQuests.length > 0 && (
              <View style={styles.questSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
                {achievementQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={() => handleClaim(quest.id)}
                    isClaiming={claiming === quest.id}
                  />
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

export default function QuestsSection() {
  return (
    <IfFeatureEnabled feature="xpSystem">
      <QuestsSectionContent />
    </IfFeatureEnabled>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  glowRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  arrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  questRows: {
    gap: 10,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 50,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questMinis: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  questMini: {
    position: 'relative',
  },
  questMiniCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  questMiniIcon: {
    fontSize: 18,
  },
  progressRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  completedDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  emptySlot: {
    opacity: 0.5,
  },
  emptyIcon: {
    fontSize: 16,
    fontWeight: '300',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  questSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
