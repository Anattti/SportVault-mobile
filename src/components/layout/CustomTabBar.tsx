import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LiquidTabs, TabItem } from '@/components/ui/LiquidTabs';
import { Activity, History, TrendingUp, Calendar, Calculator } from "lucide-react-native";
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useRouter } from "expo-router";

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Define tabs configuration
  const TABS: TabItem[] = [
    { id: 'workouts', label: t('nav.workouts'), icon: Activity },
    { id: 'history', label: t('nav.history'), icon: History },
    { id: 'analytics', label: t('nav.analytics'), icon: TrendingUp },
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar },
    { id: 'calculator', label: t('nav.calculator'), icon: Calculator },
  ];

  // Map current route to tab ID
  const getActiveTabId = () => {
    const currentRoute = state.routes[state.index];
    const name = currentRoute.name;

    if (name.includes('history')) return 'history';
    if (name.includes('analytics')) return 'analytics';
    if (name.includes('calendar')) return 'calendar';
    if (name.includes('calculator')) return 'calculator';
    if (name.includes('workouts')) return 'workouts'; // Covers 'workouts/index' and 'workouts/[id]'
    
    return 'workouts';
  };

  const handleTabChange = (id: string) => {
    // Navigate to the correct route based on ID
    switch(id) {
        case 'workouts':
          router.push("/(dashboard)/workouts");
          break;
        case 'history':
          router.push("/(dashboard)/history");
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

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <LiquidTabs 
        tabs={TABS} 
        activeTabId={getActiveTabId()} 
        onTabChange={handleTabChange} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingTop: 12,
  },
});
