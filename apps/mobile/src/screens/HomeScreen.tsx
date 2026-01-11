import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getHomeData } from '../api/workouts';
import { useThemeStore } from '../store/themeStore';
import { HomeData } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setError(null);
      const homeData = await getHomeData();
      setData(homeData);
    } catch (err) {
      console.error('Error loading home data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartWorkout = () => {
    if (data?.nextWorkout) {
      navigation.navigate('Templates', {
        screen: 'WorkoutDay',
        params: { dayId: data.nextWorkout.dayId },
      });
    }
  };

  const handleViewWorkout = (dayId: number) => {
    navigation.navigate('Templates', {
      screen: 'WorkoutDay',
      params: { dayId },
    });
  };

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}t`;
    }
    return `${Math.round(weight)}kg`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>Welcome back!</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatWeight(data?.totalWeightLifted || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Lifted</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{data?.workoutsCompleted || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
          </View>
        </View>

        {/* Personal Bests */}
        {data?.personalRecords && data.personalRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Bests</Text>
            <View style={[styles.prsContainer, { backgroundColor: colors.surface }]}>
              {data.personalRecords.map((pr, index) => (
                <View
                  key={pr.exerciseId}
                  style={[
                    styles.prRow,
                    index < data.personalRecords.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.prExercise, { color: colors.text }]} numberOfLines={1}>
                    {pr.exerciseName}
                  </Text>
                  <Text style={[styles.prValue, { color: colors.primary }]}>
                    {pr.bestSetReps}×{pr.bestSetWeight}kg
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Next Workout */}
        {data?.nextWorkout ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Next Workout</Text>
            <TouchableOpacity
              style={[styles.nextWorkoutCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}
              onPress={handleStartWorkout}
            >
              <View style={styles.nextWorkoutInfo}>
                <Text style={[styles.nextWorkoutName, { color: colors.text }]}>{data.nextWorkout.dayName}</Text>
                <Text style={[styles.nextWorkoutPlan, { color: colors.textSecondary }]}>
                  {data.nextWorkout.planName} - Week {data.nextWorkout.weekNumber}
                </Text>
              </View>
              <View style={[styles.startButton, { backgroundColor: colors.success }]}>
                <Text style={[styles.startButtonText, { color: colors.buttonText }]}>Start</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Get Started</Text>
            <TouchableOpacity
              style={[styles.emptyCard, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Templates')}
            >
              <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
                No active workout plan. Tap to browse templates!
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity */}
        {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            {data.recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={[styles.recentCard, { backgroundColor: colors.surface }]}
                onPress={() => handleViewWorkout(workout.id)}
              >
                <View>
                  <Text style={[styles.recentName, { color: colors.text }]}>{workout.name}</Text>
                  <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                    {workout.exerciseCount} exercises
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={[styles.recentDate, { color: colors.textMuted }]}>
                    {formatDate(workout.completedAt)}
                  </Text>
                  <Text style={[styles.recentArrow, { color: colors.textMuted }]}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    margin: 8,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  nextWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  nextWorkoutInfo: {
    flex: 1,
  },
  nextWorkoutName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextWorkoutPlan: {
    fontSize: 14,
    marginTop: 4,
  },
  startButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  startButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    textAlign: 'center',
  },
  recentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentDate: {
    fontSize: 12,
  },
  recentArrow: {
    fontSize: 20,
    marginLeft: 8,
  },
  prsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  prExercise: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  prValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
