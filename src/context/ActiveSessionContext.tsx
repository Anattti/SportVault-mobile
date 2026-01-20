import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { ActiveSession, WorkoutExercise, SetResult } from '@/types';

interface ActiveSessionContextType {
  activeSession: ActiveSession | null;
  startSession: (workoutId: string, workoutName: string, exercises: WorkoutExercise[]) => void;
  updateSession: (updates: Partial<ActiveSession>) => void;
  endSession: () => void;
  getElapsedTime: () => number;
  resumeSession: () => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType | undefined>(undefined);

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const startSession = useCallback((
    workoutId: string, 
    workoutName: string, 
    exercises: WorkoutExercise[]
  ) => {
    // Initialize set results for all exercises
    const initialResults: SetResult[][] = exercises.map(ex => 
      ex.sets.map(set => ({
        weight: set.weight,
        reps: set.reps,
        rpe: null,
        completed: false,
      }))
    );

    setActiveSession({
      workoutId,
      workoutName,
      startTime: Date.now(),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      setResults: initialResults,
      exercises,
    });
  }, []);

  const updateSession = useCallback((updates: Partial<ActiveSession>) => {
    setActiveSession(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const endSession = useCallback(() => {
    setActiveSession(null);
  }, []);

  const getElapsedTime = useCallback(() => {
    if (!activeSession) return 0;
    return Math.floor((Date.now() - activeSession.startTime) / 1000);
  }, [activeSession]);

  const resumeSession = useCallback(() => {
    if (activeSession) {
      router.push(`/workout-session/${activeSession.workoutId}`);
    }
  }, [activeSession, router]);

  return (
    <ActiveSessionContext.Provider value={{
      activeSession,
      startSession,
      updateSession,
      endSession,
      getElapsedTime,
      resumeSession,
    }}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (context === undefined) {
    throw new Error('useActiveSession must be used within an ActiveSessionProvider');
  }
  return context;
}
