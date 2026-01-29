/**
 * Sync Queue (SQLite Implementation)
 * Persistent queue for offline operations using SQLite
 */

import { getDB } from '@/lib/db';

// Re-defining types here to avoid circular dependency if we import from itself, 
// or if we want to keep this file self-contained.
// Actually, let's keep the types exported here as they were.

export type SyncOperationType = 'insert' | 'update' | 'delete';
export type SyncItemType = 'workout_session' | 'session_exercise' | 'session_set' | 'workout_template_update';

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
 * Get all items in the sync queue
 */
export async function getQueue(): Promise<SyncItem[]> {
  const db = await getDB();
  const results = await db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY timestamp ASC');
  
  return results.map(row => ({
    id: row.id,
    type: row.type as SyncItemType,
    operation: row.operation as SyncOperationType,
    data: JSON.parse(row.data),
    timestamp: row.timestamp,
    retryCount: row.retry_count,
    lastError: row.last_error || undefined,
  }));
}

/**
 * Add an item to the sync queue
 */
export async function addToQueue(item: Omit<SyncItem, 'timestamp' | 'retryCount'>): Promise<void> {
  const db = await getDB();
  const timestamp = Date.now();
  
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue (id, type, operation, data, timestamp, retry_count, last_error)
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    [
      item.id,
      item.type,
      item.operation,
      JSON.stringify(item.data),
      timestamp
    ]
  );
  
  console.log(`[SyncQueue] Added item: ${item.type}/${item.id}`);
}

/**
 * Remove an item from the queue by ID
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  console.log(`[SyncQueue] Removed item: ${id}`);
}

/**
 * Update retry count for an item
 */
export async function incrementRetryCount(id: string, error?: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    [error || null, id]
  );
}

/**
 * Clear the entire queue
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM sync_queue');
  console.log('[SyncQueue] Queue cleared');
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const db = await getDB();
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue');
  return result?.count || 0;
}

// Sync Lock Implementation (using SQLite documents table)
const SYNC_LOCK_KEY = 'sportvault_sync_lock';

/**
 * Acquire sync lock (prevents multiple sync processes)
 */
export async function acquireSyncLock(): Promise<boolean> {
  const db = await getDB();
  
  // Check existing lock
  const result = await db.getFirstAsync<{ created_at: number }>(
    'SELECT created_at FROM documents WHERE key = ?',
    [SYNC_LOCK_KEY]
  );
  
  if (result) {
    // Check if lock is stale (older than 5 minutes)
    if (Date.now() - result.created_at < 5 * 60 * 1000) {
      return false; // Lock is still valid
    }
  }

  // Acquire lock (upsert)
  const timestamp = Date.now();
  await db.runAsync(
    'INSERT OR REPLACE INTO documents (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [SYNC_LOCK_KEY, 'locked', timestamp, timestamp]
  );
  return true;
}

/**
 * Release sync lock
 */
export async function releaseSyncLock(): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM documents WHERE key = ?', [SYNC_LOCK_KEY]);
}
