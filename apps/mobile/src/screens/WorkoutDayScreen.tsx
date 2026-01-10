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
import { useThemeStore } from '../store/themeStore';

type RouteParams = RouteProp<TemplatesStackParamList, 'WorkoutDay'>;

export default function WorkoutDayScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { dayId } = route.params;
  const { colors } = useThemeStore();

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" style={styles.loader} color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !workoutDay) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || 'Workout not found'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadWorkoutDay}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.dayName, { color: colors.text }]}>{workoutDay.name}</Text>
        <Text style={[styles.weekInfo, { color: colors.textSecondary }]}>Week {workoutDay.weekNumber}</Text>
        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
            <Text style={[styles.completedText, { color: colors.buttonText }]}>Completed</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {workoutDay.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>
              {exerciseIndex + 1}. {exercise.exerciseName}
            </Text>

            <View style={[styles.setHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.setHeaderText, { color: colors.textSecondary }]}>Set</Text>
              <Text style={[styles.setHeaderText, { color: colors.textSecondary }]}>Target</Text>
              <Text style={[styles.setHeaderText, { color: colors.textSecondary }]}>Reps</Text>
              <Text style={[styles.setHeaderText, { color: colors.textSecondary }]}>Weight</Text>
              <Text style={[styles.setHeaderText, { color: colors.textSecondary }]}>Done</Text>
            </View>

            {exercise.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setNumber, { color: colors.text }]}>{set.setNumber}</Text>
                <Text style={[styles.targetReps, { color: colors.textSecondary }]}>{set.targetReps}</Text>

                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
                  value={set.actualReps?.toString() || ''}
                  onChangeText={(value) => {
                    const num = parseInt(value) || 0;
                    handleUpdateSet(exercise.id, set.id, 'actualReps', num);
                  }}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                  editable={!isCompleted}
                />

                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.text }]}
                  value={set.weight?.toString() || ''}
                  onChangeText={(value) => {
                    const num = parseFloat(value) || 0;
                    handleUpdateSet(exercise.id, set.id, 'weight', num);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                  editable={!isCompleted}
                />

                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    set.completed && { backgroundColor: colors.success, borderColor: colors.success },
                  ]}
                  onPress={() =>
                    handleUpdateSet(exercise.id, set.id, 'completed', !set.completed)
                  }
                  disabled={isCompleted}
                >
                  {set.completed && <Text style={[styles.checkmark, { color: colors.buttonText }]}>✓</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {!isCompleted && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              { backgroundColor: colors.success },
              !allSetsCompleted && styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteWorkout}
            disabled={!allSetsCompleted}
          >
            <Text style={[styles.completeButtonText, { color: colors.buttonText }]}>Complete Workout</Text>
          </TouchableOpacity>
        </View>
      )}
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
  dayName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  weekInfo: {
    fontSize: 14,
    marginTop: 4,
  },
  completedBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseCard: {
    marginBottom: 24,
    padding: 16,
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
    marginBottom: 8,
  },
  setHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  input: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  checkbox: {
    width: 50,
    height: 40,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {},
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  completeButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
