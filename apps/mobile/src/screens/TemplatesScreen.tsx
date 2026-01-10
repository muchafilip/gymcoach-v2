import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { WorkoutTemplate } from '../types';
import { fetchTemplates } from '../api/templates';
import {
  generateWorkoutPlan,
  getActivePlan,
  getUserPlans,
  activatePlan,
  deactivatePlan,
  deletePlan,
} from '../api/workouts';
import { useThemeStore } from '../store/themeStore';

interface UserPlan {
  id: number;
  templateName: string;
  startDate: string;
  completedDays: number;
  totalDays: number;
  isActive: boolean;
}

type NavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplatesList'>;

const DURATION_OPTIONS = [4, 6, 8];

export default function TemplatesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useThemeStore();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<UserPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [templatesData, plansData] = await Promise.all([
        fetchTemplates(),
        getUserPlans(),
      ]);
      setTemplates(templatesData);

      // Sort plans: active first, then by start date
      const sortedPlans = [...plansData].sort((a: UserPlan, b: UserPlan) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
      setUserPlans(sortedPlans);

      // Find active plan from the plans data
      const activePlan = plansData.find((p: UserPlan) => p.isActive);
      setActivePlanId(activePlan?.id || null);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: WorkoutTemplate) => {
    setGenerating(template.id);
    try {
      // Check for existing active plan with this template
      const activePlan = await getActivePlan();
      if (activePlan && activePlan.templateId === template.id) {
        // Navigate to existing plan to prevent data loss
        navigation.navigate('WorkoutPlan', { planId: activePlan.id });
        return;
      }

      // Show duration modal for new plan
      setSelectedTemplate(template);
      setShowDurationModal(true);
    } catch (error) {
      console.error('Error checking active plan:', error);
      // If error checking, still allow creating new plan
      setSelectedTemplate(template);
      setShowDurationModal(true);
    } finally {
      setGenerating(null);
    }
  };

  const handleCreatePlan = async (durationWeeks: number) => {
    if (!selectedTemplate) return;

    setShowDurationModal(false);
    setGenerating(selectedTemplate.id);

    try {
      // Generate workout plan with duration
      const plan = await generateWorkoutPlan(selectedTemplate.id, durationWeeks);
      console.log('Generated plan:', plan);

      // Reload plans and navigate
      await loadData();
      navigation.navigate('WorkoutPlan', { planId: plan.id });
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate workout plan');
    } finally {
      setGenerating(null);
      setSelectedTemplate(null);
    }
  };

  const handlePlanPress = (plan: UserPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const handleViewPlan = async () => {
    if (!selectedPlan) return;
    setShowPlanModal(false);
    navigation.navigate('WorkoutPlan', { planId: selectedPlan.id });
  };

  const handleActivatePlan = async () => {
    if (!selectedPlan) return;
    try {
      await activatePlan(selectedPlan.id);
      setActivePlanId(selectedPlan.id);
      setShowPlanModal(false);
      await loadData();
    } catch (error) {
      console.error('Error activating plan:', error);
      alert('Failed to activate plan');
    }
  };

  const handleDeactivatePlan = async () => {
    if (!selectedPlan) return;
    Alert.alert(
      'Deactivate Plan',
      'This will stop tracking this as your active plan. You can reactivate it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivatePlan(selectedPlan.id);
              setActivePlanId(null);
              setShowPlanModal(false);
              await loadData();
            } catch (error) {
              console.error('Error deactivating plan:', error);
              alert('Failed to deactivate plan');
            }
          },
        },
      ]
    );
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    Alert.alert(
      'Delete Plan',
      'This will permanently delete this plan and all workout data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(selectedPlan.id);
              if (selectedPlan.id === activePlanId) {
                setActivePlanId(null);
              }
              setShowPlanModal(false);
              await loadData();
            } catch (error) {
              console.error('Error deleting plan:', error);
              alert('Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading === true) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* My Plans Section */}
        {userPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Plans</Text>
            {userPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  plan.isActive && { backgroundColor: colors.successLight, borderColor: colors.success },
                ]}
                onPress={() => handlePlanPress(plan)}
              >
                <View style={styles.planCardContent}>
                  <View style={styles.planCardLeft}>
                    <Text style={[styles.planCardTitle, { color: colors.text }]}>{plan.templateName}</Text>
                    <Text style={[styles.planCardMeta, { color: colors.textSecondary }]}>
                      Started {formatDate(plan.startDate)} · {plan.completedDays}/{plan.totalDays} days
                    </Text>
                  </View>
                  {plan.isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                      <Text style={[styles.activeBadgeText, { color: colors.buttonText }]}>Active</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(plan.completedDays / plan.totalDays) * 100}%`, backgroundColor: colors.success },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Templates Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {userPlans.length > 0 ? 'Start New Plan' : 'Workout Templates'}
          </Text>
          {templates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelectTemplate(item)}
              disabled={generating === item.id}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                {item.isPremium && (
                  <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                    <Text style={[styles.badgeText, { color: colors.buttonText }]}>PREMIUM</Text>
                  </View>
                )}
              </View>
              {item.description ? (
                <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              ) : null}
              {generating === item.id && (
                <ActivityIndicator size="small" style={styles.loader} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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

      {/* Plan Actions Modal */}
      <Modal
        visible={showPlanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPlan?.templateName}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {selectedPlan?.completedDays}/{selectedPlan?.totalDays} days completed
            </Text>

            <View style={styles.planActions}>
              <TouchableOpacity
                style={[styles.planActionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleViewPlan}
              >
                <Text style={[styles.planActionText, { color: colors.text }]}>View Plan</Text>
              </TouchableOpacity>

              {selectedPlan?.isActive ? (
                <TouchableOpacity
                  style={[styles.planActionButton, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}
                  onPress={handleDeactivatePlan}
                >
                  <Text style={[styles.planActionTextWarning, { color: colors.warning }]}>Deactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.planActionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleActivatePlan}
                >
                  <Text style={[styles.planActionTextPrimary, { color: colors.buttonText }]}>Set as Active</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.planActionButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
                onPress={handleDeletePlan}
              >
                <Text style={[styles.planActionTextDanger, { color: colors.error }]}>Delete Plan</Text>
              </TouchableOpacity>
            </View>

            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setShowPlanModal(false);
                setSelectedPlan(null);
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
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  planCardActive: {},
  planCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planCardLeft: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planCardMeta: {
    fontSize: 12,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  planActions: {
    width: '100%',
    marginBottom: 16,
  },
  planActionButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  planActionPrimary: {},
  planActionWarning: {},
  planActionDanger: {},
  planActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  planActionTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
  },
  planActionTextWarning: {
    fontSize: 16,
    fontWeight: '600',
  },
  planActionTextDanger: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 20,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 8,
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
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
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
