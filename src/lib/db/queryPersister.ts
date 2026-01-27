import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { getDB } from './index';

interface SQLitePersisterOptions {
  key?: string;
  throttleTime?: number;
}

export function createSQLitePersister({
  key = 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime = 3000,
}: SQLitePersisterOptions = {}): Persister {
  let timeoutHandle: NodeJS.Timeout | null = null;
  let lastWritePromise: Promise<void> = Promise.resolve();

  // Helper to process database write
  const saveToDb = async (client: PersistedClient) => {
    try {
      const db = await getDB();
      const value = JSON.stringify(client);
      const timestamp = Date.now();
      
      await db.runAsync(
          `INSERT OR REPLACE INTO documents (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)`,
          [key, value, timestamp, timestamp]
      );
    } catch (error) {
      console.error('[SQLitePersister] Failed to save cache:', error);
    }
  };

  return {
    persistClient: async (client: PersistedClient) => {
      // Basic throttling
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      timeoutHandle = setTimeout(() => {
        lastWritePromise = lastWritePromise.then(() => saveToDb(client));
      }, throttleTime);
    },

    restoreClient: async () => {
      try {
        const db = await getDB();
        const result = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM documents WHERE key = ?`,
          [key]
        );
        
        if (result) {
          return JSON.parse(result.value);
        }
      } catch (error) {
        console.error('[SQLitePersister] Failed to restore cache:', error);
      }
      return undefined;
    },

    removeClient: async () => {
      try {
        const db = await getDB();
        await db.runAsync(`DELETE FROM documents WHERE key = ?`, [key]);
      } catch (error) {
        console.error('[SQLitePersister] Failed to remove cache:', error);
      }
    },
  };
}
