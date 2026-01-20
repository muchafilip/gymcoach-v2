import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Only import Purchases when not in Expo Go
let Purchases: typeof import('react-native-purchases').default | null = null;
let isConfigured = false;

// Check if we're running in Expo Go (no native modules available)
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    console.warn('RevenueCat not available:', e);
  }
}

// RevenueCat API Keys:
// - test_* = Sandbox (for development/TestFlight)
// - appl_* = Production (after connecting App Store Connect)
// - sk_* = Secret (NEVER use in client code)
const REVENUECAT_API_KEY = 'test_szQbEWfqQgENYCtQxolwgDfnLvO';
const ENTITLEMENT_ID = 'gymchoach2 Pro'; // Must match RevenueCat dashboard 

export const initPurchases = async (userId?: string) => {
  if (!Purchases || isExpoGo) {
    console.log('[Purchases] Skipping init - running in Expo Go or native module unavailable');
    return;
  }

  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId,
    });
    isConfigured = true;
    console.log('[Purchases] Initialized successfully');
  } catch (e) {
    console.warn('[Purchases] Failed to initialize:', e);
  }
};

export const checkPremiumStatus = async (): Promise<boolean> => {
  if (!Purchases || !isConfigured) {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.warn('RevenueCat error:', e);
    return false;
  }
};

export const getOfferings = async () => {
  if (!Purchases || !isConfigured) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export type { PurchasesPackage } from 'react-native-purchases';

export const purchasePackage = async (pkg: any) => {
  if (!Purchases || !isConfigured) {
    throw new Error('Purchases not available');
  }

  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active['premium'] !== undefined;
};

export const restorePurchases = async (): Promise<boolean> => {
  if (!Purchases || !isConfigured) {
    return false;
  }

  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active['premium'] !== undefined;
};

export const addPurchaseListener = (callback: (info: any) => void) => {
  if (!Purchases || !isConfigured) {
    return;
  }

  Purchases.addCustomerInfoUpdateListener(callback);
};

export const isPurchasesAvailable = () => !isExpoGo && Purchases !== null;

// Paywall UI
let RevenueCatUI: typeof import('react-native-purchases-ui').default | null = null;
let PAYWALL_RESULT: typeof import('react-native-purchases-ui').PAYWALL_RESULT | null = null;

if (!isExpoGo) {
  try {
    const ui = require('react-native-purchases-ui');
    RevenueCatUI = ui.default;
    PAYWALL_RESULT = ui.PAYWALL_RESULT;
  } catch (e) {
    console.warn('RevenueCat UI not available:', e);
  }
}

export const presentPaywall = async (): Promise<boolean> => {
  if (!RevenueCatUI || !PAYWALL_RESULT || isExpoGo) {
    console.log('[Purchases] Paywall not available in Expo Go');
    return false;
  }

  try {
    const result = await RevenueCatUI.presentPaywall();

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        return true;
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
      default:
        return false;
    }
  } catch (e) {
    console.warn('[Purchases] Paywall error:', e);
    return false;
  }
};
