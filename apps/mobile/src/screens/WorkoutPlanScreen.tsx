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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Plan not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlanData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderCalendarView = () => (
    <ScrollView
      style={styles.calendarContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {weekGroups.map(({ week, days: weekDays }) => (
        <View key={week} style={styles.weekSection}>
          <Text style={styles.weekTitle}>Week {week}</Text>
          <View style={styles.weekDays}>
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayCard,
                  day.completedAt !== null && styles.dayCardCompleted,
                  day.exerciseCount === 0 && styles.dayCardEmpty,
                ]}
                onPress={() => handleDayPress(day.id)}
                disabled={day.exerciseCount === 0}
              >
                <Text style={styles.dayCardName}>{day.name}</Text>
                {day.completedAt !== null ? (
                  <Text style={styles.dayCardCheck}>✓</Text>
                ) : day.exerciseCount > 0 ? (
                  <Text style={styles.dayCardExercises}>
                    {day.exerciseCount} ex
                  </Text>
                ) : (
                  <Text style={styles.dayCardPending}>...</Text>
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.card,
            item.completedAt !== null && styles.cardCompleted,
          ]}
          onPress={() => handleDayPress(item.id)}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.dayNumber}>
              Week {item.weekNumber} · Day {item.dayNumber}
            </Text>
            <Text style={styles.dayName}>{item.name}</Text>
            <Text style={styles.exerciseCount}>
              {item.exerciseCount} exercises
            </Text>
          </View>
          <View style={styles.cardRight}>
            {item.completedAt !== null ? (
              <Text style={styles.completedBadge}>✓</Text>
            ) : (
              <Text style={styles.arrow}>→</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.planName}>{plan.templateName}</Text>
            <Text style={styles.subtitle}>
              {completedCount}/{totalDays} completed · {plan.durationWeeks} weeks
            </Text>
          </View>
          {plan.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'calendar' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'calendar' && styles.toggleTextActive,
              ]}
            >
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'list' && styles.toggleTextActive,
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
    backgroundColor: '#fff',
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
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#666',
  },
  activeBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
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
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  // Calendar view styles
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
    color: '#333',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    padding: 10,
    justifyContent: 'space-between',
  },
  dayCardCompleted: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  dayCardEmpty: {
    opacity: 0.5,
  },
  dayCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dayCardCheck: {
    fontSize: 20,
    color: '#4caf50',
    alignSelf: 'flex-end',
  },
  dayCardExercises: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'flex-end',
  },
  dayCardPending: {
    fontSize: 14,
    color: '#999',
    alignSelf: 'flex-end',
  },
  // List view styles
  list: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardCompleted: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  cardLeft: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#666',
  },
  cardRight: {
    marginLeft: 16,
  },
  arrow: {
    fontSize: 24,
    color: '#2196f3',
  },
  completedBadge: {
    fontSize: 28,
    color: '#4caf50',
  },
});
