import { getDatabase } from './init';
import { HomeData, UserWorkoutDay, UserExercise, ExerciseSet, WorkoutTemplate } from '../types';
import { addToSyncQueue } from './sync';

/**
 * Update a set locally (instant) and queue for sync
 */
export async function updateSetLocally(
  setId: number,
  updates: { actualReps?: number; weight?: number; completed?: boolean }
): Promise<void> {
  const db = getDatabase();

  const setClauses: string[] = [];
  const values: (number | null)[] = [];

  if (updates.actualReps !== undefined) {
    setClauses.push('actual_reps = ?');
    values.push(updates.actualReps);
  }
  if (updates.weight !== undefined) {
    setClauses.push('weight = ?');
    values.push(updates.weight);
  }
  if (updates.completed !== undefined) {
    setClauses.push('completed = ?');
    values.push(updates.completed ? 1 : 0);
  }

  if (setClauses.length === 0) return;

  setClauses.push("sync_status = 'pending'");
  values.push(setId);

  await db.runAsync(
    `UPDATE ExerciseSet SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );

  // Queue for sync
  await addToSyncQueue('ExerciseSet', setId, 'UPDATE', updates);
}

/**
 * Mark workout day as completed locally and queue for sync
 */
export async function completeWorkoutDayLocally(
  dayId: number,
  durationSeconds?: number
): Promise<void> {
  const db = getDatabase();
  const completedAt = new Date().toISOString();

  await db.runAsync(
    `UPDATE UserWorkoutDay
     SET completed_at = ?, duration_seconds = ?, sync_status = 'pending'
     WHERE id = ?`,
    [completedAt, durationSeconds ?? null, dayId]
  );

  await addToSyncQueue('UserWorkoutDay', dayId, 'COMPLETE', { durationSeconds });
}

/**
 * Get home data entirely from local SQLite database
 * Used as fallback when offline and no cache exists
 */
export async function getLocalHomeData(): Promise<HomeData> {
  const db = getDatabase();

  // Get total weight lifted from completed sets
  const weightResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(es.weight * es.actual_reps), 0) as total
     FROM ExerciseSet es
     JOIN UserExerciseLog uel ON es.exercise_log_id = uel.id
     JOIN UserWorkoutDay uwd ON uel.workout_day_id = uwd.id
     WHERE uwd.completed_at IS NOT NULL AND es.completed = 1`
  );
  const totalWeightLifted = weightResult?.total || 0;

  // Get workouts completed count
  const workoutsResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM UserWorkoutDay WHERE completed_at IS NOT NULL`
  );
  const workoutsCompleted = workoutsResult?.count || 0;

  // Get next workout (first incomplete day from active plan)
  const nextWorkoutRow = await db.getFirstAsync<{
    dayId: number;
    planId: number;
    dayName: string;
    planName: string;
    weekNumber: number;
  }>(
    `SELECT
       uwd.id as dayId,
       uwd.plan_id as planId,
       wdt.name as dayName,
       wt.name as planName,
       uwd.week_number as weekNumber
     FROM UserWorkoutDay uwd
     JOIN UserWorkoutPlan uwp ON uwd.plan_id = uwp.id
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     JOIN WorkoutTemplate wt ON uwp.template_id = wt.id
     WHERE uwp.is_active = 1 AND uwd.completed_at IS NULL
     ORDER BY uwd.week_number, uwd.day_number
     LIMIT 1`
  );

  const nextWorkout = nextWorkoutRow ? {
    dayId: nextWorkoutRow.dayId,
    planId: nextWorkoutRow.planId,
    dayName: nextWorkoutRow.dayName,
    planName: nextWorkoutRow.planName,
    weekNumber: nextWorkoutRow.weekNumber,
  } : null;

  // Get recent completed workouts
  const recentRows = await db.getAllAsync<{
    id: number;
    name: string;
    completedAt: string;
    exerciseCount: number;
  }>(
    `SELECT
       uwd.id,
       wdt.name,
       uwd.completed_at as completedAt,
       (SELECT COUNT(*) FROM UserExerciseLog WHERE workout_day_id = uwd.id) as exerciseCount
     FROM UserWorkoutDay uwd
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uwd.completed_at IS NOT NULL
     ORDER BY uwd.completed_at DESC
     LIMIT 5`
  );

  const recentWorkouts = recentRows.map(row => ({
    id: row.id,
    name: row.name,
    completedAt: row.completedAt,
    exerciseCount: row.exerciseCount,
  }));

  // Get personal records (best weight for each exercise)
  const prRows = await db.getAllAsync<{
    exerciseId: number;
    exerciseName: string;
    maxWeight: number;
    bestSetReps: number;
    bestSetWeight: number;
  }>(
    `SELECT
       e.id as exerciseId,
       e.name as exerciseName,
       MAX(es.weight) as maxWeight,
       es.actual_reps as bestSetReps,
       es.weight as bestSetWeight
     FROM ExerciseSet es
     JOIN UserExerciseLog uel ON es.exercise_log_id = uel.id
     JOIN Exercise e ON uel.exercise_id = e.id
     WHERE es.completed = 1 AND es.weight IS NOT NULL
     GROUP BY e.id
     ORDER BY maxWeight DESC
     LIMIT 5`
  );

  const personalRecords = prRows.map(row => ({
    exerciseId: row.exerciseId,
    exerciseName: row.exerciseName,
    maxWeight: row.maxWeight,
    bestSetReps: row.bestSetReps || 0,
    bestSetWeight: row.bestSetWeight || 0,
  }));

  return {
    totalWeightLifted,
    workoutsCompleted,
    nextWorkout,
    recentWorkouts,
    personalRecords,
  };
}

/**
 * Get workout day data from local SQLite
 */
export async function getLocalWorkoutDay(dayId: number): Promise<UserWorkoutDay | null> {
  const db = getDatabase();

  // Get day info
  const dayRow = await db.getFirstAsync<{
    id: number;
    planId: number;
    dayNumber: number;
    weekNumber: number;
    dayTypeId: number;
    dayName: string;
    scheduledDate: string | null;
    completedAt: string | null;
  }>(
    `SELECT
       uwd.id,
       uwd.plan_id as planId,
       uwd.day_number as dayNumber,
       uwd.week_number as weekNumber,
       uwd.day_type_id as dayTypeId,
       wdt.name as dayName,
       uwd.scheduled_date as scheduledDate,
       uwd.completed_at as completedAt
     FROM UserWorkoutDay uwd
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uwd.id = ?`,
    [dayId]
  );

  if (!dayRow) return null;

  // Get exercises for this day
  const exerciseRows = await db.getAllAsync<{
    id: number;
    exerciseId: number;
    exerciseName: string;
    primaryMuscleGroup: string | null;
    orderIndex: number;
  }>(
    `SELECT
       uel.id,
       uel.exercise_id as exerciseId,
       e.name as exerciseName,
       mg.name as primaryMuscleGroup,
       uel.order_index as orderIndex
     FROM UserExerciseLog uel
     JOIN Exercise e ON uel.exercise_id = e.id
     LEFT JOIN MuscleGroup mg ON e.primary_muscle_group_id = mg.id
     WHERE uel.workout_day_id = ?
     ORDER BY uel.order_index`,
    [dayId]
  );

  // Get sets for each exercise
  const exercises: UserExercise[] = [];
  for (const exercise of exerciseRows) {
    const setRows = await db.getAllAsync<{
      id: number;
      setNumber: number;
      targetReps: number;
      actualReps: number | null;
      weight: number | null;
      completed: number;
    }>(
      `SELECT id, set_number as setNumber, target_reps as targetReps,
              actual_reps as actualReps, weight, completed
       FROM ExerciseSet
       WHERE exercise_log_id = ?
       ORDER BY set_number`,
      [exercise.id]
    );

    const sets: ExerciseSet[] = setRows.map(s => ({
      id: s.id,
      setNumber: s.setNumber,
      targetReps: s.targetReps,
      actualReps: s.actualReps ?? undefined,
      weight: s.weight ?? undefined,
      completed: s.completed === 1,
    }));

    exercises.push({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      primaryMuscleGroup: exercise.primaryMuscleGroup ?? undefined,
      orderIndex: exercise.orderIndex,
      sets,
    });
  }

  return {
    id: dayRow.id,
    planId: dayRow.planId,
    dayNumber: dayRow.dayNumber,
    weekNumber: dayRow.weekNumber,
    dayTypeId: dayRow.dayTypeId,
    name: dayRow.dayName,
    scheduledDate: dayRow.scheduledDate ?? undefined,
    completedAt: dayRow.completedAt ?? undefined,
    exercises,
    syncStatus: 'synced',
  };
}

/**
 * Check if we have any local data (has the app been synced before?)
 */
export async function hasLocalData(): Promise<boolean> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM Exercise`
  );
  return (result?.count || 0) > 0;
}

