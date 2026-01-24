import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Zap,
  Dumbbell,
  Rocket,
  Move,
  Copy,
  Timer,
  Ruler,
  RotateCcw,
  Target,
  ArrowUp,
  LayoutList,
  Clock,
  GripVertical
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ExercisePickerModal } from "@/components/workout/ExercisePickerModal";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import type { WorkoutExercise } from "@/types";

import { 
  Minimize2,
  Maximize2
} from "lucide-react-native";

type TargetType = 'reps' | 'meters' | 'seconds';

// This represents a "Block" of sets (e.g., "3 sets of 10 reps")
interface SetBlock {
  id: string;
  reps: string; // The amount (reps, seconds, or meters)
  weight: string;
  restTime: string; // In seconds
  targetType: TargetType;
  isBodyweight: boolean;
}

interface ExerciseData {
  id: string; // temp id
  name: string;
  category: string;
  setBlocks: SetBlock[];
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120, // Space for footer
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // Workout Type Selector
  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 20,
    padding: 16,
    height: 70,
  },
  typeSelectorActive: {
    borderColor: Colors.neon.DEFAULT,
    backgroundColor: "rgba(204, 255, 0, 0.05)",
  },
  selectedTypeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderText: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
  },
  selectedtypeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeDropdown: {
    marginTop: 8,
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  typeOptionText: {
    color: "#ccc",
    fontSize: 16,
    fontWeight: "500",
  },
  // Exercise Styles
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    marginTop: 10,
  },
  sectionTitle: {
    color: "#fff", 
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  dragTipText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "500",
  },
  exerciseCard: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  exerciseCardActive: {
    borderColor: Colors.neon.DEFAULT,
    backgroundColor: "#0d0d0d",
    transform: [{ scale: 1.02 }],
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dragHandle: {
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },


  categoryOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  // Tools Header & Category
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    zIndex: 10,
  },
  categoryWrapper: {
    flex: 1,
    marginRight: 12,
    zIndex: 20,
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    backgroundColor: "#161616",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryDropdown: {
    marginTop: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    zIndex: 100,
    padding: 4,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerToolBtn: {
    width: 36, 
    height: 36,
    borderRadius: 10,
    backgroundColor: "#161616",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "transparent",
  },
  headerToolBtnActive: {
    backgroundColor: "rgba(204, 255, 0, 0.1)",
    borderColor: Colors.neon.DEFAULT,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryText: {
    color: Colors.neon.DEFAULT,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  // Set Block
  setBlock: {
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  setBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setIdxBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.neon.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  setIdxText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  setInputsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1, 
    position: 'relative', 
    justifyContent: 'center' 
  },
  valInput: {
    backgroundColor: "#000",
    borderRadius: 12,
    height: 44,
    paddingLeft: 12,
    paddingRight: 30, // Space for suffix
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  valInputDisabled: {
    opacity: 0.3,
    backgroundColor: "#111",
  },
  inputSuffix: {
    position: 'absolute',
    right: 12,
    color: "#666",
    fontSize: 10,
    fontWeight: "700",
  },
  toolsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  toolBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#222",
  },
  toolBtnActive: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  // Footer
  addSetButton: {
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "dashed",
  },
  addSetText: {
    color: "#888",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 13,
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addExerciseBtn: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingTop: 24,
    paddingBottom: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addExerciseText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "transparent",
  },
  saveButton: {
    backgroundColor: Colors.neon.DEFAULT,
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.neon.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 18,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyweightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#222",
  },
  bodyweightBadgeActive: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  bodyweightText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
  },
  bodyweightTextActive: {
    color: '#000',
  }
});

// Separate components for better performance (memoization)
const SetBlockItem = memo(({ 
  block, 
  blockIndex, 
  exerciseId, 
  onUpdate, 
  onRemove,
  isOnlyBlock,
  t 
}: { 
  block: SetBlock; 
  blockIndex: number; 
  exerciseId: string;
  onUpdate: (field: keyof SetBlock, value: any) => void;
  onRemove: () => void;
  isOnlyBlock: boolean;
  t: any;
}) => {
  return (
    <View style={styles.setBlock}>
      <View style={styles.setBlockRow}>
        {/* Index Badge */}
        <View style={styles.setIdxBadge}>
          <Text style={styles.setIdxText}>{blockIndex + 1}</Text>
        </View>

        {/* Inputs */}
        <View style={styles.setInputsContainer}>
          <View style={styles.inputWrapper}>
            <TextInput 
              style={[styles.valInput, block.isBodyweight && styles.valInputDisabled]}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#333"
              value={block.isBodyweight ? '-' : block.weight}
              editable={!block.isBodyweight}
              onChangeText={(t) => onUpdate("weight", t)}
              selectTextOnFocus
            />
            {!block.isBodyweight && <Text style={styles.inputSuffix}>KG</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.valInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#333"
              value={block.reps}
              onChangeText={(t) => onUpdate("reps", t)}
              selectTextOnFocus
            />
            <Text style={styles.inputSuffix}>
              {block.targetType === 'reps' ? 'R' : 
               block.targetType === 'meters' ? 'M' : 'S'}
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.valInput}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor="#333"
              value={block.restTime}
              onChangeText={(t) => onUpdate("restTime", t)}
              selectTextOnFocus
            />
            <Text style={styles.inputSuffix}>S</Text>
          </View>
        </View>

        {/* Delete only */}
        {!isOnlyBlock && (
            <Pressable 
              style={[styles.toolBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginLeft: 8 }]}
              onPress={onRemove}
            >
              <X size={14} color="#ef4444" />
            </Pressable>
        )}
      </View>
    </View>
  );
});

