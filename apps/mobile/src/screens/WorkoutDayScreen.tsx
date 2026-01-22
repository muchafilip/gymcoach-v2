import React, { useState, useCallback, useRef } from 'react';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getWorkoutDay,
  updateSet,
  completeWorkoutDay,
  addSet,
  deleteSet,
  deleteExercise,
  startWorkoutDay,
  getProgression,
} from '../api/workouts';
import { getLocalWorkoutDay, updateSetLocally, completeWorkoutDayLocally } from '../db/localData';
import { syncUserData } from '../db/sync';
import { isOnline } from '../utils/network';
import { UserWorkoutDay, UserExercise, ExerciseRole, SetTarget } from '../types';
import { useThemeStore } from '../store/themeStore';
import { useFeature } from '../store/featureStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useWorkoutTimerStore } from '../store/workoutTimerStore';
import { useRestTimerStore } from '../store/restTimerStore';
import { useProgressStore } from '../store/progressStore';
import LevelUpModal from '../components/LevelUpModal';
import NumberPickerModal from '../components/ui/NumberPickerModal';
import ExercisePicker from '../components/ExercisePicker';
import ExerciseInfoModal from '../components/ExerciseInfoModal';
import SupersetModal from '../components/SupersetModal';
import WorkoutTimer from '../components/WorkoutTimer';
import RestTimer from '../components/RestTimer';
import { IfFeatureEnabled } from '../components/PremiumGate';
import { getExercise } from '../api/exercises';
import { Exercise } from '../types';
import { TemplatesStackParamList } from '../navigation/AppNavigator';

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
  const insets = useSafeAreaInsets();
  const { dayId } = route.params;
  const { colors, isDarkMode } = useThemeStore();
  const { weightUnit, displayWeight, toKg, compactMode } = usePreferencesStore();
  const { stopTimer } = useWorkoutTimerStore();
  const { startTimer: startRestTimer, autoStart: restTimerAutoStart } = useRestTimerStore();
  const { updateFromWorkoutComplete } = useProgressStore();

  const [workoutDay, setWorkoutDay] = useState<UserWorkoutDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [swapExerciseId, setSwapExerciseId] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [exerciseInfoVisible, setExerciseInfoVisible] = useState(false);
  const [supersetModalVisible, setSupersetModalVisible] = useState(false);
  const supersetsFeature = useFeature('supersets');
  const progressionFeature = useFeature('smartProgression');
  const [progressionData, setProgressionData] = useState<Record<number, SetTarget>>({});
  const [picker, setPicker] = useState<PickerState>({
    visible: false,
    exerciseId: 0,
    setId: 0,
    field: 'actualReps',
    value: 0,
    title: '',
  });

  // Ref map for inline input focus management: key = "exerciseId-setId-field"
  const inputRefs = useRef<Map<string, TextInput>>(new Map());

  const getInputKey = (exerciseId: number, setId: number, field: 'reps' | 'weight') =>
    `${exerciseId}-${setId}-${field}`;

  const focusNextInput = (currentExerciseId: number, currentSetId: number, currentField: 'reps' | 'weight') => {
    if (!workoutDay) return;

    // Find all sets across all exercises in order
    const allInputs: { exerciseId: number; setId: number; field: 'reps' | 'weight' }[] = [];
    workoutDay.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        allInputs.push({ exerciseId: ex.id, setId: set.id, field: 'reps' });
        allInputs.push({ exerciseId: ex.id, setId: set.id, field: 'weight' });
      });
    });

    // Find current index
    const currentIndex = allInputs.findIndex(
      (input) =>
        input.exerciseId === currentExerciseId &&
        input.setId === currentSetId &&
        input.field === currentField
    );

    // Focus next input if exists
    if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
      const next = allInputs[currentIndex + 1];
      const nextKey = getInputKey(next.exerciseId, next.setId, next.field);
      const nextInput = inputRefs.current.get(nextKey);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const isLastInput = (exerciseId: number, setId: number, field: 'reps' | 'weight') => {
    if (!workoutDay) return true;
    const lastExercise = workoutDay.exercises[workoutDay.exercises.length - 1];
    if (!lastExercise) return true;
    const lastSet = lastExercise.sets[lastExercise.sets.length - 1];
    if (!lastSet) return true;
    return exerciseId === lastExercise.id && setId === lastSet.id && field === 'weight';
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkoutDay();
    }, [dayId])
  );

  const loadWorkoutDay = async () => {
    try {
      setError(null);

      // 1. Try local DB first (instant)
      try {
        const localData = await getLocalWorkoutDay(dayId);
        if (localData && localData.exercises.length > 0) {
          setWorkoutDay(localData);
          setLoading(false); // Show immediately
        }
      } catch (localErr) {
        console.log('No local data, fetching from API');
      }

      // 2. Fetch from API in background (if online)
      if (isOnline()) {
        try {
          const data = await getWorkoutDay(dayId);
          setWorkoutDay(data);

          // Fetch progression data for each exercise if feature is available
          if (progressionFeature.isAvailable && data.exercises) {
            const progressionPromises = data.exercises.map(async (ex) => {
              const progression = await getProgression(ex.exerciseId);
              return { exerciseId: ex.exerciseId, progression };
            });

            const results = await Promise.all(progressionPromises);
            const progressionMap: Record<number, SetTarget> = {};
            results.forEach(({ exerciseId, progression }) => {
              if (progression) {
                progressionMap[exerciseId] = progression;
              }
            });
            setProgressionData(progressionMap);
          }
        } catch (apiErr) {
          console.log('API fetch failed, using local data');
          // If we already have local data, don't show error
          if (!workoutDay) {
            setError('Failed to load workout');
          }
        }
      }
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
    const displayValue = field === 'weight' && currentValue
      ? displayWeight(currentValue)
      : currentValue ?? 0;

    setPicker({
      visible: true,
      exerciseId,
      setId,
      field,
      value: displayValue,
      title: field === 'actualReps' ? 'Reps' : `Weight (${weightUnit})`,
    });
  };

  const handlePickerConfirm = async (value: number) => {
    const { exerciseId, setId, field } = picker;
    setPicker((prev) => ({ ...prev, visible: false }));

    if (!workoutDay) return;

    // Convert weight to kg for storage if needed
    const valueToSave = field === 'weight' ? toKg(value) : value;

    try {
      await updateSet(setId, { [field]: valueToSave });

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
                return { ...set, [field]: valueToSave };
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

  const handleInlineInputChange = async (
    exerciseId: number,
    setId: number,
    field: 'actualReps' | 'weight',
    text: string
  ) => {
    if (!workoutDay) return;

    // Parse the input - allow empty string (will save as 0 or null)
    const parsedValue = text === '' ? 0 : parseFloat(text);

    // Validate: only allow non-negative numbers
    if (isNaN(parsedValue) || parsedValue < 0) return;

    // For reps, ensure whole numbers and reasonable range (0-999)
    if (field === 'actualReps') {
      const repsValue = Math.floor(parsedValue);
      if (repsValue > 999) return;

      // Update local state immediately for responsive UI
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
                return { ...set, actualReps: repsValue || undefined };
              }),
            };
          }),
        };
      });
    }

    // For weight, allow decimals and convert to kg before saving
    if (field === 'weight') {
      if (parsedValue > 9999) return; // Max 9999 lbs/kg

      const weightInKg = toKg(parsedValue);

      // Update local state immediately
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
                return { ...set, weight: weightInKg || undefined };
              }),
            };
          }),
        };
      });
    }
  };

  const handleInlineInputBlur = async (
    setId: number,
    field: 'actualReps' | 'weight',
    kgValue: number | null | undefined
  ) => {
    // Save to local DB (instant) - will sync on workout complete
    const updates = field === 'actualReps'
      ? { actualReps: kgValue || 0 }
      : { weight: kgValue || 0 };

    updateSetLocally(setId, updates).catch((err) => {
      console.error('Error saving to local DB:', err);
    });
  };

  const handleToggleCompleted = async (exerciseId: number, setId: number, completed: boolean) => {
    if (!workoutDay) return;

    // 1. Update UI immediately (instant feedback)
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

    // Start rest timer when marking a set as complete (not uncompleting)
    if (!completed && restTimerAutoStart) {
      startRestTimer();
    }

    // 2. Update local DB (async, don't wait) - will sync on workout complete
    updateSetLocally(setId, { completed: !completed }).catch((err) => {
      console.error('Error saving to local DB:', err);
    });
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

  const handleExerciseSwapped = async () => {
    // Reload the workout day to get the updated exercise with sets
    setSwapExerciseId(null);
    setExercisePickerVisible(false);
    await loadWorkoutDay();
  };

  const handleSwapExercise = (exerciseId: number) => {
    setSwapExerciseId(exerciseId);
    setExercisePickerVisible(true);
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

  const handleTimerStart = async () => {
    try {
      await startWorkoutDay(dayId);
    } catch (err) {
      console.error('Error starting workout:', err);
    }
  };

  const handleCompleteWorkout = async () => {
    const durationSeconds = stopTimer();

    // 1. Update UI immediately
    setWorkoutDay((prev) => (prev ? { ...prev, completedAt: new Date().toISOString() } : prev));

    // 2. Save to local DB
    completeWorkoutDayLocally(dayId, durationSeconds).catch((err) => {
      console.error('Error saving completion to local DB:', err);
    });

    // 3. Navigate immediately (don't wait for sync)
    navigation.getParent()?.navigate('Home');

    // 4. Sync all pending changes in background
    if (isOnline()) {
      try {
        // First sync all queued set updates
        await syncUserData();
        // Then complete on server to get XP
        const xpResult = await completeWorkoutDay(dayId, durationSeconds);
        if (xpResult) {
          updateFromWorkoutComplete(xpResult);
        }
      } catch (err) {
        console.log('Background sync failed, will retry later:', err);
      }
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
      <View style={[styles.header, compactMode && styles.headerCompact, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.dayName, compactMode && styles.dayNameCompact, { color: colors.text }]}>{workoutDay.name}</Text>
          <Text style={[styles.weekInfo, compactMode && styles.weekInfoCompact, { color: colors.textSecondary }]}>
            Week {workoutDay.weekNumber}
          </Text>
        </View>
        {isCompleted ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
            <Text style={[styles.completedText, { color: colors.buttonText }]}>Done</Text>
          </View>
        ) : (
          <WorkoutTimer dayId={dayId} onStart={handleTimerStart} inline />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, compactMode && styles.contentContainerCompact]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          keyboardShouldPersistTaps="handled"
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
      </KeyboardAvoidingView>

      {!isCompleted && (
        <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: 28 }]}>
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
        onClose={() => {
          setExercisePickerVisible(false);
          setSwapExerciseId(null);
        }}
        swapExerciseId={swapExerciseId ?? undefined}
        onExerciseSwapped={handleExerciseSwapped}
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

      <RestTimer />
      <LevelUpModal />
    </SafeAreaView>
  );

  function renderExerciseCard(exercise: UserExercise, exerciseIndex: number, roleBadge: { text: string; color: string }, inSuperset: boolean) {
    return (
          <View key={exercise.id} style={[styles.exerciseCard, compactMode && styles.exerciseCardCompact, { backgroundColor: inSuperset ? 'transparent' : colors.surface }]}>
            <View style={[styles.exerciseHeader, compactMode && styles.exerciseHeaderCompact]}>
              <View style={styles.exerciseNameContainer}>
                <View style={styles.exerciseNameRow}>
                  <Text style={[styles.exerciseName, compactMode && styles.exerciseNameCompact, { color: colors.text }]}>
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
                {progressionFeature.isAvailable && progressionData[exercise.exerciseId] && (
                  <View style={[styles.progressionHint, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.progressionText, { color: colors.primary }]}>
                      {progressionData[exercise.exerciseId].weight > 0
                        ? `Try ${displayWeight(progressionData[exercise.exerciseId].weight)} × ${progressionData[exercise.exerciseId].targetReps}`
                        : progressionData[exercise.exerciseId].suggestion}
                    </Text>
                  </View>
                )}
              </View>
              {!isCompleted && (
                <View style={styles.exerciseActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => handleSwapExercise(exercise.id)}
                  >
                    <Text style={[styles.swapIcon, { color: colors.textSecondary }]}>↻</Text>
                  </TouchableOpacity>
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
              <View style={[styles.setHeader, compactMode && styles.setHeaderCompact, { borderBottomColor: colors.border }]}>
                <Text style={[styles.headerCell, styles.setCol, compactMode && styles.headerCellCompact, { color: colors.textMuted }]}>
                  SET
                </Text>
                <Text style={[styles.headerCell, styles.targetCol, compactMode && styles.headerCellCompact, { color: colors.textMuted }]}>
                  TARGET
                </Text>
                <Text style={[styles.headerCell, styles.repsCol, compactMode && styles.headerCellCompact, { color: colors.textMuted }]}>
                  REPS
                </Text>
                <Text style={[styles.headerCell, styles.weightCol, compactMode && styles.headerCellCompact, { color: colors.textMuted }]}>
                  {weightUnit.toUpperCase()}
                </Text>
                <View style={[styles.checkCol, compactMode && styles.checkColCompact]} />
                {!isCompleted && <View style={styles.deleteCol} />}
              </View>

              {exercise.sets.map((set) => (
                <View
                  key={set.id}
                  style={[
                    styles.setRow,
                    compactMode && styles.setRowCompact,
                    set.completed && { backgroundColor: colors.successLight },
                  ]}
                >
                  <Text style={[styles.cell, styles.setCol, { color: colors.text }, compactMode && styles.cellCompact]}>
                    {set.setNumber}
                  </Text>
                  <Text style={[styles.cell, styles.targetCol, { color: colors.textSecondary }, compactMode && styles.cellCompact]}>
                    {set.targetReps}
                  </Text>

                  <TextInput
                    ref={(ref) => {
                      if (ref) {
                        inputRefs.current.set(getInputKey(exercise.id, set.id, 'reps'), ref);
                      }
                    }}
                    style={[
                      styles.valueCell,
                      styles.repsCol,
                      styles.textInput,
                      compactMode && styles.valueCellCompact,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
                    ]}
                    value={set.actualReps?.toString() ?? ''}
                    placeholder="-"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    keyboardAppearance={isDarkMode ? 'dark' : 'light'}
                    returnKeyType={isLastInput(exercise.id, set.id, 'reps') ? 'done' : 'next'}
                    blurOnSubmit={false}
                    onChangeText={(text) => handleInlineInputChange(exercise.id, set.id, 'actualReps', text)}
                    onBlur={() => handleInlineInputBlur(set.id, 'actualReps', set.actualReps)}
                    onSubmitEditing={() => focusNextInput(exercise.id, set.id, 'reps')}
                    editable={!isCompleted}
                    selectTextOnFocus
                  />

                  <TextInput
                    ref={(ref) => {
                      if (ref) {
                        inputRefs.current.set(getInputKey(exercise.id, set.id, 'weight'), ref);
                      }
                    }}
                    style={[
                      styles.valueCell,
                      styles.weightCol,
                      styles.textInput,
                      compactMode && styles.valueCellCompact,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text },
                    ]}
                    value={set.weight ? displayWeight(set.weight).toString() : ''}
                    placeholder="-"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    keyboardAppearance={isDarkMode ? 'dark' : 'light'}
                    returnKeyType={isLastInput(exercise.id, set.id, 'weight') ? 'done' : 'next'}
                    blurOnSubmit={false}
                    onChangeText={(text) => handleInlineInputChange(exercise.id, set.id, 'weight', text)}
                    onBlur={() => handleInlineInputBlur(set.id, 'weight', set.weight)}
                    onSubmitEditing={() => focusNextInput(exercise.id, set.id, 'weight')}
                    editable={!isCompleted}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      styles.checkCol,
                      compactMode && styles.checkboxCompact,
                      { borderColor: colors.border },
                      set.completed && { backgroundColor: colors.success, borderColor: colors.success },
                    ]}
                    onPress={() => handleToggleCompleted(exercise.id, set.id, set.completed)}
                    disabled={isCompleted}
                  >
                    {set.completed && (
                      <Text style={[styles.checkmark, { color: colors.buttonText }, compactMode && styles.checkmarkCompact]}>✓</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerCenter: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekInfo: {
    fontSize: 12,
    marginTop: 1,
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  completedText: {
    fontWeight: 'bold',
    fontSize: 11,
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
  progressionHint: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressionText: {
    fontSize: 12,
    fontWeight: '600',
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
  swapIcon: {
    fontSize: 16,
    fontWeight: '600',
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
    padding: 12,
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
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 0,
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
  // TextInput styles for inline editing
  scrollView: {
    flex: 1,
  },
  textInput: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  // Compact mode styles
  headerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dayNameCompact: {
    fontSize: 16,
  },
  weekInfoCompact: {
    fontSize: 11,
  },
  contentContainerCompact: {
    padding: 8,
  },
  exerciseCardCompact: {
    marginBottom: 12,
    padding: 8,
    borderRadius: 10,
  },
  exerciseHeaderCompact: {
    marginBottom: 6,
  },
  exerciseNameCompact: {
    fontSize: 14,
  },
  setHeaderCompact: {
    paddingBottom: 4,
    marginBottom: 2,
  },
  headerCellCompact: {
    fontSize: 9,
  },
  setRowCompact: {
    paddingVertical: 2,
  },
  cellCompact: {
    fontSize: 13,
  },
  valueCellCompact: {
    height: 30,
  },
  checkboxCompact: {
    width: 28,
    height: 28,
  },
  checkColCompact: {
    width: 28,
  },
  checkmarkCompact: {
    fontSize: 14,
  },
});
