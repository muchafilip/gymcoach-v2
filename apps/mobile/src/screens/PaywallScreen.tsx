import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useFeatureStore } from '../store/featureStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPurchasesAvailable,
} from '../services/purchases';

// Type for package (avoiding direct import from react-native-purchases in Expo Go)
interface PackageOption {
  identifier: string;
  packageType: string;
  product: {
    priceString: string;
  };
}

const PREMIUM_FEATURES = [
  'Supersets with antagonist muscle groups',
  'Custom rep schemes (EMOM, AMRAP)',
  'Advanced workout analytics & charts',
  'Visual progress graphs over time',
  'Smart weight & rep suggestions',
  'XP system, levels & streaks',
];

// Type for offering
interface OfferingOption {
  availablePackages: PackageOption[];
}

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const { setPremiumStatus, toggleDevMode, devModeEnabled } = useFeatureStore();

  const [offering, setOffering] = useState<OfferingOption | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const purchasesAvailable = isPurchasesAvailable();

  useEffect(() => {
    if (purchasesAvailable) {
      loadOfferings();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      const currentOffering = await getOfferings();
      setOffering(currentOffering);
      // Select the first package by default (usually monthly)
      if (currentOffering?.availablePackages?.length) {
        setSelectedPackage(currentOffering.availablePackages[0]);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
      Alert.alert('Error', 'Failed to load subscription options. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan.');
      return;
    }

    try {
      setIsPurchasing(true);
      const isPremium = await purchasePackage(selectedPackage);
      if (isPremium) {
        setPremiumStatus(true);
        Alert.alert('Success', 'Welcome to GymCoach Premium!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      // User cancelled is not an error
      if (error.userCancelled) {
        return;
      }
      console.error('Purchase failed:', error);
      Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const isPremium = await restorePurchases();
      if (isPremium) {
        setPremiumStatus(true);
        Alert.alert('Success', 'Your purchases have been restored!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'We could not find any previous purchases to restore.');
      }
    } catch (error: any) {
      console.error('Restore failed:', error);
      Alert.alert('Restore Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderPackageOption = (pkg: PackageOption) => {
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const isYearly = pkg.packageType === 'ANNUAL';

    return (
      <TouchableOpacity
        key={pkg.identifier}
        style={[
          styles.packageOption,
          {
            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setSelectedPackage(pkg)}
        disabled={isPurchasing}
      >
        <View style={styles.packageContent}>
          <View style={styles.packageHeader}>
            <Text style={[styles.packageTitle, { color: colors.text }]}>
              {isYearly ? 'Yearly' : 'Monthly'}
            </Text>
            {isYearly && (
              <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.saveBadgeText}>SAVE 40%</Text>
              </View>
            )}
          </View>
          <Text style={[styles.packagePrice, { color: colors.text }]}>
            {pkg.product.priceString}
            <Text style={[styles.packagePeriod, { color: colors.textSecondary }]}>
              {isYearly ? '/year' : '/month'}
            </Text>
          </Text>
        </View>
        <View
          style={[
            styles.radioOuter,
            { borderColor: isSelected ? colors.primary : colors.border },
          ]}
        >
          {isSelected && (
            <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close Button */}
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.surface }]}
        onPress={handleClose}
      >
        <Text style={[styles.closeButtonText, { color: colors.text }]}>X</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.primary }]}>GymCoach</Text>
          <Text style={[styles.title, { color: colors.text }]}>Unlock Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Get the most out of your workouts
          </Text>
        </View>

        {/* Features List */}
        <View style={[styles.featuresCard, { backgroundColor: colors.surface }]}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Subscription Options */}
        {!purchasesAvailable ? (
          <View style={styles.devModeContainer}>
            <View style={[styles.devModeCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <Text style={[styles.devModeTitle, { color: colors.text }]}>
                Running in Expo Go
              </Text>
              <Text style={[styles.devModeText, { color: colors.textSecondary }]}>
                In-app purchases require a development build. Use Dev Mode to test premium features.
              </Text>
              <TouchableOpacity
                style={[
                  styles.devModeButton,
                  { backgroundColor: devModeEnabled ? colors.success : colors.primary },
                ]}
                onPress={() => {
                  toggleDevMode();
                  if (!devModeEnabled) {
                    Alert.alert('Dev Mode Enabled', 'All premium features are now unlocked for testing.', [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  }
                }}
              >
                <Text style={[styles.devModeButtonText, { color: colors.buttonText }]}>
                  {devModeEnabled ? 'Dev Mode: ON' : 'Enable Dev Mode'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading options...
            </Text>
          </View>
        ) : offering?.availablePackages?.length ? (
          <View style={styles.packagesContainer}>
            {offering.availablePackages.map(renderPackageOption)}
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              No subscription options available.
            </Text>
            <TouchableOpacity onPress={loadOfferings}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Continue Button - only show when purchases available */}
        {purchasesAvailable && (
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              (isPurchasing || !selectedPackage) && styles.buttonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPackage}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[styles.continueButtonText, { color: colors.buttonText }]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Restore Purchases - only show when purchases available */}
        {purchasesAvailable && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textMuted }]}>
          {purchasesAvailable
            ? 'Subscriptions will automatically renew unless canceled within 24-hours before the end of the current period. You can cancel anytime in your App Store settings.'
            : 'Dev Mode unlocks all premium features for testing purposes only.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  featuresCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  packagesContainer: {
    marginBottom: 24,
  },
  packageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  packageContent: {
    flex: 1,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  packagePeriod: {
    fontSize: 14,
    fontWeight: '400',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  devModeContainer: {
    marginBottom: 24,
  },
  devModeCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
  },
  devModeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  devModeText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  devModeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  devModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
