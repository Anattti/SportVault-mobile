import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  Pressable, 
  Platform,
  Alert,
  KeyboardAvoidingView,
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
  Clock
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

type TargetType = 'reps' | 'meters' | 'seconds';

// This represents a "Block" of sets (e.g., "3 sets of 10 reps")
interface SetBlock {
  id: string;
  sets: string; // The number of sets to perform
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

const WORKOUT_TYPES = [
  { id: "endurance_basic", label: "Peruskestävyys (PK)", icon: Activity, color: "#ef4444" },
  { id: "endurance_max", label: "Maksimikestävyys", icon: Zap, color: "#eab308" },
  { id: "strength", label: "Voimaharjoittelu", icon: Dumbbell, color: "#f97316" },
  { id: "speed_explosive", label: "Nopeus- ja räjähtävyysharjoittelu", icon: Rocket, color: "#3b82f6" },
  { id: "mobility", label: "Liikkuvuus- ja kehonhuolto", icon: Move, color: "#8b5cf6" },
];

const EXERCISE_CATEGORIES = [
  { id: "legs", label: "Jalat", icon: Move },
  { id: "arms", label: "Kädet", icon: Dumbbell },
  { id: "core", label: "Keskivartalo", icon: Target },
  { id: "back", label: "Selkä", icon: LayoutList },
  { id: "chest", label: "Rinta", icon: Activity },
  { id: "shoulders", label: "Olkapäät", icon: ArrowUp },
];

export default function CreateWorkoutScreen() {
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
  
  // Track open category dropdowns by exercise ID
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null);

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
              isBodyweight: set.weight === 0
            }))
          }));
          setExercises(formattedExercises);
        }
      } catch (error) {
        console.error("Error fetching workout:", error);
        Alert.alert("Virhe", "Treenin tietojen haku epäonnistui.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [id]);

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: Math.random().toString(),
        name: "",
        category: "",
        setBlocks: [{
          id: Math.random().toString(),
          sets: "1",
          reps: "",
          weight: "",
          restTime: "60",
          targetType: "reps",
          isBodyweight: false
        }]
      }
    ]);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, field: keyof ExerciseData, value: any) => {
    setExercises(exercises.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
  };

  // --- Set Block Logic ---

  const addSetBlock = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          setBlocks: [...ex.setBlocks, {
            id: Math.random().toString(),
            sets: "1",
            reps: "",
            weight: "",
            restTime: "60",
            targetType: "reps",
            isBodyweight: false
          }]
        };
      }
      return ex;
    }));
  };

  const removeSetBlock = (exerciseId: string, blockId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, setBlocks: ex.setBlocks.filter(b => b.id !== blockId) };
      }
      return ex;
    }));
  };

  const updateSetBlock = (exerciseId: string, blockId: string, field: keyof SetBlock, value: any) => {
    setExercises(exercises.map(ex => {
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
  };

  const duplicateSetBlock = (exerciseId: string, block: SetBlock) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newBlock = { ...block, id: Math.random().toString() };
        return { ...ex, setBlocks: [...ex.setBlocks, newBlock] };
      }
      return ex;
    }));
  };

  const handleSave = async () => {
    if (!programName.trim()) {
      Alert.alert("Virhe", "Anna treenille nimi.");
      return;
    }
    if (!workoutType) {
        Alert.alert("Virhe", "Valitse treenin tyyppi.");
        return;
    }
    if (exercises.length === 0) {
      Alert.alert("Virhe", "Lisää vähintään yksi liike.");
      return;
    }

    try {
      setLoading(true);

      if (id) {
        // Update existing workout
        // 1. Update workout details
        const { error: updateError } = await supabase
          .from("workouts")
          .update({
            program: programName,
            workout_type: workoutType,
            notes: notes,
          })
          .eq("id", id);

        if (updateError) throw updateError;

        // 2. Delete existing exercises (cascade deletes sets)
        // We delete all and re-create to ensure sync with editor state
        const { error: deleteError } = await supabase
          .from("exercises")
          .delete()
          .eq("workout_id", id);

        if (deleteError) throw deleteError;

        // 3. Insert new exercises and sets
        for (const ex of exercises) {
          const { data: exerciseData, error: exerciseError } = await supabase
            .from("exercises")
            .insert({
              workout_id: id,
              name: ex.name || "Nimetön liike",
              category: ex.category
            })
            .select()
            .single();

          if (exerciseError) throw exerciseError;

          const setsToInsert = ex.setBlocks.flatMap(block => {
             const count = parseInt(block.sets) || 1;
             return Array(count).fill({
               exercise_id: exerciseData.id,
               reps: parseInt(block.reps) || 0,
               weight: block.isBodyweight ? 0 : (parseFloat(block.weight) || 0),
               rest_time: parseInt(block.restTime) || 60,
               target_type: block.targetType,
               sets: 1, // Individual sets
               rpe: 8
             });
          });

          if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase
              .from("exercise_sets")
              .insert(setsToInsert);
            
            if (setsError) throw setsError;
          }
        }
      } else {
        // Create new workout (existing logic)
        const formattedExercises = exercises.map(ex => ({
          name: ex.name || "Nimetön liike",
          sets: ex.setBlocks.map(b => ({
            reps: parseInt(b.reps) || 0,
            weight: b.isBodyweight ? 0 : (parseFloat(b.weight) || 0),
            rest_time: parseInt(b.restTime) || 60,
            restTime: parseInt(b.restTime) || 60,
            target_type: b.targetType,
            targetType: b.targetType,
            sets: parseInt(b.sets) || 1, 
            rpe: 8 
          }))
        }));

        const { data, error } = await supabase.rpc('insert_workout_with_children', {
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
      if (id) {
         await queryClient.invalidateQueries({ queryKey: ['workout_details', id] });
         // Käytetään navigatea backin sijaan varmistaaksemme että päädymme oikeaan osoitteeseen
         router.navigate(`/(dashboard)/workouts/${id}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert("Virhe", "Treenin tallennus epäonnistui.");
    } finally {
      setLoading(false);
    }
  };

  const selectedType = WORKOUT_TYPES.find(t => t.id === workoutType);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{id ? "Muokkaa treeniä" : "Luo uusi treeni"}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <X color={Colors.text.primary} size={24} />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          {/* Program Name */}
          <Input 
            label="TREENIN NIMI"
            placeholder="Esim. Jalkatreeni"
            value={programName}
            onChangeText={setProgramName}
            style={{ marginBottom: 20 }}
          />

          {/* Workout Type Selector */}
          <View style={[styles.inputGroup, { zIndex: 10 }]}>
            <Text style={styles.label}>TYYPPI</Text>
            <Pressable 
              style={[styles.typeSelector, isTypeSelectorOpen && styles.typeSelectorActive]} 
              onPress={() => setIsTypeSelectorOpen(!isTypeSelectorOpen)}
            >
              <View style={styles.selectedTypeContent}>
                {selectedType ? (
                    <View style={styles.typeRow}>
                        <selectedType.icon size={20} color={selectedType.color} />
                        <Text style={styles.selectedtypeText}>{selectedType.label}</Text>
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>Valitse tyyppi</Text>
                )}
              </View>
              {isTypeSelectorOpen ? (
                <ChevronUp color={Colors.text.secondary} size={20} />
              ) : (
                <ChevronDown color={Colors.text.secondary} size={20} />
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
            <Text style={styles.sectionTitle}>LIIKKEET</Text>
          </View>

          {exercises.map((ex, index) => {
            const isCategoryOpen = openCategoryDropdown === ex.id;
            const selectedCategory = EXERCISE_CATEGORIES.find(c => c.id === ex.category);

            return (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={[styles.exerciseIndex, { borderColor: Colors.neon.DEFAULT }]}>
                   <Text style={[styles.indexText, { color: Colors.neon.DEFAULT }]}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Input
                        label="LIIKKEEN NIMI"
                        placeholder="Esim. Penkkipunnerrus"
                        value={ex.name}
                        onChangeText={(text) => updateExercise(ex.id, "name", text)}
                    />
                </View>
                <Pressable onPress={() => removeExercise(ex.id)} style={styles.removeBtn}>
                  <Trash2 color="#ef4444" size={20} />
                </Pressable>
              </View>

              {/* Category Selector */}
              <View style={{ marginBottom: 24, zIndex: 5 }}>
                  <Text style={styles.label}>KATEGORIA</Text>
                  <Pressable 
                    style={styles.categorySelector}
                    onPress={() => setOpenCategoryDropdown(isCategoryOpen ? null : ex.id)}
                  >
                      {selectedCategory ? (
                          <View style={styles.categoryRow}>
                              <selectedCategory.icon size={16} color={Colors.neon.DEFAULT} />
                              <Text style={styles.categoryText}>{selectedCategory.label}</Text>
                          </View>
                      ) : (
                          <Text style={styles.placeholderText}>Valitse kategoria</Text>
                      )}
                      <ChevronDown size={16} color={Colors.text.secondary} />
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

              {ex.setBlocks.map((block, blockIndex) => (
                <View key={block.id} style={styles.setBlock}>
                    {/* Header Row: Title, Bodyweight, Duplicate */}
                    <View style={styles.blockHeader}>
                        <View style={styles.blockTitleBadge}>
                            <Text style={styles.blockTitleText}>Sarja {blockIndex + 1}</Text>
                        </View>
                        
                        <Pressable 
                            style={[
                                styles.bodyweightToggle, 
                                block.isBodyweight && styles.bodyweightToggleActive
                            ]}
                            onPress={() => updateSetBlock(ex.id, block.id, "isBodyweight", !block.isBodyweight)}
                        >
                            <Text style={[
                                styles.bodyweightText,
                                block.isBodyweight && styles.bodyweightTextActive
                            ]}>Kehon paino</Text>
                        </Pressable>

                        <View style={{ flex: 1 }} />

                        <Pressable 
                            style={styles.toolAction}
                            onPress={() => duplicateSetBlock(ex.id, block)}
                        >
                            <Copy size={16} color={Colors.text.primary} />
                        </Pressable>
                        
                        {ex.setBlocks.length > 1 && (
                            <Pressable 
                                onPress={() => removeSetBlock(ex.id, block.id)}
                                style={{ marginLeft: 16 }}
                            >
                                <Trash2 size={16} color="#ef4444" />
                            </Pressable>
                        )}
                    </View>

                    {/* Target Type Selector */}
                    <View style={styles.targetTypeContainer}>
                        {(['reps', 'meters', 'seconds'] as TargetType[]).map((type) => {
                            const labels: Record<string, string> = {
                                reps: 'Toistot',
                                meters: 'Metrit',
                                seconds: 'Sekunnit'
                            };
                            const isActive = block.targetType === type;
                            return (
                                <Pressable
                                    key={type}
                                    style={[styles.targetTypeOption, isActive && styles.targetTypeOptionActive]}
                                    onPress={() => updateSetBlock(ex.id, block.id, "targetType", type)}
                                >
                                    <Text style={[styles.targetTypeText, isActive && styles.targetTypeTextActive]}>
                                        {labels[type]}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Inputs Grid */}
                    <View style={styles.gridContainer}>
                        {/* Row 1 */}
                        <View style={styles.gridRow}>
                            {/* Weight Input */}
                            <View style={[styles.gridItem, { opacity: block.isBodyweight ? 0.3 : 1 }]}>
                                <View style={styles.inputLabelRow}>
                                    <Dumbbell size={12} color={Colors.text.secondary} />
                                    <Text style={styles.gridLabel}>Paino (kg)</Text>
                                </View>
                                <TextInput 
                                    style={[styles.gridInput, block.isBodyweight && styles.gridInputDisabled]}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={block.isBodyweight ? '' : block.weight}
                                    editable={!block.isBodyweight}
                                    onChangeText={(t) => updateSetBlock(ex.id, block.id, "weight", t)}
                                />
                            </View>

                            {/* Amount Input (Dynamic Label) */}
                            <View style={styles.gridItem}>
                                <View style={styles.inputLabelRow}>
                                    {block.targetType === 'reps' && <RotateCcw size={12} color={Colors.text.secondary} />}
                                    {block.targetType === 'meters' && <Ruler size={12} color={Colors.text.secondary} />}
                                    {block.targetType === 'seconds' && <Timer size={12} color={Colors.text.secondary} />}
                                    <Text style={styles.gridLabel}>
                                        {block.targetType === 'reps' ? 'Toistot' : 
                                         block.targetType === 'meters' ? 'Metrit' : 'Sekunnit'}
                                    </Text>
                                </View>
                                <TextInput 
                                    style={styles.gridInput}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={block.reps}
                                    onChangeText={(t) => updateSetBlock(ex.id, block.id, "reps", t)}
                                />
                            </View>
                        </View>

                        {/* Row 2 */}
                        <View style={styles.gridRow}>
                            {/* Sets Count */}
                            <View style={styles.gridItem}>
                                <View style={styles.inputLabelRow}>
                                    <Copy size={12} color={Colors.text.secondary} />
                                    <Text style={styles.gridLabel}>Sarjat</Text>
                                </View>
                                <TextInput 
                                    style={styles.gridInput}
                                    keyboardType="numeric"
                                    placeholder="1"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={block.sets}
                                    onChangeText={(t) => updateSetBlock(ex.id, block.id, "sets", t)}
                                />
                            </View>

                            {/* Rest Time */}
                            <View style={styles.gridItem}>
                                <View style={styles.inputLabelRow}>
                                    <Clock size={12} color={Colors.text.secondary} />
                                    <Text style={styles.gridLabel}>Palautus (s)</Text>
                                </View>
                                <TextInput 
                                    style={styles.gridInput}
                                    keyboardType="numeric"
                                    placeholder="60"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={block.restTime}
                                    onChangeText={(t) => updateSetBlock(ex.id, block.id, "restTime", t)}
                                />
                            </View>
                        </View>
                    </View>
                </View>
              ))}

              <Button 
                variant="secondary" // Dark background
                onPress={() => addSetBlock(ex.id)}
                style={styles.addSetButton}
              >
                <Plus color="#fff" size={16} />
                <Text style={styles.addSetText}>LISÄÄ SARJA</Text>
              </Button>
            </View>
          )})}

          <Button variant="outline" onPress={addExercise} style={styles.addExerciseBtn}>
            <Plus color={Colors.neon.DEFAULT} size={20} />
            <Text style={styles.addExerciseText}>LISÄÄ UUSI LIIKE</Text>
          </Button>

          {/* Notes Section */}
          <View style={[styles.inputGroup, { marginTop: 32 }]}>
            <Input
              label="MUISTIINPANOT"
              placeholder="Kirjoita muistiinpanoja treenistä..."
              multiline
              value={notes}
              onChangeText={setNotes}
              style={{ height: 120, paddingTop: 16 }}
            />
          </View>

          <View style={{ height: 100 }} /> 
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button onPress={handleSave} style={styles.saveButton} disabled={loading}>
          {loading ? (
             <Text style={styles.saveButtonText}>TALLENNETAAN...</Text>
          ) : (
            <>
              <Save color="#000" size={20} />
              <Text style={styles.saveButtonText}>TALLENNA TREENI</Text>
            </>
          )}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.border,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#111',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  
  // Type Selector Styles (Matching Input component)
  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    height: 56,
  },
  typeSelectorActive: {
    borderColor: Colors.neon.DEFAULT,
  },
  selectedTypeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderText: {
    color: "#71717a", // zinc-500
    fontSize: 16,
  },
  selectedtypeText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  typeDropdown: {
    marginTop: 8,
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  typeOptionText: {
    color: Colors.text.primary,
    fontSize: 16,
  },

  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    color: Colors.text.primary, 
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  exerciseCard: {
    backgroundColor: "#111", // Slightly lighter than background
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.neon.DEFAULT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24, // Visual alignment
  },
  indexText: {
    color: Colors.neon.DEFAULT,
    fontWeight: "800",
    fontSize: 14,
  },
  removeBtn: {
    padding: 8,
    marginTop: 24, // Visual alignment
  },
  
  // Category Selector
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryText: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  categoryDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: 4,
    zIndex: 100,
    padding: 4,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  categoryOptionText: {
    color: Colors.text.primary,
    fontSize: 14,
  },

  // Set Block Styles
  setBlock: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  blockTitleBadge: {
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockTitleText: {
    color: Colors.text.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  bodyweightToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "transparent",
  },
  bodyweightToggleActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  bodyweightText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  bodyweightTextActive: {
    color: Colors.text.primary,
  },
  toolAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toolActionText: {
    color: Colors.text.secondary,
    fontSize: 12,
  },

  // Target Type
  targetTypeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  targetTypeOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#222",
  },
  targetTypeOptionActive: {
    backgroundColor: Colors.neon.DEFAULT,
  },
  targetTypeText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  targetTypeTextActive: {
    color: "#000",
  },

  // Grid
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  gridLabel: {
    color: Colors.text.secondary,
    fontSize: 12,
  },
  gridInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    color: Colors.text.primary,
    fontSize: 16,
    textAlign: "center",
  },
  gridInputDisabled: {
    backgroundColor: "#111",
    color: "rgba(255,255,255,0.1)",
  },

  addSetButton: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addSetText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },

  addExerciseBtn: {
    borderColor: Colors.neon.DEFAULT,
    borderWidth: 1,
    backgroundColor: "#111", // darker bg
    paddingTop: 16,
    paddingBottom: 16,
  },
  addExerciseText: {
    color: Colors.neon.DEFAULT,
    fontWeight: "700",
    marginLeft: 8,
  },
  
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  saveButton: {
    backgroundColor: Colors.neon.DEFAULT,
    height: 56,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 8,
  },
});
