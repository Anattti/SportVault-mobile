import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import "@/lib/i18n"; // Initialize i18n

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inDashboardGroup = segments[0] === "(dashboard)";
    const atRoot = (segments as string[]).length === 0;

    if (!session) {
      // If user is not logged in and not in auth group, redirect to login
      // This covers root path (index) and any protected routes
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
    } else {
      // If user IS logged in:
      // 1. If at root, go to dashboard
      // 2. If in auth group (login page), go to dashboard
      if (atRoot || inAuthGroup) {
        router.replace("/(dashboard)/workouts");
      }
    }
  }, [session, loading, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="workout-session/[id]" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom"
        }} 
      />
    </Stack>
  );
}

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveSessionProvider } from '@/context/ActiveSessionContext';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { startSyncMonitor } from '@/lib/offlineSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      networkMode: 'offlineFirst', // Allow queries to run without network
    },
    mutations: {
      networkMode: 'offlineFirst', // Allow mutations to run without network
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 3000, // Throttle saves to once every 3 seconds
});

export default function Layout() {
  // Start background sync monitor when app launches
  useEffect(() => {
    const stopMonitor = startSyncMonitor(30000); // Sync every 30 seconds
    return () => stopMonitor();
  }, []);

  return (
    <PersistQueryClientProvider 
      client={queryClient} 
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AuthProvider>
        <ActiveSessionProvider>
          <SafeAreaProvider>
            <View style={styles.container}>
              <StatusBar style="light" />
              <OfflineIndicator />
              <RootLayoutNav />
            </View>
          </SafeAreaProvider>
        </ActiveSessionProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
