import { apiClient } from './client';
import { isOnline } from '../utils/network';

export type InsightType = 'plateau' | 'progress' | 'volume' | 'consistency' | 'streak';

export interface Insight {
  type: InsightType;
  title: string;
  message: string;
  suggestion?: string;
  exerciseName?: string;
  iconEmoji?: string;
}

/**
 * Get weekly insights for the authenticated user
 * This is a premium feature - check feature flag before calling
 */
export const getInsights = async (): Promise<Insight[]> => {
  if (!isOnline()) {
    return [];
  }

  try {
    const response = await apiClient.get<Insight[]>('/insights');
    return response.data;
  } catch (error) {
    console.warn('[Insights] Failed to get insights:', error);
    return [];
  }
};
