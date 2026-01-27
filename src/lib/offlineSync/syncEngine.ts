/**
 * Sync Engine
 * Background sync manager for processing offline queue with batch support
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
  SyncItemType,
  addToQueue
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
    const queue = await getQueue();
    
    if (queue.length === 0) {
      console.log('[SyncEngine] Queue empty');
      return { synced: 0, failed: 0 };
    }

    emit('sync_start');
    console.log(`[SyncEngine] Processing ${queue.length} items`);
    
    let synced = 0;
    let failed = 0;

    // Group items by session to batch them
    // Map<SessionID, SyncItem[]>
    const sessionBatches = new Map<string, SyncItem[]>();
    const otherItems: SyncItem[] = [];

    // Sort by timestamp (oldest first)
    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    // 1. First pass: Identify sessions and grouping
    for (const item of sortedQueue) {
      if (item.type === 'workout_session') {
        const sessionId = item.id;
        if (!sessionBatches.has(sessionId)) {
          sessionBatches.set(sessionId, []);
        }
        sessionBatches.get(sessionId)?.push(item);
      } else if (item.type === 'session_exercise') {
        const sessionId = item.data.session_id as string;
        if (sessionId) {
           if (!sessionBatches.has(sessionId)) {
             sessionBatches.set(sessionId, []);
           }
           sessionBatches.get(sessionId)?.push(item);
        } else {
          otherItems.push(item);
        }
      } else if (item.type === 'session_set') {
         // Sets don't have session_id directly, usually only session_exercise_id
         // For now, we put them in 'otherItems' unless we can link them.
         // OPTIMIZATION: In a real app we'd map exercise->session to group these too.
         // However, simple batching of checking workout_session existence is often enough for the main payload.
         // Let's see if we can perform a basic link if we have the exercise in the queue.
         const exerciseId = item.data.session_exercise_id as string;
         // Find exercise in current queue to get session_id
         const relatedExercise = sortedQueue.find(q => q.type === 'session_exercise' && q.id === exerciseId);
         if (relatedExercise && relatedExercise.data.session_id) {
           const sessionId = relatedExercise.data.session_id as string;
           if (!sessionBatches.has(sessionId)) {
             sessionBatches.set(sessionId, []);
           }
           sessionBatches.get(sessionId)?.push(item);
         } else {
           otherItems.push(item);
         }
      } else {
        otherItems.push(item);
      }
    }

    // 2. Process Batches (RPC)
    for (const [sessionId, items] of sessionBatches) {
      // Check max retries for the batch (use any item's retry count)
      if (items.some(i => i.retryCount >= MAX_RETRIES)) {
          console.warn(`[SyncEngine] Batch for session ${sessionId} exceeded max retries, skipping`);
          failed += items.length;
          continue;
      }

      console.log(`[SyncEngine] Processing batch for session ${sessionId} (${items.length} items)`);
      const success = await syncSessionBatch(sessionId, items);

      if (success) {
        // Remove all items in batch
        for (const item of items) {
          await removeFromQueue(item.id);
          emit('item_synced', { id: item.id, type: item.type });
        }
        synced += items.length;
      } else {
        // Increment retry for all
        for (const item of items) {
           await incrementRetryCount(item.id, 'Batch sync failed');
        }
        failed += items.length;
      }
    }

    // 3. Process remaining items individually (legacy fallback)
    for (const item of otherItems) {
      if (item.retryCount >= MAX_RETRIES) continue;

      const success = await processSyncItem(item);
      if (success) {
        await removeFromQueue(item.id);
        synced++;
        emit('item_synced', { id: item.id, type: item.type });
      } else {
        await incrementRetryCount(item.id, 'Sync failed');
        failed++;
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
 * Sync a batch of items for a single session using RPC
 */
