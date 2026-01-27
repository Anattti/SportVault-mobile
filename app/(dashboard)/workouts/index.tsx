import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Plus, 
  Clock, 
  MoreVertical, 
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Database } from "@/types/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";

import * as Haptics from "expo-haptics";


type Workout = Database["public"]["Tables"]["workouts"]["Row"] & {
  duration?: number; // Add duration for average calculation
  workout_sessions?: { duration: number | null }[]; // For the joined data
};

export default function WorkoutsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workouts = [], isLoading, refetch, isRefetching } = useQuery<Workout[]>({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_sessions (
            duration
          )
        `)
        .eq('user_id', user.id)
        .order("display_order", { ascending: true });

      if (error) throw error;

      // Calculate averages from the nested data
      return data.map(workout => {
        const sessions = workout.workout_sessions || [];
        // Filter out null durations just in case
        const durations = sessions
          .map((s: any) => s.duration)
          .filter((d: any) => typeof d === 'number');
          
        let avgDuration = workout.duration; // Default to manual duration if it exists
        
        if (durations.length > 0) {
          const total = durations.reduce((sum: number, d: number) => sum + d, 0);
          avgDuration = Math.round(total / durations.length);
        }

        return {
          ...workout,
          duration: avgDuration
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const onRefresh = async () => {
    await refetch();
  };

  const formatDuration = (totalSeconds: number | undefined) => {
    if (totalSeconds === undefined || totalSeconds === null) return t('workouts.not_available');
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}${t('workouts.hours')} ${m}${t('workouts.minutes')}`;
  };

  const formatDate = (dateString: string) => {
    const locale = i18n.language === 'fi' ? 'fi-FI' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  // Handle drag end - update display_order in Supabase
  const handleDragEnd = async ({ data }: { data: Workout[] }) => {
    // Optimistically update local state via query cache
    queryClient.setQueryData(['workouts', user?.id], data);

    // Light haptic on drop
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update display_order in Supabase
    try {
      const updates = data.map((workout, index) => ({
        id: workout.id,
        display_order: index,
      }));

      // Update each workout's display_order
      for (const update of updates) {
        await supabase
          .from("workouts")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error updating workout order:", error);
      // Refetch to restore correct order on error
      refetch();
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Workout>) => (
    <ScaleDecorator activeScale={1.02}>
      <Pressable 
        onPress={() => router.push(`/(dashboard)/workouts/${item.id}`)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          drag();
        }}
        disabled={isActive}
      >
        <Card style={StyleSheet.flatten([styles.workoutCard, isActive && styles.workoutCardActive]) as ViewStyle} glass={false}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.emojiIcon}>🏋️</Text>
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.workoutTitle}>{item.program}</Text>
              </View>
              <Pressable style={styles.moreButton}>
                <MoreVertical color={Colors.text.secondary} size={24} />
              </Pressable>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock color={Colors.text.secondary} size={18} />
                <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
              </View>
            </View>
            
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={workouts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        onDragBegin={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        activationDistance={15}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('workouts.empty_templates')}</Text>
              <Button 
                variant="outline" 
                style={styles.emptyButton}
                onPress={() => router.push("/create-workout")}
              >
                <Text style={styles.emptyButtonText}>{t('workouts.create_first')}</Text>
              </Button>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.horizontal,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 16,
  },
  workoutCard: {
    backgroundColor: Colors.card.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  workoutCardActive: {
    borderColor: Colors.neon.DEFAULT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  listContainer: {
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  emojiIcon: {
    fontSize: 24,
  },
  titleContainer: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  moreButton: {
    padding: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    color: Colors.text.secondary,
    fontSize: 18,
    fontWeight: "500",
  },
  dateRow: {
    marginTop: 4,
  },
  dateText: {
    color: Colors.text.secondary,
    fontSize: 16,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: 16,
    marginBottom: 20,
  },
  emptyButton: {
    borderColor: Colors.neon.DEFAULT,
  },
  emptyButtonText: {
    color: Colors.neon.DEFAULT,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neon.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
