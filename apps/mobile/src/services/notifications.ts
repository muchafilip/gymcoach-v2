import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as notificationsApi from '../api/notifications';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type { NotificationPreferences } from '../api/notifications';

/**
 * Request notification permissions and register for push notifications
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    const token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    // Store token locally
    await AsyncStorage.setItem('pushToken', token);

    // Register token with backend
    await registerTokenWithBackend(token);

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await notificationsApi.registerPushToken(
      token,
      Platform.OS,
      Device.deviceName || undefined
    );
    console.log('[Notifications] Token registered with backend');
  } catch (error) {
    console.error('[Notifications] Failed to register token:', error);
  }
}

const DEFAULT_PREFERENCES: notificationsApi.NotificationPreferences = {
  enabled: true,
  workoutReminder: true,
  workoutReminderTime: '09:00',
  streakReminder: true,
  streakReminderTime: '19:00',
  questReminder: true,
  weeklyGoalReminder: true,
  restDayReminder: false,
};

/**
 * Get notification preferences (from backend with local fallback)
 */
export async function getNotificationPreferences(): Promise<notificationsApi.NotificationPreferences> {
  try {
    // Try backend first
    const prefs = await notificationsApi.getNotificationPreferences();
    // Cache locally
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    return prefs;
  } catch (error) {
    console.warn('[Notifications] Failed to load from backend, using local cache');
    // Fall back to local cache
    try {
      const stored = await AsyncStorage.getItem('notificationPreferences');
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('[Notifications] Failed to load local preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save notification preferences
 */
export async function saveNotificationPreferences(
  prefs: notificationsApi.NotificationPreferences
): Promise<void> {
  try {
    // Save to backend
    await notificationsApi.updateNotificationPreferences(prefs);

    // Cache locally
    await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));

    // Reschedule local notifications based on new preferences
    await scheduleLocalNotifications(prefs);
  } catch (error) {
    console.error('[Notifications] Failed to save preferences:', error);
    throw error;
  }
}

/**
 * Schedule local notifications (workout reminders)
 */
export async function scheduleLocalNotifications(
  prefs: notificationsApi.NotificationPreferences
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!prefs.enabled) return;

  // Schedule daily workout reminder
  if (prefs.workoutReminder) {
    const [hours, minutes] = prefs.workoutReminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to train!',
        body: 'Your workout is waiting. Let\'s crush it today!',
        data: { type: 'workout_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
    console.log(`[Notifications] Scheduled daily workout reminder at ${prefs.workoutReminderTime}`);
  }

  // Schedule streak reminder
  if (prefs.streakReminder) {
    const [hours, minutes] = prefs.streakReminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Don\'t lose your streak!',
        body: 'You haven\'t worked out today. Keep your streak alive!',
        data: { type: 'streak_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
    console.log(`[Notifications] Scheduled streak reminder at ${prefs.streakReminderTime}`);
  }
}

/**
 * Send immediate local notification (for testing or local triggers)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null, // Immediate
  });
}

/**
 * Handle notification response (when user taps notification)
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Handle notification received (when notification arrives)
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}
