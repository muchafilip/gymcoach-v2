import React, { useState, useCallback, useMemo } from 'react';
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
  Dimensions,
  Share,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TemplatesStackParamList } from '../navigation/AppNavigator';
import { WorkoutTemplate } from '../types';
import { fetchTemplates } from '../api/templates';
import {
  generateWorkoutPlan,
  getUserPlans,
  activatePlan,
  deactivatePlan,
  deletePlan,
} from '../api/workouts';
import { useThemeStore } from '../store/themeStore';
import { useFeatureStore } from '../store/featureStore';
import { useNavigation as useRootNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp as RootNavProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

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
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.75;

export default function TemplatesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const rootNavigation = useRootNavigation<RootNavProp<RootStackParamList>>();
  const { colors } = useThemeStore();
  const { isPremium, devModeEnabled } = useFeatureStore();
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

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    // Check if premium template requires subscription
    if (template.isPremium && !isPremium && !devModeEnabled) {
      // Navigate to paywall
      rootNavigation.navigate('Paywall');
      return;
    }
    // Show duration modal to create a new plan
    setSelectedTemplate(template);
    setShowDurationModal(true);
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

  // Featured templates (premium ones)
  const featuredTemplates = useMemo(() => {
    return templates.filter(t => t.isPremium);
  }, [templates]);

  // Non-featured templates
  const regularTemplates = useMemo(() => {
    return templates.filter(t => !t.isPremium);
  }, [templates]);

  // Separate active plan from other plans
  const activePlan = useMemo(() => {
    return userPlans.find(p => p.isActive);
  }, [userPlans]);

  const otherPlans = useMemo(() => {
    return userPlans.filter(p => !p.isActive);
  }, [userPlans]);

  // TODO: Replace with actual App Store / Play Store URLs when published
  const APP_STORE_URL = 'https://apps.apple.com/app/gymcoach/id123456789';
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gymcoach.app';

  const handleSharePlan = async (plan: UserPlan) => {
    try {
      const progress = Math.round((plan.completedDays / plan.totalDays) * 100);
      const shareMessage = `I'm ${progress}% through my "${plan.templateName}" workout program! 💪

${plan.completedDays}/${plan.totalDays} workout days completed.

Join me on GymCoach and start your fitness journey:
📱 iOS: ${APP_STORE_URL}
📱 Android: ${PLAY_STORE_URL}`;

      await Share.share({
        message: shareMessage,
        title: `My ${plan.templateName} Progress`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
        {/* Featured Section */}
        {featuredTemplates.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeader}>
              <Text style={[styles.featuredTitle, { color: colors.text }]}>Featured Programs</Text>
              <Text style={[styles.featuredSubtitle, { color: colors.textSecondary }]}>Premium</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
              decelerationRate="fast"
              snapToInterval={FEATURED_CARD_WIDTH + 12}
            >
              {featuredTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[styles.featuredCard, { backgroundColor: colors.primary, width: FEATURED_CARD_WIDTH }]}
                  onPress={() => handleSelectTemplate(template)}
                  activeOpacity={0.9}
                >
                  <View style={styles.featuredCardTop}>
                    <Text style={styles.featuredEmoji}>
                      {template.name.includes('Strength') ? '💪' :
                       template.name.includes('Push') ? '🏋️' :
                       template.name.includes('Upper') ? '👊' :
                       template.name.includes('Superset') ? '⚡' : '🔥'}
                    </Text>
                    <View style={[styles.premiumBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Text style={styles.premiumBadgeText}>PRO</Text>
                    </View>
                  </View>
                  <Text style={styles.featuredCardTitle}>{template.name}</Text>
                  <Text style={styles.featuredCardDesc} numberOfLines={2}>{template.description}</Text>
                  <View style={styles.featuredCardFooter}>
                    <Text style={styles.featuredCardCta}>Start Program →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* My Custom Templates - Always visible at top */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.myTemplatesCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={() => navigation.navigate('MyTemplates')}
          >
            <View style={styles.myTemplatesContent}>
              <Text style={[styles.myTemplatesTitle, { color: colors.text }]}>My Custom Templates</Text>
              <Text style={[styles.myTemplatesSubtitle, { color: colors.textSecondary }]}>
                Create and manage your own workout templates
              </Text>
            </View>
            <Text style={[styles.myTemplatesArrow, { color: colors.primary }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Active Plan Section - Highlighted */}
        {activePlan && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Plan</Text>
            <TouchableOpacity
              style={[
                styles.planCard,
                { backgroundColor: colors.successLight, borderColor: colors.success },
              ]}
              onPress={() => handlePlanPress(activePlan)}
            >
              <View style={styles.planCardContent}>
                <View style={styles.planCardLeft}>
                  <Text style={[styles.planCardTitle, { color: colors.text }]}>{activePlan.templateName}</Text>
                  <Text style={[styles.planCardMeta, { color: colors.textSecondary }]}>
                    Started {formatDate(activePlan.startDate)} · {activePlan.completedDays}/{activePlan.totalDays} days
                  </Text>
                </View>
                <View style={styles.planCardRight}>
                  <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                    <Text style={[styles.activeBadgeText, { color: colors.buttonText }]}>Active</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.shareButton, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => handleSharePlan(activePlan)}
                  >
                    <Text style={styles.shareIcon}>📤</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(activePlan.completedDays / activePlan.totalDays) * 100}%`, backgroundColor: colors.success },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Other Plans Section */}
        {otherPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Other Plans</Text>
            {otherPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
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
                  <View style={styles.planCardRight}>
                    <TouchableOpacity
                      style={[styles.shareButton, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => handleSharePlan(plan)}
                    >
                      <Text style={styles.shareIcon}>📤</Text>
                    </TouchableOpacity>
                  </View>
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
    paddingVertical: 20,
  },
  // Featured Section
  featuredSection: {
    marginBottom: 24,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  featuredSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuredScroll: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  featuredCard: {
    borderRadius: 16,
    padding: 18,
    marginRight: 12,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  featuredCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredEmoji: {
    fontSize: 32,
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  featuredCardDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  featuredCardFooter: {
    marginTop: 12,
  },
  featuredCardCta: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Regular sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  planCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planCardMeta: {
    fontSize: 12,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 14,
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
  myTemplatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  myTemplatesContent: {
    flex: 1,
  },
  myTemplatesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  myTemplatesSubtitle: {
    fontSize: 13,
  },
  myTemplatesArrow: {
    fontSize: 24,
    marginLeft: 12,
  },
});
