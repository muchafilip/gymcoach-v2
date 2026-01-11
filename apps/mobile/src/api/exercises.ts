import { apiClient } from './client';
import { Exercise } from '../types';

export const getExercises = async (params?: {
  muscleGroupId?: number;
  equipmentIds?: number[];
}): Promise<Exercise[]> => {
  const queryParams = new URLSearchParams();

  if (params?.muscleGroupId) {
    queryParams.append('muscleGroupId', params.muscleGroupId.toString());
  }

  if (params?.equipmentIds && params.equipmentIds.length > 0) {
    params.equipmentIds.forEach(id => {
      queryParams.append('equipmentIds', id.toString());
    });
  }

  const queryString = queryParams.toString();
  const url = `/exercises${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get(url);
  return response.data;
};

export const getExercise = async (id: number): Promise<Exercise> => {
  const response = await apiClient.get(`/exercises/${id}`);
  return response.data;
};
