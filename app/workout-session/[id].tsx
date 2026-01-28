import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, InteractionManager, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useWorkoutTemplate } from '@/hooks/useWorkoutTemplate';
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
import { LiveHeartRate } from '@/components/workout/LiveHeartRate';
import { useQueryClient } from "@tanstack/react-query";
import { ExerciseReorderModal } from '@/components/workout/session/ExerciseReorderModal';
import { WarmupPhase, type WarmupPhaseData } from '@/components/workout/WarmupPhase';
import { WorkoutProgressBar } from '@/components/workout/session/WorkoutProgressBar';
import { SessionSummary } from '@/features/workouts/SessionSummary';
import type { WorkoutExercise } from '@/types';
import { Database } from '@/types/supabase';
import { isOnline, addToQueue } from '@/lib/offlineSync';
import { workoutHistoryKeys } from '@/hooks/useWorkoutHistory';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseSet = Database["public"]["Tables"]["exercise_sets"]["Row"];

interface ExerciseWithSets extends Exercise {
  exercise_sets: ExerciseSet[];
}

type SessionPhase = 'warmup' | 'workout' | 'cooldown' | 'complete' | 'summary';

export default function WorkoutSessionScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeSession, startSession, endSession, isLoading } = useActiveSession();
  
  const { data: workoutTemplate, isLoading: isTemplateLoading, error: templateError } = useWorkoutTemplate(id);
  // Do NOT wait for isLoading from activeSession to show loading spinner initially, 
  // as activeSession loads async and we want to start quickly if possible.
  // But we need to know if we are restoring.
  const loading = isTemplateLoading;

  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [phase, setPhase] = useState<SessionPhase>('warmup');
  const [warmupData, setWarmupData] = useState<WarmupPhaseData | null>(null);
  const [cooldownData, setCooldownData] = useState<WarmupPhaseData | null>(null);
  const [notesVisible, setNotesVisible] = useState(false);
  
  // New state to hold the saved session ID for summary view
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const justStarted = React.useRef(false);

  /* Ref to prevent session resurrection when exiting */
  const isExiting = React.useRef(false);

  useEffect(() => {
    if (templateError) {
      console.error("Error loading workout:", templateError);
      Alert.alert(t('profile.error'), t('session.alerts.load_error'));
      router.back();
    }
  }, [templateError]);

  // If resuming an active session, skip directly to workout phase
  useEffect(() => {
    if (!isLoading && activeSession && activeSession.workoutId === id && phase === 'warmup') {
      if (justStarted.current) {
        justStarted.current = false;
        return;
      }
      console.log('Resuming active session, skipping warmup');
      setPhase('workout');
    }
  }, [isLoading, activeSession, id, phase]);

  useEffect(() => {
    if (workoutTemplate) {
      const transformedExercises: WorkoutExercise[] = workoutTemplate.exercises.map(ex => ({
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

      setWorkoutName(workoutTemplate.program);
      setExercises(transformedExercises);
      
      // Only start if not exiting and no active session
      if (!activeSession && !isExiting.current && !isLoading) {
          // Defer startSession to avoid blocking the modal transition and causing background flashes
          InteractionManager.runAfterInteractions(() => {
            if (!isExiting.current) {
              startSession(id!, workoutTemplate.program, transformedExercises);
              justStarted.current = true;
            }
          });
      }
    }
  }, [workoutTemplate, activeSession, id, isLoading]);

  const handleWarmupComplete = (data: WarmupPhaseData) => {
    setWarmupData(data);
    setPhase('workout');
  };

  const handleWarmupSkip = () => {
    setWarmupData({ duration: 0, method: 'muu', intensity: 5, notes: '', skipped: true });
    setPhase('workout');
  };

  const handleCooldownComplete = (data: WarmupPhaseData) => {
    setCooldownData(data);
    setPhase('complete');
  };

  const handleCooldownSkip = () => {
    setCooldownData({ duration: 0, method: 'muu', intensity: 5, notes: '', skipped: true });
    setPhase('complete');
  };

  
  const handleSessionSaved = (sessionId: string | null) => {
    if (sessionId) {
      setSavedSessionId(sessionId);
      setPhase('summary');
    } else {
      // If save failed or returned null (e.g. error), exit
      router.back();
    }
  };


  if (loading || isLoading || exercises.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
      </View>
    );
  }



  // Show summary phase
  if (phase === 'summary' && savedSessionId) {
    return (
      <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(400)}>
        <SessionSummary 
            sessionId={savedSessionId} 
            onClose={() => {
            // Dismiss the modal completely
            if (router.canDismiss()) {
                router.dismiss();
            } else {
                router.back();
            }
            }} 
        />
      </Animated.View>
    );
  }

  const showContent = phase === 'workout' || phase === 'cooldown' || phase === 'complete';

  return (
    <View style={styles.container}>
      {/* Warmup Phase - Standard render (not overlay, as session hasn't started visualy) */}
      {phase === 'warmup' && (
        <WarmupPhase
          type="warmup"
          visible={true}
          onComplete={handleWarmupComplete}
          onSkip={handleWarmupSkip}
          workoutType={workoutTemplate?.workout_type ?? 'other'}
        />
      )}

      {/* Main Session Content - Kept mounted during cooldown/complete */}
      {showContent && (
        <WorkoutSessionContent
          exercises={activeSession?.exercises || exercises}
          initialState={activeSession?.workoutId === id ? {
            setResults: activeSession.setResults,
            currentExerciseIndex: activeSession.currentExerciseIndex,
            currentSetIndex: activeSession.currentSetIndex,
            orderedExercises: activeSession.exercises,
            exerciseNotes: activeSession.exerciseNotes,
          } : undefined}
          workoutName={workoutName}
          workoutId={id!}
          onExit={() => { isExiting.current = true; }}
          warmupData={warmupData}
          cooldownData={cooldownData}
          onRequestCooldown={() => setPhase('cooldown')}
          shouldAutoSave={phase === 'complete'}
          notesVisible={notesVisible}
          onToggleNotes={() => setNotesVisible(!notesVisible)}
          onSessionSaved={handleSessionSaved}
        />
      )}

      {/* Cooldown Overlay */}
      {phase === 'cooldown' && (
        <Animated.View 
            style={[StyleSheet.absoluteFill, { zIndex: 2000 }]} 
            entering={SlideInUp.duration(400)}
        >
          <WarmupPhase
            type="cooldown"
            visible={true} // prop ignored by overlay=true logic usually, but kept for type
            overlay={true}
            onComplete={handleCooldownComplete}
            onSkip={handleCooldownSkip}
          />
        </Animated.View>
      )}

      {/* Saving Overlay */}
      {phase === 'complete' && (
        <Animated.View 
            style={styles.loadingOverlay}
            entering={FadeIn.duration(300)}
        >
          <ActivityIndicator color={Colors.neon.DEFAULT} size="large" />
          <Text style={styles.loadingText}>{t('session.saving') || 'Saving...'}</Text>
        </Animated.View>
      )}
    </View>
  );
}

