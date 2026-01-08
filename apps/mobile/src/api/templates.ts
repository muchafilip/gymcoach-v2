import { apiClient } from './client';
import { WorkoutTemplate } from '../types';

export const fetchTemplates = async (includePremium = true): Promise<WorkoutTemplate[]> => {
  const response = await apiClient.get<WorkoutTemplate[]>('/workouttemplates', {
    params: { includePremium },
  });
  return response.data;
};

export const fetchTemplateDetail = async (id: number) => {
  const response = await apiClient.get(`/workouttemplates/${id}`);
  return response.data;
};
