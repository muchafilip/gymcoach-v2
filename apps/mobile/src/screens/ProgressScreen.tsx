import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getProgressStats, ProgressStats } from '../api/stats';
import PremiumGate from '../components/PremiumGate';

const screenWidth = Dimensions.get('window').width;

// Simple area chart component using Views
function SimpleAreaChart({
  data,
  color,
  fillColor,
  height = 120,
}: {
  data: { value: number; label: string }[];
  color: string;
  fillColor: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartWidth = screenWidth - 64;
  const barWidth = chartWidth / data.length;

  return (
    <View style={[chartStyles.container, { height }]}>
      <View style={chartStyles.barsContainer}>
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * (height - 20);
          return (
            <View key={index} style={[chartStyles.barColumn, { width: barWidth }]}>
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: barHeight,
                    backgroundColor: fillColor,
                    borderTopWidth: 2,
                    borderTopColor: color,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={chartStyles.labelsContainer}>
        {data.map((point, index) => (
          index % Math.ceil(data.length / 5) === 0 ? (
            <Text
              key={index}
              style={[chartStyles.label, { left: index * barWidth }]}
              numberOfLines={1}
            >
              {point.label}
            </Text>
          ) : null
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '90%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  labelsContainer: {
    height: 20,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    fontSize: 9,
    color: '#888',
  },
});

export default function ProgressScreen() {
  const { colors } = useThemeStore();
  const { displayWeight, weightUnit } = usePreferencesStore();

  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [days])
  );

  const loadStats = async () => {
    try {
      const data = await getProgressStats(days);
      setStats(data);
    } catch (err) {
      console.error('Error loading progress stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatVolume = (volume: number): string => {
    const converted = displayWeight(volume);
    if (converted >= 1000000) {
      return `${(converted / 1000000).toFixed(1)}M`;
    }
    if (converted >= 1000) {
      return `${(converted / 1000).toFixed(1)}k`;
    }
    return converted.toFixed(0);
  };

  // Calculate week-over-week stats
  const getWeekComparison = () => {
    if (!stats || stats.volumeOverTime.length === 0) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let thisWeekVolume = 0;
    let lastWeekVolume = 0;
    let thisWeekWorkouts = 0;
    let lastWeekWorkouts = 0;

    stats.volumeOverTime.forEach((point) => {
      const date = new Date(point.date);
      if (date >= oneWeekAgo) {
        thisWeekVolume += point.volume;
        thisWeekWorkouts++;
      } else if (date >= twoWeeksAgo) {
        lastWeekVolume += point.volume;
        lastWeekWorkouts++;
      }
    });

    const volumeChange = lastWeekVolume > 0
      ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100
      : 0;
    const workoutChange = lastWeekWorkouts > 0
      ? thisWeekWorkouts - lastWeekWorkouts
      : thisWeekWorkouts;

    return {
      thisWeekVolume,
      lastWeekVolume,
      volumeChange,
      thisWeekWorkouts,
      lastWeekWorkouts,
      workoutChange,
    };
  };

  // Prepare chart data
  const getChartData = () => {
    if (!stats || stats.volumeOverTime.length === 0) return [];

    return stats.volumeOverTime.slice(-14).map((point) => {
      const date = new Date(point.date);
      return {
        value: displayWeight(point.volume),
        label: `${date.getDate()}/${date.getMonth() + 1}`,
      };
    });
  };

  const weekComparison = getWeekComparison();
  const chartData = getChartData();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <PremiumGate feature="progressCharts" message="Unlock Progress Charts">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Header with Time Range */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
            <View style={styles.timeSelector}>
              {[7, 30, 90].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.timeButton,
                    { backgroundColor: days === d ? colors.primary : colors.surface },
                  ]}
                  onPress={() => setDays(d)}
                >
                  <Text
                    style={[
                      styles.timeButtonText,
                      { color: days === d ? colors.buttonText : colors.textSecondary },
                    ]}
                  >
                    {d}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Week vs Week Comparison */}
          {weekComparison && (
            <View style={[styles.comparisonCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.comparisonTitle, { color: colors.text }]}>This Week vs Last</Text>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                    {formatVolume(weekComparison.thisWeekVolume)}
                  </Text>
                  <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                    volume ({weightUnit})
                  </Text>
                  {weekComparison.volumeChange !== 0 && (
                    <Text
                      style={[
                        styles.changeIndicator,
                        { color: weekComparison.volumeChange > 0 ? colors.success : colors.warning },
                      ]}
                    >
                      {weekComparison.volumeChange > 0 ? '↑' : '↓'} {Math.abs(weekComparison.volumeChange).toFixed(0)}%
                    </Text>
                  )}
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                    {weekComparison.thisWeekWorkouts}
                  </Text>
                  <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                    workouts
                  </Text>
                  {weekComparison.workoutChange !== 0 && (
                    <Text
                      style={[
                        styles.changeIndicator,
                        { color: weekComparison.workoutChange > 0 ? colors.success : colors.warning },
                      ]}
                    >
                      {weekComparison.workoutChange > 0 ? '+' : ''}{weekComparison.workoutChange} vs last
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Volume Chart */}
          {chartData.length > 1 && (
            <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Volume Trend</Text>
              <SimpleAreaChart
                data={chartData}
                color={colors.primary}
                fillColor={colors.primaryLight}
                height={120}
              />
            </View>
          )}

          {/* Summary Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats?.workoutCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Workouts
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatVolume(stats?.totalVolume || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total {weightUnit}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats && stats.workoutCount > 0
                  ? (stats.workoutCount / (days / 7)).toFixed(1)
                  : '0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Per Week
              </Text>
            </View>
          </View>

          {/* Top Exercises */}
          {stats && stats.topExercises.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Top Exercises</Text>
              {stats.topExercises.slice(0, 5).map((exercise, index) => {
                const maxVolume = stats.topExercises[0]?.totalVolume || 1;
                const barWidth = (exercise.totalVolume / maxVolume) * 100;
                return (
                  <View key={exercise.exerciseId} style={styles.exerciseRow}>
                    <View style={styles.exerciseLeft}>
                      <Text style={[styles.exerciseRank, { color: colors.textMuted }]}>
                        {index + 1}
                      </Text>
                      <View style={styles.exerciseInfo}>
                        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                          {exercise.exerciseName}
                        </Text>
                        <View style={[styles.exerciseBarContainer, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.exerciseBar,
                              { backgroundColor: colors.primary, width: `${barWidth}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.exerciseVolume, { color: colors.primary }]}>
                      {formatVolume(exercise.totalVolume)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Workout Frequency */}
          {stats && stats.frequencyByWeek.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Activity</Text>
              <View style={styles.frequencyRow}>
                {stats.frequencyByWeek.slice(-8).map((week, index) => {
                  const maxCount = Math.max(...stats.frequencyByWeek.map((w) => w.count));
                  const height = maxCount > 0 ? (week.count / maxCount) * 50 + 10 : 10;
                  return (
                    <View key={index} style={styles.frequencyCol}>
                      <View
                        style={[
                          styles.frequencyBar,
                          { backgroundColor: colors.primary, height },
                        ]}
                      />
                      <Text style={[styles.frequencyCount, { color: colors.text }]}>
                        {week.count}
                      </Text>
                      <Text style={[styles.frequencyLabel, { color: colors.textMuted }]}>
                        W{week.week}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {(!stats || (stats.volumeOverTime.length === 0 && stats.frequencyByWeek.length === 0)) && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Complete some workouts to see your progress!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  timeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  timeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Week Comparison
  comparisonCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  comparisonTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  comparisonLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  changeIndicator: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 50,
    marginHorizontal: 16,
  },
  // Chart
  chartCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  // Exercise List
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  exerciseRank: {
    width: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseBarContainer: {
    height: 4,
    borderRadius: 2,
  },
  exerciseBar: {
    height: '100%',
    borderRadius: 2,
  },
  exerciseVolume: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Frequency
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 90,
  },
  frequencyCol: {
    alignItems: 'center',
  },
  frequencyBar: {
    width: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  frequencyCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  frequencyLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
