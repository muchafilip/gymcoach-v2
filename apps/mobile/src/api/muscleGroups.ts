import { apiClient } from './client';
import { MuscleGroup } from '../types';
import { cachedFetch } from './offlineSupport';

export const fetchMuscleGroups = async (): Promise<MuscleGroup[]> => {
  return cachedFetch('muscle-groups', async () => {
    const response = await apiClient.get('/MuscleGroups');
    return response.data;
  });
};
