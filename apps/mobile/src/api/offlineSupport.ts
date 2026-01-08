import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../db/init';
import { isOnline } from '../utils/network';

/**
 * Wrapper for READ operations - caches API responses to AsyncStorage
 * Online: Fetch from API, cache result
 * Offline: Return cached data
 */
export async function cachedFetch<T>(
  cacheKey: string,
  apiFn: () => Promise<T>
): Promise<T> {
  // Try API if online
  if (isOnline()) {
    try {
      const result = await apiFn();
      // Cache the successful response
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
      return result;
    } catch (error) {
      console.warn(`[Cache] API failed for ${cacheKey}, trying cache...`);
      // Fall through to cache
    }
  }

  // Offline or API failed - try cache
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    console.log(`[Cache] Serving ${cacheKey} from cache`);
    return JSON.parse(cached);
  }

  throw new Error('No network connection and no cached data available');
}

/**
 * Wrapper for WRITE operations - optimistic local update + queue for sync
 * 1. Update SQLite immediately (optimistic)
 * 2. Queue API call for sync
 * 3. If online, try to sync immediately
 */
export async function offlineWrite(
  apiCall: () => Promise<any>,
  localUpdate: () => Promise<void>,
  queueItem: { table: string; id: number; op: string; data: any }
): Promise<void> {
  const db = getDatabase();

  // 1. Update SQLite immediately (optimistic update)
  await localUpdate();

  // 2. Queue for sync
  await db.runAsync(
    `INSERT INTO SyncQueue (table_name, record_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [queueItem.table, queueItem.id, queueItem.op, JSON.stringify(queueItem.data)]
  );

  // 3. Try API if online
  if (isOnline()) {
    try {
      await apiCall();
      // Success - remove from queue
      await db.runAsync(
        'DELETE FROM SyncQueue WHERE table_name = ? AND record_id = ? AND operation = ?',
        [queueItem.table, queueItem.id, queueItem.op]
      );
    } catch (error) {
      console.warn(`[Offline] API failed, queued for later: ${queueItem.table} ${queueItem.id}`);
      // Keep in queue for later sync
    }
  } else {
    console.log(`[Offline] Queued for sync: ${queueItem.table} ${queueItem.id}`);
  }
}

/**
 * Clear specific cache entry (useful after mutations)
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey);
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k: string) =>
    k.startsWith('home-') ||
    k.startsWith('day-') ||
    k.startsWith('plan-') ||
    k.startsWith('history-')
  );
  await AsyncStorage.multiRemove(cacheKeys);
}
