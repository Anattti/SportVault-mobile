import { Tabs } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Colors } from "@/constants/Colors";
import { View } from "react-native";
import { DashboardHeader } from "@/components/layout/DashboardHeader";


export default function DashboardLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            header: () => <DashboardHeader />,
            headerShown: true,
            // Hide native/custom bottom bar completely
            // We use DashboardHeader for navigation
            tabBarStyle: { display: 'none' }, 
            animation: 'fade', // Add fade animation for smoother tab switches if needed due to header staying
          }}
        >
          <Tabs.Screen name="workouts/index" options={{ headerShown: true }} />
          {/* Explicitly hide header for preview screens - handled by the stack inside or global config? 
              Actually, workouts/[id] is inside the (dashboard) group but NOT a direct tab screen. 
              The (dashboard)/_layout touches ALL screens in this group.
              
              Wait, 'workouts/index' is the tab. 'workouts/[id]' is effectively a sibling or nested stack?
              File structure:
              app/(dashboard)/workouts/index.tsx
              app/(dashboard)/workouts/[id].tsx
              
              If they are flat files in (dashboard), they are children of this Layout.
              But <Tabs> only renders children that are <Tabs.Screen>.
              Routes NOT matched by a <Tabs.Screen> but in the directory are usually treated as "stack-like" if using Stack, 
              but here we are using Tabs.
              
              If a route is not a Tab, it often doesn't show up in the tab bar (correct), but it shares the layout.
              
              However, [id].tsx needs to HIDE the header.
              We can do that in [id].tsx using standard options.
          */}
          
          <Tabs.Screen name="history" />
          <Tabs.Screen name="analytics" />
          <Tabs.Screen name="calendar" />
          <Tabs.Screen name="calculator" />
        </Tabs>
      </View>
    </GestureHandlerRootView>
  );
}