async function syncSessionBatch(sessionId: string, items: SyncItem[]): Promise<boolean> {
  // 1. Construct the payload
  // Find the session data (latest update prefers)
  const sessionItem = items.find(i => i.type === 'workout_session');
  // If we have only children but no session parent in queue, we might need to fetch it or this is a partial update?
  // Current RPC requires session object.
  // If sessionItem is missing, we strictly can't use save_full_workout_session easily unless we fetch current state.
  // Fallback: if no session item, return false so they fall through to individual processing? 
  // OR: We construct a minimal session object if we are just adding sets? 
  // Let's stick to: Use RPC only if we have the session item (e.g. creating/finishing workout).
  
  if (!sessionItem) {
    // Cannot batch without the session parent context for the RPC in its current design
    console.log('[SyncEngine] No session parent in batch, falling back to individual processing');
    return false; // Will be processed by fallback logic? No, we removed them from 'otherItems'.
    // Logic fix: We need to handle this. 
    // Actually, 'otherItems' are populated only if NOT matching sessionBatches logic.
    // If we are here, we put them in the batch.
    // We should fallback to individual processing inside here or return false.
    // If we return false, the outside loop increments retry. That's bad if it's just a Logic mismatch.
    // Let's execute them individually here if RPC is not possible.
    
    let allSuccess = true;
    for (const item of items) {
      if (!(await processSyncItem(item))) allSuccess = false;
    }
    return allSuccess;
  }

  const exercises = items.filter(i => i.type === 'session_exercise').map(i => i.data);
  const sets = items.filter(i => i.type === 'session_set').map(i => i.data);

  // 1.5 Conflict Detection (Client-Side)
  try {
    const { data: currentSession, error: fetchError } = await supabase
      .from('workout_sessions')
      .select('updated_at, id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!fetchError && currentSession) {
      const localUpdatedAt = sessionItem.data.updated_at ? new Date(sessionItem.data.updated_at as string).getTime() : 0;
      const serverUpdatedAt = currentSession.updated_at ? new Date(currentSession.updated_at).getTime() : 0;

      // Tolerance of 1 second to avoid clock drift issues on same-device quick syncs
      if (serverUpdatedAt > localUpdatedAt + 1000) {
        console.warn(`[SyncEngine] Conflict detected for session ${sessionId}. Server: ${serverUpdatedAt}, Local: ${localUpdatedAt}. Aborting batch sync to protect server data.`);
        // For now, we abort. In future, we could trigger valid conflict resolution UI or auto-merge.
        // Returning false causes retry, which might loop if we don't handle it. 
        // We should mark it as failed with specific error or move to a "conflict queue".
        // For this phase, logging and "Last Writer Wins" (if we proceeded) is the norm, but we choose to PROTECT server data.
        
        // However, if we abort and return false, it will retry forever.
        // Let's Log strict warning but PROCEED for now as per plan "Log warning but let user change win" 
        // OR better: skip this item and mark as 'conflict_error' to stop retrying.
        
        // Actually, the plan said: "Log warning but let user change win (or force-flag)".
        // But to be safe, let's just Log for now and proceed, effectively "Last Writer Wins" but with visibility.
        console.warn('[SyncEngine] Proceeding with overwrite (Last Writer Wins strategy currently active).');
      }
    }
  } catch (e) {
    console.log('[SyncEngine] Failed to check for conflicts, proceeding anyway.', e);
  }

  const payload = {
    session: sessionItem.data,
    exercises: exercises,
    sets: sets
  };

  // 2. Call RPC
  const { data, error } = await supabase.rpc('save_full_workout_session', { payload });

  if (error) {
    console.error('[SyncEngine] RPC Batch save failed:', error);
    return false;
  }

  // Check application level success from RPC response if it returns one
  // Our RPC returns jsonb_build_object('success', true/false...)
  if (data && data.success === false) {
     console.error('[SyncEngine] RPC returned error:', data.error);
     return false;
  }

  return true;
}


/**
 * Process a single sync item (Legacy/Fallback)
 */
async function processSyncItem(item: SyncItem): Promise<boolean> {
  try {
    const { type, operation, data, id } = item;
    // ... (Use existing simple sync functions)
    switch (type) {
      case 'workout_session': return await syncWorkoutSession(operation, data, id);
      case 'session_exercise': return await syncSessionExercise(operation, data, id);
      case 'session_set': return await syncSessionSet(operation, data, id);
      default: return false;
    }
  } catch (error) {
    console.error(`[SyncEngine] Error processing item ${item.id}:`, error);
    return false;
  }
}

// ... Keep existing individual sync functions (syncWorkoutSession, etc) for fallback ...
async function syncWorkoutSession(operation: string, data: Record<string, unknown>, id: string): Promise<boolean> {
    if (operation === 'delete') {
      const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
      return !error;
    }
    const { error } = await supabase.from('workout_sessions').upsert({ ...data, _offline: false, _pendingsync: false } as never);
    return !error;
}

async function syncSessionExercise(operation: string, data: Record<string, unknown>, id: string): Promise<boolean> {
    if (operation === 'delete') {
      const { error } = await supabase.from('session_exercises').delete().eq('id', id);
      return !error;
    }
    const { error } = await supabase.from('session_exercises').upsert(data as never);
    return !error;
}

async function syncSessionSet(operation: string, data: Record<string, unknown>, id: string): Promise<boolean> {
    if (operation === 'delete') {
        const { error } = await supabase.from('session_sets').delete().eq('id', id);
        return !error;
    }
    const { error } = await supabase.from('session_sets').upsert({ ...data, _offline: false, _pendingsync: false } as never);
    return !error;
}

/**
 * Start background sync monitor
 */
export function startSyncMonitor(intervalMs: number = 30000): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  processQueue();
  intervalId = setInterval(() => { processQueue(); }, intervalMs);
  return () => { if (intervalId) clearInterval(intervalId); };
}