/**
 * Get active plan from local SQLite
 */
export async function getLocalActivePlan(): Promise<{
  id: number;
  templateId: number;
  templateName: string;
  startDate: string;
  durationWeeks: number;
  isActive: boolean;
  days: { id: number; dayNumber: number; weekNumber: number; name: string; completedAt: string | null }[];
} | null> {
  const db = getDatabase();

  const plan = await db.getFirstAsync<{
    id: number;
    templateId: number;
    templateName: string;
    startDate: string;
    durationWeeks: number;
    isActive: number;
  }>(
    `SELECT
       uwp.id,
       uwp.template_id as templateId,
       wt.name as templateName,
       uwp.start_date as startDate,
       uwp.duration_weeks as durationWeeks,
       uwp.is_active as isActive
     FROM UserWorkoutPlan uwp
     JOIN WorkoutTemplate wt ON uwp.template_id = wt.id
     WHERE uwp.is_active = 1
     LIMIT 1`
  );

  if (!plan) return null;

  const days = await db.getAllAsync<{
    id: number;
    dayNumber: number;
    weekNumber: number;
    name: string;
    completedAt: string | null;
  }>(
    `SELECT
       uwd.id,
       uwd.day_number as dayNumber,
       uwd.week_number as weekNumber,
       wdt.name,
       uwd.completed_at as completedAt
     FROM UserWorkoutDay uwd
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uwd.plan_id = ?
     ORDER BY uwd.week_number, uwd.day_number`,
    [plan.id]
  );

  return {
    id: plan.id,
    templateId: plan.templateId,
    templateName: plan.templateName,
    startDate: plan.startDate,
    durationWeeks: plan.durationWeeks,
    isActive: plan.isActive === 1,
    days,
  };
}

