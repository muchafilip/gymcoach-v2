import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { CustomTemplate } from '../types';
import {
  getMyTemplates,
  createCustomTemplate,
  deleteCustomTemplate,
} from '../api/templates';
import { generateWorkoutPlan } from '../api/workouts';
import { useThemeStore } from '../store/themeStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'MyTemplates'>;

const DURATION_OPTIONS = [4, 6, 8];

export default function MyTemplatesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useThemeStore();

  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [generating, setGenerating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    try {
      const data = await getMyTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTemplateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setCreating(true);
    try {
      const template = await createCustomTemplate(
        newTemplateName.trim(),
        newTemplateDescription.trim() || undefined
      );
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      navigation.navigate('TemplateBuilder', { templateId: template.id });
    } catch (error) {
      console.error('Error creating template:', error);
      Alert.alert('Error', 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (template: CustomTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomTemplate(template.id);
              await loadTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const handleGeneratePlan = (template: CustomTemplate) => {
    if (template.days.length === 0) {
      Alert.alert('Cannot Generate', 'This template has no days. Add at least one day first.');
      return;
    }

    const hasExercises = template.days.some((day) => day.exercises.length > 0);
    if (!hasExercises) {
      Alert.alert('Cannot Generate', 'This template has no exercises. Add exercises to at least one day.');
      return;
    }

    setSelectedTemplate(template);
    setShowDurationModal(true);
  };

  const handleCreatePlan = async (durationWeeks: number) => {
    if (!selectedTemplate) return;

    setShowDurationModal(false);
    setGenerating(true);

    try {
      const plan = await generateWorkoutPlan(selectedTemplate.id, durationWeeks);
      navigation.navigate('WorkoutPlan', { planId: plan.id });
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate workout plan');
    } finally {
      setGenerating(false);
      setSelectedTemplate(null);
    }
  };

  const renderTemplate = ({ item }: { item: CustomTemplate }) => {
    const exerciseCount = item.days.reduce((sum, day) => sum + day.exercises.length, 0);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('TemplateBuilder', { templateId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.errorLight }]}
            onPress={() => handleDelete(item)}
          >
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {item.description && (
          <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
            {item.days.length} days · {exerciseCount} exercises
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: colors.primary },
            (item.days.length === 0 || exerciseCount === 0) && styles.generateButtonDisabled,
          ]}
          onPress={() => handleGeneratePlan(item)}
          disabled={item.days.length === 0 || exerciseCount === 0 || generating}
        >
          {generating && selectedTemplate?.id === item.id ? (
            <ActivityIndicator size="small" color={colors.buttonText} />
          ) : (
            <Text style={[styles.generateButtonText, { color: colors.buttonText }]}>
              Generate Plan
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTemplate}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No custom templates yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Create a template to build your own workout plans
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={[styles.fabText, { color: colors.buttonText }]}>+</Text>
      </TouchableOpacity>

      {/* Create Template Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Template</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Template name"
              placeholderTextColor={colors.textMuted}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={newTemplateDescription}
              onChangeText={setNewTemplateDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTemplateName('');
                  setNewTemplateDescription('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duration Selection Modal */}
      <Modal
        visible={showDurationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Plan Duration</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {selectedTemplate?.name}
            </Text>

            <View style={styles.durationOptions}>
              {DURATION_OPTIONS.map((weeks) => (
                <TouchableOpacity
                  key={weeks}
                  style={[styles.durationButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleCreatePlan(weeks)}
                >
                  <Text style={[styles.durationWeeks, { color: colors.buttonText }]}>{weeks}</Text>
                  <Text style={[styles.durationLabel, { color: colors.buttonText }]}>weeks</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowDurationModal(false);
                setSelectedTemplate(null);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  list: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardMeta: {
    marginBottom: 12,
  },
  cardMetaText: {
    fontSize: 12,
  },
  generateButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  durationButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  durationWeeks: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  durationLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
