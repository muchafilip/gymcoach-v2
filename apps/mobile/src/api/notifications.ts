import { apiClient } from './client';

export interface NotificationPreferences {
  enabled: boolean;
  workoutReminder: boolean;
  workoutReminderTime: string; // "HH:mm" format
  streakReminder: boolean;
  streakReminderTime: string;
  questReminder: boolean;
  weeklyGoalReminder: boolean;
  restDayReminder: boolean;
}

export interface DeviceToken {
  id: number;
  platform: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

/**
 * Register a push token with the backend
 */
export async function registerPushToken(
  token: string,
  platform: string,
  deviceName?: string
): Promise<void> {
  await apiClient.post('/notifications/register', {
    token,
    platform,
    deviceName,
  });
}

/**
 * Unregister a push token
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await apiClient.delete(`/notifications/token?token=${encodeURIComponent(token)}`);
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get('/notifications/preferences');
  return response.data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await apiClient.put('/notifications/preferences', prefs);
}

/**
 * Get active device tokens (for debugging)
 */
export async function getActiveTokens(): Promise<DeviceToken[]> {
  const response = await apiClient.get('/notifications/tokens');
  return response.data;
}
