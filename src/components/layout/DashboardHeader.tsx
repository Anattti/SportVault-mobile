import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { BoltLogo } from "@/components/ui/BoltLogo";
import { Plus, Activity, History, TrendingUp, Calendar, Calculator } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ActiveSessionBanner } from "@/components/workout/ActiveSessionBanner";
import { LiquidTabs, TabItem } from "@/components/ui/LiquidTabs";

export function DashboardHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const TABS: TabItem[] = useMemo(() => [
    { id: 'workouts', label: t('nav.workouts'), icon: Activity },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'analytics', label: t('nav.analytics'), icon: TrendingUp },
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar },
    { id: 'calculator', label: t('nav.calculator'), icon: Calculator },
  ], [t]);
  const pathname = usePathname();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Determine active tab based on pathname
  const getActiveTab = () => {
    if (pathname.includes('/workouts/history')) return 'history';
    if (pathname.includes('/workouts') && !pathname.includes('/workouts/history')) return 'workouts';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/calculator')) return 'calculator';
    return 'workouts';
  };

  const activeTab = getActiveTab();

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

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>SportVault</Text>
            <BoltLogo size={24} style={{ marginLeft: -2 }} />
          </View>
        </View>
        <View style={styles.headerRight}>
          <Button 
            style={styles.addWorkoutButton}
            onPress={() => router.push("/(dashboard)/workouts/create")}
          >
            <View style={styles.addWorkoutContent}>
              <Plus color="#000" size={20} />
              <Text style={styles.addWorkoutText}>{t('common.add_workout')}</Text>
            </View>
          </Button>
        </View>
      </View>
      
      {/* Tabs row with username on left */}
      <View style={styles.tabsRow}>
        <LiquidTabs 
          tabs={TABS} 
          activeTabId={activeTab} 
          onTabChange={handleTabChange} 
        />
        <Pressable style={styles.userIndicator} onPress={() => router.push("/(dashboard)/profile")}>
          <Text style={styles.userIndicatorText}>{nickname || '...'}</Text>
        </Pressable>
      </View>
      
      <ActiveSessionBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Push content to edges
    paddingHorizontal: Spacing.horizontal,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  userIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16, // Match button padding to align with text
  },
  userIndicatorText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
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
});


