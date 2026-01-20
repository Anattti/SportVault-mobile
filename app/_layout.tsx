import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

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
        name="workout-flow/active" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom"
        }} 
      />
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActiveSessionProvider } from '@/context/ActiveSessionContext';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { startSyncMonitor } from '@/lib/offlineSync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default - reduces unnecessary refetches
      retry: 2, // Limit retries on failure
      refetchOnWindowFocus: false, // Not needed in React Native
      refetchOnReconnect: true, // Refetch when network reconnects
    },
  },
});

export default function Layout() {
  // Start background sync monitor when app launches
  useEffect(() => {
    const stopMonitor = startSyncMonitor(30000); // Sync every 30 seconds
    return () => stopMonitor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
