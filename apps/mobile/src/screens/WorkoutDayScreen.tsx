import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { getWorkoutDay, updateSet, completeWorkoutDay } from '../api/workouts';
import { UserWorkoutDay, UserExercise, ExerciseSet } from '../types';

type RouteParams = RouteProp<TemplatesStackParamList, 'WorkoutDay'>;

export default function WorkoutDayScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { dayId } = route.params;

  const [workoutDay, setWorkoutDay] = useState<UserWorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutDay();
    }, [dayId])
  );

  const loadWorkoutDay = async () => {
    try {
      setError(null);
      const data = await getWorkoutDay(dayId);
      setWorkoutDay(data);
    } catch (err) {
      console.error('Error loading workout day:', err);
      setError('Failed to load workout');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutDay();
  };

  const handleUpdateSet = async (
    exerciseId: number,
    setId: number,
    field: 'actualReps' | 'weight' | 'completed',
    value: number | boolean
  ) => {
    if (!workoutDay) return;

    try {
      // Update API
      await updateSet(setId, { [field]: value });

      // Update local state
      setWorkoutDay((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map((set) => {
                if (set.id !== setId) return set;
                return { ...set, [field]: value };
              }),
            };
          }),
        };
      });
    } catch (err) {
      console.error('Error updating set:', err);
      alert('Failed to update set');
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      await completeWorkoutDay(dayId);

      // Update local state
      setWorkoutDay((prev) => prev ? { ...prev, completedAt: new Date().toISOString() } : prev);

      // Navigate to Home tab
      navigation.getParent()?.navigate('Home');
    } catch (err) {
      console.error('Error completing workout:', err);
      alert('Failed to complete workout');
    }
  };

  const allSetsCompleted = workoutDay?.exercises.every((ex) =>
    ex.sets.every((set) => set.completed)
  ) ?? false;

  const isCompleted = !!workoutDay?.completedAt;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !workoutDay) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Workout not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWorkoutDay}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dayName}>{workoutDay.name}</Text>
        <Text style={styles.weekInfo}>Week {workoutDay.weekNumber}</Text>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {workoutDay.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>
              {exerciseIndex + 1}. {exercise.exerciseName}
            </Text>

            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Target</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Done</Text>
            </View>

            {exercise.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{set.setNumber}</Text>
                <Text style={styles.targetReps}>{set.targetReps}</Text>

                <TextInput
                  style={styles.input}
                  value={set.actualReps?.toString() || ''}
                  onChangeText={(value) => {
                    const num = parseInt(value) || 0;
                    handleUpdateSet(exercise.id, set.id, 'actualReps', num);
                  }}
                  keyboardType="numeric"
                  placeholder="-"
                  editable={!isCompleted}
                />

                <TextInput
                  style={styles.input}
                  value={set.weight?.toString() || ''}
                  onChangeText={(value) => {
                    const num = parseFloat(value) || 0;
                    handleUpdateSet(exercise.id, set.id, 'weight', num);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="-"
                  editable={!isCompleted}
                />

                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    set.completed && styles.checkboxChecked,
                  ]}
                  onPress={() =>
                    handleUpdateSet(exercise.id, set.id, 'completed', !set.completed)
                  }
                  disabled={isCompleted}
                >
                  {set.completed && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {!isCompleted && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              !allSetsCompleted && styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteWorkout}
            disabled={!allSetsCompleted}
          >
            <Text style={styles.completeButtonText}>Complete Workout</Text>
          </TouchableOpacity>
        </View>
      )}
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
  dayName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  weekInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  completedBadge: {
    marginTop: 8,
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  completedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 8,
  },
  setHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    width: 50,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  setNumber: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
  },
  targetReps: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  input: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  checkbox: {
    width: 50,
    height: 40,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completeButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
