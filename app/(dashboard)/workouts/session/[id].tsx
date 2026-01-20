import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  Pressable, 
  ActivityIndicator,
  Platform,
  TextInput,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { 
  X, 
  Clock, 
  Zap, 
  Flame, 
  ThermometerSnowflake, 
  MessageSquare, 
  ChevronRight,
  Plus,
  Trophy,
  Trash2
} from "lucide-react-native";
import { Database } from "@/types/supabase";

type Session = Database["public"]["Tables"]["workout_sessions"]["Row"];
type SessionExercise = Database["public"]["Tables"]["session_exercises"]["Row"] & {
  sets?: SessionSet[];
};
type SessionSet = Database["public"]["Tables"]["session_sets"]["Row"];

interface EditedSet {
  id: string;
  weight_used: number;
  reps_completed: number;
  rpe: number | null;
}

interface EditedExercise {
  id: string;
  name: string;
  sets: EditedSet[];
}

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedExercises, setEditedExercises] = useState<EditedExercise[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: sessionDetails, isLoading: loading } = useQuery({
    queryKey: ['session_summary', id],
    queryFn: async () => {
      // 1. Fetch from workout_sessions (standard table)
      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          workouts (program)
        `)
        .eq("id", id)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) return { session: null, exercises: [] };

      // 2. Fetch exercises for this session
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("session_exercises")
        .select("*")
        .eq("session_id", id)
        .order("order_index", { ascending: true });

      if (exercisesError) throw exercisesError;

      let finalExercises: SessionExercise[] = [];
      let finalSession = { ...sessionData };

      if (exercisesData && exercisesData.length > 0) {
        // 3. Fetch sets for these exercises
        const exerciseIds = exercisesData.map(ex => ex.id);
        const { data: setsData, error: setsError } = await supabase
          .from("session_sets")
          .select("*")
          .in("session_exercise_id", exerciseIds)
          .order("created_at", { ascending: true });

        if (setsError) throw setsError;

        finalExercises = exercisesData.map(ex => ({
          ...ex,
          sets: setsData?.filter(s => s.session_exercise_id === ex.id) || []
        }));

        // Calculate total volume if missing or 0
        if (!sessionData.total_volume || sessionData.total_volume === 0) {
          const calculatedVolume = (setsData || []).reduce((sum, set) => 
            sum + ((set.weight_used || 0) * (set.reps_completed || 0)), 0
          );
          finalSession = { ...finalSession, total_volume: calculatedVolume };
        }
      }
      
      return { session: finalSession as any, exercises: finalExercises };
    },
    enabled: !!id,
  });

  const session = sessionDetails?.session || null;
  const exercises = sessionDetails?.exercises || [];

  const handleStartEdit = () => {
    setEditedExercises(exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: (ex.sets || []).map((s: SessionSet) => ({
        id: s.id,
        weight_used: s.weight_used || 0,
        reps_completed: s.reps_completed || 0,
        rpe: s.rpe
      }))
    })));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedExercises([]);
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, updates: Partial<EditedSet>) => {
    setEditedExercises(prev => {
      const next = [...prev];
      next[exIdx].sets[setIdx] = { ...next[exIdx].sets[setIdx], ...updates };
      return next;
    });
  };

  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      
      // 1. Update each set in Supabase
      for (const ex of editedExercises) {
        for (const set of ex.sets) {
          const { error } = await supabase
            .from("session_sets")
            .update({
              weight_used: set.weight_used,
              reps_completed: set.reps_completed,
            })
            .eq("id", set.id);
          
          if (error) throw error;
        }
      }

      // 2. Recalculate and update total volume in workout_sessions
      let totalVolume = 0;
      editedExercises.forEach(ex => {
        ex.sets.forEach(set => {
          totalVolume += (set.weight_used * set.reps_completed);
        });
      });

      const { error: sessionError } = await supabase
        .from("workout_sessions")
        .update({ total_volume: totalVolume })
        .eq("id", id);

      if (sessionError) throw sessionError;

      
      
      // 3. Refresh data and close editing
      queryClient.invalidateQueries({ queryKey: ['session_summary', id] });
      // await fetchSessionDetails(); // No longer needed
      setIsEditing(false);
      Alert.alert("Tallennettu", "Muutokset tallennettu onnistuneesti (Huom: Muutokset eivät välttämättä päivity vanhaan web-näkymään).");
    } catch (error) {
      console.error("Error saving edits:", error);
      Alert.alert("Virhe", "Muutosten tallennus epäonnistui.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Poista treeni",
      "Oletko varma, että haluat poistaa tämän treenin? Tätä toimintoa ei voi peruuttaa.",
      [
        { text: "Peruuta", style: "cancel" },
        { 
          text: "Poista", 
          style: "destructive", 
          onPress: async () => {
            try {
              const sessionId = id as string;
              console.log("[Delete] Starting deletion for session:", sessionId);

              // Delete from workout_sessions
              const { error: sessionError } = await supabase
                .from("workout_sessions")
                .delete()
                .eq("id", sessionId);

              if (sessionError) {
                console.log("[Delete] Error:", sessionError.message);
                throw sessionError;
              }

              console.log("[Delete] Successfully deleted session");

              // Force refetch by invalidating and setting refetchType
              await queryClient.invalidateQueries({ 
                queryKey: ['workout_history'],
                refetchType: 'all'
              });
              await queryClient.removeQueries({ queryKey: ['session_summary', sessionId] });
              
              router.back();
            } catch (error) {
              console.error("[Delete] Error:", error);
              Alert.alert("Virhe", "Treenin poisto epäonnistui.");
            }
          }
        }
      ]
    );
  };

  const formatDuration = (totalSeconds: number) => {
    return Math.floor(totalSeconds / 60);
  };

  const formatVolume = (kg: number) => {
    return (kg / 1000).toFixed(1);
  };

  const calculate1RM = (weight: number | null, reps: number | null) => {
    if (!weight || !reps) return 0;
    return Math.round(weight * (1 + reps / 30));
  };

  const getRPEColor = (rpe: number | null) => {
    if (!rpe) return Colors.text.secondary;
    if (rpe >= 9) return "#EF4444"; // Red
    if (rpe >= 8) return "#F97316"; // Orange
    if (rpe >= 7) return "#F59E0B"; // Yellow
    return Colors.neon.DEFAULT;
  };

  const getRPEBg = (rpe: number | null) => {
    if (!rpe) return "rgba(255, 255, 255, 0.05)";
    if (rpe >= 9) return "rgba(239, 68, 68, 0.1)";
    if (rpe >= 8) return "rgba(249, 115, 22, 0.1)";
    if (rpe >= 7) return "rgba(245, 158, 11, 0.1)";
    return "rgba(0, 255, 65, 0.1)";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Treenin yhteenveto</Text>
            {isEditing && <Text style={styles.editingLabel}>MUOKKAUS</Text>}
          </View>
          <View style={styles.headerButtons}>
            {!isEditing && (
              <>
                <Pressable style={styles.iconButton} onPress={handleDelete}>
                  <Trash2 color="#EF4444" size={20} />
                </Pressable>
                <Pressable style={styles.editButton} onPress={handleStartEdit}>
                  <Text style={styles.editButtonText}>Muokkaa</Text>
                </Pressable>
              </>
            )}
            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <X color={Colors.text.primary} size={24} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBlock}>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{formatDuration(session?.duration || 0)}</Text>
                <Text style={styles.statUnit}>MIN</Text>
              </View>
              <View style={styles.statLabelRow}>
                <Clock size={12} color={Colors.text.secondary} />
                <Text style={styles.statLabel}>KESTO</Text>
              </View>
            </View>

            <View style={styles.statBlock}>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: Colors.neon.DEFAULT }]}>{formatVolume(session?.total_volume || 0)}</Text>
                <Text style={styles.statUnit}>TON</Text>
              </View>
              <View style={styles.statLabelRow}>
                <Zap size={12} color={Colors.text.secondary} />
                <Text style={styles.statLabel}>VOLYYMI</Text>
              </View>
            </View>
          </View>

          {/* Warmup/Cooldown Mockup (can be expanded if data exists) */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Flame size={14} color="#F97316" />
              <Text style={styles.badgeText}>8 min</Text>
              <View style={styles.badgeDivider} />
              <Text style={styles.badgeSubText}>JUOKSUMAT...</Text>
            </View>
            <View style={styles.badge}>
              <ThermometerSnowflake size={14} color="#60A5FA" />
              <Text style={styles.badgeText}>10 min</Text>
              <View style={styles.badgeDivider} />
              <Text style={styles.badgeSubText}>JUOKSUMAT...</Text>
            </View>
          </View>

          {/* Exercises List */}
          <View style={styles.exercisesList}>
            {(isEditing ? editedExercises : exercises).map((exercise, exIdx) => {
              const max1RM = isEditing 
                ? Math.max(...(exercise.sets?.map((s: any) => calculate1RM(s.weight_used || 0, s.reps_completed || 0)) || [0]))
                : Math.max(...((exercise as SessionExercise).sets?.map((s: SessionSet) => calculate1RM(s.weight_used || 0, s.reps_completed || 0)) || [0]));

              return (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {max1RM > 0 && (
                      <View style={styles.oneRmBadge}>
                        <Text style={styles.oneRmLabel}>1RM</Text>
                        <Text style={styles.oneRmValue}>{max1RM} kg</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.setsList}>
                    {exercise.sets?.map((set: any, setIdx: number) => (
                      <View key={set.id} style={styles.setRow}>
                        <Text style={styles.setIndex}>{setIdx + 1}</Text>
                        
                        {isEditing ? (
                          <View style={styles.setMainInfoEditing}>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.setEditInput}
                                value={String(set.weight_used)}
                                onChangeText={(text) => handleUpdateSet(exIdx, setIdx, { weight_used: parseFloat(text) || 0 })}
                                keyboardType="numeric"
                                selectTextOnFocus
                              />
                              <Text style={styles.inputUnitText}>kg</Text>
                            </View>
                            <Text style={styles.setMultiplier}>×</Text>
                            <View style={styles.inputContainer}>
                              <TextInput
                                style={styles.setEditInput}
                                value={String(set.reps_completed)}
                                onChangeText={(text) => handleUpdateSet(exIdx, setIdx, { reps_completed: parseInt(text) || 0 })}
                                keyboardType="numeric"
                                selectTextOnFocus
                              />
                              <Text style={styles.inputUnitText}>reps</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.setMainInfo}>
                            <Text style={styles.weightValue}>{set.weight_used || 0}</Text>
                            <Text style={styles.weightUnit}>kg</Text>
                            <Text style={styles.setMultiplier}>×</Text>
                            <Text style={styles.repsValue}>{set.reps_completed || 0}</Text>
                          </View>
                        )}
                        
                        {(set.rpe || 0) > 0 && (
                          <View style={[styles.rpeBadge, { backgroundColor: getRPEBg(set.rpe) }]}>
                            <Text style={[styles.rpeText, { color: getRPEColor(set.rpe) }]}>RPE {set.rpe}</Text>
                          </View>
                        )}
                        {!isEditing && <ChevronRight size={16} color={Colors.text.secondary} opacity={0.3} />}
                      </View>
                    ))}
                  </View>

                  {!isEditing && (
                    <Pressable style={styles.addNoteButton}>
                      <Plus size={16} color={Colors.text.secondary} />
                      <Text style={styles.addNoteText}>Lisää muistiinpano</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {isEditing && (
          <View style={[styles.editingFooter, { paddingBottom: Platform.OS === 'ios' ? 34 : 20 }]}>
            <Pressable 
              style={[styles.footerButton, styles.cancelButton]} 
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Peruuta</Text>
            </Pressable>
            <Pressable 
              style={[styles.footerButton, styles.saveButton]} 
              onPress={handleSaveEdits}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Tallenna muutokset</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  editingLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.neon.DEFAULT,
    backgroundColor: "rgba(0, 255, 65, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  editButtonText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  statBlock: {
    flex: 1,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 48,
    fontWeight: "900",
    color: Colors.neon.DEFAULT,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text.secondary,
    opacity: 0.5,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
  badgesRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  badge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  badgeDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  badgeSubText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text.secondary,
    opacity: 0.5,
  },
  exercisesList: {
    padding: 20,
    gap: 32,
  },
  exerciseCard: {
    gap: 16,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text.primary,
  },
  oneRmBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 6,
  },
  oneRmLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text.secondary,
    opacity: 0.5,
  },
  oneRmValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.neon.DEFAULT,
  },
  setsList: {
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.02)",
    gap: 16,
  },
  setIndex: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.secondary,
    opacity: 0.3,
    width: 16,
  },
  setMainInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  weightUnit: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  setMultiplier: {
    fontSize: 14,
    color: Colors.text.secondary,
    opacity: 0.3,
    marginHorizontal: 4,
  },
  repsValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  rpeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  rpeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  addNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  addNoteText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  setMainInfoEditing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  setEditInput: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
    width: 44,
    textAlign: 'center',
  },
  inputUnitText: {
    color: Colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
  },
  editingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: Colors.neon.DEFAULT,
    flex: 2,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
