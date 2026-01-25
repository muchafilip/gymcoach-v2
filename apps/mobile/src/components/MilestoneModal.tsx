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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MilestoneModal() {
  const { colors } = useThemeStore();
  const { showMilestoneModal, milestoneWeeks, dismissMilestoneModal } = useProgressStore();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const trophyBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showMilestoneModal) {
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

      // Bounce trophy animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(trophyBounce, {
            toValue: -10,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(trophyBounce, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      trophyBounce.setValue(0);
    }
  }, [showMilestoneModal, scaleAnim, opacityAnim, trophyBounce]);

  const handleDismiss = (action: 'keep_going' | 'try_new') => {
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
      dismissMilestoneModal();
      if (action === 'try_new') {
        // Navigate to templates screen to browse new plans
        navigation.navigate('MainTabs', { screen: 'Plans' });
      }
    });
  };

  if (!showMilestoneModal) return null;

  return (
    <Modal
      transparent
      visible={showMilestoneModal}
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
              styles.trophy,
              { transform: [{ translateY: trophyBounce }] },
            ]}
          >
            🏆
          </Animated.Text>

          <Text style={[styles.title, { color: colors.primary }]}>MILESTONE!</Text>

          <View style={[styles.weeksCircle, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Text style={[styles.weeksNumber, { color: colors.success }]}>
              {milestoneWeeks}
            </Text>
            <Text style={[styles.weeksLabel, { color: colors.success }]}>WEEKS</Text>
          </View>

          <Text style={[styles.message, { color: colors.text }]}>
            Incredible dedication!
          </Text>
          <Text style={[styles.submessage, { color: colors.textSecondary }]}>
            You've completed {milestoneWeeks} weeks of consistent training.
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => handleDismiss('keep_going')}
            >
              <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                Keep Going!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => handleDismiss('try_new')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Try Something New
              </Text>
            </TouchableOpacity>
          </View>
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
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  trophy: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 24,
  },
  weeksCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  weeksNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  weeksLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  message: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 14,
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
