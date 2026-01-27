import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { processQueue } from './offlineSync/syncEngine';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

// Define the task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Starting background sync...');
    const result = await processQueue();
    console.log(`[BackgroundSync] Completed. Synced: ${result.synced}, Failed: ${result.failed}`);
    
    if (result.synced > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else if (result.failed > 0) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[BackgroundSync] Failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the task
export async function registerBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 60 * 15, // 15 minutes
            stopOnTerminate: false, // Continue even if app is terminated (Android only mostly)
            startOnBoot: true, // Android only
        });
        console.log('[BackgroundSync] Task registered');
    } else {
        console.log('[BackgroundSync] Task already registered');
    }
  } catch (err: any) {
    if (err?.message?.includes('Background Fetch has not been configured')) {
      console.warn('[BackgroundSync] Background Fetch not configured (Expected in Expo Go). Skipping registration.');
      return;
    }
    console.error('[BackgroundSync] Registration failed:', err);
  }
}
