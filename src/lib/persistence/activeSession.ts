import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveSession } from '@/types';

const ACTIVE_SESSION_KEY = '@sportvault_active_session';

/**
 * Save active session to AsyncStorage
 */
export async function saveActiveSession(session: ActiveSession): Promise<void> {
  try {
    const jsonValue = JSON.stringify(session);
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save active session:', e);
  }
}

/**
 * Load active session from AsyncStorage
 */
export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to load active session:', e);
    return null;
  }
}

/**
 * Clear active session from AsyncStorage
 */
export async function clearActiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear active session:', e);
  }
}