/**
 * Get all workout templates from local SQLite
 */
export async function getLocalTemplates(): Promise<WorkoutTemplate[]> {
  const db = getDatabase();

  const templates = await db.getAllAsync<{
    id: number;
    name: string;
    description: string | null;
    isPremium: number;
    dayCount: number;
  }>(
    `SELECT
       wt.id,
       wt.name,
       wt.description,
       wt.is_premium as isPremium,
       (SELECT COUNT(*) FROM WorkoutDayTemplate WHERE template_id = wt.id) as dayCount
     FROM WorkoutTemplate wt
     ORDER BY wt.name`
  );

  return templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description ?? undefined,
    isPremium: t.isPremium === 1,
    dayCount: t.dayCount,
  }));
}

/**
 * Get all user workout plans from local SQLite
 */
export async function getLocalUserPlans(): Promise<{
  id: number;
  userId: number;
  templateId: number;
  templateName: string;
  startDate: string;
  durationWeeks: number;
  isActive: boolean;
}[]> {
  const db = getDatabase();

  const plans = await db.getAllAsync<{
    id: number;
    userId: number;
    templateId: number;
    templateName: string;
    startDate: string;
    durationWeeks: number;
    isActive: number;
  }>(
    `SELECT
       uwp.id,
       uwp.user_id as userId,
       uwp.template_id as templateId,
       wt.name as templateName,
       uwp.start_date as startDate,
       uwp.duration_weeks as durationWeeks,
       uwp.is_active as isActive
     FROM UserWorkoutPlan uwp
     JOIN WorkoutTemplate wt ON uwp.template_id = wt.id
     ORDER BY uwp.is_active DESC, uwp.start_date DESC`
  );

  return plans.map(p => ({
    id: p.id,
    userId: p.userId,
    templateId: p.templateId,
    templateName: p.templateName,
    startDate: p.startDate,
    durationWeeks: p.durationWeeks,
    isActive: p.isActive === 1,
  }));
}

/**
 * Get workout plan detail from local SQLite
 */
