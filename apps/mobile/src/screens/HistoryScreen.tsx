import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getWorkoutHistory, WorkoutHistory } from '../api/workouts';
import { getLocalWorkoutHistory } from '../db/localData';
import { isOnline } from '../utils/network';
import { useThemeStore } from '../store/themeStore';

type RootNavigation = {
  navigate: (screen: string, params?: any) => void;
};

// Simplified type for list display (exercises array not needed)
type WorkoutHistoryItem = Pick<WorkoutHistory, 'id' | 'dayName' | 'completedAt' | 'exerciseCount' | 'totalSets'>;

export default function HistoryScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { colors } = useThemeStore();
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      setError(null);

      // 1. Try local DB first (instant)
      try {
        const localData = await getLocalWorkoutHistory();
        if (localData && localData.length > 0) {
          setWorkouts(localData);
          setLoading(false); // Show immediately
        }
      } catch (localErr) {
        console.log('No local history data');
      }

      // 2. Fetch from API in background (if online)
      if (isOnline()) {
        try {
          const response = await getWorkoutHistory(1, 20);
          setWorkouts(response.items);
        } catch (apiErr) {
          console.log('API fetch failed, using local data');
          if (workouts.length === 0) {
            setError('Failed to load history');
          }
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const handleViewWorkout = (dayId: number) => {
    navigation.navigate('Templates', {
      screen: 'WorkoutDay',
      params: { dayId },
    });
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
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadHistory}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (workouts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No completed workouts yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Complete your first workout to see it here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}
            onPress={() => handleViewWorkout(item.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.dayName, { color: colors.text }]}>{item.dayName}</Text>
              <View style={styles.dateRow}>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(item.completedAt)}</Text>
                <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                {item.exerciseCount} exercises
              </Text>
              <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.stat, { color: colors.textSecondary }]}>
                {item.totalSets} sets completed
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
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
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 20,
    marginLeft: 8,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    fontSize: 14,
  },
  separator: {
    marginHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
