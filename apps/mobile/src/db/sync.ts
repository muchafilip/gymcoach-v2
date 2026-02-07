import { getDatabase } from './init';
import { fetchEquipment } from '../api/equipment';
import { fetchTemplates, fetchTemplateDetail } from '../api/templates';
import { apiClient } from '../api/client';
import { isOnline } from '../utils/network';

/**
 * Sync reference data from backend to local SQLite
 * This includes Equipment, Exercises, Templates
 * Order is critical due to foreign key constraints
 */
export const syncReferenceData = async (): Promise<void> => {
  // Skip sync if offline
  if (!isOnline()) {
    console.log('Offline - skipping reference data sync');
    return;
  }

  try {
    const db = getDatabase();
    console.log('Starting reference data sync...');

    // STEP 1: Sync Equipment (no dependencies)
    console.log('Syncing equipment...');
    const equipment = await fetchEquipment();
    for (const item of equipment) {
      await db.runAsync(
        `INSERT OR REPLACE INTO Equipment (id, name, icon, synced_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [item.id, item.name, item.icon || null]
      );
    }
    console.log(`✓ Synced ${equipment.length} equipment items`);

    // STEP 2: Sync Muscle Groups (no dependencies)
    console.log('Syncing muscle groups...');
    const muscleGroups = await apiClient.get('/musclegroups');
    for (const mg of muscleGroups.data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO MuscleGroup (id, name, synced_at)
         VALUES (?, ?, datetime('now'))`,
        [mg.id, mg.name]
      );
    }
    console.log(`✓ Synced ${muscleGroups.data.length} muscle groups`);

    // STEP 3: Sync Exercises (depends on MuscleGroups)
    console.log('Syncing exercises...');
    const exercises = await apiClient.get('/exercises');

    // Create lookup maps for muscle groups and equipment
    const muscleGroupMap = new Map<string, number>();
    for (const mg of muscleGroups.data) {
      muscleGroupMap.set(mg.name, mg.id);
    }

    const equipmentMap = new Map<string, number>();
    for (const eq of equipment) {
      equipmentMap.set(eq.name, eq.id);
    }

    for (const exercise of exercises.data) {
      // Get primary muscle group ID
      const primaryMuscleGroupId = muscleGroupMap.get(exercise.primaryMuscleGroup);

      await db.runAsync(
        `INSERT OR REPLACE INTO Exercise (id, name, description, instructions, video_url, primary_muscle_group_id, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          exercise.id,
          exercise.name,
          exercise.description || null,
          exercise.instructions || null,
          exercise.videoUrl || null,
          primaryMuscleGroupId || null,
        ]
      );

      // Sync required equipment (convert names to IDs)
      if (exercise.requiredEquipment && Array.isArray(exercise.requiredEquipment)) {
        await db.runAsync(
          'DELETE FROM ExerciseEquipment WHERE exercise_id = ?',
          [exercise.id]
        );

        for (const equipmentName of exercise.requiredEquipment) {
          const equipmentId = equipmentMap.get(equipmentName);
          if (equipmentId) {
            await db.runAsync(
              `INSERT INTO ExerciseEquipment (exercise_id, equipment_id)
               VALUES (?, ?)`,
              [exercise.id, equipmentId]
            );
          }
        }
      }

      // Sync secondary muscles (convert names to IDs)
      if (exercise.secondaryMuscleGroups && Array.isArray(exercise.secondaryMuscleGroups)) {
        await db.runAsync(
          'DELETE FROM ExerciseSecondaryMuscle WHERE exercise_id = ?',
          [exercise.id]
        );

        for (const muscleName of exercise.secondaryMuscleGroups) {
          const muscleGroupId = muscleGroupMap.get(muscleName);
          if (muscleGroupId) {
            await db.runAsync(
              `INSERT INTO ExerciseSecondaryMuscle (exercise_id, muscle_group_id)
               VALUES (?, ?)`,
              [exercise.id, muscleGroupId]
            );
          }
        }
      }
    }
    console.log(`✓ Synced ${exercises.data.length} exercises`);

    // STEP 4: Sync Templates (no dependencies)
    console.log('Syncing templates...');
    const templates = await fetchTemplates();
    for (const template of templates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO WorkoutTemplate (id, name, description, is_premium, synced_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [template.id, template.name, template.description || null, template.isPremium ? 1 : 0]
      );
    }
    console.log(`✓ Synced ${templates.length} templates`);

    // STEP 5: Sync WorkoutDayTemplates (depends on Templates and MuscleGroups)
    console.log('Syncing template details...');
    for (const template of templates) {
      const templateDetail = await fetchTemplateDetail(template.id);

      if (templateDetail.days) {
        for (const day of templateDetail.days) {
          await db.runAsync(
            `INSERT OR REPLACE INTO WorkoutDayTemplate (id, template_id, day_number, name)
             VALUES (?, ?, ?, ?)`,
            [day.id, template.id, day.dayNumber, day.name]
          );

          // Sync target muscles for each day
          if (day.targetMuscles) {
            await db.runAsync(
              'DELETE FROM WorkoutDayTemplateMuscle WHERE day_template_id = ?',
              [day.id]
            );

            for (const muscle of day.targetMuscles) {
              await db.runAsync(
                `INSERT INTO WorkoutDayTemplateMuscle (day_template_id, muscle_group_id, exercise_count)
                 VALUES (?, ?, ?)`,
                [day.id, muscle.muscleGroupId, muscle.exerciseCount]
              );
            }
          }
        }
      }
    }
    console.log('✓ Synced template details');

    console.log('✅ Reference data sync completed successfully');
  } catch (error) {
    console.error('❌ Error syncing reference data:', error);
    throw error;
  }
};

/**
 * Push local user data to backend
 * This includes UserWorkoutPlan, UserWorkoutDay, ExerciseSet
 */
export const syncUserData = async (): Promise<void> => {
  // Skip sync if offline
  if (!isOnline()) {
    console.log('Offline - skipping user data sync');
    return;
  }

  try {
    const db = getDatabase();

    // Get all pending sync items from queue
    const pendingItems = await db.getAllAsync<{
      id: number;
      table_name: string;
      record_id: number;
      operation: string;
      payload: string;
    }>(
      'SELECT * FROM SyncQueue ORDER BY created_at ASC'
    );

    console.log(`Processing ${pendingItems.length} pending sync items`);

    // Batch ExerciseSet updates into a single API call
    const setUpdates = pendingItems.filter(
      (item) => item.table_name === 'ExerciseSet' && item.operation === 'UPDATE'
    );
    const otherItems = pendingItems.filter(
      (item) => !(item.table_name === 'ExerciseSet' && item.operation === 'UPDATE')
    );

    if (setUpdates.length > 0) {
      try {
        const batchPayload = setUpdates.map((item) => {
          const payload = JSON.parse(item.payload);
          return { setId: item.record_id, ...payload };
        });
        await apiClient.put('/workouts/sets/batch', batchPayload);
        // Remove all from queue on success
        for (const item of setUpdates) {
          await db.runAsync('DELETE FROM SyncQueue WHERE id = ?', [item.id]);
          await db.runAsync(
            `UPDATE ExerciseSet SET sync_status = 'synced' WHERE id = ?`,
            [item.record_id]
          );
        }
        console.log(`Batch synced ${setUpdates.length} set updates`);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status: number } };
        const status = axiosError.response?.status;
        if (status === 404 || status === 400 || status === 403) {
          for (const item of setUpdates) {
            await db.runAsync('DELETE FROM SyncQueue WHERE id = ?', [item.id]);
          }
        } else {
          console.error(`Failed to batch sync sets:`, error);
        }
      }
    }

    // Process remaining items individually
    for (const item of otherItems) {
      try {
        const payload = JSON.parse(item.payload);

        switch (item.table_name) {
          case 'UserWorkoutDay':
            if (item.operation === 'COMPLETE') {
              await apiClient.post(`/workouts/days/${item.record_id}/complete`, payload);
            } else if (item.operation === 'START') {
              await apiClient.post(`/workouts/days/${item.record_id}/start`);
            }
            break;

          case 'UserEquipment':
            if (item.operation === 'SYNC') {
              await apiClient.put('/equipment/me', payload);
            }
            break;

          default:
            console.warn(`Unknown table in sync queue: ${item.table_name}`);
        }

        await db.runAsync('DELETE FROM SyncQueue WHERE id = ?', [item.id]);
        await db.runAsync(
          `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
          [item.record_id]
        );
        console.log(`Synced ${item.table_name} ${item.record_id}`);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status: number } };
        const status = axiosError.response?.status;

        if (status === 404 || status === 400 || status === 403) {
          console.log(`Removing from queue (status ${status}): ${item.table_name} ${item.record_id}`);
          await db.runAsync('DELETE FROM SyncQueue WHERE id = ?', [item.id]);
        } else {
          console.error(`Failed to sync ${item.table_name} ${item.record_id}:`, error);
        }
      }
    }

    console.log('User data sync completed');
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
};

