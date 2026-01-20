import React, { useState, useCallback, useEffect } from 'react';
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
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { getProgressStats, ProgressStats } from '../api/stats';
import { getWorkoutHistory, WorkoutHistory } from '../api/workouts';
import PremiumGate from '../components/PremiumGate';

const screenWidth = Dimensions.get('window').width;

type TabType = 'progress' | 'history';

// Simple area chart component
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
        {data.map((point, index) =>
          index % Math.ceil(data.length / 5) === 0 ? (
            <Text
              key={index}
              style={[chartStyles.label, { left: index * barWidth }]}
              numberOfLines={1}
            >
              {point.label}
            </Text>
          ) : null
        )}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { width: '100%' },
  barsContainer: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '90%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  labelsContainer: { height: 20, position: 'relative' },
  label: { position: 'absolute', fontSize: 9, color: '#888' },
});

export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const { displayWeight, weightUnit } = usePreferencesStore();

  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Progress state
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [days, setDays] = useState(30);

  // History state
  const [workouts, setWorkouts] = useState<WorkoutHistory[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Auto-expand recent entries (this week + last week)
  useEffect(() => {
    if (workouts.length > 0) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const recentIds = workouts
        .filter(w => new Date(w.completedAt) >= twoWeeksAgo)
        .map(w => w.id);
      setExpandedIds(new Set(recentIds));
    }
  }, [workouts]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [days, activeTab])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'progress') {
        const data = await getProgressStats(days);
        setStats(data);
      } else {
        setHistoryError(null);
        const data = await getWorkoutHistory();
        console.log('History API response:', JSON.stringify(data[0], null, 2));
        setWorkouts(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      if (activeTab === 'history') {
        setHistoryError('Failed to load history');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatVolume = (volume: number): string => {
    const converted = displayWeight(volume);
    if (converted >= 1000000) return `${(converted / 1000000).toFixed(1)}M`;
    if (converted >= 1000) return `${(converted / 1000).toFixed(1)}k`;
    return converted.toFixed(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

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

    const volumeChange = lastWeekVolume > 0 ? ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100 : 0;
    const workoutChange = lastWeekWorkouts > 0 ? thisWeekWorkouts - lastWeekWorkouts : thisWeekWorkouts;

    return { thisWeekVolume, volumeChange, thisWeekWorkouts, workoutChange };
  };

  const getChartData = () => {
    if (!stats || stats.volumeOverTime.length === 0) return [];
    return stats.volumeOverTime.slice(-14).map((point) => {
      const date = new Date(point.date);
      return { value: displayWeight(point.volume), label: `${date.getDate()}/${date.getMonth() + 1}` };
    });
  };

  const handleViewWorkout = (dayId: number) => {
    navigation.navigate('Templates', { screen: 'WorkoutDay', params: { dayId } });
  };

  const weekComparison = getWeekComparison();
  const chartData = getChartData();

  const renderProgressContent = () => (
    <PremiumGate feature="progressCharts" message="Unlock Progress Charts">
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Time Range Selector */}
        <View style={styles.timeSelector}>
          {[7, 30, 90].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.timeButton, { backgroundColor: days === d ? colors.primary : colors.surface }]}
              onPress={() => setDays(d)}
            >
              <Text style={[styles.timeButtonText, { color: days === d ? colors.buttonText : colors.textSecondary }]}>
                {d}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Week Comparison */}
        {weekComparison && (
          <View style={[styles.comparisonCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.comparisonTitle, { color: colors.text }]}>This Week vs Last</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                  {formatVolume(weekComparison.thisWeekVolume)}
                </Text>
                <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>volume ({weightUnit})</Text>
                {weekComparison.volumeChange !== 0 && (
                  <Text style={[styles.changeIndicator, { color: weekComparison.volumeChange > 0 ? colors.success : colors.warning }]}>
                    {weekComparison.volumeChange > 0 ? '↑' : '↓'} {Math.abs(weekComparison.volumeChange).toFixed(0)}%
                  </Text>
                )}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.comparisonItem}>
                <Text style={[styles.comparisonValue, { color: colors.primary }]}>{weekComparison.thisWeekWorkouts}</Text>
                <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>workouts</Text>
                {weekComparison.workoutChange !== 0 && (
                  <Text style={[styles.changeIndicator, { color: weekComparison.workoutChange > 0 ? colors.success : colors.warning }]}>
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
            <SimpleAreaChart data={chartData} color={colors.primary} fillColor={colors.primaryLight} height={120} />
          </View>
        )}

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats?.workoutCount || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{formatVolume(stats?.totalVolume || 0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total {weightUnit}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats && stats.workoutCount > 0 ? (stats.workoutCount / (days / 7)).toFixed(1) : '0'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Per Week</Text>
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
                    <Text style={[styles.exerciseRank, { color: colors.textMuted }]}>{index + 1}</Text>
                    <View style={styles.exerciseInfo}>
                      <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                        {exercise.exerciseName}
                      </Text>
                      <View style={[styles.exerciseBarContainer, { backgroundColor: colors.border }]}>
                        <View style={[styles.exerciseBar, { backgroundColor: colors.primary, width: `${barWidth}%` }]} />
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.exerciseVolume, { color: colors.primary }]}>{formatVolume(exercise.totalVolume)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {(!stats || (stats.volumeOverTime.length === 0 && stats.frequencyByWeek.length === 0)) && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Complete some workouts to see your progress!</Text>
          </View>
        )}
      </ScrollView>
    </PremiumGate>
  );

  const renderHistoryContent = () => {
    if (historyError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{historyError}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (workouts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No completed workouts yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Complete your first workout to see it here</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const isExpanded = expandedIds.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.historyCard, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.historyHeader}>
                <Text style={[styles.historyDayName, { color: colors.text }]}>{item.dayName}</Text>
                <View style={styles.historyDateRow}>
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formatDate(item.completedAt)}</Text>
                  <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </View>
              <View style={styles.historyStats}>
                <Text style={[styles.historyStat, { color: colors.textSecondary }]}>{item.exerciseCount} exercises</Text>
                <Text style={[styles.historySeparator, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.historyStat, { color: colors.textSecondary }]}>{item.totalSets} sets</Text>
              </View>

              {/* Expandable exercise details */}
              {isExpanded && item.exercises && item.exercises.length > 0 && (
                <View style={[styles.exerciseDetails, { borderTopColor: colors.border }]}>
                  {item.exercises.map((ex, idx) => (
                    <View key={idx} style={styles.exerciseRow}>
                      <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={[styles.exerciseStats, { color: colors.textSecondary }]}>
                        {ex.sets}×{ex.reps} @ {ex.weight}kg
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.historyList}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Segment Control */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'progress' && { backgroundColor: colors.surface }]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'progress' ? colors.text : colors.textSecondary }]}>
            Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, activeTab === 'history' && { backgroundColor: colors.surface }]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'history' ? colors.text : colors.textSecondary }]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : activeTab === 'progress' ? (
        renderProgressContent()
      ) : (
        renderHistoryContent()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' },
  segmentContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  timeSelector: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  timeButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16 },
  timeButtonText: { fontSize: 13, fontWeight: '600' },
  comparisonCard: { borderRadius: 12, padding: 14, marginBottom: 12 },
  comparisonTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center' },
  comparisonItem: { flex: 1, alignItems: 'center' },
  comparisonValue: { fontSize: 24, fontWeight: 'bold' },
  comparisonLabel: { fontSize: 11, marginTop: 2 },
  changeIndicator: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  divider: { width: 1, height: 50, marginHorizontal: 16 },
  chartCard: { borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  exerciseRank: { width: 20, fontSize: 12, fontWeight: '600' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  exerciseBarContainer: { height: 4, borderRadius: 2 },
  exerciseBar: { height: '100%', borderRadius: 2 },
  exerciseVolume: { fontSize: 13, fontWeight: '700' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginBottom: 16 },
  retryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { fontWeight: 'bold' },
  historyList: { padding: 16, paddingBottom: 100 },
  historyCard: { padding: 14, marginBottom: 10, borderRadius: 10, borderLeftWidth: 4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyDayName: { fontSize: 16, fontWeight: '600' },
  historyDateRow: { flexDirection: 'row', alignItems: 'center' },
  historyDate: { fontSize: 13 },
  historyArrow: { fontSize: 18, marginLeft: 6 },
  historyStats: { flexDirection: 'row', alignItems: 'center' },
  historyStat: { fontSize: 13 },
  historySeparator: { marginHorizontal: 6 },
  expandIcon: { fontSize: 12, marginLeft: 8 },
  exerciseDetails: { marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  exerciseStats: { fontSize: 13, fontWeight: '500' },
});
