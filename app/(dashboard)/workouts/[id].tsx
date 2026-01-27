import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Share,
  Platform,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Colors } from "@/constants/Colors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  X, 
  Clock, 
  Dumbbell, 
  Trophy, 
  Play, 
  Share2, 
  Edit3, 
  Trash2,
  ChevronRight
} from "lucide-react-native";
import { Database } from "@/types/supabase";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseSet = Database["public"]["Tables"]["exercise_sets"]["Row"];

interface ExerciseWithSets extends Exercise {
  exercise_sets: ExerciseSet[];
}

import { useWorkoutAvgDuration } from "@/hooks/useWorkoutHistory";

export default function WorkoutDetailsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: details, isLoading } = useQuery({
    queryKey: ['workout_details', id],
    queryFn: async () => {
      // 1. Fetch workout
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (workoutError) throw workoutError;

      // 2. Fetch exercises with their sets
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select(`
          *,
          exercise_sets (*)
        `)
        .eq("workout_id", id)
        .order("order_index", { ascending: true });

      if (exerciseError) throw exerciseError;

      return {
        workout: workoutData,
        exercises: exerciseData as ExerciseWithSets[],
      };
    },
    enabled: !!id,
  });

  const { data: avgDuration = details?.workout.duration || 0 } = useWorkoutAvgDuration(
    id as string, 
    details?.workout.duration || 0
  );

  const workout = details?.workout;
  const exercises = details?.exercises || [];

  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}${t('workouts.hours')} ${m}${t('workouts.minutes')}`;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('workouts.details.share_message', { name: workout?.program }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('workouts.details.delete_title'),
      t('workouts.details.delete_confirm', { name: workout?.program }),
      [
        {
          text: t('profile.cancel'),
          style: "cancel",
        },
        {
          text: t('workouts.details.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              // Supabase poistaa liittyvät exercises ja sets cascade-poistolla
              const { error } = await supabase
                .from("workouts")
                .delete()
                .eq("id", id);

              if (error) throw error;

              // Invalidoi cache päivittääksesi listan
              await queryClient.invalidateQueries({ queryKey: ['workouts'] });
              
              // Navigoi takaisin treenilistaan
              router.back();
            } catch (error) {
              console.error("Virhe poistettaessa treeniä:", error);
              Alert.alert(
                t('profile.error'),
                t('workouts.details.delete_error')
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
      </View>
    );
  }

  const totalSets = exercises.reduce((acc: number, curr: ExerciseWithSets) => acc + curr.exercise_sets.length, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.tagRow}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText}>{t('workouts.details.preview_tag')}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{workout?.program}</Text>
        </View>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <X color={Colors.text.primary} size={24} />
        </Pressable>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('workouts.details.avg_duration')}</Text>
          <View style={styles.statValueRow}>
            <Clock color={Colors.neon.DEFAULT} size={16} />
            <Text style={styles.statValue}>{formatDuration(avgDuration)}</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('workouts.details.exercises_label')}</Text>
          <View style={styles.statValueRow}>
            <Dumbbell color={Colors.neon.DEFAULT} size={16} />
            <Text style={styles.statValue}>{exercises.length} {t('workouts.details.count_unit')}</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('workouts.details.sets_label')}</Text>
          <View style={styles.statValueRow}>
            <Trophy color={Colors.neon.DEFAULT} size={16} />
            <Text style={styles.statValue}>{totalSets} {t('workouts.details.sets_unit')}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((ex: ExerciseWithSets, index: number) => (
          <View key={ex.id} style={styles.exerciseSection}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseNumber}>{(index + 1).toString().padStart(2, '0')}</Text>
                <Text style={styles.exerciseName}>{ex.name}</Text>
              </View>
              <View style={styles.oneRMBadge}>
                <Text style={styles.oneRMText}>{t('workouts.details.one_rm')} <Text style={styles.oneRMValue}>128 {t('calculator.unit_kg')}</Text></Text>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.setsScroll}
            >
              {ex.exercise_sets.map((set: ExerciseSet, setIndex: number) => (
                <View key={set.id} style={styles.setCard}>
                  <Text style={styles.setLabel}>{t('workouts.details.set_num')} {setIndex + 1}</Text>
                  <View style={styles.setDataRow}>
                    <Text style={styles.setMainValue}>{set.reps}</Text>
                    <Text style={styles.setX}>×</Text>
                    <Text style={styles.setMainValue}>{set.weight}</Text>
                    <Text style={styles.setUnit}>{t('calculator.unit_kg')}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Actions */}
      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button 
          style={styles.startButton}
          onPress={() => router.push(`/workout-session/${id}`)}
        >
          <View style={styles.startButtonContent}>
            <Play color="#000" size={20} fill="#000" />
            <Text style={styles.startButtonText}>{t('workouts.details.start_workout')}</Text>
          </View>
        </Button>

        <View style={styles.footerButtons}>
          <Pressable style={styles.footerBtn} onPress={handleShare}>
            <Share2 color={Colors.text.secondary} size={18} />
            <Text style={styles.footerBtnText}>{t('workouts.details.share')}</Text>
          </Pressable>
          <View style={styles.footerDivider} />
          <Pressable 
            style={styles.footerBtn}
            onPress={() => router.push({ pathname: "/create-workout", params: { id } })}
          >
            <Edit3 color={Colors.text.secondary} size={18} />
            <Text style={styles.footerBtnText}>{t('workouts.details.edit')}</Text>
          </Pressable>
          <View style={styles.footerDivider} />
          <Pressable 
            style={[styles.footerBtn, isDeleting && styles.footerBtnDisabled]} 
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color={Colors.text.secondary} size={16} />
            ) : (
              <Trash2 color="#ff4444" size={18} />
            )}
            <Text style={[styles.footerBtnText, { color: isDeleting ? Colors.text.muted : '#ff4444' }]}>
              {isDeleting ? t('workouts.details.deleting') : t('workouts.details.delete')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 40, // Add padding for status bar since global header is hidden
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neon.DEFAULT,
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tagText: {
    color: Colors.neon.DEFAULT,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.text.primary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: Colors.border.default,
    marginHorizontal: 16,
    alignSelf: 'center',
  },
  statLabel: {
    color: Colors.text.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    color: Colors.text.primary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  exerciseSection: {
    marginBottom: 32,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  exerciseNumber: {
    color: Colors.neon.DEFAULT,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    opacity: 0.8,
  },
  exerciseName: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  oneRMBadge: {
    backgroundColor: Colors.card.DEFAULT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  oneRMText: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
  },
  oneRMValue: {
    color: Colors.neon.DEFAULT,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  setsScroll: {
    gap: 12,
  },
  setCard: {
    backgroundColor: Colors.card.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 14,
    padding: 14,
    minWidth: 96,
    alignItems: "center",
  },
  setLabel: {
    color: Colors.text.muted,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 1,
  },
  setDataRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  setMainValue: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    letterSpacing: -1,
  },
  setX: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: "500",
    marginHorizontal: 1,
  },
  setUnit: {
    color: Colors.text.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    backgroundColor: "rgba(0,0,0,0.95)", // Slightly more opaque
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  startButton: {
    backgroundColor: Colors.neon.DEFAULT,
    height: 56,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  startButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    gap: 10,
    height: '100%',
  },
  startButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.8,
  },
  footerBtnDisabled: {
    opacity: 0.5,
  },
  footerBtnText: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  footerDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border.default,
  },
});
