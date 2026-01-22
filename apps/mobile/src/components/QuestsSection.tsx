import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useQuestStore } from '../store/questStore';
import QuestCard from './QuestCard';
import { IfFeatureEnabled } from './PremiumGate';

function QuestsSectionContent() {
  const { colors, isDarkMode } = useThemeStore();
  const { quests, loading, claiming, loadQuests, claimQuest, logRestDay } = useQuestStore();
  const [expanded, setExpanded] = useState(false);

  // Load quests when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadQuests();
    }, [])
  );

  // Group quests by priority: completed unclaimed first, then onboarding, daily, weekly, achievements
  const sortedQuests = [...quests].sort((a, b) => {
    // Completed unclaimed first
    if (a.completed && !a.claimed && !(b.completed && !b.claimed)) return -1;
    if (b.completed && !b.claimed && !(a.completed && !a.claimed)) return 1;

    // Then by type priority
    const typePriority: Record<string, number> = {
      onboarding: 0,
      daily: 1,
      weekly: 2,
      achievement: 3,
    };
    return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
  });

  // Show 3 quests by default, all when expanded
  const displayedQuests = expanded ? sortedQuests : sortedQuests.slice(0, 3);

  const handleClaim = async (questId: number) => {
    const result = await claimQuest(questId);
    if (result) {
      // Quest claimed successfully - store already updated
    }
  };

  const handleRestDay = () => {
    Alert.alert(
      'Log Rest Day',
      'Are you taking an intentional rest day today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Log Rest Day',
          onPress: async () => {
            await logRestDay();
          },
        },
      ]
    );
  };

  // Check if there's a rest day quest that can be completed
  const hasRestDayQuest = quests.some(q => q.code === 'daily_rest' && !q.completed);

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
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, cardShadow]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (quests.length === 0) {
    return null;
  }

  const unclaimedCount = quests.filter(q => q.completed && !q.claimed).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, cardShadow]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Quests</Text>
          {unclaimedCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Text style={styles.badgeText}>{unclaimedCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
          {expanded ? '−' : '+'}
        </Text>
      </TouchableOpacity>

      <View style={styles.questList}>
        {displayedQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onClaim={() => handleClaim(quest.id)}
            isClaiming={claiming === quest.id}
          />
        ))}
      </View>

      {sortedQuests.length > 3 && !expanded && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeMoreText, { color: colors.primary }]}>
            See {sortedQuests.length - 3} more quests
          </Text>
        </TouchableOpacity>
      )}

      {hasRestDayQuest && (
        <TouchableOpacity
          style={[styles.restDayButton, { borderColor: colors.border }]}
          onPress={handleRestDay}
          activeOpacity={0.7}
        >
          <Text style={[styles.restDayText, { color: colors.textSecondary }]}>
            Taking a rest day today?
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
  questList: {
    marginTop: 4,
  },
  seeMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restDayButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  restDayText: {
    fontSize: 13,
  },
});
