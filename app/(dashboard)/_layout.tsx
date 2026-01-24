import { Tabs } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Colors } from "@/constants/Colors";

export default function DashboardLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Hide native tab bar - using LiquidTabs in header
        }}
      >
        <Tabs.Screen name="workouts/index" />
        <Tabs.Screen name="workouts/history" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="calendar/index" />
        <Tabs.Screen name="calculator/index" />
      </Tabs>
    </GestureHandlerRootView>
  );
}
