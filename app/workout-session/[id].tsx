import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useActiveSession } from '@/context/ActiveSessionContext';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { useWorkoutState } from '@/hooks/useWorkoutState';
import { WorkoutHeader } from '@/components/workout/session/WorkoutHeader';
import { WorkoutControls } from '@/components/workout/session/WorkoutControls';
import { ActiveExerciseCard } from '@/components/workout/session/ActiveExerciseCard';
import { RPESlider } from '@/components/workout/session/RPESlider';
import { RestTimerDisplay } from '@/components/workout/session/RestTimerDisplay';
import { WorkoutNotes } from '@/components/workout/session/WorkoutNotes';
import { ExerciseReorderModal } from '@/components/workout/session/ExerciseReorderModal';
import { WarmupPhase, type WarmupPhaseData } from '@/components/workout/WarmupPhase';
import { WorkoutProgressBar } from '@/components/workout/session/WorkoutProgressBar';
import type { WorkoutExercise } from '@/types';
import { Database } from '@/types/supabase';
import { isOnline, addToQueue } from '@/lib/offlineSync';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseSet = Database["public"]["Tables"]["exercise_sets"]["Row"];

interface ExerciseWithSets extends Exercise {
  exercise_sets: ExerciseSet[];
}

type SessionPhase = 'warmup' | 'workout' | 'cooldown' | 'complete';

export default function WorkoutSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeSession, startSession, endSession } = useActiveSession();
  
  const [loading, setLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [phase, setPhase] = useState<SessionPhase>('warmup');
  const [warmupData, setWarmupData] = useState<WarmupPhaseData | null>(null);
  const [cooldownData, setCooldownData] = useState<WarmupPhaseData | null>(null);
  const [notesVisible, setNotesVisible] = useState(false);

  useEffect(() => {
    if (id) {
      loadWorkout();
    }
  }, [id]);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (workoutError) throw workoutError;
      setWorkoutName(workoutData.program);

      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select(`*, exercise_sets (*)`)
        .eq("workout_id", id)
        .order("created_at", { ascending: true });

      if (exerciseError) throw exerciseError;

      const transformedExercises: WorkoutExercise[] = (exerciseData as ExerciseWithSets[]).map(ex => ({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        supersetGroup: ex.superset_group,
        sets: ex.exercise_sets.map(set => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          restTime: set.rest_time,
          rpe: set.rpe,
          isBodyweight: set.is_bodyweight || false,
          targetType: set.target_type,
        })),
      }));

      setExercises(transformedExercises);

      if (!activeSession || activeSession.workoutId !== id) {
        startSession(id!, workoutData.program, transformedExercises);
      }

    } catch (error) {
      console.error("Error loading workout:", error);
      Alert.alert("Virhe", "Treenin lataus epäonnistui");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleWarmupComplete = (data: WarmupPhaseData) => {
    setWarmupData(data);
    setPhase('workout');
  };

  const handleWarmupSkip = () => {
    setWarmupData({ duration: 0, method: 'muu', intensity: 'keskitaso', notes: '', skipped: true });
    setPhase('workout');
  };

  const handleCooldownComplete = (data: WarmupPhaseData) => {
    setCooldownData(data);
    setPhase('complete');
  };

  const handleCooldownSkip = () => {
    setCooldownData({ duration: 0, method: 'muu', intensity: 'keskitaso', notes: '', skipped: true });
    setPhase('complete');
  };

  const handleClose = () => {
    Alert.alert(
      "Lopeta treeni",
      "Haluatko lopettaa treenin?",
      [
        { text: "Peruuta", style: "cancel" },
        { text: "Tallenna ja lopeta", onPress: () => endSession() },
        { text: "Hylkää", style: "destructive", onPress: () => { endSession(); router.back(); } },
      ]
    );
  };

  // Handle 'complete' phase (after cooldown) - need to pass to content component
  const handleSaveSession = async () => {
    // This will be called from WorkoutSessionContent after cooldown phase
    // The actual save is handled inside WorkoutSessionContent
  };

  if (loading || exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
      </View>
    );
  }

  // Show warmup phase
  if (phase === 'warmup') {
    return (
      <WarmupPhase
        type="warmup"
        visible={true}
        onComplete={handleWarmupComplete}
        onSkip={handleWarmupSkip}
      />
    );
  }

  // Show cooldown phase
  if (phase === 'cooldown') {
    return (
      <WarmupPhase
        type="cooldown"
        visible={true}
        onComplete={handleCooldownComplete}
        onSkip={handleCooldownSkip}
      />
    );
  }

  // If phase is 'complete', WorkoutSessionContent will auto-save
  return (
    <WorkoutSessionContent
      exercises={activeSession?.exercises || exercises}
      workoutName={workoutName}
      workoutId={id!}
      onClose={handleClose}
      warmupData={warmupData}
      cooldownData={cooldownData}
      onRequestCooldown={() => setPhase('cooldown')}
      shouldAutoSave={phase === 'complete'}
      notesVisible={notesVisible}
      onToggleNotes={() => setNotesVisible(!notesVisible)}
    />
  );
}