/**
 * Add item to sync queue for later processing
 */
export const addToSyncQueue = async (
  tableName: string,
  recordId: number,
  operation: string,
  payload: object
): Promise<void> => {
  try {
    const db = getDatabase();

    await db.runAsync(
      `INSERT INTO SyncQueue (table_name, record_id, operation, payload, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [tableName, recordId, operation, JSON.stringify(payload)]
    );

    console.log(`Added to sync queue: ${tableName} ${recordId}`);
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    throw error;
  }
};

/**
 * Full sync - pull reference data and push user data
 */
export const performFullSync = async (): Promise<void> => {
  console.log('Starting full sync...');

  try {
    // First pull reference data from backend
    await syncReferenceData();

    // Then push any pending user data
    await syncUserData();

    console.log('Full sync completed successfully');
  } catch (error) {
    console.error('Full sync failed:', error);
    throw error;
  }
};

/**
 * Sync a specific workout plan from backend to local SQLite
 * This pulls the full plan with all days, exercises, and sets
 */
export const syncWorkoutPlan = async (planId: number): Promise<void> => {
  try {
    const db = getDatabase();
    console.log(`Syncing workout plan ${planId}...`);

    // Fetch full plan details from backend
    const response = await apiClient.get(`/workouts/plans/${planId}`);
    const plan = response.data;

    // Temporarily disable foreign key checks (reference data may not be synced yet)
    await db.execAsync('PRAGMA foreign_keys = OFF');

    try {
      // Save UserWorkoutPlan
      await db.runAsync(
        `INSERT OR REPLACE INTO UserWorkoutPlan (id, user_id, template_id, start_date, duration_weeks, is_active, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, plan.userId, plan.templateId, plan.startDate, plan.durationWeeks || 4, plan.isActive ? 1 : 0, 'synced']
      );

      // Save each WorkoutDay with exercises and sets
      for (const day of plan.days) {
        await db.runAsync(
          `INSERT OR REPLACE INTO UserWorkoutDay (id, plan_id, day_number, week_number, day_type_id, day_template_id, scheduled_date, completed_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            day.id,
            plan.id,
            day.dayNumber,
            day.weekNumber || 1,
            day.dayTemplateId,
            day.dayTemplateId,
            day.scheduledDate || null,
            day.completedAt || null,
            'synced'
          ]
        );

        // Save exercises for this day
        for (let i = 0; i < day.exercises.length; i++) {
          const exercise = day.exercises[i];
          await db.runAsync(
            `INSERT OR REPLACE INTO UserExerciseLog (id, workout_day_id, exercise_id, order_index, sync_status)
             VALUES (?, ?, ?, ?, ?)`,
            [
              exercise.id,
              day.id,
              exercise.exerciseId,
              i,
              'synced'
            ]
          );

          // Save sets for this exercise
          for (const set of exercise.sets) {
            await db.runAsync(
              `INSERT OR REPLACE INTO ExerciseSet (id, exercise_log_id, set_number, target_reps, actual_reps, weight, completed, sync_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                set.id,
                exercise.id,
                set.setNumber,
                set.targetReps,
                set.actualReps || null,
                set.weight || null,
                set.completed ? 1 : 0,
                'synced'
              ]
            );
          }
        }
      }

      console.log(`✅ Workout plan ${planId} synced successfully`);
    } finally {
      // Re-enable foreign key checks
      await db.execAsync('PRAGMA foreign_keys = ON');
    }
  } catch (error) {
    console.error(`Error syncing workout plan ${planId}:`, error);
    throw error;
  }
};
