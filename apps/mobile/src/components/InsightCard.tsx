import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { Insight, InsightType } from '../api/insights';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = (SCREEN_WIDTH - 32 - 10) / 2; // 16px margin each side, 10px gap

interface InsightCardProps {
  insight: Insight;
}

// Map emoji names to actual emojis
const emojiMap: Record<string, string> = {
  warning: '\u26A0\uFE0F',
  trophy: '\uD83C\uDFC6',
  chart_increasing: '\uD83D\uDCC8',
  chart_decreasing: '\uD83D\uDCC9',
  flexed_biceps: '\uD83D\uDCAA',
  fire: '\uD83D\uDD25',
  target: '\uD83C\uDFAF',
  checkmark: '\u2705',
};

export default function InsightCard({ insight }: InsightCardProps) {
  const { colors } = useThemeStore();

  // Get colors based on insight type
  const getTypeColors = (type: InsightType) => {
    switch (type) {
      case 'plateau':
        return {
          background: colors.warningLight,
          accent: colors.warning,
        };
      case 'progress':
        return {
          background: colors.successLight,
          accent: colors.success,
        };
      case 'volume':
        return {
          background: colors.primaryLight,
          accent: colors.primary,
        };
      case 'consistency':
        return {
          background: colors.warningLight,
          accent: colors.warning,
        };
      case 'streak':
        return {
          background: colors.successLight,
          accent: colors.success,
        };
      default:
        return {
          background: colors.surface,
          accent: colors.primary,
        };
    }
  };

  const typeColors = getTypeColors(insight.type);
  const emoji = insight.iconEmoji ? emojiMap[insight.iconEmoji] || '' : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: typeColors.background,
          width: CARD_SIZE,
          height: CARD_SIZE,
        },
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{insight.title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{insight.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 12,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 11,
    lineHeight: 14,
  },
});
