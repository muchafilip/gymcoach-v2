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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { CustomTemplate, CustomTemplateDay } from '../types';
import {
  getCustomTemplate,
  updateCustomTemplate,
  addTemplateDay,
  updateTemplateDay,
  deleteTemplateDay,
} from '../api/templates';
import { useThemeStore } from '../store/themeStore';

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplateBuilder'>;
type RouteParams = RouteProp<TemplatesStackParamList, 'TemplateBuilder'>;

export default function TemplateBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { templateId } = route.params;
  const { colors } = useThemeStore();

  const [template, setTemplate] = useState<CustomTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [editingDay, setEditingDay] = useState<CustomTemplateDay | null>(null);
  const [editedDayName, setEditedDayName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTemplate();
    }, [templateId])
  );

  const loadTemplate = async () => {
    try {
      const data = await getCustomTemplate(templateId);
      setTemplate(data);
      setEditedName(data.name);
      setEditedDescription(data.description || '');
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load template');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Template name is required');
      return;
    }

    setSaving(true);
    try {
      await updateCustomTemplate(templateId, {
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
      });
      setTemplate((prev) => prev ? { ...prev, name: editedName.trim(), description: editedDescription.trim() } : null);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating template:', error);
      Alert.alert('Error', 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDay = async () => {
    if (!newDayName.trim()) {
      Alert.alert('Error', 'Please enter a day name');
      return;
    }

    setSaving(true);
    try {
      await addTemplateDay(templateId, newDayName.trim());
      setShowAddDayModal(false);
      setNewDayName('');
      await loadTemplate();
    } catch (error) {
      console.error('Error adding day:', error);
      Alert.alert('Error', 'Failed to add day');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDay = async () => {
    if (!editingDay || !editedDayName.trim()) {
      Alert.alert('Error', 'Please enter a day name');
      return;
    }

    setSaving(true);
    try {
      await updateTemplateDay(editingDay.id, editedDayName.trim());
      setEditingDay(null);
      setEditedDayName('');
      await loadTemplate();
    } catch (error) {
      console.error('Error updating day:', error);
      Alert.alert('Error', 'Failed to update day');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = (day: CustomTemplateDay) => {
    Alert.alert(
      'Delete Day',
      `Are you sure you want to delete "${day.name}"? All exercises in this day will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplateDay(day.id);
              await loadTemplate();
            } catch (error) {
              console.error('Error deleting day:', error);
              Alert.alert('Error', 'Failed to delete day');
            }
          },
        },
      ]
    );
  };

  const renderDay = ({ item, index }: { item: CustomTemplateDay; index: number }) => (
    <TouchableOpacity
      style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('DayBuilder', { dayId: item.id, dayName: item.name, exercises: item.exercises })}
    >
      <View style={styles.dayCardContent}>
        <View style={styles.dayCardLeft}>
          <Text style={[styles.dayNumber, { color: colors.textSecondary }]}>Day {index + 1}</Text>
          <Text style={[styles.dayName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.exerciseCount, { color: colors.textMuted }]}>
            {item.exercises.length} exercises
          </Text>
        </View>
        <View style={styles.dayCardActions}>
          <TouchableOpacity
            style={[styles.dayActionButton, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => {
              setEditingDay(item);
              setEditedDayName(item.name);
            }}
          >
            <Text style={[styles.dayActionText, { color: colors.text }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dayActionButton, { backgroundColor: colors.errorLight }]}
            onPress={() => handleDeleteDay(item)}
          >
            <Text style={[styles.dayActionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.dayCardArrow}>
        <Text style={[styles.arrowText, { color: colors.primary }]}>→</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Template not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Template Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {isEditingName ? (
          <View style={styles.editingContainer}>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Template name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TextInput
              style={[styles.descInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.editingButtons}>
              <TouchableOpacity
                style={[styles.editButton, { borderColor: colors.border }]}
                onPress={() => {
                  setIsEditingName(false);
                  setEditedName(template.name);
                  setEditedDescription(template.description || '');
                }}
              >
                <Text style={[styles.editButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveDetails}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingName(true)}>
            <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
            {template.description && (
              <Text style={[styles.templateDescription, { color: colors.textSecondary }]}>
                {template.description}
              </Text>
            )}
            <Text style={[styles.tapToEdit, { color: colors.textMuted }]}>Tap to edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Days List */}
      <View style={styles.daysSection}>
        <View style={styles.daysSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Days</Text>
          <TouchableOpacity
            style={[styles.addDayButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddDayModal(true)}
          >
            <Text style={[styles.addDayButtonText, { color: colors.buttonText }]}>+ Add Day</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={template.days}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDay}
          contentContainerStyle={styles.daysList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No days yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Add workout days to your template
              </Text>
            </View>
          }
        />
      </View>

      {/* Add Day Modal */}
      <Modal
        visible={showAddDayModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Workout Day</Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Day name (e.g., Push Day, Leg Day)"
              placeholderTextColor={colors.textMuted}
              value={newDayName}
              onChangeText={setNewDayName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setShowAddDayModal(false);
                  setNewDayName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddDay}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Day Modal */}
      <Modal
        visible={editingDay !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Day</Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Day name"
              placeholderTextColor={colors.textMuted}
              value={editedDayName}
              onChangeText={setEditedDayName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: colors.border }]}
                onPress={() => {
                  setEditingDay(null);
                  setEditedDayName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateDay}
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
  errorText: {
    flex: 1,
    textAlign: 'center',
    paddingTop: 40,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  templateName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  tapToEdit: {
    fontSize: 12,
  },
  editingContainer: {
    gap: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  descInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysSection: {
    flex: 1,
    padding: 16,
  },
  daysSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addDayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addDayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysList: {
    flexGrow: 1,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  dayCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCardLeft: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 12,
    marginBottom: 2,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 12,
  },
  dayCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  dayActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dayActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayCardArrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
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
