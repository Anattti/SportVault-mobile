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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { Button } from "@/components/ui/Button";
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
  Trash2,
  Check,
  Edit3
} from "lucide-react-native";
import { Database } from "@/types/supabase";

import { 
  useWorkoutSessionDetail,
  type FullWorkoutSession,
  type SessionExercise,
} from "@/hooks/useWorkoutHistory";

type SessionSet = Database["public"]["Tables"]["session_sets"]["Row"];

interface EditedSet {
  id: string;
  weight_used: number;
  reps_completed: number;
  rpe: number | null;
  notes?: string | null;
}

interface EditedExercise {
  id: string;
  name: string;
  notes?: string | null;
  sets: EditedSet[];
}

export default function SessionSummaryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedExercises, setEditedExercises] = useState<EditedExercise[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: sessionDetails, isLoading: loading } = useWorkoutSessionDetail(id!);

  const session = sessionDetails?.session || null;
  const rawExercises = sessionDetails?.exercises || [];

  // Filter out duplicate exercises and fix "double sets" bug from legacy data
  const exercises = useMemo(() => {
    if (!rawExercises.length) return [];
    
    // Helper to generate a unique key for an exercise's content
    const getExerciseSignature = (ex: SessionExercise) => {
      const setsSig = (ex.sets || []).map(s => 
        `${s.weight_used}-${s.reps_completed}-${s.rpe}`
      ).join('|');
      return `${ex.name}:${setsSig}`; // Intentionally ignoring notes for dedupe to be aggressive on "ghost" dupes
    };

    const unique: SessionExercise[] = [];
    const seenSignatures = new Set<string>();

    for (const ex of rawExercises) {
      // 1. Check for "Array Double" bug within sets (e.g. [A, B, A, B] or [A, B, C, A, B, C])
      // Use a heuristic: if sets length is even, and 2nd half equals 1st half --> slice it.
      const sets = ex.sets || [];
      let cleanedSets = sets;
      
      if (sets.length >= 2 && sets.length % 2 === 0) {
        const mid = sets.length / 2;
        const firstHalf = sets.slice(0, mid);
        const secondHalf = sets.slice(mid);
        
        const isExactDouble = firstHalf.every((s1, i) => {
          const s2 = secondHalf[i];
          return s1.weight_used === s2.weight_used && 
                 s1.reps_completed === s2.reps_completed && 
                 s1.rpe === s2.rpe;
        });

        if (isExactDouble) {
          cleanedSets = firstHalf;
        }
      }

      // Create a modified exercise object with cleaned sets for signature check
      const cleanedEx = { ...ex, sets: cleanedSets };
      const signature = getExerciseSignature(cleanedEx);

      if (!seenSignatures.has(signature)) {
        unique.push(cleanedEx);
        seenSignatures.add(signature);
      }
    }
    return unique;
  }, [rawExercises]);

  const handleStartEdit = () => {
    setEditedExercises(exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      notes: ex.notes,
      sets: (ex.sets || []).map((s: SessionSet) => ({
        id: s.id,
        weight_used: s.weight_used || 0,
        reps_completed: s.reps_completed || 0,
        rpe: s.rpe,
        notes: s.notes
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

  const handleUpdateExercise = (exIdx: number, updates: Partial<EditedExercise>) => {
    setEditedExercises(prev => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], ...updates };
      return next;
    });
  };

  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      
      // 1. Update each set in Supabase
      for (const ex of editedExercises) {
        // Update exercise notes
        const { error: exError } = await supabase
          .from("session_exercises")
          .update({ notes: ex.notes })
          .eq("id", ex.id);

        if (exError) throw exError;

        for (const set of ex.sets) {
          const { error } = await supabase
            .from("session_sets")
            .update({
              weight_used: set.weight_used,
              reps_completed: set.reps_completed,
              notes: set.notes
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
      // Alert.alert(t('session_summary.save_success_title'), t('session_summary.save_success_msg'));
    } catch (error) {
      console.error("Error saving edits:", error);
      Alert.alert(t('profile.error'), t('session_summary.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('session_summary.delete_title'),
      t('session_summary.delete_confirm'),
      [
        { text: t('session_summary.cancel'), style: "cancel" },
        { 
          text: t('workouts.details.delete'), 
          style: "destructive", 
          onPress: async () => {
            try {
              const sessionId = id as string;
              console.log("[Delete] Starting deletion for session:", sessionId);

              // Delete using RPC to handle cascade logic safely
              const { error: sessionError } = await supabase.rpc('delete_workout_session', {
                p_session_id: sessionId
              });

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
              Alert.alert(t('profile.error'), t('session_summary.delete_error'));
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('session_summary.title')}</Text>
            {isEditing && (
              <Text style={styles.editingLabel}>{t('session_summary.editing')}</Text>
            )}
          </View>
          <View style={styles.headerButtons}>
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
                <Text style={styles.statLabel}>{t('session_summary.duration')}</Text>
              </View>
            </View>

            <View style={styles.statBlock}>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: Colors.neon.DEFAULT }]}>
                  {formatVolume(
                    // If we have filtered duplicates, recalculate volume to show correct value
                    // Otherwise use stored total
                    exercises.length !== rawExercises.length 
                      ? exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((sSum, s) => sSum + ((s.weight_used || 0) * (s.reps_completed || 0)), 0), 0)
                      : (session?.total_volume || 0)
                  )}
                </Text>
                <Text style={styles.statUnit}>TON</Text>
              </View>
              <View style={styles.statLabelRow}>
                <Zap size={12} color={Colors.text.secondary} />
                <Text style={styles.statLabel}>{t('session_summary.volume')}</Text>
              </View>
            </View>
          </View>

          {/* Warmup/Cooldown Mockup (can be expanded if data exists) */}
          {/* Warmup/Cooldown Info */}
          <View style={styles.badgesRow}>
            {/* @ts-ignore */}
            {session?.warmup && session.warmup.duration > 0 && (
              <View style={styles.badge}>
                <Flame size={14} color="#F97316" />
                {/* @ts-ignore */}
                <Text style={styles.badgeText}>{formatDuration(session.warmup.duration * 60)} min</Text>
                <View style={styles.badgeDivider} />
                {/* @ts-ignore */}
                <Text style={styles.badgeSubText}>{(session.warmup.method || 'WARMUP').toUpperCase()}</Text>
              </View>
            )}
            
            {/* @ts-ignore */}
            {session?.cooldown && session.cooldown.duration > 0 && (
              <View style={styles.badge}>
                <ThermometerSnowflake size={14} color="#60A5FA" />
                {/* @ts-ignore */}
                <Text style={styles.badgeText}>{formatDuration(session.cooldown.duration * 60)} min</Text>
                <View style={styles.badgeDivider} />
                {/* @ts-ignore */}
                <Text style={styles.badgeSubText}>{(session.cooldown.method || 'COOLDOWN').toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Session Notes */}
          {session?.notes && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
               <View style={{ 
                 flexDirection: 'row', 
                 alignItems: 'flex-start', 
                 gap: 8, 
                 backgroundColor: 'rgba(255,255,255,0.03)', 
                 padding: 12, 
                 borderRadius: 12,
                 borderWidth: 1,
                 borderColor: 'rgba(255,255,255,0.05)'
               }}>
                 <MessageSquare size={16} color={Colors.text.secondary} style={{ marginTop: 2 }} />
                 <Text style={{ color: Colors.text.secondary, fontSize: 14, flex: 1, lineHeight: 20 }}>
                   {session.notes}
                 </Text>
               </View>
            </View>
          )}

          {/* Exercises List */}
          <View style={styles.exercisesList}>
            {(isEditing ? editedExercises : exercises).map((exercise, exIdx) => {
              const max1RM = isEditing 
                ? Math.max(...(exercise.sets?.map((s: any) => calculate1RM(s.weight_used || 0, s.reps_completed || 0)) || [0]))
                : Math.max(...((exercise as SessionExercise).sets?.map((s: SessionSet) => calculate1RM(s.weight_used || 0, s.reps_completed || 0)) || [0]));

              return (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                    </View>

                    {max1RM > 0 && (
                      <View style={styles.oneRmBadge}>
                        <Text style={styles.oneRmLabel}>1RM</Text>
                        <Text style={styles.oneRmValue}>{max1RM} kg</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.setsList}>
                    {exercise.sets?.map((set: any, setIdx: number) => (
                      <View key={set.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <View style={styles.setRow}>
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
                            <TextInput
                                style={[styles.setEditInput, { width: 120, fontSize: 12, textAlign: 'left' }]}
                                value={set.notes || ''}
                                placeholder={t('session_summary.notes_placeholder')}
                                placeholderTextColor={Colors.text.secondary}
                                onChangeText={(text) => handleUpdateSet(exIdx, setIdx, { notes: text })}
                              />
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
                      {/* Set Note Display */}
                      {!isEditing && set.notes && (
                        <View style={{ marginLeft: 30, marginTop: 4, marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, color: Colors.text.secondary, fontStyle: 'italic' }}>
                            {set.notes}
                          </Text>
                        </View>
                      )}
                      </View>
                    ))}
                  </View>

                  {!isEditing && (exercise as SessionExercise).notes && (
                    <View style={styles.exerciseNoteContainer}>
                      <View style={styles.exerciseNoteHeader}>
                        <MessageSquare size={14} color={Colors.neon.DEFAULT} />
                        <Text style={styles.exerciseNoteLabel}>{t('session_summary.notes') || 'Notes'}</Text>
                      </View>
                      <Text style={styles.exerciseNoteText}>{(exercise as SessionExercise).notes}</Text>
                    </View>
                  )}

                  {isEditing && (
                    <View style={styles.exerciseNoteInputContainer}>
                      <Text style={styles.inputLabel}>{t('session_summary.exercise_notes_label') || 'Exercise Notes'}</Text>
                      <TextInput
                        style={styles.exerciseNoteInput}
                        value={(exercise as EditedExercise).notes || ''}
                        placeholder={t('session_summary.exercise_notes_placeholder') || "Add notes about this exercise..."}
                        placeholderTextColor={Colors.text.secondary}
                        multiline
                        textAlignVertical="top"
                        onChangeText={(text) => handleUpdateExercise(exIdx, { notes: text })}
                      />
                    </View>
                  )}

                  {!isEditing && !(exercise as SessionExercise).notes && (
                    <Pressable style={styles.addNoteButton} onPress={() => handleStartEdit()}>
                      <Plus size={16} color={Colors.text.secondary} />
                      <Text style={styles.addNoteText}>{t('session_summary.add_note')}</Text>
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
              <Text style={styles.cancelButtonText}>{t('session_summary.cancel')}</Text>
            </Pressable>
            <Pressable 
              style={[styles.footerButton, styles.saveButton]} 
              onPress={handleSaveEdits}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('session_summary.save_changes')}</Text>
              )}
            </Pressable>
          </View>
        )}

        {!isEditing && (
          <View style={styles.bottomActions}>
            <Button 
              style={styles.startButton}
              onPress={() => router.back()}
            >
              <View style={styles.startButtonContent}>
                <Check color="#000" size={20} />
                <Text style={styles.startButtonText}>{t('workouts.details.close_preview')}</Text>
              </View>
            </Button>

            <View style={styles.footerButtons}>
              <Pressable 
                style={styles.footerBtn}
                onPress={handleStartEdit}
              >
                <Edit3 color={Colors.text.secondary} size={18} />
                <Text style={styles.footerBtnText}>{t('session_summary.edit').toUpperCase()}</Text>
              </Pressable>
              <View style={styles.footerDivider} />
              <Pressable 
                style={styles.footerBtn} 
                onPress={handleDelete}
              >
                <Trash2 color="#ff4444" size={18} />
                <Text style={[styles.footerBtnText, { color: '#ff4444' }]}>
                  {t('workouts.details.delete')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
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
    paddingBottom: 120, // Increased padding to make room for bottom button
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
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34, // Matches preview screen exactly
    backgroundColor: "rgba(0,0,0,0.95)",
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  startButton: {
    backgroundColor: Colors.neon.DEFAULT,
    height: 56,
    borderRadius: 16,
    marginBottom: 0, // No margin bottom needed as paddingBottom handles it
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
    marginTop: 20,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.8,
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
  exerciseNoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  exerciseNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exerciseNoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  exerciseNoteText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  exerciseNoteInputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginLeft: 4,
  },
  exerciseNoteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: Colors.text.primary,
    fontSize: 14,
    minHeight: 80,
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
