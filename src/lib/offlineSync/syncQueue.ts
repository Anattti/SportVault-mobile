/**
 * Sync Queue
 * AsyncStorage-based queue for offline operations with atomic writes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = '@sportvault_sync_queue';
const SYNC_QUEUE_TEMP_KEY = '@sportvault_sync_queue_temp';
const SYNC_LOCK_KEY = '@sportvault_sync_lock';

export type SyncOperationType = 'insert' | 'update' | 'delete';
export type SyncItemType = 'workout_session' | 'session_exercise' | 'session_set';

export interface SyncItem {
  id: string;
  type: SyncItemType;
  operation: SyncOperationType;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Atomic write pattern - write to temp, then swap
 * Prevents data corruption on crashes
 */
async function atomicWrite(data: SyncItem[]): Promise<void> {
  const jsonData = JSON.stringify(data);
  
  // Write to temp key first
  await AsyncStorage.setItem(SYNC_QUEUE_TEMP_KEY, jsonData);
  
  // Then atomically move to main key
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, jsonData);
  
  // Clean up temp
  await AsyncStorage.removeItem(SYNC_QUEUE_TEMP_KEY);
}

/**
 * Recover from potential corruption
 */
async function recoverQueue(): Promise<SyncItem[]> {
  try {
    // Try main queue first
    const mainData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (mainData) {
      return JSON.parse(mainData);
    }

    // Check temp queue as fallback
    const tempData = await AsyncStorage.getItem(SYNC_QUEUE_TEMP_KEY);
    if (tempData) {
      const items = JSON.parse(tempData);
      await atomicWrite(items); // Recover by completing the write
      return items;
    }

    return [];
  } catch (error) {
    console.error('[SyncQueue] Recovery failed:', error);
    return [];
  }
}

/**
 * Get all items in the sync queue
 */
export async function getQueue(): Promise<SyncItem[]> {
  return recoverQueue();
}

/**
 * Add an item to the sync queue
 */
export async function addToQueue(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): Promise<void> {
  const queue = await getQueue();
  
  const newItem: SyncItem = {
    ...item,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(newItem);
  await atomicWrite(queue);
  
  console.log(`[SyncQueue] Added item: ${item.type}/${item.id}`);
}

/**
 * Remove an item from the queue by ID
 */
export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== id);
  await atomicWrite(filtered);
  
  console.log(`[SyncQueue] Removed item: ${id}`);
}

/**
 * Update retry count for an item
 */
export async function incrementRetryCount(id: string, error?: string): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map(item => {
    if (item.id === id) {
      return {
        ...item,
        retryCount: item.retryCount + 1,
        lastError: error,
      };
    }
    return item;
  });
  await atomicWrite(updated);
}

/**
 * Clear the entire queue
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  await AsyncStorage.removeItem(SYNC_QUEUE_TEMP_KEY);
  console.log('[SyncQueue] Queue cleared');
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Acquire sync lock (prevents multiple sync processes)
 */
export async function acquireSyncLock(): Promise<boolean> {
  const lock = await AsyncStorage.getItem(SYNC_LOCK_KEY);
  
  if (lock) {
    // Check if lock is stale (older than 5 minutes)
    const lockTime = parseInt(lock, 10);
    if (Date.now() - lockTime < 5 * 60 * 1000) {
      return false; // Lock is still valid
    }
  }

  await AsyncStorage.setItem(SYNC_LOCK_KEY, Date.now().toString());
  return true;
}

/**
 * Release sync lock
 */
export async function releaseSyncLock(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_LOCK_KEY);
}
