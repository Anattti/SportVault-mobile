import { getDB } from '@/lib/db';
import type { ActiveSession } from '@/types';

/**
 * Save active session to SQLite
 */
export async function saveActiveSession(session: ActiveSession): Promise<void> {
  try {
    const db = await getDB();
    const jsonValue = JSON.stringify(session);
    // Use a fixed ID 'current_session' for the single active session row
    await db.runAsync(
      `INSERT OR REPLACE INTO active_session (id, data, created_at) VALUES (?, ?, ?)`,
      ['current_session', jsonValue, Date.now()]
    );
  } catch (e) {
    console.error('Failed to save active session:', e);
  }
}

/**
 * Load active session from SQLite
 */
export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    const db = await getDB();
    const result = await db.getFirstAsync<{ data: string }>(
      `SELECT data FROM active_session WHERE id = ?`,
      ['current_session']
    );
    
    return result ? JSON.parse(result.data) : null;
  } catch (e) {
    console.error('Failed to load active session:', e);
    return null;
  }
}

/**
 * Clear active session from SQLite
 */
export async function clearActiveSession(): Promise<void> {
  try {
    const db = await getDB();
    await db.runAsync(`DELETE FROM active_session WHERE id = ?`, ['current_session']);
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
}
