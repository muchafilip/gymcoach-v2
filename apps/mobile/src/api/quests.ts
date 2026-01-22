import { apiClient } from './client';

export interface Quest {
  id: number;
  questId: number;
  code: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'onboarding' | 'achievement';
  xpReward: number;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  expiresAt: string | null;
}

export interface QuestClaimResult {
  xpAwarded: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  xpToNextLevel: number;
}

export const getQuests = async (): Promise<Quest[]> => {
  const response = await apiClient.get('/quests');
  return response.data;
};

export const claimQuest = async (userQuestId: number): Promise<QuestClaimResult> => {
  const response = await apiClient.post(`/quests/${userQuestId}/claim`);
  return response.data;
};

export const logRestDay = async (): Promise<void> => {
  await apiClient.post('/workouts/rest-day');
};
