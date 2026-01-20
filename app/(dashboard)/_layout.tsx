
import { Tabs, useRouter, usePathname } from "expo-router";
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { useEffect, useState, useMemo, useRef } from "react";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { BoltLogo } from "@/components/ui/BoltLogo";
import { Plus, User, Settings, Activity, History, BarChart2, Calendar, Dumbbell, Calculator, TrendingUp } from "lucide-react-native";
import { LiquidTabs, TabItem } from "@/components/ui/LiquidTabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useActiveSession } from "@/context/ActiveSessionContext";
import { ActiveSessionBanner } from "@/components/workout/ActiveSessionBanner";

const TABS: TabItem[] = [
  { id: 'workouts', label: 'Treenit', icon: Activity },
  { id: 'history', label: 'Historia', icon: History },
  { id: 'analytics', label: 'Analytiikka', icon: TrendingUp },
  { id: 'calendar', label: 'Kalenteri', icon: Calendar },
  { id: 'calculator', label: 'Laskuri', icon: Calculator },
];

export default function DashboardLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Determine active active tab based on pathname
  const getActiveTab = () => {
    if (pathname.includes('/workouts/history')) return 'history';
    if (pathname.includes('/workouts') && !pathname.includes('/workouts/history')) return 'workouts';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/calculator')) return 'calculator';
    return 'workouts';
  };

  const activeTab = getActiveTab();

  // Use React Query for profile
  const { data: profile } = useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const nickname = profile?.nickname;

  const handleTabChange = (id: string) => {
    switch(id) {
      case 'workouts':
        router.push("/(dashboard)/workouts");
        break;
      case 'history':
        router.push("/(dashboard)/workouts/history");
        break;
      case 'analytics':
        router.push("/(dashboard)/analytics");
        break;
      case 'calendar':
        router.push("/(dashboard)/calendar");
        break;
      case 'calculator':
        router.push("/(dashboard)/calculator");
        break;
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (direction === 'left') {
       // Swipe Left -> Go Right (Next Tab)
       nextIndex = currentIndex + 1;
    } else {
       // Swipe Right -> Go Left (Prev Tab)
       nextIndex = currentIndex - 1;
    }

    if (nextIndex >= 0 && nextIndex < TABS.length) {
      handleTabChange(TABS[nextIndex].id);
    }
  };

  // Configure swipe gesture
  // We use activeOffsetX to require a significant horizontal movement before activating,
  // preventing accidental triggers during vertical scrolling.
  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-20, 20]) 
    .failOffsetY([-20, 20]) // Fail if vertical movement is detected first/significant
    .onEnd((e: any) => {
      if (e.translationX < -50) {
        runOnJS(handleSwipe)('left');
      } else if (e.translationX > 50) {
        runOnJS(handleSwipe)('right');
      }
    }), [activeTab]); // Depend on activeTab to ensure closure captures correct index

  const insets = useSafeAreaInsets();

  // Determine if we should show the persistent UI (Header + Tabs)
  const isMainTab = 
    (pathname === '/workouts' || pathname === '(dashboard)/workouts') || 
    pathname.includes('/workouts/history') || 
    pathname.includes('/analytics') || 
    pathname.includes('/calendar') || 
    pathname.includes('/calculator') || 
    pathname === '/' ||
    pathname === '';

  // Only enable gestures on main tabs to avoid messing with inner screens
  const isGestureEnabled = isMainTab;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: isMainTab ? insets.top : 0 }]}>
        {/* Persistent Header - Only show on main tabs */}
        {isMainTab && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.brandContainer}>
                <Text style={styles.brandText}>SportVault</Text>
                <BoltLogo size={24} style={{ marginLeft: -2 }} />
              </View>
            </View>
            <Button 
              style={styles.addWorkoutButton}
              onPress={() => router.push("/workout-flow/active")}
            >
              <View style={styles.addWorkoutContent}>
                <Plus color="#000" size={20} />
                <Text style={styles.addWorkoutText}>Lisää treeni</Text>
              </View>
            </Button>
          </View>
        )}

        {/* Persistent Liquid Tabs - Only show on main tabs */}
        {isMainTab && (
          <View style={styles.tabsBar}>
             <LiquidTabs 
               tabs={TABS} 
               activeTabId={activeTab} 
               onTabChange={handleTabChange} 
             />
            
            <Pressable style={styles.userIndicator} onPress={() => router.push("/(dashboard)/profile")}>
               <Text style={styles.userIndicatorText}>{nickname || '...'}</Text>
            </Pressable>
          </View>
        )}

        {/* Active Session Banner */}
        {isMainTab && <ActiveSessionBanner />}

        {/* Content Area with Gesture Detector */}
        <GestureDetector gesture={isGestureEnabled ? panGesture : Gesture.Native()}>
          <View style={styles.content}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' }, // Hide default bottom bar since we have LiquidTabs
                animation: 'shift', // Optional: try to make it smoother
              }}
            >
              <Tabs.Screen name="workouts/index" />
              <Tabs.Screen name="workouts/history" />
              <Tabs.Screen name="analytics" />
              <Tabs.Screen name="calendar/index" />
              <Tabs.Screen name="calculator/index" />
            </Tabs>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.horizontal,
    paddingVertical: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.neon.DEFAULT,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  addWorkoutButton: {
    backgroundColor: Colors.neon.DEFAULT,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
  },
  addWorkoutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addWorkoutText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
  tabsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.horizontal,
    paddingVertical: 12, // <-- SÄÄDÄ TÄTÄ ARVOA (väli tabsin ja sisällön välissä)
    zIndex: 10,
  },
  userIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingEnd: 17,
  },
  userIndicatorText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
});
