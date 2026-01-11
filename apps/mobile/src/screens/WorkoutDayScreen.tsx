import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import {
  getWorkoutDay,
  updateSet,
  completeWorkoutDay,
  addSet,
  deleteSet,
  deleteExercise,
} from '../api/workouts';
import { UserWorkoutDay, UserExercise, ExerciseRole } from '../types';
import { useThemeStore } from '../store/themeStore';
import { useFeature } from '../store/featureStore';
import NumberPickerModal from '../components/ui/NumberPickerModal';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseInfoModal from '../components/ExerciseInfoModal';
import SupersetModal from '../components/SupersetModal';
import { IfFeatureEnabled } from '../components/PremiumGate';
import { getExercise } from '../api/exercises';
import { Exercise } from '../types';

type RouteParams = RouteProp<TemplatesStackParamList, 'WorkoutDay'>;

const getRoleBadgeInfo = (role?: ExerciseRole): { text: string; color: string } => {
  switch (role) {
    case 'MainMover':
      return { text: 'MAIN', color: '#4CAF50' }; // Green
    case 'Accessory':
      return { text: 'ACC', color: '#2196F3' }; // Blue
    case 'Finisher':
      return { text: 'FINISH', color: '#FF9800' }; // Orange
    default:
      return { text: '', color: '#888' };
  }
};

interface PickerState {
  visible: boolean;
  exerciseId: number;
  setId: number;
  field: 'actualReps' | 'weight';
  value: number;
  title: string;
}

