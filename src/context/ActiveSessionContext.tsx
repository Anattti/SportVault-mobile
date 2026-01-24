import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import type { ActiveSession, WorkoutExercise, SetResult } from '@/types';
import { saveActiveSession, loadActiveSession, clearActiveSession } from '@/lib/persistence/activeSession';

interface ActiveSessionContextType {
  activeSession: ActiveSession | null;
  isLoading: boolean;
  startSession: (workoutId: string, workoutName: string, exercises: WorkoutExercise[]) => void;
  updateSession: (updates: Partial<ActiveSession>) => void;
  endSession: () => void;
  getElapsedTime: () => number;
  resumeSession: () => void;
}

const ActiveSessionContext = createContext<ActiveSessionContextType | undefined>(undefined);

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load persisted session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const savedSession = await loadActiveSession();
        if (savedSession) {
          // Verify if session is not too old (e.g., > 24 hours)?
          // For now, just restore it.
          setActiveSession(savedSession);
          console.log('Restored active session:', savedSession.workoutId);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

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

    const newSession: ActiveSession = {
      workoutId,
      workoutName,
      startTime: Date.now(),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      setResults: initialResults,
      exercises,
      exerciseNotes: {},
    };

    setActiveSession(newSession);
    saveActiveSession(newSession);
  }, []);

  const updateSession = useCallback((updates: Partial<ActiveSession>) => {
    setActiveSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      saveActiveSession(updated); // Persist updates immediately
      return updated;
    });
  }, []);

  const endSession = useCallback(() => {
    setActiveSession(null);
    clearActiveSession();
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
      isLoading,
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
