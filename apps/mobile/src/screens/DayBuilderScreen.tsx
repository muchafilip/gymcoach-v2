import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { CustomTemplateExercise } from '../types';
import {
  addTemplateExercise,
  updateTemplateExercise,
  deleteTemplateExercise,
  reorderExercises,
} from '../api/templates';
import { getAllExercises, ExerciseListItem } from '../api/workouts';
import { useThemeStore } from '../store/themeStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'DayBuilder'>;
type RouteParams = RouteProp<TemplatesStackParamList, 'DayBuilder'>;

export default function DayBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { dayId, dayName, exercises: initialExercises } = route.params;
  const { colors } = useThemeStore();

  const [exercises, setExercises] = useState<CustomTemplateExercise[]>(initialExercises || []);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CustomTemplateExercise | null>(null);
  const [editedSets, setEditedSets] = useState('3');
  const [editedReps, setEditedReps] = useState('10');
  const [editedWeight, setEditedWeight] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: dayName });
  }, [dayName, navigation]);

  const loadAllExercises = async () => {
    setLoadingExercises(true);
    try {
      const data = await getAllExercises();
      setAllExercises(data);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleAddExercise = async (exercise: ExerciseListItem) => {
    setSaving(true);
    try {
      const newExercise = await addTemplateExercise(dayId, {
        exerciseId: exercise.id,
        sets: 3,
        targetReps: 10,
      });
      setExercises((prev) => [...prev, newExercise]);
      setShowAddModal(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding exercise:', error);
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExercise = async () => {
    if (!editingExercise) return;

    const sets = parseInt(editedSets) || 3;
    const reps = parseInt(editedReps) || 10;
    const weight = editedWeight ? parseFloat(editedWeight) : undefined;

    setSaving(true);
    try {
      const updated = await updateTemplateExercise(editingExercise.id, {
        sets,
        targetReps: reps,
        defaultWeight: weight,
        notes: editedNotes.trim() || undefined,
      });
      setExercises((prev) =>
        prev.map((e) => (e.id === editingExercise.id ? { ...e, ...updated } : e))
      );
      setEditingExercise(null);
    } catch (error) {
      console.error('Error updating exercise:', error);
      Alert.alert('Error', 'Failed to update exercise');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercise = (exercise: CustomTemplateExercise) => {
    Alert.alert(
      'Remove Exercise',
      `Remove "${exercise.exerciseName}" from this day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplateExercise(exercise.id);
              setExercises((prev) => prev.filter((e) => e.id !== exercise.id));
            } catch (error) {
              console.error('Error deleting exercise:', error);
              Alert.alert('Error', 'Failed to remove exercise');
            }
          },
        },
      ]
    );
  };

  const handleDragEnd = async ({ data }: { data: CustomTemplateExercise[] }) => {
    setExercises(data);
    try {
      await reorderExercises(dayId, data.map((e) => e.id));
    } catch (error) {
      console.error('Error reordering exercises:', error);
      Alert.alert('Error', 'Failed to save order');
    }
  };

  const openEditModal = (exercise: CustomTemplateExercise) => {
    setEditingExercise(exercise);
    setEditedSets(exercise.sets.toString());
    setEditedReps(exercise.targetReps.toString());
    setEditedWeight(exercise.defaultWeight?.toString() || '');
    setEditedNotes(exercise.notes || '');
  };

  const filteredExercises = allExercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.primaryMuscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderExercise = useCallback(
    ({ item, drag, isActive }: RenderItemParams<CustomTemplateExercise>) => (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.exerciseCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            isActive && { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
          ]}
          onLongPress={drag}
          onPress={() => openEditModal(item)}
          delayLongPress={150}
        >
          <View style={styles.exerciseCardContent}>
            <View style={styles.dragHandle}>
              <Text style={[styles.dragHandleText, { color: colors.textMuted }]}>≡</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{item.exerciseName}</Text>
              <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
                {item.primaryMuscleGroup}
              </Text>
              <Text style={[styles.exerciseConfig, { color: colors.textMuted }]}>
                {item.sets} sets × {item.targetReps} reps
                {item.defaultWeight ? ` @ ${item.defaultWeight}kg` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.errorLight }]}
              onPress={() => handleDeleteExercise(item)}
            >
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>×</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [colors]
  );

  const renderAddExerciseItem = ({ item }: { item: ExerciseListItem }) => {
    const isAlreadyAdded = exercises.some((e) => e.exerciseId === item.id);

    return (
      <TouchableOpacity
        style={[
          styles.addExerciseItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isAlreadyAdded && { opacity: 0.5 },
        ]}
        onPress={() => !isAlreadyAdded && handleAddExercise(item)}
        disabled={isAlreadyAdded || saving}
      >
        <View style={styles.addExerciseInfo}>
          <Text style={[styles.addExerciseName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.addExerciseMeta, { color: colors.textSecondary }]}>
            {item.primaryMuscleGroup} · {item.exerciseType}
          </Text>
        </View>
        {isAlreadyAdded && (
          <Text style={[styles.addedBadge, { color: colors.success }]}>Added</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerHint, { color: colors.textMuted }]}>
            Hold and drag to reorder • Tap to edit
          </Text>
        </View>

        {exercises.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No exercises yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add exercises to this workout day
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={exercises}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExercise}
            onDragEnd={handleDragEnd}
            containerStyle={styles.list}
          />
        )}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setShowAddModal(true);
            if (allExercises.length === 0) {
              loadAllExercises();
            }
          }}
        >
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ Add Exercise</Text>
        </TouchableOpacity>

        {/* Add Exercise Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={[styles.addModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.addModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.addModalTitle, { color: colors.text }]}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[styles.addModalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loadingExercises ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderAddExerciseItem}
                contentContainerStyle={styles.addExerciseList}
                ListEmptyComponent={
                  <Text style={[styles.noResults, { color: colors.textMuted }]}>
                    No exercises found
                  </Text>
                }
              />
            )}
          </View>
        </Modal>

        {/* Edit Exercise Modal */}
        <Modal
          visible={editingExercise !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditingExercise(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingExercise?.exerciseName}
              </Text>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sets</Text>
                  <TextInput
                    style={[styles.numberInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={editedSets}
                    onChangeText={setEditedSets}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
                  <TextInput
                    style={[styles.numberInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={editedReps}
                    onChangeText={setEditedReps}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.numberInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    value={editedWeight}
                    onChangeText={setEditedWeight}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroupFull}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                  onPress={() => setEditingExercise(null)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleUpdateExercise}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
    alignItems: 'center',
  },
  headerHint: {
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: 180,
  },
  exerciseCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dragHandle: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleText: {
    fontSize: 20,
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  exerciseConfig: {
    fontSize: 12,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addModalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addModalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  addExerciseList: {
    padding: 16,
    paddingTop: 0,
  },
  addExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  addExerciseInfo: {
    flex: 1,
  },
  addExerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  addExerciseMeta: {
    fontSize: 12,
  },
  addedBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