import { Audio } from 'expo-av';

const completeSound = require('../../assets/sounds/wooden_mallet.mp3');

function WorkoutSessionContent({
  exercises,
  workoutName,
  workoutId,
  onClose,
  warmupData,
  cooldownData,
  onRequestCooldown,
  shouldAutoSave,
  notesVisible,
  onToggleNotes,
}: {
  exercises: WorkoutExercise[];
  workoutName: string;
  workoutId: string;
  onClose: () => void;
  warmupData: WarmupPhaseData | null;
  cooldownData: WarmupPhaseData | null;
  onRequestCooldown: () => void;
  shouldAutoSave: boolean;
  notesVisible: boolean;
  onToggleNotes: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { endSession } = useActiveSession();

  const playCompleteSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(completeSound);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const workoutTimer = useWorkoutTimer({
    initialRestTime: exercises[0]?.sets[0]?.restTime || 120,
    onRestComplete: () => {
      playCompleteSound();
    },
  });

  const workoutState = useWorkoutState({ exercises });

  const [reorderModalVisible, setReorderModalVisible] = useState(false);

  const handleReorderSave = (newOrder: number[]) => {
    workoutState.reorderExercises(newOrder);
    setReorderModalVisible(false);
  };

  // Auto-save when cooldown is complete
  useEffect(() => {
    if (shouldAutoSave) {
      handleSaveAndEnd(true);
    }
  }, [shouldAutoSave]);

  const handleSaveAndEnd = async (save: boolean) => {
    let sessionId: string | null = null;
    if (save) {
      sessionId = await saveSession();
    }
    endSession();
    if (sessionId) {
      router.replace(`/(dashboard)/workouts/session/${sessionId}`);
    } else {
      router.back();
    }
  };

  const saveSession = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const totalVolume = calculateTotalVolume();
      const sessionId = uuidv4();
      const sessionDate = new Date().toISOString();
      
      // Calculate total duration including warmup and cooldown
      const warmupDuration = warmupData?.duration || 0;
      const cooldownDuration = cooldownData?.duration || 0;
      const totalDuration = workoutTimer.workoutTime + warmupDuration + cooldownDuration;
      
      // Check network status
      const online = await isOnline();

      if (online) {
        // === ONLINE PATH: Direct Supabase writes ===
        
        // 1. MAIN WRITE: New Schema (workout_sessions)
        const { data: sessionData, error: sessionError } = await supabase
          .from("workout_sessions")
          .insert({
            id: sessionId,
            user_id: user.id,
            workout_id: workoutId,
            duration: totalDuration,
            date: sessionDate,
            total_volume: totalVolume,
            _offline: false,
            _pendingsync: false,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // 2. Insert exercises and sets for New Schema
        for (let exIdx = 0; exIdx < workoutState.orderedExercises.length; exIdx++) {
          const exercise = workoutState.orderedExercises[exIdx];
          const { data: exData, error: exError } = await supabase
            .from("session_exercises")
            .insert({
              session_id: sessionData.id,
              exercise_id: exercise.id,
              name: exercise.name,
              order_index: exIdx,
              notes: workoutState.exerciseNotes[exIdx] || null,
            })
            .select()
            .single();

          if (exError) throw exError;

          const setsToInsert = (workoutState.setResults[exIdx] || [])
            .filter(r => r.completed)
            .map((result) => ({
              session_exercise_id: exData.id,
              weight_used: result.weight,
              reps_completed: result.reps,
              rpe: result.rpe,
              notes: result.notes || null,
              completed_at: new Date().toISOString(),
              _offline: false,
              _pendingsync: false,
            }));

          if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase
              .from("session_sets")
              .insert(setsToInsert);

            if (setsError) throw setsError;
          }
        }

        // 3. LEGACY WRITE: Old Schema (workout_results) - best effort
        try {
          const { data: legacyResult, error: legacyError } = await supabase
            .from("workout_results")
            .insert({
              user_id: user.id,
              workout_id: workoutId,
              duration: totalDuration,
              completed_at: sessionDate,
              notes: null,
              warmup: null,
              cooldown: null,
            })
            .select()
            .single();

          if (!legacyError && legacyResult) {
            const legacySetsToInsert: any[] = [];
            
            workoutState.orderedExercises.forEach((exercise, exIdx) => {
               const results = workoutState.setResults[exIdx] || [];
               results.forEach((res, setIdx) => {
                 if (res.completed) {
                   legacySetsToInsert.push({
                     workout_result_id: legacyResult.id,
                     exercise_name: exercise.name,
                     exercise_index: exIdx,
                     set_index: setIdx,
                     weight: res.weight,
                     reps: res.reps,
                     rpe: res.rpe,
                     sets: 0,
                     superset_group: exercise.supersetGroup,
                   });
                 }
               });
            });

            if (legacySetsToInsert.length > 0) {
              await supabase.from("workout_set_results").insert(legacySetsToInsert);
            }
          }
        } catch (legacyCatchError) {
          console.error("Legacy write crash:", legacyCatchError);
        }

        return sessionData.id;
        
      } else {
        // === OFFLINE PATH: Queue to sync later ===
        console.log('[SaveSession] Offline - queueing workout for later sync');
        
        // Generate IDs for all entities
        const exerciseIds: string[] = [];
        const sessionExercisesData: any[] = [];
        const sessionSetsData: any[] = [];

        // Build the data structures
        for (let exIdx = 0; exIdx < workoutState.orderedExercises.length; exIdx++) {
          const exercise = workoutState.orderedExercises[exIdx];
          const exId = uuidv4();
          exerciseIds.push(exId);

          sessionExercisesData.push({
            id: exId,
            session_id: sessionId,
            exercise_id: exercise.id,
            name: exercise.name,
            order_index: exIdx,
            notes: workoutState.exerciseNotes[exIdx] || null,
          });

          const completedSets = (workoutState.setResults[exIdx] || [])
            .filter(r => r.completed)
            .map((result) => ({
              id: uuidv4(),
              session_exercise_id: exId,
              weight_used: result.weight,
              reps_completed: result.reps,
              rpe: result.rpe,
              notes: result.notes || null,
              completed_at: new Date().toISOString(),
              _offline: true,
              _pendingsync: true,
            }));

          sessionSetsData.push(...completedSets);
        }

        // Queue the session
        await addToQueue({
          id: sessionId,
          type: 'workout_session',
          operation: 'insert',
          data: {
            id: sessionId,
            user_id: user.id,
            workout_id: workoutId,
            duration: totalDuration,
            date: sessionDate,
            total_volume: totalVolume,
            _offline: true,
            _pendingsync: true,
          },
        });

        // Queue each exercise
        for (const exData of sessionExercisesData) {
          await addToQueue({
            id: exData.id,
            type: 'session_exercise',
            operation: 'insert',
            data: exData,
          });
        }

        // Queue each set
        for (const setData of sessionSetsData) {
          await addToQueue({
            id: setData.id,
            type: 'session_set',
            operation: 'insert',
            data: setData,
          });
        }

        Alert.alert(
          "Tallennettu paikallisesti",
          "Treeni tallennetaan Supabaseen kun verkkoyhteys palautuu."
        );

        return sessionId;
      }
    } catch (error) {
      console.error("Error saving session:", error);
      Alert.alert("Virhe", "Treenin tallennus epäonnistui. Tarkista verkkoyhteys.");
      return null;
    }
  };

  const calculateTotalVolume = () => {
    return workoutState.setResults.flat().reduce((sum, result) => {
      if (result.completed) {
        return sum + (result.weight * result.reps);
      }
      return sum;
    }, 0);
  };

  const handleMarkComplete = () => {
    workoutState.markSetComplete();
    const currentSet = workoutState.currentExercise?.sets[workoutState.currentSetIndex];
    if (currentSet) { 
      workoutTimer.initRestTimer(currentSet.restTime);
    }
  };

  const handleNextStep = () => {
    const result = workoutState.moveToNext();
    if (result.type === 'complete') {
      // Trigger cooldown phase
      onRequestCooldown();
    } else {
      workoutTimer.skipRestTimer();
      const newSet = exercises[workoutState.currentExerciseIndex]?.sets[workoutState.currentSetIndex + 1];
      if (newSet) {
        workoutTimer.initRestTimer(newSet.restTime);
      }
    }
  };

  return (
    <View style={styles.container}>
      <WorkoutHeader
        formattedTime={workoutTimer.formattedWorkoutTime}
        workoutName={workoutName}
        onClose={onClose}
        onOpenMenu={() => setReorderModalVisible(true)}
      />
      
      <WorkoutProgressBar
        sessionExercises={exercises}
        currentExerciseIndex={workoutState.currentExerciseIndex}
        currentSetIndex={workoutState.currentSetIndex}
        setResults={workoutState.setResults}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {workoutState.currentExercise && workoutState.currentResult && (
          <>
            <ActiveExerciseCard
              exercise={workoutState.currentExercise}
              setIndex={workoutState.currentSetIndex}
              result={workoutState.currentResult}
              onWeightChange={(weight) => workoutState.updateCurrentResult({ weight })}
              onRepsChange={(reps) => workoutState.updateCurrentResult({ reps })}
              onToggleNotes={onToggleNotes}
              notesVisible={notesVisible}
            />

            <RPESlider
              value={workoutState.currentResult.rpe || 5}
              onChange={(rpe) => workoutState.updateCurrentResult({ rpe })}
            />

            <WorkoutNotes
              visible={notesVisible}
              setNote={workoutState.currentResult.notes || ''}
              onSetNoteChange={(notes) => workoutState.updateCurrentResult({ notes })}
              exerciseNote={workoutState.exerciseNotes[workoutState.currentExerciseIndex] || ''}
              onExerciseNoteChange={workoutState.updateExerciseNote}
            />

            <RestTimerDisplay
              currentSeconds={workoutTimer.restTimer}
              totalSeconds={workoutTimer.totalRestTime}
              isActive={workoutTimer.isRestTimerActive}
              onAdjust={workoutTimer.adjustRestTimer}
              onToggle={workoutTimer.toggleRestTimer}
            />
          </>
        )}
      </ScrollView>

      <WorkoutControls
        isLastSet={workoutState.isLastSet}
        isLastExercise={workoutState.isLastExercise}
        isSetCompleted={workoutState.currentResult?.completed || false}
        isFirstStep={workoutState.isFirstStep}
        onComplete={handleNextStep}
        onMarkComplete={handleMarkComplete}
        onBack={() => workoutState.moveToPrevious()}
      />

      <ExerciseReorderModal
        visible={reorderModalVisible}
        exercises={workoutState.orderedExercises}
        completedIndices={workoutState.getCompletedExerciseIndices()}
        onClose={() => setReorderModalVisible(false)}
        onSave={handleReorderSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
});
