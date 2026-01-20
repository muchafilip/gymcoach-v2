import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getActivePlan } from '../api/workouts';
import { useThemeStore } from '../store/themeStore';

interface ExerciseInfo {
  id: number;
  exerciseName: string;
}

interface WorkoutDay {
  id: number;
  dayNumber: number;
  weekNumber: number;
  name: string;
  completedAt: string | null;
  exerciseCount: number;
  exercises: ExerciseInfo[];
}

interface PlanDetail {
  id: number;
  templateName: string;
  durationWeeks: number;
  isActive: boolean;
  days: WorkoutDay[];
}

export default function PlanScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useThemeStore();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPlanData();
    }, [])
  );

  const loadPlanData = async () => {
    try {
      setError(null);
      const data = await getActivePlan();

      if (!data) {
        setPlan(null);
        return;
      }

      const transformedPlan: PlanDetail = {
        id: data.id,
        templateName: data.templateName,
        durationWeeks: data.durationWeeks,
        isActive: data.isActive,
        days: data.days.map((d: any) => ({
          id: d.id,
          dayNumber: d.dayNumber,
          weekNumber: d.weekNumber,
          name: d.name,
          completedAt: d.completedAt,
          exerciseCount: d.exercises?.length || 0,
          exercises: (d.exercises || []).map((e: any) => ({
            id: e.id,
            exerciseName: e.exerciseName,
          })),
        })),
      };

      setPlan(transformedPlan);
    } catch (err) {
      console.error('Error loading active plan:', err);
      setError('Failed to load workout plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlanData();
  };

  // Group days by week for calendar view
  const weekGroups = useMemo(() => {
    if (!plan) return [];

    const groups: { week: number; days: WorkoutDay[] }[] = [];
    const weekMap = new Map<number, WorkoutDay[]>();

    plan.days.forEach((day) => {
      const week = day.weekNumber || 1;
      if (!weekMap.has(week)) {
        weekMap.set(week, []);
      }
      weekMap.get(week)!.push(day);
    });

    weekMap.forEach((weekDays, week) => {
      groups.push({ week, days: weekDays });
    });

    return groups.sort((a, b) => a.week - b.week);
  }, [plan]);

  // Find next workout (first incomplete day)
  const nextWorkoutId = useMemo(() => {
    if (!plan) return null;
    const nextDay = plan.days.find(d => d.completedAt === null && d.exerciseCount > 0);
    return nextDay?.id || null;
  }, [plan]);

  const handleDayPress = (dayId: number) => {
    navigation.navigate('Templates', {
      screen: 'WorkoutDay',
      params: { dayId },
    });
  };

  const handleBrowseTemplates = () => {
    navigation.navigate('Templates');
  };

  const completedCount = plan?.days.filter((d) => d.completedAt !== null).length || 0;
  const totalDays = plan?.days.filter(d => d.exerciseCount > 0).length || 0;
  const progressPercent = totalDays > 0 ? (completedCount / totalDays) * 100 : 0;

  // Shadow helper
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadPlanData}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No active plan state
  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Plan</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start a workout plan to see your schedule here
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: colors.primary }]}
            onPress={handleBrowseTemplates}
          >
            <Text style={[styles.browseButtonText, { color: colors.buttonText }]}>Browse Templates</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={[styles.planName, { color: colors.text }]}>{plan.templateName}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {plan.durationWeeks} week program
            </Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {completedCount}/{totalDays} workouts
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.success, width: `${progressPercent}%` }
              ]}
            />
          </View>
        </View>
      </View>

      {/* Calendar View */}
      <ScrollView
        style={styles.calendarContainer}
        contentContainerStyle={styles.calendarContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {weekGroups.map(({ week, days: weekDays }) => {
          const weekCompleted = weekDays.filter(d => d.completedAt !== null).length;
          const weekTotal = weekDays.filter(d => d.exerciseCount > 0).length;

          return (
            <View key={week} style={styles.weekSection}>
              <View style={styles.weekHeader}>
                <Text style={[styles.weekTitle, { color: colors.text }]}>Week {week}</Text>
                <Text style={[styles.weekProgress, { color: colors.textMuted }]}>
                  {weekCompleted}/{weekTotal}
                </Text>
              </View>
              <View style={styles.weekDays}>
                {weekDays.map((day) => {
                  const isNext = day.id === nextWorkoutId;
                  const isCompleted = day.completedAt !== null;
                  const isEmpty = day.exerciseCount === 0;

                  return (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayCard,
                        { backgroundColor: colors.surface },
                        cardShadow,
                        isCompleted && { backgroundColor: colors.successLight },
                        isNext && { borderWidth: 2, borderColor: colors.primary },
                        isEmpty && styles.dayCardEmpty,
                      ]}
                      onPress={() => handleDayPress(day.id)}
                      disabled={isEmpty}
                      activeOpacity={0.8}
                    >
                      {isNext && (
                        <View style={[styles.nextBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.nextBadgeText}>NEXT</Text>
                        </View>
                      )}
                      <View style={styles.dayCardHeader}>
                        <Text
                          style={[
                            styles.dayCardName,
                            { color: colors.text },
                            isCompleted && { color: colors.success }
                          ]}
                          numberOfLines={1}
                        >
                          {day.name}
                        </Text>
                        {isCompleted && (
                          <Text style={[styles.dayCardCheck, { color: colors.success }]}>✓</Text>
                        )}
                      </View>
                      {day.exercises.length > 0 ? (
                        <View style={styles.exerciseList}>
                          {day.exercises.slice(0, 4).map((exercise) => (
                            <Text
                              key={exercise.id}
                              style={[styles.exerciseListItem, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              • {exercise.exerciseName}
                            </Text>
                          ))}
                          {day.exercises.length > 4 && (
                            <Text style={[styles.moreExercises, { color: colors.textMuted }]}>
                              +{day.exercises.length - 4} more
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text style={[styles.dayCardPending, { color: colors.textMuted }]}>
                          Rest day
                        </Text>
                      )}
                      <View style={[styles.dayCardFooter, { borderTopColor: colors.border }]}>
                        <Text style={[styles.exerciseCount, { color: colors.textMuted }]}>
                          {day.exerciseCount} exercises
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  browseButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Progress
  progressSection: {
    marginBottom: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Calendar View
  calendarContainer: {
    flex: 1,
  },
  calendarContent: {
    padding: 16,
    paddingBottom: 100,
  },
  weekSection: {
    marginBottom: 24,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  weekProgress: {
    fontSize: 13,
  },
  weekDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: '31%',
    minHeight: 150,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  dayCardEmpty: {
    opacity: 0.5,
  },
  nextBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayCardName: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  dayCardCheck: {
    fontSize: 14,
    marginLeft: 4,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListItem: {
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 1,
  },
  moreExercises: {
    fontSize: 10,
    marginTop: 2,
  },
  dayCardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 6,
  },
  exerciseCount: {
    fontSize: 10,
  },
  dayCardPending: {
    fontSize: 11,
    flex: 1,
    textAlign: 'center',
    marginTop: 20,
  },
});
