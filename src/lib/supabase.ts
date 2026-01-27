import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    } catch (error) {
      console.warn('SecureStore.getItem failed:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      return await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    } catch (error) {
      console.warn('SecureStore.setItem failed:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      return await SecureStore.deleteItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    } catch (error) {
      console.warn('SecureStore.removeItem failed:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
