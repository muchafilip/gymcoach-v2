import { getDatabase } from '../db/init';
import { apiClient } from './client';

interface SyncQueueItem {
  id: number;
  table_name: string;
  record_id: number;
  operation: string;
  payload: string;
}

export const syncPendingChanges = async () => {
  const db = getDatabase();

  const pending = await db.getAllAsync<SyncQueueItem>(
    'SELECT * FROM SyncQueue ORDER BY created_at ASC'
  );

  if (pending.length === 0) return;

  console.log(`[Sync] Processing ${pending.length} pending changes...`);

  for (const item of pending) {
    try {
      const data = JSON.parse(item.payload);

      switch (item.table_name) {
        case 'ExerciseSet':
          await apiClient.put(`/workouts/sets/${item.record_id}`, data);
          break;
        case 'UserWorkoutDay':
          if (item.operation === 'COMPLETE') {
            await apiClient.post(`/workouts/days/${item.record_id}/complete`);
          }
          break;
        default:
          console.warn(`[Sync] Unknown table: ${item.table_name}`);
      }

      // Success - remove from queue
      await db.runAsync('DELETE FROM SyncQueue WHERE id = ?', [item.id]);
      console.log(`[Sync] Synced ${item.table_name} ${item.record_id}`);
    } catch (error) {
      console.error(`[Sync] Failed ${item.table_name} ${item.record_id}:`, error);
      // Keep in queue for retry
    }
  }

  console.log('[Sync] Complete');
};