export async function getLocalWorkoutPlanDetail(planId: number): Promise<{
  id: number;
  userId: number;
  templateId: number;
  templateName: string;
  startDate: string;
  durationWeeks: number;
  isActive: boolean;
  days: {
    id: number;
    dayNumber: number;
    weekNumber: number;
    dayTemplateId: number;
    name: string;
    scheduledDate: string | null;
    completedAt: string | null;
    exercises: UserExercise[];
  }[];
} | null> {
  const db = getDatabase();

  const plan = await db.getFirstAsync<{
    id: number;
    userId: number;
    templateId: number;
    templateName: string;
    startDate: string;
    durationWeeks: number;
    isActive: number;
  }>(
    `SELECT
       uwp.id,
       uwp.user_id as userId,
       uwp.template_id as templateId,
       wt.name as templateName,
       uwp.start_date as startDate,
       uwp.duration_weeks as durationWeeks,
       uwp.is_active as isActive
     FROM UserWorkoutPlan uwp
     JOIN WorkoutTemplate wt ON uwp.template_id = wt.id
     WHERE uwp.id = ?`,
    [planId]
  );

  if (!plan) return null;

  const dayRows = await db.getAllAsync<{
    id: number;
    dayNumber: number;
    weekNumber: number;
    dayTemplateId: number;
    name: string;
    scheduledDate: string | null;
    completedAt: string | null;
  }>(
    `SELECT
       uwd.id,
       uwd.day_number as dayNumber,
       uwd.week_number as weekNumber,
       uwd.day_template_id as dayTemplateId,
       wdt.name,
       uwd.scheduled_date as scheduledDate,
       uwd.completed_at as completedAt
     FROM UserWorkoutDay uwd
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uwd.plan_id = ?
     ORDER BY uwd.week_number, uwd.day_number`,
    [planId]
  );

  // Get exercises for each day
  const days = [];
  for (const day of dayRows) {
    const exerciseRows = await db.getAllAsync<{
      id: number;
      exerciseId: number;
      exerciseName: string;
      primaryMuscleGroup: string | null;
      orderIndex: number;
    }>(
      `SELECT
         uel.id,
         uel.exercise_id as exerciseId,
         e.name as exerciseName,
         mg.name as primaryMuscleGroup,
         uel.order_index as orderIndex
       FROM UserExerciseLog uel
       JOIN Exercise e ON uel.exercise_id = e.id
       LEFT JOIN MuscleGroup mg ON e.primary_muscle_group_id = mg.id
       WHERE uel.workout_day_id = ?
       ORDER BY uel.order_index`,
      [day.id]
    );

    const exercises: UserExercise[] = [];
    for (const exercise of exerciseRows) {
      const setRows = await db.getAllAsync<{
        id: number;
        setNumber: number;
        targetReps: number;
        actualReps: number | null;
        weight: number | null;
        completed: number;
      }>(
        `SELECT id, set_number as setNumber, target_reps as targetReps,
                actual_reps as actualReps, weight, completed
         FROM ExerciseSet
         WHERE exercise_log_id = ?
         ORDER BY set_number`,
        [exercise.id]
      );

      const sets: ExerciseSet[] = setRows.map(s => ({
        id: s.id,
        setNumber: s.setNumber,
        targetReps: s.targetReps,
        actualReps: s.actualReps ?? undefined,
        weight: s.weight ?? undefined,
        completed: s.completed === 1,
      }));

      exercises.push({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        primaryMuscleGroup: exercise.primaryMuscleGroup ?? undefined,
        orderIndex: exercise.orderIndex,
        sets,
      });
    }

    days.push({
      id: day.id,
      dayNumber: day.dayNumber,
      weekNumber: day.weekNumber,
      dayTemplateId: day.dayTemplateId,
      name: day.name,
      scheduledDate: day.scheduledDate,
      completedAt: day.completedAt,
      exercises,
    });
  }

  return {
    id: plan.id,
    userId: plan.userId,
    templateId: plan.templateId,
    templateName: plan.templateName,
    startDate: plan.startDate,
    durationWeeks: plan.durationWeeks,
    isActive: plan.isActive === 1,
    days,
  };
}

/**
 * Get workout history from local SQLite (completed workouts)
 */
export async function getLocalWorkoutHistory(): Promise<{
  id: number;
  dayName: string;
  completedAt: string;
  exerciseCount: number;
  totalSets: number;
}[]> {
  const db = getDatabase();

  const rows = await db.getAllAsync<{
    id: number;
    dayName: string;
    completedAt: string;
    exerciseCount: number;
    totalSets: number;
  }>(
    `SELECT
       uwd.id,
       wdt.name as dayName,
       uwd.completed_at as completedAt,
       (SELECT COUNT(*) FROM UserExerciseLog WHERE workout_day_id = uwd.id) as exerciseCount,
       (SELECT COUNT(*) FROM ExerciseSet es
        JOIN UserExerciseLog uel ON es.exercise_log_id = uel.id
        WHERE uel.workout_day_id = uwd.id AND es.completed = 1) as totalSets
     FROM UserWorkoutDay uwd
     JOIN WorkoutDayTemplate wdt ON uwd.day_template_id = wdt.id
     WHERE uwd.completed_at IS NOT NULL
     ORDER BY uwd.completed_at DESC
     LIMIT 50`
  );

  return rows;
}