export default function CreateWorkoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [programName, setProgramName] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  
  // Track open category dropdowns by exercise ID
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null);

  const WORKOUT_TYPES = useMemo(() => [
    { id: "endurance_basic", label: t('workouts.types.endurance_basic'), icon: Activity, color: "#ef4444" },
    { id: "endurance_max", label: t('workouts.types.endurance_max'), icon: Zap, color: "#eab308" },
    { id: "strength", label: t('workouts.types.strength'), icon: Dumbbell, color: "#f97316" },
    { id: "speed_explosive", label: t('workouts.types.speed_explosive'), icon: Rocket, color: "#3b82f6" },
    { id: "mobility", label: t('workouts.types.mobility'), icon: Move, color: "#8b5cf6" },
  ], [t]);

  const EXERCISE_CATEGORIES = useMemo(() => [
    { id: "legs", label: t('workouts.categories.legs'), icon: Move },
    { id: "arms", label: t('workouts.categories.arms'), icon: Dumbbell },
    { id: "core", label: t('workouts.categories.core'), icon: Target },
    { id: "back", label: t('workouts.categories.back'), icon: LayoutList },
    { id: "chest", label: t('workouts.categories.chest'), icon: Activity },
    { id: "shoulders", label: t('workouts.categories.shoulders'), icon: ArrowUp },
  ], [t]);

  // Fetch existing workout data if in edit mode
  useEffect(() => {
    if (!id) return;

    const fetchWorkout = async () => {
      try {
        setLoading(true);
        const { data: workout, error: workoutError } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", id)
          .single();

        if (workoutError) throw workoutError;

        setProgramName(workout.program);
        setWorkoutType(workout.workout_type || "");
        setNotes(workout.notes || "");

        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select(`
            *,
            exercise_sets (*)
          `)
          .eq("workout_id", id)
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: true });

        if (exercisesError) throw exercisesError;

        if (exercisesData) {
          const formattedExercises: ExerciseData[] = exercisesData.map(ex => ({
            id: ex.id,
            name: ex.name,
            category: ex.category || "",
            setBlocks: ex.exercise_sets.map((set: any) => ({
              id: set.id,
              sets: String(set.sets || 1),
              reps: String(set.reps || 0),
              weight: String(set.weight || 0),
              restTime: String(set.rest_time || 60),
              targetType: set.target_type || "reps",
              isBodyweight: set.is_bodyweight ?? (set.weight === 0)
            }))
          }));
          setExercises(formattedExercises);
        }
      } catch (error) {
        console.error("Error fetching workout:", error);
        Alert.alert(t('profile.error'), t('workouts.errors.fetch_failed'));
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [id, t]);

  const handleAddExerciseFromLibrary = useCallback((exercise: WorkoutExercise) => {
    const newExercise: ExerciseData = {
      id: Math.random().toString(),
      name: exercise.name,
      category: exercise.category || "",
      setBlocks: exercise.sets.map(s => ({
        id: Math.random().toString(),
        reps: String(s.reps),
        weight: String(s.weight),
        restTime: String(s.restTime),
        targetType: (s.targetType as TargetType) || "reps",
        isBodyweight: s.isBodyweight || false
      }))
    };
    
    if (newExercise.setBlocks.length === 0) {
      newExercise.setBlocks.push({
        id: Math.random().toString(),
        reps: "10",
        weight: "0",
        restTime: "60",
        targetType: "reps",
        isBodyweight: false
      });
    }

    setExercises(prev => [...prev, newExercise]);
  }, []);

  const addManualExercise = useCallback(() => {
    setExercises(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        name: "",
        category: "",
        setBlocks: [{
          id: Math.random().toString(),
          reps: "",
          weight: "",
          restTime: "60",
          targetType: "reps",
          isBodyweight: false
        }]
      }
    ]);
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  }, []);

  const updateExercise = useCallback((exerciseId: string, field: keyof ExerciseData, value: any) => {
    setExercises(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, [field]: value } : ex
    ));
  }, []);

  const updateAllSets = useCallback((exerciseId: string, field: keyof SetBlock, value: any) => {
    setExercises(prev => prev.map(ex => {
        if (ex.id === exerciseId) {
            const newBlocks = ex.setBlocks.map(b => ({ ...b, [field]: value }));
            return { ...ex, setBlocks: newBlocks };
        }
        return ex;
    }));
  }, []);

  const addSetBlock = useCallback((exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const lastBlock = ex.setBlocks[ex.setBlocks.length - 1];
        return {
          ...ex,
          setBlocks: [...ex.setBlocks, {
            id: Math.random().toString(),
            reps: lastBlock?.reps || "",
            weight: lastBlock?.weight || "",
            restTime: lastBlock?.restTime || "60",
            targetType: lastBlock?.targetType || "reps",
            isBodyweight: lastBlock?.isBodyweight || false
          }]
        };
      }
      return ex;
    }));
  }, []);

  const removeSetBlock = useCallback((exerciseId: string, blockId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, setBlocks: ex.setBlocks.filter(b => b.id !== blockId) };
      }
      return ex;
    }));
  }, []);

  const updateSetBlock = useCallback((exerciseId: string, blockId: string, field: keyof SetBlock, value: any) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const newBlocks = ex.setBlocks.map(b => {
          if (b.id === blockId) {
            return { ...b, [field]: value };
          }
          return b;
        });
        return { ...ex, setBlocks: newBlocks };
      }
      return ex;
    }));
  }, []);



  const handleSave = async () => {
    if (!programName.trim()) {
      Alert.alert(t('profile.error'), t('workouts.errors.missing_name'));
      return;
    }
    if (!workoutType) {
        Alert.alert(t('profile.error'), t('workouts.errors.missing_type'));
        return;
    }
    if (exercises.length === 0) {
      Alert.alert(t('profile.error'), t('workouts.errors.missing_exercise'));
      return;
    }

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Helper for safe parsing
const safeParseInt = (val: string | undefined | null, defaultVal: number = 0): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
};

