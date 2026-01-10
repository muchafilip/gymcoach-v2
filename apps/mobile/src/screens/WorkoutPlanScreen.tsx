import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { getWorkoutPlanDetail } from '../api/workouts';
import { useThemeStore } from '../store/themeStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'WorkoutPlan'>;
type RouteParams = RouteProp<TemplatesStackParamList, 'WorkoutPlan'>;

interface WorkoutDay {
  id: number;
  dayNumber: number;
  weekNumber: number;
  name: string;
  completedAt: string | null;
  exerciseCount: number;
}

interface PlanDetail {
  id: number;
  templateName: string;
  durationWeeks: number;
  isActive: boolean;
  days: WorkoutDay[];
}

type ViewMode = 'list' | 'calendar';

export default function WorkoutPlanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { planId } = route.params;
  const { colors } = useThemeStore();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  useFocusEffect(
    useCallback(() => {
      loadPlanData();
    }, [planId])
  );

  const loadPlanData = async () => {
    try {
      setError(null);
      const data = await getWorkoutPlanDetail(planId);

      // Transform API response to our format
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
        })),
      };

      setPlan(transformedPlan);
    } catch (err) {
      console.error('Error loading workout plan:', err);
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

  const handleDayPress = (dayId: number) => {
    navigation.navigate('WorkoutDay', { dayId });
  };

  const completedCount = plan?.days.filter((d) => d.completedAt !== null).length || 0;
  const totalDays = plan?.days.length || 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || 'Plan not found'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadPlanData}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderCalendarView = () => (
    <ScrollView
      style={styles.calendarContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {weekGroups.map(({ week, days: weekDays }) => (
        <View key={week} style={styles.weekSection}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>Week {week}</Text>
          <View style={styles.weekDays}>
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  day.completedAt !== null && { backgroundColor: colors.successLight, borderColor: colors.success },
                  day.exerciseCount === 0 && styles.dayCardEmpty,
                ]}
                onPress={() => handleDayPress(day.id)}
                disabled={day.exerciseCount === 0}
              >
                <Text style={[styles.dayCardName, { color: colors.text }]}>{day.name}</Text>
                {day.completedAt !== null ? (
                  <Text style={[styles.dayCardCheck, { color: colors.success }]}>✓</Text>
                ) : day.exerciseCount > 0 ? (
                  <Text style={[styles.dayCardExercises, { color: colors.textSecondary }]}>
                    {day.exerciseCount} ex
                  </Text>
                ) : (
                  <Text style={[styles.dayCardPending, { color: colors.textMuted }]}>...</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderListView = () => (
    <FlatList
      data={plan.days}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: colors.surface },
            item.completedAt !== null && { backgroundColor: colors.successLight, borderColor: colors.success },
          ]}
          onPress={() => handleDayPress(item.id)}
        >
          <View style={styles.cardLeft}>
            <Text style={[styles.dayNumber, { color: colors.textSecondary }]}>
              Week {item.weekNumber} · Day {item.dayNumber}
            </Text>
            <Text style={[styles.dayName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.exerciseCount, { color: colors.textSecondary }]}>
              {item.exerciseCount} exercises
            </Text>
          </View>
          <View style={styles.cardRight}>
            {item.completedAt !== null ? (
              <Text style={[styles.completedBadge, { color: colors.success }]}>✓</Text>
            ) : (
              <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.planName, { color: colors.text }]}>{plan.templateName}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {completedCount}/{totalDays} completed · {plan.durationWeeks} weeks
            </Text>
          </View>
          {plan.isActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
              <Text style={[styles.activeBadgeText, { color: colors.buttonText }]}>Active</Text>
            </View>
          )}
        </View>

        <View style={[styles.viewToggle, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'calendar' && [styles.toggleButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: colors.textSecondary },
                viewMode === 'calendar' && { color: colors.text, fontWeight: '600' },
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && [styles.toggleButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.toggleText,
                { color: colors.textSecondary },
                viewMode === 'list' && { color: colors.text, fontWeight: '600' },
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
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
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {},
  toggleText: {
    fontSize: 14,
  },
  toggleTextActive: {
    fontWeight: '600',
  },
  calendarContainer: {
    flex: 1,
    padding: 16,
  },
  weekSection: {
    marginBottom: 20,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  weekDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    padding: 10,
    justifyContent: 'space-between',
  },
  dayCardCompleted: {},
  dayCardEmpty: {
    opacity: 0.5,
  },
  dayCardName: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCardCheck: {
    fontSize: 20,
    alignSelf: 'flex-end',
  },
  dayCardExercises: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  dayCardPending: {
    fontSize: 14,
    alignSelf: 'flex-end',
  },
  list: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardCompleted: {},
  cardLeft: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
  },
  cardRight: {
    marginLeft: 16,
  },
  arrow: {
    fontSize: 24,
  },
  completedBadge: {
    fontSize: 28,
  },
});
