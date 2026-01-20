import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { Exercise } from '../types';
import { getExerciseHistory, ExerciseHistory } from '../api/workouts';
import { IfFeatureEnabled } from './PremiumGate';

interface ExerciseInfoModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
}

export default function ExerciseInfoModal({
  visible,
  exercise,
  onClose,
}: ExerciseInfoModalProps) {
  const { colors } = useThemeStore();
  const { displayWeight, weightUnit } = usePreferencesStore();
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (visible && exercise) {
      loadHistory();
    }
  }, [visible, exercise?.id]);

  const loadHistory = async () => {
    if (!exercise) return;
    try {
      setLoadingHistory(true);
      const data = await getExerciseHistory(exercise.id);
      setHistory(data.slice(0, 5)); // Last 5 performances
    } catch (err) {
      console.error('Error loading exercise history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!exercise) return null;

  const getYouTubeSearchUrl = (exerciseName: string) => {
    const query = encodeURIComponent(`${exerciseName} exercise tutorial`);
    return `https://www.youtube.com/results?search_query=${query}`;
  };

  const handleWatchVideo = async () => {
    const videoUrl = exercise.videoUrl || getYouTubeSearchUrl(exercise.name);

    try {
      const canOpen = await Linking.canOpenURL(videoUrl);
      if (canOpen) {
        await Linking.openURL(videoUrl);
      } else {
        Alert.alert('Error', 'Cannot open video URL');
      }
    } catch (err) {
      console.error('Error opening video URL:', err);
      Alert.alert('Error', 'Failed to open video');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.overlay} onPress={onClose} />

        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                Done
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {exercise.name}
            </Text>
            <TouchableOpacity
              style={styles.youtubeButton}
              onPress={handleWatchVideo}
              activeOpacity={0.8}
            >
              <Text style={styles.youtubeIcon}>▶</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                MUSCLES
              </Text>
              <View style={styles.muscleRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Primary:
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {exercise.primaryMuscleGroup}
                </Text>
              </View>
              {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0 && (
                <View style={styles.muscleRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    Secondary:
                  </Text>
                  <Text style={[styles.value, { color: colors.text }]}>
                    {exercise.secondaryMuscleGroups.join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {exercise.requiredEquipment && exercise.requiredEquipment.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  EQUIPMENT
                </Text>
                <Text style={[styles.equipmentText, { color: colors.text }]}>
                  {exercise.requiredEquipment.join(', ')}
                </Text>
              </View>
            )}

            {exercise.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  DESCRIPTION
                </Text>
                <Text style={[styles.descriptionText, { color: colors.text }]}>
                  {exercise.description}
                </Text>
              </View>
            )}

            {exercise.instructions && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  INSTRUCTIONS
                </Text>
                <Text style={[styles.instructionsText, { color: colors.text }]}>
                  {exercise.instructions}
                </Text>
              </View>
            )}

            <IfFeatureEnabled feature="exerciseHistory">
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  RECENT PERFORMANCE
                </Text>
                {loadingHistory ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.historyLoader} />
                ) : history.length === 0 ? (
                  <Text style={[styles.noHistoryText, { color: colors.textSecondary }]}>
                    No history yet
                  </Text>
                ) : (
                  <View style={[styles.historyTable, { borderColor: colors.border }]}>
                    <View style={[styles.historyHeader, { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.border }]}>
                      <Text style={[styles.historyHeaderCell, styles.dateCol, { color: colors.textMuted }]}>Date</Text>
                      <Text style={[styles.historyHeaderCell, styles.statsCol, { color: colors.textMuted }]}>Sets</Text>
                      <Text style={[styles.historyHeaderCell, styles.statsCol, { color: colors.textMuted }]}>Reps</Text>
                      <Text style={[styles.historyHeaderCell, styles.weightHistoryCol, { color: colors.textMuted }]}>Max</Text>
                    </View>
                    {history.map((item) => (
                      <View key={item.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.historyCell, styles.dateCol, { color: colors.text }]}>
                          {formatDate(item.performedAt)}
                        </Text>
                        <Text style={[styles.historyCell, styles.statsCol, { color: colors.text }]}>
                          {item.totalSets}
                        </Text>
                        <Text style={[styles.historyCell, styles.statsCol, { color: colors.text }]}>
                          {item.totalReps}
                        </Text>
                        <Text style={[styles.historyCell, styles.weightHistoryCol, { color: colors.primary, fontWeight: '600' }]}>
                          {displayWeight(item.maxWeight)}{weightUnit}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </IfFeatureEnabled>
          </ScrollView>
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
    minHeight: 300,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 50,
  },
  closeText: {
    fontSize: 17,
    fontWeight: '500',
  },
  youtubeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeIcon: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    width: 80,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  equipmentText: {
    fontSize: 15,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  instructionsText: {
    fontSize: 15,
    lineHeight: 24,
  },
  historyLoader: {
    marginVertical: 16,
  },
  noHistoryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  historyTable: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  historyHeaderCell: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  historyCell: {
    fontSize: 14,
  },
  dateCol: {
    flex: 1.5,
  },
  statsCol: {
    flex: 1,
    textAlign: 'center',
  },
  weightHistoryCol: {
    flex: 1,
    textAlign: 'right',
  },
});