const safeParseFloat = (val: string | undefined | null, defaultVal: number = 0): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultVal : parsed;
};

// Inside handleSave...
      const formattedExercises = exercises.map((ex, index) => ({
        name: ex.name || t('workouts.unnamed_exercise'),
        category: ex.category || null,
        order_index: index,
        sets: ex.setBlocks.map(block => ({
          reps: safeParseInt(block.reps, 0),
          weight: block.isBodyweight ? 0 : safeParseFloat(block.weight, 0),
          rest_time: safeParseInt(block.restTime, 60),
          restTime: safeParseInt(block.restTime, 60), // Redundant key for legacy RPC support
          isBodyweight: block.isBodyweight,
          target_type: block.targetType,
          sets: 1, 
          rpe: 8 
        }))
      }));

      if (id) {
        await supabase.from("workouts").update({
          program: programName,
          workout_type: workoutType,
          notes: notes,
        }).eq("id", id);

        await supabase.from("exercises").delete().eq("workout_id", id);

        for (const ex of formattedExercises) {
          const { data: exData, error: exError } = await supabase.from("exercises").insert({
            workout_id: id,
            name: ex.name,
            category: ex.category,
            order_index: ex.order_index
          }).select().single();

          if (exError) throw exError;

          const setsToInsert = ex.sets.map(s => ({
            exercise_id: exData.id,
            reps: s.reps,
            weight: s.weight,
            rest_time: s.rest_time, 
            rpe: s.rpe,
            target_type: s.target_type,
            is_bodyweight: s.isBodyweight, // Map camelCase from state to snake_case DB column
            sets: s.sets
          }));

          if (setsToInsert.length > 0) {
            await supabase.from("exercise_sets").insert(setsToInsert);
          }
        }
      } else {
        const { error } = await supabase.rpc('insert_workout_with_children', {
          p_date: new Date().toISOString(),
          p_duration: 60 * 60,
          p_exercises: formattedExercises,
          p_feeling: 3,
          p_notes: notes,
          p_program: programName,
          p_progression: "maintain",
          p_progression_percentage: "0",
          p_user_id: user?.id || "",
          p_workout_type: workoutType
        });

        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      if (id) await queryClient.invalidateQueries({ queryKey: ['workout_details', id] });
      
      router.back();
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert(t('profile.error'), t('workouts.errors.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  const renderExerciseItem = useCallback(({ item: ex, drag, isActive, getIndex }: RenderItemParams<ExerciseData>) => {
    const isCategoryOpen = openCategoryDropdown === ex.id;
    const selectedCategory = EXERCISE_CATEGORIES.find(c => c.id === ex.category);

    // Compact list view
    if (isCompactMode) {
      return (
        <ScaleDecorator>
          <View style={[styles.exerciseCard, isActive && styles.exerciseCardActive, { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Pressable 
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }}
                style={[styles.dragHandle, isActive && { backgroundColor: Colors.neon.DEFAULT }]}
              >
                <GripVertical size={20} color={isActive ? "#000" : "#666"} />
              </Pressable>
              
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: '700', flex: 1 }}>{ex.name || t('workouts.unnamed_exercise')}</Text>
              
              <Pressable onPress={() => removeExercise(ex.id)} style={[styles.removeBtn, { padding: 6 }]}>
                <Trash2 color="#ef4444" size={16} />
              </Pressable>
          </View>
        </ScaleDecorator>
      );
    }

    return (
      <ScaleDecorator>
        <View style={[styles.exerciseCard, isActive && styles.exerciseCardActive]}>
          <View style={styles.exerciseHeader}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder={t('workouts.exercise_name_placeholder')}
                placeholderTextColor="#666"
                value={ex.name}
                onChangeText={(text) => updateExercise(ex.id, "name", text)}
                style={{ 
                  backgroundColor: 'transparent', 
                  fontSize: 18, 
                  fontWeight: '700', 
                  color: '#fff',
                  paddingVertical: 8,
                  paddingHorizontal: 0
                }}
              />
            </View>
            <Pressable onPress={() => removeExercise(ex.id)} style={styles.removeBtn}>
              <Trash2 color="#ef4444" size={20} />
            </Pressable>
          </View>

          <View style={styles.toolsHeader}>
            <View style={styles.categoryWrapper}>
                <Text style={styles.label}>{t('workouts.category')}</Text>
                <Pressable 
                style={styles.categorySelector}
                onPress={() => setOpenCategoryDropdown(isCategoryOpen ? null : ex.id)}
                >
                {selectedCategory ? (
                    <View style={styles.categoryRow}>
                    <selectedCategory.icon size={14} color={Colors.neon.DEFAULT} />
                    <Text style={[styles.categoryText, { color: Colors.text.primary }]}>{selectedCategory.label}</Text>
                    </View>
                ) : (
                    <Text style={[styles.placeholderText, { fontSize: 13 }]}>{t('workouts.select_category')}</Text>
                )}
                <ChevronDown size={14} color="#666" />
                </Pressable>

                {isCategoryOpen && (
                <View style={styles.categoryDropdown}>
                    {EXERCISE_CATEGORIES.map(cat => (
                    <Pressable
                        key={cat.id}
                        style={styles.categoryOption}
                        onPress={() => {
                        updateExercise(ex.id, "category", cat.id);
                        setOpenCategoryDropdown(null);
                        }}
                    >
                        <cat.icon size={16} color={Colors.neon.DEFAULT} />
                        <Text style={styles.categoryOptionText}>{cat.label}</Text>
                    </Pressable>
                    ))}
                </View>
                )}
            </View>

            <View style={styles.headerTools}>
                <View>
                    <Text style={[styles.label, { textAlign: 'center' }]}>{t('workouts.bodyweight_short', 'BW')}</Text>
                    <Pressable
                        style={[styles.headerToolBtn, ex.setBlocks[0]?.isBodyweight && styles.headerToolBtnActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // Toggle based on first block
                            const newVal = !ex.setBlocks[0]?.isBodyweight;
                            updateAllSets(ex.id, "isBodyweight", newVal);
                        }}
                    >
                         <Dumbbell size={18} color={ex.setBlocks[0]?.isBodyweight ? Colors.neon.DEFAULT : "#666"} />
                    </Pressable>
                </View>

                <View>
                    <Text style={[styles.label, { textAlign: 'center' }]}>{t('workouts.type')}</Text>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <Pressable
                          style={[styles.headerToolBtn, ex.setBlocks[0]?.targetType === 'reps' && styles.headerToolBtnActive]}
                          onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              updateAllSets(ex.id, "targetType", 'reps');
                          }}
                      >
                          <Text style={{ color: ex.setBlocks[0]?.targetType === 'reps' ? Colors.neon.DEFAULT : "#666", fontWeight: '700', fontSize: 10 }}>REPS</Text>
                      </Pressable>
                      <Pressable
                          style={[styles.headerToolBtn, ex.setBlocks[0]?.targetType === 'seconds' && styles.headerToolBtnActive]}
                          onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              updateAllSets(ex.id, "targetType", 'seconds');
                          }}
                      >
                          <Timer size={18} color={ex.setBlocks[0]?.targetType === 'seconds' ? Colors.neon.DEFAULT : "#666"} />
                      </Pressable>
                       <Pressable
                          style={[styles.headerToolBtn, ex.setBlocks[0]?.targetType === 'meters' && styles.headerToolBtnActive]}
                          onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              updateAllSets(ex.id, "targetType", 'meters');
                          }}
                      >
                          <Ruler size={18} color={ex.setBlocks[0]?.targetType === 'meters' ? Colors.neon.DEFAULT : "#666"} />
                      </Pressable>
                    </View>
                </View>
            </View>
          </View>

          {ex.setBlocks.map((block, bIndex) => (
            <SetBlockItem 
              key={block.id}
              block={block}
              blockIndex={bIndex}
              exerciseId={ex.id}
              onUpdate={(field, value) => updateSetBlock(ex.id, block.id, field, value)}
              onRemove={() => removeSetBlock(ex.id, block.id)}
              isOnlyBlock={ex.setBlocks.length === 1}
              t={t}
            />
          ))}

          <Pressable 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              addSetBlock(ex.id);
            }}
            style={styles.addSetButton}
          >
            <Plus color="#888" size={14} />
            <Text style={styles.addSetText}>{t('workouts.add_set')}</Text>
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  }, [t, updateExercise, removeExercise, openCategoryDropdown, EXERCISE_CATEGORIES, updateSetBlock, removeSetBlock, addSetBlock, openCategoryDropdown, updateAllSets, isCompactMode]);

  const selectedType = WORKOUT_TYPES.find(t => t.id === workoutType);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{id ? t('workouts.edit_workout') : t('workouts.create_workout')}</Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X color="#fff" size={24} />
          </Pressable>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <DraggableFlatList
            data={exercises}
            onDragEnd={({ data }) => setExercises(data)}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseItem}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <View style={[styles.inputGroup, { marginBottom: 32 }]}>
                   <Text style={styles.label}>{t('workouts.workout_name')}</Text>
                   <TextInput
                      placeholder={t('workouts.workout_name_placeholder')}
                      placeholderTextColor="#444"
                      value={programName}
                      onChangeText={setProgramName}
                      style={{ 
                        fontSize: 24, 
                        fontWeight: '700', 
                        color: '#fff', 
                        borderBottomWidth: 1, 
                        borderBottomColor: '#222',
                        paddingBottom: 12
                      }}
                   />
                </View>

                <View style={[styles.inputGroup, { zIndex: 10 }]}>
                  <Text style={styles.label}>{t('workouts.type')}</Text>
                  <Pressable 
                    style={[styles.typeSelector, isTypeSelectorOpen && styles.typeSelectorActive]} 
                    onPress={() => setIsTypeSelectorOpen(!isTypeSelectorOpen)}
                  >
                    <View style={styles.selectedTypeContent}>
                      {selectedType ? (
                        <View style={styles.typeRow}>
                          <selectedType.icon size={24} color={selectedType.color} />
                          <Text style={styles.selectedtypeText}>{selectedType.label}</Text>
                        </View>
                      ) : (
                        <Text style={styles.placeholderText}>{t('workouts.select_type')}</Text>
                      )}
                    </View>
                    {isTypeSelectorOpen ? (
                      <ChevronUp color={Colors.neon.DEFAULT} size={24} />
                    ) : (
                      <ChevronDown color="#666" size={24} />
                    )}
                  </Pressable>

                  {isTypeSelectorOpen && (
                    <View style={styles.typeDropdown}>
                      {WORKOUT_TYPES.map((type) => (
                        <Pressable 
                          key={type.id} 
                          style={styles.typeOption}
                          onPress={() => {
                            setWorkoutType(type.id);
                            setIsTypeSelectorOpen(false);
                          }}
                        >
                          <type.icon size={20} color={type.color} />
                          <Text style={styles.typeOptionText}>{type.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.exercisesHeader}>
                  <Text style={styles.sectionTitle}>{t('workouts.exercises')}</Text>
                  
                  {exercises.length > 0 && (
                    <Pressable 
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsCompactMode(!isCompactMode);
                      }}
                      style={{ padding: 8, backgroundColor: '#1E1E1E', borderRadius: 12 }}
                    > 
                      {isCompactMode ? (
                        <Maximize2 color="#666" size={20} />
                      ) : (
                        <Minimize2 color="#666" size={20} />
                      )}
                    </Pressable>
                  )}
                </View>
              </>
            }
            ListFooterComponent={
              <View style={{ gap: 12, marginTop: 12, paddingBottom: 150 }}>
                <View style={styles.addButtonsRow}>
                  <Pressable onPress={() => setIsPickerVisible(true)} style={[styles.addExerciseBtn, { flex: 1 }]}>
                    <LayoutList color="#fff" size={20} />
                    <Text style={styles.addExerciseText}>{t('workouts.library', 'Kirjasto')}</Text>
                  </Pressable>
                  <Pressable onPress={addManualExercise} style={[styles.addExerciseBtn, { flex: 1 }]}>
                    <Plus color="#fff" size={20} />
                    <Text style={styles.addExerciseText}>{t('workouts.add_exercise')}</Text>
                  </Pressable>
                </View>

                <View style={[styles.inputGroup, { marginTop: 32 }]}>
                  <Text style={styles.label}>{t('workouts.notes_label')}</Text>
                  <TextInput
                    placeholder={t('workouts.notes_placeholder')}
                    placeholderTextColor="#444"
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    style={{ 
                      backgroundColor: '#111',
                      borderRadius: 16,
                      color: '#fff',
                      padding: 16,
                      height: 120, 
                      textAlignVertical: 'top',
                      fontSize: 16
                    }}
                  />
                </View>
              </View>
            }
          />
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Pressable onPress={handleSave} style={styles.saveButton} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Save color="#000" size={24} />
                <Text style={styles.saveButtonText}>{t('workouts.save_workout')}</Text>
              </>
            )}
          </Pressable>
        </View>

        <ExercisePickerModal
          visible={isPickerVisible}
          onClose={() => setIsPickerVisible(false)}
          onSelect={handleAddExerciseFromLibrary}
        />
      </View>
    </GestureHandlerRootView>
  );
}

