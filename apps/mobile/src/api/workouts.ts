import { apiClient } from './client';
import { ExerciseAlternative, ExerciseSet, HomeData, SetTarget, UserExercise, UserWorkoutDay, WorkoutCompleteResponse } from '../types';
import { cachedFetch, offlineWrite, invalidateCache } from './offlineSupport';
import { getDatabase } from '../db/init';
import { getLocalHomeData, getLocalWorkoutDay, getLocalActivePlan, getLocalUserPlans, getLocalWorkoutPlanDetail } from '../db/localData';
import { isOnline } from '../utils/network';
import { syncWorkoutPlan } from '../db/sync';

// ============================================
// READ OPERATIONS - with offline cache support
// ============================================

export const getHomeData = async (): Promise<HomeData> => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get('/workouts/home');
      const data = response.data;

      // Sync the active plan to SQLite for offline access
      if (data.nextWorkout?.planId) {
        syncWorkoutPlan(data.nextWorkout.planId).catch(err =>
          console.warn('[Sync] Failed to sync active plan from home:', err)
        );
      }

      return data;
    } catch (error) {
      console.warn('[Offline] API failed, falling back to local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading home data from SQLite');
  return getLocalHomeData();
};

export const getWorkoutDay = async (dayId: number): Promise<UserWorkoutDay> => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get(`/workouts/days/${dayId}`);
      return response.data;
    } catch (error) {
      console.warn('[Offline] API failed, falling back to local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading workout day from SQLite');
  const localDay = await getLocalWorkoutDay(dayId);
  if (!localDay) {
    throw new Error('Workout day not found locally');
  }
  return localDay;
};

export const getWorkoutPlanDetail = async (planId: number) => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get(`/workouts/plans/${planId}`);

      // Sync the plan to SQLite for offline access
      syncWorkoutPlan(planId).catch(err =>
        console.warn('[Sync] Failed to sync plan detail:', err)
      );

      return response.data;
    } catch (error) {
      console.warn('[Offline] Plan detail API failed, using local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading plan detail from SQLite');
  return getLocalWorkoutPlanDetail(planId);
};

export const getWorkoutHistory = async (): Promise<WorkoutHistory[]> => {
  // Bypass cache to get fresh data with exercises
  const response = await apiClient.get('/workouts/history');
  return response.data;
};

export const getUserPlans = async () => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get('/workouts/plans');
      return response.data;
    } catch (error) {
      console.warn('[Offline] User plans API failed, using local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading user plans from SQLite');
  return getLocalUserPlans();
};

