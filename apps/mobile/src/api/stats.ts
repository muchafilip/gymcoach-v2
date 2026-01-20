import { apiClient } from './client';
import { isOnline } from '../utils/network';
import { getDatabase } from '../db/init';

export interface VolumeDataPoint {
  date: string;
  volume: number;
}

export interface FrequencyDataPoint {
  year: number;
  week: number;
  count: number;
}

export interface TopExercise {
  exerciseId: number;
  exerciseName: string;
  totalVolume: number;
  sessionCount: number;
}

export interface ProgressStats {
  volumeOverTime: VolumeDataPoint[];
  frequencyByWeek: FrequencyDataPoint[];
  topExercises: TopExercise[];
  totalVolume: number;
  workoutCount: number;
  days: number;
}

export const getProgressStats = async (days: number = 30): Promise<ProgressStats> => {
  // If online, try API first
  if (isOnline()) {
    try {
      const response = await apiClient.get(`/workouts/stats/progress?days=${days}`);
      return response.data;
    } catch (error) {
      console.warn('[Offline] Progress stats API failed, using local data');
    }
  }

  // Fallback to local SQLite data
  console.log('[Offline] Building progress stats from SQLite');
  return getLocalProgressStats(days);
};

async function getLocalProgressStats(days: number): Promise<ProgressStats> {
  const db = getDatabase();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // Volume over time
  const volumeRows = await db.getAllAsync<{ date: string; volume: number }>(
    `SELECT date(uwd.completed_at) as date,
            SUM(es.weight * COALESCE(es.actual_reps, es.target_reps)) as volume
     FROM ExerciseSet es
     JOIN UserExerciseLog uel ON es.exercise_log_id = uel.id
     JOIN UserWorkoutDay uwd ON uel.workout_day_id = uwd.id
     WHERE uwd.completed_at IS NOT NULL
       AND uwd.completed_at >= ?
       AND es.completed = 1
     GROUP BY date(uwd.completed_at)
     ORDER BY date`,
    [sinceStr]
  );
  const volumeOverTime = volumeRows.map(r => ({ date: r.date, volume: r.volume || 0 }));

  // Workout frequency by week
  const frequencyRows = await db.getAllAsync<{ year: number; week: number; count: number }>(
    `SELECT strftime('%Y', completed_at) as year,
            strftime('%W', completed_at) as week,
            COUNT(*) as count
     FROM UserWorkoutDay
     WHERE completed_at IS NOT NULL AND completed_at >= ?
     GROUP BY strftime('%Y', completed_at), strftime('%W', completed_at)
     ORDER BY year, week`,
    [sinceStr]
  );
  const frequencyByWeek = frequencyRows.map(r => ({
    year: parseInt(String(r.year)),
    week: parseInt(String(r.week)),
    count: r.count,
  }));

  // Top exercises
  const topRows = await db.getAllAsync<{
    exerciseId: number;
    exerciseName: string;
    totalVolume: number;
    sessionCount: number;
  }>(
    `SELECT e.id as exerciseId, e.name as exerciseName,
            SUM(es.weight * COALESCE(es.actual_reps, es.target_reps)) as totalVolume,
            COUNT(DISTINCT uwd.id) as sessionCount
     FROM ExerciseSet es
     JOIN UserExerciseLog uel ON es.exercise_log_id = uel.id
     JOIN UserWorkoutDay uwd ON uel.workout_day_id = uwd.id
     JOIN Exercise e ON uel.exercise_id = e.id
     WHERE uwd.completed_at IS NOT NULL
       AND uwd.completed_at >= ?
       AND es.completed = 1
     GROUP BY e.id
     ORDER BY totalVolume DESC
     LIMIT 10`,
    [sinceStr]
  );
  const topExercises = topRows.map(r => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    totalVolume: r.totalVolume || 0,
    sessionCount: r.sessionCount,
  }));

  // Total stats
  const totalVolume = volumeOverTime.reduce((sum, v) => sum + v.volume, 0);
  const workoutCountResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM UserWorkoutDay
     WHERE completed_at IS NOT NULL AND completed_at >= ?`,
    [sinceStr]
  );

  return {
    volumeOverTime,
    frequencyByWeek,
    topExercises,
    totalVolume,
    workoutCount: workoutCountResult?.count || 0,
    days,
  };
}
