/**
 * Sync Engine
 * Background sync manager for processing offline queue
 */

import { supabase } from '@/lib/supabase';
import { isOnline } from './networkStatus';
import {
  getQueue,
  removeFromQueue,
  incrementRetryCount,
  acquireSyncLock,
  releaseSyncLock,
  SyncItem,
} from './syncQueue';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second

// Event emitter for sync status updates
type SyncEventType = 'sync_start' | 'sync_complete' | 'sync_error' | 'item_synced';
type SyncEventCallback = (event: { type: SyncEventType; data?: unknown }) => void;

const listeners: Set<SyncEventCallback> = new Set();

export function addSyncListener(callback: SyncEventCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit(type: SyncEventType, data?: unknown) {
  listeners.forEach(callback => callback({ type, data }));
}

/**
 * Exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, retryCount), 30000);
}

/**
 * Process a single sync item
 */
async function processSyncItem(item: SyncItem): Promise<boolean> {
  try {
    const { type, operation, data, id } = item;

    switch (type) {
      case 'workout_session':
        return await syncWorkoutSession(operation, data, id);
      case 'session_exercise':
        return await syncSessionExercise(operation, data, id);
      case 'session_set':
        return await syncSessionSet(operation, data, id);
      default:
        console.warn(`[SyncEngine] Unknown sync type: ${type}`);
        return false;
    }
  } catch (error) {
    console.error(`[SyncEngine] Error processing item ${item.id}:`, error);
    return false;
  }
}

/**
 * Sync workout session to Supabase
 */
async function syncWorkoutSession(
  operation: string,
  data: Record<string, unknown>,
  id: string
): Promise<boolean> {
  switch (operation) {
    case 'insert': {
      // Update offline flag to false before inserting
      const insertData = { ...data, _offline: false, _pendingsync: false };
      const { error } = await supabase
        .from('workout_sessions')
        .insert(insertData as never);
      
      if (error) {
        console.error('[SyncEngine] Insert workout_session error:', error);
        return false;
      }
      return true;
    }
    case 'update': {
      const updateData = { ...data, _offline: false, _pendingsync: false };
      const { error } = await supabase
        .from('workout_sessions')
        .update(updateData as never)
        .eq('id', id);
      
      if (error) {
        console.error('[SyncEngine] Update workout_session error:', error);
        return false;
      }
      return true;
    }
    case 'delete': {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('[SyncEngine] Delete workout_session error:', error);
        return false;
      }
      return true;
    }
    default:
      return false;
  }
}

/**
 * Sync session exercise to Supabase
 */
async function syncSessionExercise(
  operation: string,
  data: Record<string, unknown>,
  id: string
): Promise<boolean> {
  switch (operation) {
    case 'insert': {
      const { error } = await supabase
        .from('session_exercises')
        .insert(data as never);
      return !error;
    }
    case 'update': {
      const { error } = await supabase
        .from('session_exercises')
        .update(data as never)
        .eq('id', id);
      return !error;
    }
    case 'delete': {
      const { error } = await supabase
        .from('session_exercises')
        .delete()
        .eq('id', id);
      return !error;
    }
    default:
      return false;
  }
}

/**
 * Sync session set to Supabase
 */
async function syncSessionSet(
  operation: string,
  data: Record<string, unknown>,
  id: string
): Promise<boolean> {
  switch (operation) {
    case 'insert': {
      const insertData = { ...data, _offline: false, _pendingsync: false };
      const { error } = await supabase
        .from('session_sets')
        .insert(insertData as never);
      return !error;
    }
    case 'update': {
      const updateData = { ...data, _offline: false, _pendingsync: false };
      const { error } = await supabase
        .from('session_sets')
        .update(updateData as never)
        .eq('id', id);
      return !error;
    }
    case 'delete': {
      const { error } = await supabase
        .from('session_sets')
        .delete()
        .eq('id', id);
      return !error;
    }
    default:
      return false;
  }
}

/**
 * Process the entire sync queue
 */
export async function processQueue(): Promise<{ synced: number; failed: number }> {
  // Check if online
  const online = await isOnline();
  if (!online) {
    console.log('[SyncEngine] Offline, skipping sync');
    return { synced: 0, failed: 0 };
  }

  // Try to acquire lock
  const hasLock = await acquireSyncLock();
  if (!hasLock) {
    console.log('[SyncEngine] Another sync in progress');
    return { synced: 0, failed: 0 };
  }

  try {
    emit('sync_start');
    const queue = await getQueue();
    
    if (queue.length === 0) {
      console.log('[SyncEngine] Queue empty');
      emit('sync_complete', { synced: 0, failed: 0 });
      return { synced: 0, failed: 0 };
    }

    console.log(`[SyncEngine] Processing ${queue.length} items`);
    
    let synced = 0;
    let failed = 0;

    // Sort by timestamp (oldest first) for proper ordering
    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const item of sortedQueue) {
      // Skip items that have exceeded max retries
      if (item.retryCount >= MAX_RETRIES) {
        console.warn(`[SyncEngine] Item ${item.id} exceeded max retries, skipping`);
        failed++;
        continue;
      }

      // Check network before each item
      if (!(await isOnline())) {
        console.log('[SyncEngine] Lost connection during sync');
        break;
      }

      const success = await processSyncItem(item);

      if (success) {
        await removeFromQueue(item.id);
        synced++;
        emit('item_synced', { id: item.id, type: item.type });
      } else {
        await incrementRetryCount(item.id, 'Sync failed');
        failed++;
        
        // Add delay before next attempt (exponential backoff)
        const delay = getRetryDelay(item.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`[SyncEngine] Sync complete. Synced: ${synced}, Failed: ${failed}`);
    emit('sync_complete', { synced, failed });
    return { synced, failed };
  } finally {
    await releaseSyncLock();
  }
}

/**
 * Start background sync monitor
 * Call this when the app starts
 */
export function startSyncMonitor(intervalMs: number = 30000): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  
  // Initial sync
  processQueue();

  // Set up periodic sync
  intervalId = setInterval(() => {
    processQueue();
  }, intervalMs);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}
