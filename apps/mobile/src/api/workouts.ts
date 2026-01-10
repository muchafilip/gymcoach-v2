import { apiClient } from './client';
import { ExerciseAlternative, HomeData, UserWorkoutDay } from '../types';
import { cachedFetch, offlineWrite, invalidateCache } from './offlineSupport';
import { getDatabase } from '../db/init';

// ============================================
// READ OPERATIONS - with offline cache support
// ============================================

export const getHomeData = async (): Promise<HomeData> => {
  return cachedFetch('home', async () => {
    const response = await apiClient.get('/workouts/home');
    return response.data;
  });
};

export const getWorkoutDay = async (dayId: number): Promise<UserWorkoutDay> => {
  return cachedFetch(`day-${dayId}`, async () => {
    const response = await apiClient.get(`/workouts/days/${dayId}`);
    return response.data;
  });
};

export const getWorkoutPlanDetail = async (planId: number) => {
  return cachedFetch(`plan-${planId}`, async () => {
    const response = await apiClient.get(`/workouts/plans/${planId}`);
    return response.data;
  });
};

export const getWorkoutHistory = async (): Promise<WorkoutHistory[]> => {
  return cachedFetch('history', async () => {
    const response = await apiClient.get('/workouts/history');
    return response.data;
  });
};

export const getUserPlans = async () => {
  return cachedFetch('plans', async () => {
    const response = await apiClient.get('/workouts/plans');
    return response.data;
  });
};

export const getActivePlan = async () => {
  return cachedFetch('active-plan', async () => {
    try {
      const response = await apiClient.get('/workouts/active-plan');
      return response.data;
    } catch (error: unknown) {
      if ((error as { response?: { status: number } }).response?.status === 404) {
        return null;
      }
      throw error;
    }
  });
};

export const getCurrentWorkout = async (planId: number) => {
  return cachedFetch(`current-${planId}`, async () => {
    const response = await apiClient.get(`/workouts/plans/${planId}/current`);
    return response.data;
  });
};

export const getExerciseAlternatives = async (
  exerciseId: number
): Promise<ExerciseAlternative[]> => {
  return cachedFetch(`alternatives-${exerciseId}`, async () => {
    const response = await apiClient.get(
      `/workouts/exercises/alternatives/${exerciseId}`
    );
    return response.data;
  });
};

// ============================================
// WRITE OPERATIONS - with offline queue support
// ============================================

export const updateSet = async (setId: number, data: {
  actualReps?: number;
  weight?: number;
  completed?: boolean;
}) => {
  return offlineWrite(
    // API call
    async () => {
      const response = await apiClient.put(`/workouts/sets/${setId}`, data);
      return response.data;
    },
    // Local SQLite update
    async () => {
      const db = getDatabase();
      await db.runAsync(
        `UPDATE ExerciseSet SET
          actual_reps = COALESCE(?, actual_reps),
          weight = COALESCE(?, weight),
          completed = COALESCE(?, completed)
         WHERE id = ?`,
        [
          data.actualReps ?? null,
          data.weight ?? null,
          data.completed !== undefined ? (data.completed ? 1 : 0) : null,
          setId
        ]
      );
    },
    // Queue item
    { table: 'ExerciseSet', id: setId, op: 'UPDATE', data }
  );
};

export const completeWorkoutDay = async (dayId: number) => {
  return offlineWrite(
    // API call
    async () => {
      const response = await apiClient.post(`/workouts/days/${dayId}/complete`);
      return response.data;
    },
    // Local SQLite update
    async () => {
      const db = getDatabase();
      await db.runAsync(
        `UPDATE UserWorkoutDay SET completed_at = datetime('now') WHERE id = ?`,
        [dayId]
      );
    },
    // Queue item
    { table: 'UserWorkoutDay', id: dayId, op: 'COMPLETE', data: {} }
  );
};

// ============================================
// MUTATION OPERATIONS - online only, invalidate cache
// ============================================

export const generateWorkoutPlan = async (
  templateId: number,
  durationWeeks: number = 4
) => {
  const response = await apiClient.post('/workouts/generate', {
    templateId,
    durationWeeks,
  });
  // Invalidate related caches
  await invalidateCache('plans');
  await invalidateCache('home');
  await invalidateCache('active-plan');
  return response.data;
};

export const activatePlan = async (planId: number) => {
  const response = await apiClient.post(`/workouts/plans/${planId}/activate`);
  // Invalidate related caches
  await invalidateCache('plans');
  await invalidateCache('home');
  await invalidateCache('active-plan');
  return response.data;
};

export const deactivatePlan = async (planId: number) => {
  const response = await apiClient.post(`/workouts/plans/${planId}/deactivate`);
  return response.data;
};

export const deletePlan = async (planId: number) => {
  const response = await apiClient.delete(`/workouts/plans/${planId}/delete`);
  return response.data;
};

export const substituteExercise = async (
  exerciseLogId: number,
  newExerciseId: number
) => {
  const response = await apiClient.post(
    `/workouts/exercises/${exerciseLogId}/substitute/${newExerciseId}`
  );
  return response.data;
};

// ============================================
// Types
// ============================================

export interface WorkoutHistory {
  id: number;
  dayName: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
}
