import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
// Dumbbell icon emoji
const DUMBBELL_ICON = '🏋️';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getHomeData } from '../api/workouts';
import { getLocalHomeData } from '../db/localData';
import { isOnline } from '../utils/network';
import { getInsights, Insight } from '../api/insights';
import { useThemeStore } from '../store/themeStore';
import { useProgressStore } from '../store/progressStore';
import { useFeature } from '../store/featureStore';
import XPBar from '../components/XPBar';
import LevelUpModal from '../components/LevelUpModal';
import InsightCard from '../components/InsightCard';
import TourOverlay from '../components/TourOverlay';
import { IfFeatureEnabled } from '../components/PremiumGate';
import { useOnboardingStore } from '../store/onboardingStore';
import { HomeData } from '../types';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDarkMode } = useThemeStore();
  const xpFeature = useFeature('xpSystem');
  const insightsFeature = useFeature('insights');
  const { loadProgress } = useProgressStore();
  const { hasSeenTour, startTour, setTargetMeasurement } = useOnboardingStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<HomeData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAllPRs, setShowAllPRs] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Refs for tour targeting
  const nextWorkoutRef = useRef<View>(null);
  const xpBarRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Trigger tour on first visit after data loads
  useEffect(() => {
    if (!loading && !hasSeenTour && data) {
      // Small delay to ensure UI is rendered
      const timer = setTimeout(() => {
        measureTourTargets();
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, hasSeenTour, data]);

  // Measure tour target positions
  const measureTourTargets = () => {
    // Measure next workout card
    if (nextWorkoutRef.current) {
      nextWorkoutRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetMeasurement('next-workout', { x, y, width, height });
        }
      });
    }

    // Measure XP bar
    if (xpBarRef.current) {
      xpBarRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetMeasurement('xp-bar', { x, y, width, height });
        }
      });
    }
  };

  const loadData = async () => {
    try {
      setError(null);

      // 1. Try local DB first (instant)
      try {
        const localData = await getLocalHomeData();
        if (localData) {
          setData(localData);
          setLoading(false); // Show immediately
        }
      } catch (localErr) {
        console.log('No local home data');
      }

      // 2. Fetch from API in background (if online)
      if (isOnline()) {
        try {
          const homeData = await getHomeData();
          setData(homeData);

          // Load XP progress if feature is available
          if (xpFeature.isAvailable) {
            loadProgress();
          }

          // Load insights if feature is available (premium)
          if (insightsFeature.isAvailable) {
            const insightsData = await getInsights();
            setInsights(insightsData.slice(0, 5)); // Show top 5 insights
          }
        } catch (apiErr) {
          console.log('API fetch failed, using local data');
          if (!data) {
            setError('Failed to load data');
          }
        }
      }
    } catch (err) {
      console.error('Error loading home data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStartWorkout = () => {
    if (data?.nextWorkout) {
      navigation.navigate('Templates', {
        screen: 'WorkoutDay',
        params: { dayId: data.nextWorkout.dayId },
      });
    }
  };

  const handleViewWorkout = (dayId: number) => {
    navigation.navigate('Templates', {
      screen: 'WorkoutDay',
      params: { dayId },
    });
  };

  const formatWeight = (weight: number) => {
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(1)}t`;
    }
    return `${Math.round(weight)}kg`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Shadow style helper - subtle for glass effect
  const cardShadow = isDarkMode ? {
    borderWidth: 1,
    borderColor: colors.border,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={[styles.retryButtonText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const visiblePRs = showAllPRs ? data?.personalRecords : data?.personalRecords?.slice(0, 3);
  const visibleRecent = showAllRecent ? data?.recentWorkouts : data?.recentWorkouts?.slice(0, 2);

  // Animated toggle functions
  const togglePRs = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllPRs(!showAllPRs);
  };

  const toggleRecent = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllRecent(!showAllRecent);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header with Stats */}
        <View style={styles.headerCompact}>
          <Text style={[styles.greetingCompact, { color: colors.text }]}>Welcome back!</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.statPillText, { color: colors.primary }]}>
                {formatWeight(data?.totalWeightLifted || 0)} lifted
              </Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.statPillText, { color: colors.success }]}>
                {data?.workoutsCompleted || 0} workouts
              </Text>
            </View>
          </View>
        </View>

        {/* Next Workout - TOP PRIORITY */}
        {data?.nextWorkout ? (
          <TouchableOpacity
            ref={nextWorkoutRef}
            style={[styles.nextWorkoutCard, cardShadow]}
            onPress={handleStartWorkout}
            activeOpacity={0.85}
          >
            <View style={[styles.nextWorkoutGradient, { backgroundColor: colors.primary }]}>
              <View style={styles.nextWorkoutHeader}>
                <View style={styles.nextUpBadge}>
                  <Text style={styles.nextUpText}>NEXT UP</Text>
                </View>
              </View>
              <Text style={styles.nextWorkoutName}>{data.nextWorkout.dayName}</Text>
              <Text style={styles.nextWorkoutMeta}>
                {data.nextWorkout.planName} • Week {data.nextWorkout.weekNumber}
              </Text>
              <View style={styles.startButtonContainer}>
                <View style={styles.startButton}>
                  <Text style={styles.startButtonText}>START WORKOUT</Text>
                  <Text style={styles.startButtonArrow}>→</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.emptyCard, { backgroundColor: colors.surface }, cardShadow]}
            onPress={() => navigation.navigate('Templates')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
              No active plan
            </Text>
            <Text style={[styles.emptyCardSubtext, { color: colors.primary }]}>
              Tap to browse templates →
            </Text>
          </TouchableOpacity>
        )}

        {/* XP Progress Bar + Quests */}
        <View ref={xpBarRef} collapsable={false}>
          <XPBar />
        </View>

        {/* Weekly Insights - Horizontal Scroll */}
        <IfFeatureEnabled feature="insights">
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.insightsScroll}
              >
                {insights.map((insight, index) => (
                  <InsightCard key={`${insight.type}-${index}`} insight={insight} />
                ))}
              </ScrollView>
            </View>
          )}
        </IfFeatureEnabled>

        {/* Personal Bests - Collapsible */}
        {data?.personalRecords && data.personalRecords.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={togglePRs}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🏆</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Bests</Text>
              </View>
              <View style={styles.expandToggleRow}>
                {!showAllPRs && data.personalRecords.length > 3 && (
                  <Text style={[styles.expandCount, { color: colors.textMuted }]}>
                    +{data.personalRecords.length - 3}
                  </Text>
                )}
                <View style={[styles.chevronCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                    {showAllPRs ? '▲' : '▼'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={[styles.prsContainer, { backgroundColor: colors.surface }, cardShadow]}>
              {visiblePRs?.map((pr, index) => (
                <View
                  key={pr.exerciseId}
                  style={[
                    styles.prRow,
                    index < (visiblePRs?.length || 0) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.prExercise, { color: colors.text }]} numberOfLines={1}>
                    {pr.exerciseName}
                  </Text>
                  <View style={[styles.prBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.prValue, { color: colors.primary }]}>
                      {pr.bestSetReps}×{pr.bestSetWeight}kg
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity - Collapsible */}
        {data?.recentWorkouts && data.recentWorkouts.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={toggleRecent}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>📅</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
              </View>
              <View style={styles.expandToggleRow}>
                {!showAllRecent && data.recentWorkouts.length > 2 && (
                  <Text style={[styles.expandCount, { color: colors.textMuted }]}>
                    +{data.recentWorkouts.length - 2}
                  </Text>
                )}
                <View style={[styles.chevronCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                    {showAllRecent ? '▲' : '▼'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {visibleRecent?.map((workout, index) => (
              <TouchableOpacity
                key={workout.id}
                style={[
                  styles.recentCard,
                  { backgroundColor: colors.surface },
                  cardShadow,
                  index < (visibleRecent?.length || 0) - 1 && { marginBottom: 8 }
                ]}
                onPress={() => handleViewWorkout(workout.id)}
                activeOpacity={0.8}
              >
                <View style={styles.recentLeft}>
                  <Text style={[styles.recentName, { color: colors.text }]}>{workout.name}</Text>
                  <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
                    {workout.exerciseCount} exercises • {formatDate(workout.completedAt)}
                  </Text>
                </View>
                <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[styles.arrowText, { color: colors.primary }]}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <LevelUpModal />
      <TourOverlay />
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
    borderRadius: 12,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  // Header
  headerCompact: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  greetingCompact: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Next Workout Card
  nextWorkoutCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  nextWorkoutGradient: {
    padding: 20,
  },
  nextWorkoutHeader: {
    marginBottom: 8,
  },
  nextUpBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  nextUpText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nextWorkoutName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  nextWorkoutMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  startButtonContainer: {
    marginTop: 16,
  },
  startButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  startButtonArrow: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '600',
  },
  // Empty Card
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyCardSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  expandToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 9,
  },
  // Insights Horizontal Scroll
  insightsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  // Personal Bests
  prsContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  prExercise: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  prBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  prValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Recent Activity
  recentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  recentLeft: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100, // Extra padding for floating tab bar
  },
});
