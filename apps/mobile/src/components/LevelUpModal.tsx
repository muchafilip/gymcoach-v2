import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '../store/themeStore';
import { useProgressStore } from '../store/progressStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LevelUpModal() {
  const { colors } = useThemeStore();
  const { showLevelUpModal, newLevel, unlockedPlan, dismissLevelUpModal } = useProgressStore();

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showLevelUpModal) {
      // Haptic feedback for celebration
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate stars
      Animated.loop(
        Animated.sequence([
          Animated.timing(starAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(starAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      starAnim.setValue(0);
    }
  }, [showLevelUpModal, scaleAnim, opacityAnim, starAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissLevelUpModal();
    });
  };

  const starRotate = starAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!showLevelUpModal) return null;

  return (
    <Modal
      transparent
      visible={showLevelUpModal}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.content,
            { backgroundColor: colors.surface },
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.star,
              { transform: [{ rotate: starRotate }] },
            ]}
          >
            ⭐
          </Animated.Text>

          <Text style={[styles.title, { color: colors.text }]}>LEVEL UP!</Text>

          <View style={[styles.levelCircle, { backgroundColor: colors.primary }]}>
            <Text style={[styles.levelNumber, { color: colors.buttonText }]}>
              {newLevel}
            </Text>
          </View>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            You've reached Level {newLevel}!
          </Text>

          {unlockedPlan ? (
            <View style={[styles.rewardContainer, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.rewardIcon}>🎁</Text>
              <Text style={[styles.rewardTitle, { color: colors.primary }]}>
                REWARD UNLOCKED!
              </Text>
              <Text style={[styles.rewardPlanName, { color: colors.text }]}>
                {unlockedPlan.planName}
              </Text>
              <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>
                You can now access this premium plan for free!
              </Text>
            </View>
          ) : (
            <Text style={[styles.submessage, { color: colors.textMuted }]}>
              Keep pushing, champion!
            </Text>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleDismiss}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              Awesome!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  star: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 24,
  },
  levelCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  submessage: {
    fontSize: 14,
    marginBottom: 24,
  },
  rewardContainer: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  rewardPlanName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