export default function WorkoutDayScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { dayId } = route.params;
  const { colors } = useThemeStore();

  const [workoutDay, setWorkoutDay] = useState<UserWorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseInfoVisible, setExerciseInfoVisible] = useState(false);
  const [supersetModalVisible, setSupersetModalVisible] = useState(false);
  const supersetsFeature = useFeature('supersets');
  const [picker, setPicker] = useState<PickerState>({
    visible: false,
    exerciseId: 0,
    setId: 0,
    field: 'actualReps',
    value: 0,
    title: '',
  });

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

  const openPicker = (
    exerciseId: number,
    setId: number,
    field: 'actualReps' | 'weight',
    currentValue: number | null | undefined,
    exerciseName: string
  ) => {
    setPicker({
      visible: true,
      exerciseId,
      setId,
      field,
      value: currentValue ?? 0,
      title: field === 'actualReps' ? 'Reps' : 'Weight (kg)',
    });
  };

  const handlePickerConfirm = async (value: number) => {
    const { exerciseId, setId, field } = picker;
    setPicker((prev) => ({ ...prev, visible: false }));

    if (!workoutDay) return;

    try {
      await updateSet(setId, { [field]: value });

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
      Alert.alert('Error', 'Failed to update set');
    }
  };

  const handleToggleCompleted = async (exerciseId: number, setId: number, completed: boolean) => {
    if (!workoutDay) return;

    try {
      await updateSet(setId, { completed: !completed });

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
                return { ...set, completed: !completed };
              }),
            };
          }),
        };
      });
    } catch (err) {
      console.error('Error updating set:', err);
      Alert.alert('Error', 'Failed to update set');
    }
  };

  const handleAddSet = async (exercise: UserExercise) => {
    try {
      const newSet = await addSet(exercise.id);
      setWorkoutDay((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== exercise.id) return ex;
            return {
              ...ex,
              sets: [...ex.sets, newSet],
            };
          }),
        };
      });
    } catch (err) {
      console.error('Error adding set:', err);
      Alert.alert('Error', 'Failed to add set');
    }
  };

  const handleDeleteSet = async (exerciseId: number, setId: number, setsCount: number) => {
    if (setsCount <= 1) {
      Alert.alert('Cannot Delete', 'Each exercise must have at least one set');
      return;
    }

    Alert.alert('Delete Set', 'Are you sure you want to delete this set?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSet(setId);
            setWorkoutDay((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                exercises: prev.exercises.map((ex) => {
                  if (ex.id !== exerciseId) return ex;
                  const filteredSets = ex.sets
                    .filter((s) => s.id !== setId)
                    .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
                  return { ...ex, sets: filteredSets };
                }),
              };
            });
          } catch (err) {
            console.error('Error deleting set:', err);
            Alert.alert('Error', 'Failed to delete set');
          }
        },
      },
    ]);
  };

  const handleDeleteExercise = async (exercise: UserExercise) => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to remove "${exercise.exerciseName}" from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(exercise.id);
              setWorkoutDay((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  exercises: prev.exercises.filter((ex) => ex.id !== exercise.id),
                };
              });
            } catch (err) {
              console.error('Error deleting exercise:', err);
              Alert.alert('Error', 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  const handleExerciseAdded = (newExercise: UserExercise) => {
    setWorkoutDay((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: [...prev.exercises, newExercise],
      };
    });
    setExercisePickerVisible(false);
  };

  const handleShowExerciseInfo = async (exerciseId: number) => {
    try {
      const exercise = await getExercise(exerciseId);
      setSelectedExercise(exercise);
      setExerciseInfoVisible(true);
    } catch (err) {
      console.error('Error loading exercise details:', err);
      Alert.alert('Error', 'Failed to load exercise details');
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      await completeWorkoutDay(dayId);
      setWorkoutDay((prev) => (prev ? { ...prev, completedAt: new Date().toISOString() } : prev));
      navigation.getParent()?.navigate('Home');
    } catch (err) {
      console.error('Error completing workout:', err);
      Alert.alert('Error', 'Failed to complete workout');
    }
  };

  const allSetsCompleted =
    workoutDay?.exercises.every((ex) => ex.sets.every((set) => set.completed)) ?? false;

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
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || 'Workout not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadWorkoutDay}
          >
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
        <Text style={[styles.weekInfo, { color: colors.textSecondary }]}>
          Week {workoutDay.weekNumber}
        </Text>
        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
            <Text style={[styles.completedText, { color: colors.buttonText }]}>Completed</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {(() => {
          // Group exercises by superset, keeping non-superset exercises separate
          const renderedGroups: Set<number> = new Set();
          const elements: React.ReactNode[] = [];
          let exerciseCounter = 0;

          workoutDay.exercises.forEach((exercise) => {
            // If already rendered as part of a superset, skip
            if (exercise.supersetGroupId && renderedGroups.has(exercise.supersetGroupId)) {
              return;
            }

            if (exercise.supersetGroupId) {
              // This is part of a superset - render the whole group
              renderedGroups.add(exercise.supersetGroupId);
              const supersetExercises = workoutDay.exercises
                .filter((e) => e.supersetGroupId === exercise.supersetGroupId)
                .sort((a, b) => (a.supersetOrder || 0) - (b.supersetOrder || 0));

              const groupLabel = supersetExercises.length >= 3 ? 'GIANT SET' : 'SUPERSET';
              elements.push(
                <View key={`superset-${exercise.supersetGroupId}`} style={[styles.supersetContainer, { borderColor: colors.success, backgroundColor: colors.successLight }]}>
                  <View style={styles.supersetHeader}>
                    <Text style={[styles.supersetLabel, { color: colors.success }]}>{groupLabel}</Text>
                  </View>
                  {supersetExercises.map((supersetExercise) => {
                    exerciseCounter++;
                    const roleBadge = getRoleBadgeInfo(supersetExercise.exerciseRole);
                    return renderExerciseCard(supersetExercise, exerciseCounter - 1, roleBadge, true);
                  })}
                </View>
              );
            } else {
              // Regular exercise - render normally
              exerciseCounter++;
              const roleBadge = getRoleBadgeInfo(exercise.exerciseRole);
              elements.push(renderExerciseCard(exercise, exerciseCounter - 1, roleBadge, false));
            }
          });

          return elements;
        })()}

        {!isCompleted && (
          <>
            <TouchableOpacity
              style={[styles.addExerciseButton, { borderColor: colors.primary }]}
              onPress={() => setExercisePickerVisible(true)}
            >
              <Text style={[styles.addExerciseText, { color: colors.primary }]}>+ Add Exercise</Text>
            </TouchableOpacity>

            <IfFeatureEnabled feature="supersets">
              <TouchableOpacity
                style={[styles.supersetButton, { borderColor: colors.success, backgroundColor: colors.successLight }]}
                onPress={() => setSupersetModalVisible(true)}
              >
                <Text style={[styles.supersetButtonText, { color: colors.success }]}>Create Superset</Text>
              </TouchableOpacity>
            </IfFeatureEnabled>
          </>
        )}
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
            <Text style={[styles.completeButtonText, { color: colors.buttonText }]}>
              Complete Workout
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <NumberPickerModal
        visible={picker.visible}
        title={picker.title}
        value={picker.value}
        min={0}
        max={picker.field === 'weight' ? 500 : 100}
        step={picker.field === 'weight' ? 2.5 : 1}
        decimals={picker.field === 'weight'}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPicker((prev) => ({ ...prev, visible: false }))}
      />

      <ExercisePicker
        visible={exercisePickerVisible}
        dayId={dayId}
        onExerciseAdded={handleExerciseAdded}
        onClose={() => setExercisePickerVisible(false)}
      />

      <ExerciseInfoModal
        visible={exerciseInfoVisible}
        exercise={selectedExercise}
        onClose={() => setExerciseInfoVisible(false)}
      />

      {supersetsFeature.isAvailable && workoutDay && (
        <SupersetModal
          visible={supersetModalVisible}
          dayId={dayId}
          exercises={workoutDay.exercises}
          onClose={() => setSupersetModalVisible(false)}
          onSupersetCreated={() => {
            loadWorkoutDay();
          }}
        />
      )}
    </SafeAreaView>
  );

  function renderExerciseCard(exercise: UserExercise, exerciseIndex: number, roleBadge: { text: string; color: string }, inSuperset: boolean) {
    return (
          <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: inSuperset ? 'transparent' : colors.surface }]}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseNameContainer}>
                <View style={styles.exerciseNameRow}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exerciseIndex + 1}. {exercise.exerciseName}
                  </Text>
                  {exercise.primaryMuscleGroup && (
                    <Text style={[styles.muscleTag, { color: colors.textSecondary }]}>
                      ({exercise.primaryMuscleGroup})
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.infoButton, { borderColor: colors.primary }]}
                    onPress={() => handleShowExerciseInfo(exercise.exerciseId)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.infoIcon, { color: colors.primary }]}>i</Text>
                  </TouchableOpacity>
                </View>
                {roleBadge.text && (
                  <View style={[styles.roleBadge, { backgroundColor: roleBadge.color }]}>
                    <Text style={styles.roleBadgeText}>{roleBadge.text}</Text>
                  </View>
                )}
              </View>
              {!isCompleted && (
                <View style={styles.exerciseActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                    onPress={() => handleAddSet(exercise)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
                    onPress={() => handleDeleteExercise(exercise)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.setsContainer}>
              <View style={[styles.setHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, styles.setCol, { color: colors.textMuted }]}>
                  SET
                </Text>
                <Text style={[styles.headerCell, styles.targetCol, { color: colors.textMuted }]}>
                  TARGET
                </Text>
                <Text style={[styles.headerCell, styles.repsCol, { color: colors.textMuted }]}>
                  REPS
                </Text>
                <Text style={[styles.headerCell, styles.weightCol, { color: colors.textMuted }]}>
                  KG
                </Text>
                <View style={styles.checkCol} />
                {!isCompleted && <View style={styles.deleteCol} />}
              </View>

              {exercise.sets.map((set) => (
                <View
                  key={set.id}
                  style={[
                    styles.setRow,
                    set.completed && { backgroundColor: colors.successLight },
                  ]}
                >
                  <Text style={[styles.cell, styles.setCol, { color: colors.text }]}>
                    {set.setNumber}
                  </Text>
                  <Text style={[styles.cell, styles.targetCol, { color: colors.textSecondary }]}>
                    {set.targetReps}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.valueCell,
                      styles.repsCol,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    ]}
                    onPress={() =>
                      openPicker(exercise.id, set.id, 'actualReps', set.actualReps, exercise.exerciseName)
                    }
                    disabled={isCompleted}
                  >
                    <Text
                      style={[
                        styles.valueText,
                        { color: set.actualReps ? colors.text : colors.textMuted },
                      ]}
                    >
                      {set.actualReps ?? '-'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.valueCell,
                      styles.weightCol,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    ]}
                    onPress={() =>
                      openPicker(exercise.id, set.id, 'weight', set.weight, exercise.exerciseName)
                    }
                    disabled={isCompleted}
                  >
                    <Text
                      style={[
                        styles.valueText,
                        { color: set.weight ? colors.text : colors.textMuted },
                      ]}
                    >
                      {set.weight ?? '-'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      styles.checkCol,
                      { borderColor: colors.border },
                      set.completed && { backgroundColor: colors.success, borderColor: colors.success },
                    ]}
                    onPress={() => handleToggleCompleted(exercise.id, set.id, set.completed)}
                    disabled={isCompleted}
                  >
                    {set.completed && (
                      <Text style={[styles.checkmark, { color: colors.buttonText }]}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={styles.deleteCol}
                      onPress={() => handleDeleteSet(exercise.id, set.id, exercise.sets.length)}
                    >
                      <Text style={[styles.deleteIcon, { color: colors.textMuted }]}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
    );
  }
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
    padding: 16,
    borderBottomWidth: 1,
  },
  dayName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  weekInfo: {
    fontSize: 14,
    marginTop: 2,
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
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  exerciseCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  muscleTag: {
    fontSize: 12,
    marginLeft: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  infoIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  setsContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 1,
  },
  cell: {
    fontSize: 15,
    textAlign: 'center',
  },
  setCol: {
    width: 32,
  },
  targetCol: {
    width: 46,
  },
  repsCol: {
    width: 50,
    marginHorizontal: 3,
  },
  weightCol: {
    width: 54,
    marginHorizontal: 3,
  },
  checkCol: {
    width: 32,
  },
  deleteCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCell: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteIcon: {
    fontSize: 14,
  },
  addExerciseButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  supersetButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  supersetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  completeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  supersetContainer: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  supersetHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  supersetLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
