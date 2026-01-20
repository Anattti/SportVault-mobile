import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  interpolateColor,
  useDerivedValue,
  SharedValue,
  runOnJS,
  FadeIn
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export type TabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type LiquidTabsProps = {
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
};

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export function LiquidTabs({ tabs, activeTabId, onTabChange }: LiquidTabsProps) {
  const [layoutMap, setLayoutMap] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const isInitialized = useRef(false);

  // Update indicator when active tab changes or layouts update
  useEffect(() => {
    const targetLayout = layoutMap[activeTabId];
    if (targetLayout) {
      if (!isInitialized.current) {
        indicatorX.value = targetLayout.x;
        indicatorWidth.value = targetLayout.width;
        isInitialized.current = true;
      } else {
        indicatorX.value = withSpring(targetLayout.x, SPRING_CONFIG);
        indicatorWidth.value = withSpring(targetLayout.width, SPRING_CONFIG);
      }
    }
  }, [activeTabId, layoutMap]);

  const handleLayout = (id: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    
    // Only update if changed significantly to avoid loops
    setLayoutMap(prev => {
      const current = prev[id];
      if (current && Math.abs(current.x - x) < 1 && Math.abs(current.width - width) < 1) {
        return prev;
      }
      return { ...prev, [id]: { x, width } };
    });
  };

  const handlePress = (id: string) => {
    if (id !== activeTabId) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onTabChange(id);
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background Indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {/* Tabs */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        
        return (
          <Pressable
            key={tab.id}
            onLayout={(e) => handleLayout(tab.id, e)}
            onPress={() => handlePress(tab.id)}
            style={styles.tabItem}
          >
            <View style={styles.tabContent}>
               {/* Icon */}
               <TabIcon 
                 icon={tab.icon} 
                 isActive={isActive} 
               />
               
               {/* Label (conditionally rendered but purely with logic, 
                   animation handled by layout changes pushing elements) */}
               {isActive && (
                 <Animated.Text entering={FadeIn.duration(200)} style={styles.label}>
                   {tab.label}
                 </Animated.Text>
               )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Subcomponent for Icon to handle color animation easily
function TabIcon({ icon: Icon, isActive }: { icon: LucideIcon; isActive: boolean }) {
  // We can just switch colors or animate them. 
  // For simplicity and "pop", direct switch with the parent spring works well.
  // But let's try a subtle color transition if we wanted.
  return (
    <Icon 
      size={isActive ? 18 : 22} 
      color={isActive ? "#000000" : "#666666"} 
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 100,
    padding: 6,
    position: 'relative', // Context for absolute indicator
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0, // animated via translateX
    backgroundColor: Colors.neon.DEFAULT,
    borderRadius: 100,
    // Add subtle shadow/glow for "liquid glass" feel
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  tabItem: {
    zIndex: 1, // Above indicator
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  label: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
});
