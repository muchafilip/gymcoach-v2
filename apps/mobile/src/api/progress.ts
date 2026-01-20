import { apiClient } from './client';
import { ProgressSummary, XpEvent } from '../types';
import { isOnline } from '../utils/network';

export const getProgress = async (): Promise<ProgressSummary | null> => {
  if (!isOnline()) {
    return null;
  }

  try {
    const response = await apiClient.get('/progress');
    return response.data;
  } catch (error) {
    console.warn('[Progress] Failed to get progress:', error);
    return null;
  }
};

export const getRecentXpEvents = async (count: number = 20): Promise<XpEvent[]> => {
  if (!isOnline()) {
    return [];
  }

  try {
    const response = await apiClient.get('/progress/events', { params: { count } });
    return response.data;
  } catch (error) {
    console.warn('[Progress] Failed to get XP events:', error);
    return [];
  }
};
