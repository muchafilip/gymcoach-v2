import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store/themeStore';
import { useOnboardingStore, TOUR_STEPS } from '../store/onboardingStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPOTLIGHT_PADDING = 8;

export default function TourOverlay() {
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const {
    isTourActive,
    currentStepIndex,
    targetMeasurements,
    nextStep,
    skipTour,
    isLastStep,
  } = useOnboardingStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const measurement = currentStep ? targetMeasurements[currentStep.targetRef] : null;

  useEffect(() => {
    if (isTourActive) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(tooltipAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      tooltipAnim.setValue(0);
    }
  }, [isTourActive, fadeAnim, tooltipAnim]);

  useEffect(() => {
    if (isTourActive && currentStepIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Animate tooltip bounce on step change
      tooltipAnim.setValue(0.8);
      Animated.spring(tooltipAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStepIndex, isTourActive, tooltipAnim]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipTour();
  };

  if (!isTourActive || !currentStep) return null;

  // Calculate spotlight position
  const spotlightStyle = measurement
    ? {
        left: measurement.x - SPOTLIGHT_PADDING,
        top: measurement.y - SPOTLIGHT_PADDING,
        width: measurement.width + SPOTLIGHT_PADDING * 2,
        height: measurement.height + SPOTLIGHT_PADDING * 2,
        borderRadius: Math.min(measurement.width, measurement.height) / 2 + SPOTLIGHT_PADDING,
      }
    : null;

  // Determine tooltip position (above or below spotlight)
  const tooltipBelow = measurement ? measurement.y < SCREEN_HEIGHT / 2 : true;
  const tooltipTop = measurement
    ? tooltipBelow
      ? measurement.y + measurement.height + SPOTLIGHT_PADDING + 20
      : measurement.y - SPOTLIGHT_PADDING - 180
    : SCREEN_HEIGHT / 2 - 90;

  return (
    <Modal
      transparent
      visible={isTourActive}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Dark overlay with cutout */}
        <View style={styles.overlayBackground}>
          {spotlightStyle && (
            <View
              style={[
                styles.spotlight,
                spotlightStyle,
                { borderColor: colors.primary },
              ]}
            />
          )}
        </View>

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: colors.surface,
              top: tooltipTop,
              transform: [{ scale: tooltipAnim }],
            },
          ]}
        >
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {TOUR_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      index === currentStepIndex
                        ? colors.primary
                        : colors.textMuted,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.tooltipTitle, { color: colors.text }]}>
            {currentStep.title}
          </Text>
          <Text style={[styles.tooltipDescription, { color: colors.textSecondary }]}>
            {currentStep.description}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
                Skip Tour
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
            >
              <Text style={[styles.nextButtonText, { color: colors.buttonText }]}>
                {isLastStep() ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    // The spotlight effect is created by the border
    // The actual "hole" effect would require a more complex SVG mask
    // For simplicity, we highlight the area with a border
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltip: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
