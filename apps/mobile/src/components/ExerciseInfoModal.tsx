import React from 'react';
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
} from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { Exercise } from '../types';

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
});