import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useHeartRate } from '@/context/HeartRateContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const completeSound = require('../../assets/sounds/wooden_mallet.mp3');

function WorkoutSessionContent({
  exercises,
  workoutName,
  workoutId,
  onExit,
  warmupData,
  cooldownData,
  onRequestCooldown,
  shouldAutoSave,
  notesVisible,
  onToggleNotes,
  initialState,
  onSessionSaved
}: {
  exercises: WorkoutExercise[];
  initialState?: {
    setResults: unknown[][]; 
    currentExerciseIndex: number;
    currentSetIndex: number;
    orderedExercises: WorkoutExercise[];
    exerciseNotes: Record<number, string>;
  };
  workoutName: string;
  workoutId: string;
  onExit: () => void;
  warmupData: WarmupPhaseData | null;
  cooldownData: WarmupPhaseData | null;
  onRequestCooldown: () => void;
  shouldAutoSave: boolean;
  notesVisible: boolean;
  onToggleNotes: () => void;
  onSessionSaved: (sessionId: string | null) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { activeSession, endSession, updateSession } = useActiveSession();
  const { currentBpm } = useHeartRate();
  const [liveActivityId, setLiveActivityId] = useState<string | null>(null);

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

  useEffect(() => {
    async function initLiveActivity() {
       // Live Activity Removed
    }

    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    }
    
    requestPermissions();
    initLiveActivity();

    return () => {
      // Note: We don't end it here because the hook might unmount but session continues in context
      // End happens in endSession or handleSaveAndEnd
    };
  }, []);



  const handleRestTimerChange = async (target: number | null, duration: number | null) => {
    // Update session state
    updateSession({ 
      restTimerTarget: target,
      restTimerDuration: duration,
    });

    // Update Live Activity REMOVED

    // Handle notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    if (target && target > Date.now()) {
      const seconds = (target - Date.now()) / 1000;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('session.alerts.rest_complete') || "Rest Complete!",
          body: t('session.alerts.rest_complete_body') || "Time to crush the next set!",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: seconds,
          repeats: false,
        },
      });
    }
  };

  const workoutTimer = useWorkoutTimer({
    initialRestTime: exercises[0]?.sets[0]?.restTime || 120,
    onRestComplete: (msSinceCompletion) => {
      // If completed more than 500ms ago, assume notification handled it or meaningful time passed
      if (typeof msSinceCompletion === 'number' && msSinceCompletion > 500) {
        console.log('Rest timer finished in background (late by ' + msSinceCompletion + 'ms), suppressing in-app sound.');
        return;
      }
      playCompleteSound();
    },
    sessionStartTime: activeSession?.startTime,
    restTimerTarget: activeSession?.restTimerTarget,
    restTimerDuration: activeSession?.restTimerDuration,
    onRestTimerChange: handleRestTimerChange,
  });

  const handleClose = () => {
    Alert.alert(
      t('session.alerts.finish_title'),
      t('session.alerts.finish_message'),
      [
        { text: t('session.alerts.cancel'), style: "cancel" },
        { text: t('session.alerts.save_and_finish'), onPress: () => handleSaveAndEnd(true) },
        { text: t('session.alerts.discard'), style: "destructive", onPress: () => { 
          onExit();
          endSession(); 
          router.back(); 
        } },
      ]
    );
  };

  const workoutState = useWorkoutState({ 
    exercises,
    initialState: initialState as any // Cast because of import complexity, types match runtime
  });

  const [reorderModalVisible, setReorderModalVisible] = useState(false);

  const handleReorderSave = (newOrder: number[]) => {
    workoutState.reorderExercises(newOrder);
    setReorderModalVisible(false);
  };

  // Sync state to global context (and persistence)
  useEffect(() => {
    // We only want to update if we are in a valid session matching this workout
    // and if there are actual changes to avoid loops (though updateSession uses setState)
    updateSession({
      setResults: workoutState.setResults,
      currentExerciseIndex: workoutState.currentExerciseIndex,
      currentSetIndex: workoutState.currentSetIndex,
      exercises: workoutState.orderedExercises, // Save reordered exercises
      exerciseNotes: workoutState.exerciseNotes,
    });
  }, [
    workoutState.setResults, 
    workoutState.currentExerciseIndex, 
    workoutState.currentSetIndex,
    workoutState.orderedExercises,
    updateSession,
    workoutState.currentExercise?.name,
  ]);

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
    
    // End Live Activity REMOVED
    
    // Mark as exiting logic handled by parent via onExit if needed, 
    // but here we just need to ensure we don't start a new one.
    onExit();
    
    // Clear active session
    endSession();
    
    // Invalidate queries in any case
    await queryClient.invalidateQueries({ queryKey: ['workout_details', workoutId] });
    await queryClient.invalidateQueries({ queryKey: ['workouts'] });
    await queryClient.invalidateQueries({ queryKey: workoutHistoryKeys.all });

    if (save && sessionId) {
       // Call callback to show summary in parent
       onSessionSaved(sessionId);
    } else {
       // Exit if not saving or save failed (and we didn't return early)
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
        // === ONLINE PATH: Atomic RPC write ===
        
        // 1. Prepare payload with pre-generated IDs
        const exercisesPayload: any[] = [];
        const setsPayload: any[] = [];

        for (let exIdx = 0; exIdx < workoutState.orderedExercises.length; exIdx++) {
          const exercise = workoutState.orderedExercises[exIdx];
          const exId = uuidv4();
          
          exercisesPayload.push({
            id: exId,
            session_id: sessionId,
            exercise_id: exercise.id,
            name: exercise.name,
            order_index: exIdx,
            notes: workoutState.exerciseNotes[exIdx] || null,
            created_at: sessionDate, // Use session date for consistency
          });

          const completedSets = (workoutState.setResults[exIdx] || [])
            .filter(r => r.completed)
            .map((result) => ({
              id: uuidv4(),
              session_exercise_id: exId,
              sets_completed: 1, // Individual set record
              weight_used: result.weight,
              reps_completed: result.reps,
              rpe: result.rpe,
              notes: result.notes || null,
              created_at: sessionDate,
              completed_at: new Date().toISOString(),
            }));

          setsPayload.push(...completedSets);
        }

        const payload = {
          session: {
            id: sessionId,
            user_id: user.id,
            workout_id: workoutId,
            duration: totalDuration,
            date: sessionDate,
            total_volume: totalVolume,
            feeling: 3, // Default feeling, could be linked to a UI selector later
            rpe_average: setsPayload.length > 0 
              ? (setsPayload.reduce((acc, s) => acc + (s.rpe || 0), 0) / setsPayload.length).toFixed(1)
              : 0,
            warmup: warmupData || null,
            cooldown: cooldownData || null,
            created_at: sessionDate,
          },
          exercises: exercisesPayload,
          sets: setsPayload
        };

        // 2. MAIN WRITE: Atomic RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('save_full_workout_session', { payload });

        if (rpcError) throw rpcError;
        if (rpcData && rpcData.success === false) {
          throw new Error(rpcData.error || 'RPC save failed');
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

        return sessionId;
        
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
          t('session.alerts.offline_saved_title'),
          t('session.alerts.offline_saved_message')
        );

        return sessionId;
      }
    } catch (error) {
      console.error("Error saving session:", error);
      Alert.alert(t('profile.error'), t('session.alerts.save_error'));
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
        onClose={handleClose}
        onOpenMenu={() => setReorderModalVisible(true)}
      />
      
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <LiveHeartRate />
      </View>
      
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    gap: 16,
  },
  loadingText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
});
