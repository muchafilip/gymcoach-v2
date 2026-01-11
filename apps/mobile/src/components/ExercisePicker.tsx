import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { getExercises } from '../api/exercises';
import { addExerciseToDay } from '../api/workouts';
import { Exercise, UserExercise } from '../types';

interface ExercisePickerProps {
  visible: boolean;
  dayId: number;
  onExerciseAdded: (exercise: UserExercise) => void;
  onClose: () => void;
}

export default function ExercisePicker({
  visible,
  dayId,
  onExerciseAdded,
  onClose,
}: ExercisePickerProps) {
  const { colors } = useThemeStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible]);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExercises();
      setExercises(data);
    } catch (err) {
      setError('Failed to load exercises');
      console.error('Error loading exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return exercises;
    }
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.primaryMuscleGroup?.toLowerCase().includes(query)
    );
  }, [exercises, searchQuery]);

  const handleSelect = async (exercise: Exercise) => {
    setAdding(true);
    try {
      const newExercise = await addExerciseToDay(dayId, exercise.id);
      onExerciseAdded(newExercise);
      setSearchQuery('');
    } catch (err) {
      console.error('Error adding exercise:', err);
      Alert.alert('Error', 'Failed to add exercise');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, { borderBottomColor: colors.border }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
      disabled={adding}
    >
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.exerciseMuscle, { color: colors.textSecondary }]}>
          {item.primaryMuscleGroup}
          {item.requiredEquipment && item.requiredEquipment.length > 0 && (
            <Text> - {item.requiredEquipment.join(', ')}</Text>
          )}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.overlay} onPress={handleClose} />

        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              Add Exercise
            </Text>
            <View style={styles.headerButton} />
          </View>

          <View
            style={[
              styles.searchContainer,
              { backgroundColor: colors.surfaceAlt },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {adding && (
            <View style={styles.addingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.addingText, { color: colors.text }]}>
                Adding exercise...
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <TouchableOpacity onPress={loadExercises} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: colors.primary }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderExercise}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerContent}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {searchQuery
                      ? 'No exercises match your search'
                      : 'No exercises available'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 70,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 17,
  },
  searchContainer: {
    margin: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 44,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 34,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseMuscle: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 18,
    marginLeft: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  addingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  addingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
