import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { UserExercise, SupersetSuggestion } from '../types';
import { apiClient } from '../api/client';
import { getAllExercises, ExerciseListItem, addExerciseToDay } from '../api/workouts';

interface SupersetModalProps {
  visible: boolean;
  dayId: number;
  exercises: UserExercise[];
  onClose: () => void;
  onSupersetCreated: () => void;
}

interface SelectableExercise {
  id: number; // exerciseId for catalog items, exerciseLogId for workout items
  exerciseId: number;
  name: string;
  primaryMuscleGroup: string;
  isInWorkout: boolean;
  exerciseLogId?: number; // Only set if already in workout
  supersetGroupId?: number;
}

export default function SupersetModal({
  visible,
  dayId,
  exercises,
  onClose,
  onSupersetCreated,
}: SupersetModalProps) {
  const { colors } = useThemeStore();
  const [suggestions, setSuggestions] = useState<SupersetSuggestion[]>([]);
  const [allExercises, setAllExercises] = useState<SelectableExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<SelectableExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadData();
      setSearchQuery('');
      setSelectedExercises([]);
      setManualMode(false);
    }
  }, [visible, dayId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load suggestions and all exercises in parallel
      const [suggestionsResponse, exerciseCatalog] = await Promise.all([
        apiClient.get(`/supersets/suggestions/${dayId}`).catch(() => ({ data: [] })),
        getAllExercises(),
      ]);

      setSuggestions(suggestionsResponse.data);

      // Build list of exercises - mark which ones are in the workout
      const workoutExerciseIds = new Set(exercises.map(e => e.exerciseId));
      const workoutExerciseMap = new Map(exercises.map(e => [e.exerciseId, e]));

      const selectableList: SelectableExercise[] = exerciseCatalog.map((ex: ExerciseListItem) => {
        const workoutExercise = workoutExerciseMap.get(ex.id);
        return {
          id: workoutExercise?.id ?? ex.id, // Use exerciseLogId if in workout
          exerciseId: ex.id,
          name: ex.name,
          primaryMuscleGroup: ex.primaryMuscleGroup,
          isInWorkout: workoutExerciseIds.has(ex.id),
          exerciseLogId: workoutExercise?.id,
          supersetGroupId: workoutExercise?.supersetGroupId,
        };
      });

      setAllExercises(selectableList);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuggested = async (suggestion: SupersetSuggestion) => {
    setCreating(suggestion.templateId);
    try {
      await apiClient.post('/supersets', {
        exerciseLogAId: suggestion.exerciseAId,
        exerciseLogBId: suggestion.exerciseBId,
        isManual: false,
      });
      onSupersetCreated();
      onClose();
    } catch (error: unknown) {
      console.error('Failed to create superset:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      Alert.alert('Error', axiosError.response?.data?.message || 'Failed to create superset');
    } finally {
      setCreating(null);
    }
  };

  const handleManualSelect = (exercise: SelectableExercise) => {
    // Don't allow selecting exercises already in a superset
    if (exercise.supersetGroupId) return;

    const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.exerciseId);
    if (isSelected) {
      setSelectedExercises(selectedExercises.filter((e) => e.exerciseId !== exercise.exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const handleCreateManualSuperset = async () => {
    if (selectedExercises.length < 2) return;

    setCreating(-1);
    try {
      // First, add any exercises that aren't in the workout yet
      const exerciseLogIds: number[] = [];

      for (const exercise of selectedExercises) {
        if (exercise.isInWorkout && exercise.exerciseLogId) {
          exerciseLogIds.push(exercise.exerciseLogId);
        } else {
          // Add exercise to workout first
          const newExercise = await addExerciseToDay(dayId, exercise.exerciseId);
          exerciseLogIds.push(newExercise.id);
        }
      }

      // Now create the superset with all exercise log IDs
      await apiClient.post('/supersets', {
        exerciseLogIds,
        isManual: true,
      });

      onSupersetCreated();
      onClose();
    } catch (error: unknown) {
      console.error('Failed to create superset:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      Alert.alert('Error', axiosError.response?.data?.message || 'Failed to create superset');
    } finally {
      setCreating(null);
      setSelectedExercises([]);
    }
  };

  const getSetLabel = () => {
    if (selectedExercises.length === 2) return 'Superset';
    if (selectedExercises.length >= 3) return 'Giant Set';
    return 'Set';
  };

  // Filter exercises: exclude those already in a superset
  const availableExercises = allExercises.filter((e) => !e.supersetGroupId);

  // Search filter
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredExercises = normalizedSearch.length > 0
    ? availableExercises.filter((e) => {
        const name = (e.name || '').toLowerCase();
        const muscle = (e.primaryMuscleGroup || '').toLowerCase();
        const searchWords = normalizedSearch.split(/\s+/);
        return searchWords.every(word =>
          name.includes(word) || muscle.includes(word)
        );
      })
    : availableExercises;

  // Sort: exercises in workout first, then alphabetically
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    if (a.isInWorkout && !b.isInWorkout) return -1;
    if (!a.isInWorkout && b.isInWorkout) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Create Superset</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Tab buttons */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                !manualMode && { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setManualMode(false);
                setSelectedExercises([]);
                setSearchQuery('');
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: manualMode ? colors.textSecondary : colors.buttonText },
                ]}
              >
                Suggestions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                manualMode && { backgroundColor: colors.primary },
              ]}
              onPress={() => setManualMode(true)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: manualMode ? colors.buttonText : colors.textSecondary },
                ]}
              >
                Manual
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : manualMode ? (
              // Manual mode - select from ALL exercises
              <View>
                <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                  {selectedExercises.length === 0
                    ? 'Select 2+ exercises for superset, 3+ for giant set'
                    : `Selected ${selectedExercises.length} exercises (${getSetLabel()})`}
                </Text>

                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  placeholder={`Search ${availableExercises.length} exercises...`}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {sortedExercises.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {searchQuery ? `No exercises match "${searchQuery}"` : 'No exercises available'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {sortedExercises.map((exercise) => {
                      const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.exerciseId);
                      const selectionIndex = selectedExercises.findIndex((e) => e.exerciseId === exercise.exerciseId);
                      return (
                        <TouchableOpacity
                          key={`${exercise.exerciseId}-${exercise.isInWorkout}`}
                          style={[
                            styles.exerciseItem,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            isSelected && {
                              borderColor: colors.primary,
                              backgroundColor: colors.primaryLight,
                            },
                          ]}
                          onPress={() => handleManualSelect(exercise)}
                          disabled={creating !== null}
                        >
                          {isSelected && (
                            <View style={[styles.selectionBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.selectionBadgeText}>{selectionIndex + 1}</Text>
                            </View>
                          )}
                          <View style={styles.exerciseInfo}>
                            <Text style={[styles.exerciseName, { color: colors.text }]}>
                              {exercise.name}
                            </Text>
                            <View style={styles.exerciseMeta}>
                              {exercise.primaryMuscleGroup && (
                                <Text style={[styles.muscleGroup, { color: colors.textSecondary }]}>
                                  {exercise.primaryMuscleGroup}
                                </Text>
                              )}
                              {exercise.isInWorkout && (
                                <View style={[styles.inWorkoutBadge, { backgroundColor: colors.success }]}>
                                  <Text style={styles.inWorkoutText}>In workout</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {selectedExercises.length >= 2 && (
                      <TouchableOpacity
                        style={[styles.createButton, { backgroundColor: colors.success }]}
                        onPress={handleCreateManualSuperset}
                        disabled={creating !== null}
                      >
                        {creating === -1 ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.createButtonText}>
                            Create {getSetLabel()} ({selectedExercises.length} exercises)
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ) : (
              // Suggestions mode
              <View>
                {suggestions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No superset suggestions available for this workout.
                    Try manual mode to create custom pairings.
                  </Text>
                ) : (
                  suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.templateId}
                      style={[
                        styles.suggestionItem,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => handleCreateSuggested(suggestion)}
                      disabled={creating !== null}
                    >
                      <View style={[styles.suggestionBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.suggestionBadgeText}>{suggestion.templateName}</Text>
                      </View>
                      <View style={styles.exercisePair}>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                          {suggestion.exerciseAName}
                        </Text>
                        <Text style={[styles.plusSign, { color: colors.textMuted }]}>+</Text>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                          {suggestion.exerciseBName}
                        </Text>
                      </View>
                      {creating === suggestion.templateId && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  loader: {
    marginTop: 40,
  },
  instruction: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  emptyContainer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  muscleGroup: {
    fontSize: 12,
  },
  inWorkoutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inWorkoutText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  suggestionItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  suggestionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  suggestionBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  exercisePair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plusSign: {
    fontSize: 18,
    fontWeight: '300',
  },
  selectionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectionBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  createButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
