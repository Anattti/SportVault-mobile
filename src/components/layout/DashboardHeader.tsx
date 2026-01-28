import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { BoltLogo } from "@/components/ui/BoltLogo";
import { Plus, Activity, History, TrendingUp, Calendar, Calculator, Settings } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ActiveSessionBanner } from "@/components/workout/ActiveSessionBanner";
import { LiquidTabs, TabItem } from "@/components/ui/LiquidTabs";
import { useHeartRate } from "@/context/HeartRateContext";
import { Heart } from "lucide-react-native";
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  useSharedValue, 
  withSequence, 
  withRepeat, 
  Easing 
} from "react-native-reanimated";
import { useState, useEffect } from "react";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function EasterEggBolt() {
  const { currentBpm, status } = useHeartRate();
  const [showHeart, setShowHeart] = useState(false);
  
  // Animations
  const scaleHeart = useSharedValue(0);
  const scaleBolt = useSharedValue(1);
  const heartBeat = useSharedValue(1);

  const toggle = () => {
    const nextState = !showHeart;
    setShowHeart(nextState);

    if (nextState) {
        // Show Heart
        scaleBolt.value = withTiming(0, { duration: 300 });
        scaleHeart.value = withSpring(1, { damping: 42 });
    } else {
        // Show Bolt
        scaleHeart.value = withTiming(0, { duration: 300 });
        scaleBolt.value = withSpring(1, { damping: 42 });
    }
  };

  // Heartbeat animation
  useEffect(() => {
    if (showHeart && status === 'connected') {
        heartBeat.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 100, easing: Easing.ease }),
                withTiming(1, { duration: 500, easing: Easing.ease })
            ),
            -1,
            true
        );
    } else {
        heartBeat.value = withTiming(1);
    }
  }, [showHeart, status, currentBpm]);

  const boltStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleBolt.value }],
    opacity: scaleBolt.value,
    position: 'absolute',
    left: -2
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [
        { scale: scaleHeart.value },
        { scale: heartBeat.value }
    ],
    opacity: scaleHeart.value,
    position: 'absolute',
    left: 2, // Added padding/spacing (was -4)
    alignItems: 'center',
    justifyContent: 'center',
  }));

  const displayText = status === 'connected' && currentBpm ? currentBpm : (status === 'connected' ? '--' : 'X');
  const fillColor = status === 'connected' ? Colors.status.destructive : '#333';

  return (
    <Pressable onPress={toggle} style={styles.boltContainer}>
      <Animated.View style={boltStyle}>
        <BoltLogo size={24} />
      </Animated.View>
      
      <Animated.View style={heartStyle}>
        <Heart size={28} color={fillColor} fill={fillColor} />
        <Text style={styles.heartText}>
            {displayText}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const UserIndicator = ({ nickname }: { nickname?: string }) => {
  const router = useRouter();
  const { t } = useTranslation();
  
  return (
    <Pressable 
      style={styles.userIndicator} 
      onPress={() => router.push("/settings")}
      accessibilityRole="button"
      accessibilityLabel={t('common.profile', 'Profile')}
    >
      <Text style={styles.userIndicatorText}>{nickname || '...'}</Text>
    </Pressable>
  );
};

const StaticHeaderTop = React.memo(({ 
  onSettingsPress, 
  onAddWorkoutPress 
}: { 
  onSettingsPress: () => void, 
  onAddWorkoutPress: () => void 
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>SportVault</Text>
          <EasterEggBolt />
        </View>
      </View>
      <View style={styles.headerRight}>
        <Pressable 
          onPress={onSettingsPress}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel={t('common.settings', 'Settings')}
          hitSlop={8}
        >
          <Settings color={Colors.text.primary} size={24} />
        </Pressable>
        <Button 
          style={styles.addWorkoutButton}
          onPress={onAddWorkoutPress}
          accessibilityRole="button"
          accessibilityLabel={t('common.add_workout')}
        >
          <View style={styles.addWorkoutContent}>
            <Plus color="#000" size={20} />
            <Text style={styles.addWorkoutText}>{t('common.add_workout')}</Text>
          </View>
        </Button>
      </View>
    </View>
  );
});

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
    if (pathname.includes('/history')) return 'history';
    if (pathname.includes('/workouts')) return 'workouts';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/calculator')) return 'calculator';
    return 'workouts';
  };

  const activeTab = getActiveTab();

  const handleTabChange = useCallback((id: string) => {
    switch(id) {
      case 'workouts':
        router.replace("/(dashboard)/workouts");
        break;
      case 'history':
        router.replace("/(dashboard)/history");
        break;
      case 'analytics':
        router.replace("/(dashboard)/analytics");
        break;
      case 'calendar':
        router.replace("/(dashboard)/calendar");
        break;
      case 'calculator':
        router.replace("/(dashboard)/calculator");
        break;
    }
  }, [router]);

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

  const handleSettingsPress = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const handleAddWorkoutPress = useCallback(() => {
    router.push("/create-workout");
  }, [router]);

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <StaticHeaderTop 
        onSettingsPress={handleSettingsPress}
        onAddWorkoutPress={handleAddWorkoutPress}
      />
      
      {/* Tabs row with username on left */}
      
      {/* Tabs row with username on left */}
      <View style={styles.tabsRow}>
        <LiquidTabs 
          tabs={TABS} 
          activeTabId={activeTab} 
          onTabChange={handleTabChange} 
        />
        <UserIndicator nickname={nickname} />
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
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  boltContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
  },
  heartText: {
    position: 'absolute',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});