export const getActivePlan = async () => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get('/workouts/active-plan');
      const plan = response.data;

      // Sync the plan to SQLite for offline access
      if (plan && plan.id) {
        syncWorkoutPlan(plan.id).catch(err =>
          console.warn('[Sync] Failed to sync active plan:', err)
        );
      }

      return plan;
    } catch (error: unknown) {
      if ((error as { response?: { status: number } }).response?.status === 404) {
        return null;
      }
      console.warn('[Offline] API failed, falling back to local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading active plan from SQLite');
  return getLocalActivePlan();
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

export const getProgression = async (exerciseId: number): Promise<SetTarget | null> => {
  if (!isOnline()) {
    return null; // Progressive overload requires online for now
  }

  try {
    const response = await apiClient.get(`/workouts/progression/${exerciseId}`);
    return response.data;
  } catch (error) {
    console.warn('[Progression] Failed to get progression:', error);
    return null;
  }
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

export const startWorkoutDay = async (dayId: number) => {
  return offlineWrite(
    // API call
    async () => {
      const response = await apiClient.post(`/workouts/days/${dayId}/start`);
      return response.data;
    },
    // Local SQLite update
    async () => {
      const db = getDatabase();
      await db.runAsync(
        `UPDATE UserWorkoutDay SET started_at = datetime('now') WHERE id = ?`,
        [dayId]
      );
    },
    // Queue item
    { table: 'UserWorkoutDay', id: dayId, op: 'START', data: {} }
  );
};

export const completeWorkoutDay = async (dayId: number, durationSeconds?: number): Promise<WorkoutCompleteResponse | null> => {
  const db = getDatabase();

  // Always update SQLite first (optimistic update)
  await db.runAsync(
    `UPDATE UserWorkoutDay SET completed_at = datetime('now'), duration_seconds = ? WHERE id = ?`,
    [durationSeconds ?? null, dayId]
  );

  // If online, try API to get XP result
  if (isOnline()) {
    try {
      const response = await apiClient.post(`/workouts/days/${dayId}/complete`, {
        durationSeconds,
      });
      return response.data as WorkoutCompleteResponse;
    } catch (error) {
      console.warn('[Offline] Complete workout API failed, queued for sync');
      // Queue for later sync
      await db.runAsync(
        `INSERT INTO SyncQueue (table_name, record_id, operation, payload, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        ['UserWorkoutDay', dayId, 'COMPLETE', JSON.stringify({ durationSeconds })]
      );
      return null;
    }
  }

  // Offline - queue for sync
  await db.runAsync(
    `INSERT INTO SyncQueue (table_name, record_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    ['UserWorkoutDay', dayId, 'COMPLETE', JSON.stringify({ durationSeconds })]
  );
  console.log('[Offline] Queued workout completion for sync');
  return null;
};

// ============================================
// Exercise History
// ============================================

export interface ExerciseHistory {
  id: number;
  workoutDayName: string;
  totalSets: number;
  totalReps: number;
  maxWeight: number;
  totalVolume: number;
  performedAt: string;
}

export const getExerciseHistory = async (exerciseId: number): Promise<ExerciseHistory[]> => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get(`/workouts/exercises/${exerciseId}/history`);
      return response.data;
    } catch (error) {
      console.warn('[Offline] Exercise history API failed, using local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Loading exercise history from SQLite');
  return getLocalExerciseHistory(exerciseId);
};

async function getLocalExerciseHistory(exerciseId: number): Promise<ExerciseHistory[]> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{
    id: number;
    workoutDayName: string;
    totalSets: number;
    totalReps: number;
    maxWeight: number;
    totalVolume: number;
    performedAt: string;
  }>(
    `SELECT
       uwd.id,
       wdt.name as workoutDayName,
       COUNT(es.id) as totalSets,
       SUM(COALESCE(es.actual_reps, es.target_reps)) as totalReps,
       MAX(es.weight) as maxWeight,
       SUM(es.weight * COALESCE(es.actual_reps, es.target_reps)) as totalVolume,
       uwd.completed_at as performedAt
     FROM UserExerciseLog uel
     JOIN ExerciseSet es ON es.exercise_log_id = uel.id
     JOIN UserWorkoutDay uwd ON uel.workout_day_id = uwd.id
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uel.exercise_id = ?
       AND uwd.completed_at IS NOT NULL
       AND es.completed = 1
     GROUP BY uwd.id
     ORDER BY uwd.completed_at DESC
     LIMIT 20`,
    [exerciseId]
  );

  return rows.map(r => ({
    id: r.id,
    workoutDayName: r.workoutDayName,
    totalSets: r.totalSets,
    totalReps: r.totalReps || 0,
    maxWeight: r.maxWeight || 0,
    totalVolume: r.totalVolume || 0,
    performedAt: r.performedAt,
  }));
}

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

  // Sync the new plan to SQLite for offline access
  try {
    await syncWorkoutPlan(response.data.id);
    console.log('[Sync] New workout plan synced to SQLite');
  } catch (error) {
    console.warn('[Sync] Failed to sync new plan to SQLite:', error);
  }

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

export const addSet = async (exerciseLogId: number): Promise<ExerciseSet> => {
  const response = await apiClient.post(`/workouts/exercises/${exerciseLogId}/sets`);
  return response.data;
};

export const deleteSet = async (setId: number): Promise<void> => {
  await apiClient.delete(`/workouts/sets/${setId}`);
};

export const addExerciseToDay = async (
  dayId: number,
  exerciseId: number,
  sets: number = 3,
  targetReps: number = 10
): Promise<UserExercise> => {
  const response = await apiClient.post(`/workouts/days/${dayId}/exercises`, {
    exerciseId,
    sets,
    targetReps,
  });
  return response.data;
};

export const deleteExercise = async (exerciseLogId: number): Promise<void> => {
  await apiClient.delete(`/workouts/exercises/${exerciseLogId}`);
};

export interface ExerciseListItem {
  id: number;
  name: string;
  primaryMuscleGroup: string;
  exerciseType: string;
}

export const getAllExercises = async (): Promise<ExerciseListItem[]> => {
  return cachedFetch('all-exercises', async () => {
    const response = await apiClient.get('/workouts/exercises');
    return response.data;
  });
};

// ============================================
// Types
// ============================================

export interface HistoryExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface WorkoutHistory {
  id: number;
  dayName: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
  exercises: HistoryExercise[];
}
