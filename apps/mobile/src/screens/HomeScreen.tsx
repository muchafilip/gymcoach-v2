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
import { HomeData } from '../types';
import { MOCK_USER_ID } from '../utils/constants';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
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
      const homeData = await getHomeData(MOCK_USER_ID);
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back!</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {formatWeight(data?.totalWeightLifted || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Lifted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.workoutsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
        </View>

        {/* Next Workout */}
        {data?.nextWorkout ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Workout</Text>
            <TouchableOpacity
              style={styles.nextWorkoutCard}
              onPress={handleStartWorkout}
            >
              <View style={styles.nextWorkoutInfo}>
                <Text style={styles.nextWorkoutName}>{data.nextWorkout.dayName}</Text>
                <Text style={styles.nextWorkoutPlan}>
                  {data.nextWorkout.planName} - Week {data.nextWorkout.weekNumber}
                </Text>
              </View>
              <View style={styles.startButton}>
                <Text style={styles.startButtonText}>Start</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Started</Text>
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate('Templates')}
            >
              <Text style={styles.emptyCardText}>
                No active workout plan. Tap to browse templates!
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity */}
        {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {data.recentWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                style={styles.recentCard}
                onPress={() => handleViewWorkout(workout.id)}
              >
                <View>
                  <Text style={styles.recentName}>{workout.name}</Text>
                  <Text style={styles.recentMeta}>
                    {workout.exerciseCount} exercises
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentDate}>
                    {formatDate(workout.completedAt)}
                  </Text>
                  <Text style={styles.recentArrow}>›</Text>
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
    color: '#333',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  nextWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  nextWorkoutInfo: {
    flex: 1,
  },
  nextWorkoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  nextWorkoutPlan: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  recentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  recentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentDate: {
    fontSize: 12,
    color: '#999',
  },
  recentArrow: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
});
