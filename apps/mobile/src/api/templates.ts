import { apiClient } from './client';
import { CustomTemplate, CustomTemplateDay, CustomTemplateExercise, WorkoutTemplate } from '../types';
import { cachedFetch, invalidateCache } from './offlineSupport';
import { isOnline } from '../utils/network';
import { getLocalTemplates } from '../db/localData';

export const fetchTemplates = async (includePremium = true): Promise<WorkoutTemplate[]> => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get<WorkoutTemplate[]>('/workouttemplates', {
        params: { includePremium },
      });
      return response.data;
    } catch (error) {
      console.warn('[Offline] Templates API failed, using local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading templates from SQLite');
  return getLocalTemplates();
};

export const fetchTemplateDetail = async (id: number) => {
  const response = await apiClient.get(`/workouttemplates/${id}`);
  return response.data;
};

// ============================================
// Custom Templates - GET operations
// ============================================

export const getMyTemplates = async (): Promise<CustomTemplate[]> => {
  return cachedFetch('my-templates', async () => {
    const response = await apiClient.get('/workouttemplates/my');
    return response.data;
  });
};

export const getCustomTemplate = async (templateId: number): Promise<CustomTemplate> => {
  return cachedFetch(`custom-template-${templateId}`, async () => {
    const response = await apiClient.get(`/workouttemplates/custom/${templateId}`);
    return response.data;
  });
};

// ============================================
// Custom Templates - Template CRUD
// ============================================

export const createCustomTemplate = async (
  name: string,
  description?: string
): Promise<CustomTemplate> => {
  const response = await apiClient.post('/workouttemplates/custom', { name, description });
  await invalidateCache('my-templates');
  return response.data;
};

export const updateCustomTemplate = async (
  templateId: number,
  data: { name?: string; description?: string }
): Promise<CustomTemplate> => {
  const response = await apiClient.put(`/workouttemplates/custom/${templateId}`, data);
  await invalidateCache('my-templates');
  await invalidateCache(`custom-template-${templateId}`);
  return response.data;
};

export const deleteCustomTemplate = async (templateId: number): Promise<void> => {
  await apiClient.delete(`/workouttemplates/custom/${templateId}`);
  await invalidateCache('my-templates');
  await invalidateCache(`custom-template-${templateId}`);
};

// ============================================
// Custom Templates - Day CRUD
// ============================================

export const addTemplateDay = async (
  templateId: number,
  name: string
): Promise<CustomTemplateDay> => {
  const response = await apiClient.post(`/workouttemplates/custom/${templateId}/days`, { name });
  await invalidateCache('my-templates');
  await invalidateCache(`custom-template-${templateId}`);
  return response.data;
};

export const updateTemplateDay = async (
  dayId: number,
  name: string
): Promise<CustomTemplateDay> => {
  const response = await apiClient.put(`/workouttemplates/custom/days/${dayId}`, { name });
  await invalidateCache('my-templates');
  return response.data;
};

export const deleteTemplateDay = async (dayId: number): Promise<void> => {
  await apiClient.delete(`/workouttemplates/custom/days/${dayId}`);
  await invalidateCache('my-templates');
};

// ============================================
// Custom Templates - Exercise CRUD
// ============================================

export const addTemplateExercise = async (
  dayId: number,
  data: {
    exerciseId: number;
    sets?: number;
    targetReps?: number;
    defaultWeight?: number;
    notes?: string;
  }
): Promise<CustomTemplateExercise> => {
  const response = await apiClient.post(`/workouttemplates/custom/days/${dayId}/exercises`, data);
  await invalidateCache('my-templates');
  return response.data;
};

export const updateTemplateExercise = async (
  exerciseId: number,
  data: {
    sets?: number;
    targetReps?: number;
    defaultWeight?: number;
    notes?: string;
  }
): Promise<CustomTemplateExercise> => {
  const response = await apiClient.put(`/workouttemplates/custom/exercises/${exerciseId}`, data);
  await invalidateCache('my-templates');
  return response.data;
};

export const deleteTemplateExercise = async (exerciseId: number): Promise<void> => {
  await apiClient.delete(`/workouttemplates/custom/exercises/${exerciseId}`);
  await invalidateCache('my-templates');
};

export const reorderExercises = async (
  dayId: number,
  exerciseIds: number[]
): Promise<void> => {
  await apiClient.put(`/workouttemplates/custom/days/${dayId}/reorder`, { exerciseIds });
  await invalidateCache('my-templates');
};
