import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { useFeature, FeatureFlag } from '../store/featureStore';

interface PremiumGateProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  // Optional: inline mode shows a small badge instead of blocking
  inline?: boolean;
  // Optional: custom message
  message?: string;
}

export default function PremiumGate({
  feature,
  children,
  inline = false,
  message,
}: PremiumGateProps) {
  const { colors } = useThemeStore();
  const { isAvailable, showPremiumGate } = useFeature(feature);

  // Feature is available, render children
  if (isAvailable) {
    return <>{children}</>;
  }

  // Feature not enabled at all (kill switch)
  if (!showPremiumGate) {
    return null;
  }

  // Show premium gate
  if (inline) {
    return (
      <View style={styles.inlineContainer}>
        {children}
        <View style={[styles.inlineBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.inlineBadgeText}>PRO</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.badge, { backgroundColor: colors.warning }]}>
        <Text style={styles.badgeText}>PREMIUM</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        {message || 'Upgrade to Premium'}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        This feature requires a premium subscription.
      </Text>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          // TODO: Navigate to subscription screen
          console.log('Navigate to premium');
        }}
      >
        <Text style={[styles.upgradeButtonText, { color: colors.buttonText }]}>
          Upgrade Now
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Simpler component for conditional rendering
export function IfFeatureEnabled({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAvailable } = useFeature(feature);
  return isAvailable ? <>{children}</> : <>{fallback}</>;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    margin: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inlineContainer: {
    position: 'relative',
  },
  inlineBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inlineBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
