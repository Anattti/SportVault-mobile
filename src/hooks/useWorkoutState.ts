import { useState, useCallback } from 'react';
import type { WorkoutExercise, SetResult } from '@/types';

interface UseWorkoutStateOptions {
  exercises: WorkoutExercise[];
  initialState?: {
    setResults: SetResult[][];
    currentExerciseIndex: number;
    currentSetIndex: number;
    orderedExercises: WorkoutExercise[];
    exerciseNotes: Record<number, string>;
  };
  onComplete?: (results: SetResult[][], duration: number) => void;
}

export function useWorkoutState({ exercises: initialExercises, initialState, onComplete }: UseWorkoutStateOptions) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(initialState?.currentExerciseIndex ?? 0);
  const [currentSetIndex, setCurrentSetIndex] = useState(initialState?.currentSetIndex ?? 0);
  
  // Ordered exercises (can be reordered during session)
  const [orderedExercises, setOrderedExercises] = useState<WorkoutExercise[]>(initialState?.orderedExercises ?? initialExercises);
  
  // Initialize set results for all exercises
  const [setResults, setSetResults] = useState<SetResult[][]>(() => 
    initialState?.setResults ?? initialExercises.map(ex => 
      ex.sets.map(set => ({
        weight: set.weight,
        reps: set.reps,
        rpe: null,
        completed: false,
        originalWeight: set.weight,
        originalReps: set.reps,
      }))
    )
  );

  const currentExercise = orderedExercises[currentExerciseIndex];
  const currentSet = currentExercise?.sets[currentSetIndex];
  const currentResult = setResults[currentExerciseIndex]?.[currentSetIndex];

  const totalSets = orderedExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = setResults.flat().filter(r => r.completed).length;

  const updateCurrentResult = useCallback((updates: Partial<SetResult>) => {
    setSetResults(prev => {
      // Safety check: ensure indices exist
      if (!prev[currentExerciseIndex] || !prev[currentExerciseIndex][currentSetIndex]) {
        return prev;
      }
      
      const newResults = [...prev];
      newResults[currentExerciseIndex] = [...newResults[currentExerciseIndex]];
      newResults[currentExerciseIndex][currentSetIndex] = {
        ...newResults[currentExerciseIndex][currentSetIndex],
        ...updates,
      };
      return newResults;
    });
  }, [currentExerciseIndex, currentSetIndex]);

  const markSetComplete = useCallback(() => {
    updateCurrentResult({ completed: true });
  }, [updateCurrentResult]);

  const moveToNext = useCallback(() => {
    const currentEx = orderedExercises[currentExerciseIndex];
    
    // Check if there are more sets in current exercise
    if (currentSetIndex < currentEx.sets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
      return { type: 'nextSet' as const };
    }
    
    // Check if there are more exercises
    if (currentExerciseIndex < orderedExercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
      return { type: 'nextExercise' as const };
    }
    
    // Workout complete
    return { type: 'complete' as const };
  }, [currentExerciseIndex, currentSetIndex, orderedExercises]);

  const moveToPrevious = useCallback(() => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(prev => prev - 1);
      return true;
    }
    
    if (currentExerciseIndex > 0) {
      const prevExercise = orderedExercises[currentExerciseIndex - 1];
      setCurrentExerciseIndex(prev => prev - 1);
      setCurrentSetIndex(prevExercise.sets.length - 1);
      return true;
    }
    
    return false;
  }, [currentExerciseIndex, currentSetIndex, orderedExercises]);

  const isLastSet = currentSetIndex === (currentExercise?.sets.length ?? 1) - 1;
  const isLastExercise = currentExerciseIndex === orderedExercises.length - 1;
  const isFirstStep = currentExerciseIndex === 0 && currentSetIndex === 0;

  const [exerciseNotes, setExerciseNotes] = useState<Record<number, string>>(initialState?.exerciseNotes ?? {});

  const updateExerciseNote = useCallback((note: string) => {
    setExerciseNotes(prev => ({
      ...prev,
      [currentExerciseIndex]: note
    }));
  }, [currentExerciseIndex]);

  // Reorder exercises based on new order (array of original indices)
  const reorderExercises = useCallback((newOrder: number[]) => {
    // Reorder exercises
    const reorderedExercises = newOrder.map(idx => orderedExercises[idx]);
    setOrderedExercises(reorderedExercises);
    
    // Reorder set results
    const reorderedResults = newOrder.map(idx => setResults[idx]);
    setSetResults(reorderedResults);
    
    // Reorder exercise notes
    const reorderedNotes: Record<number, string> = {};
    newOrder.forEach((oldIdx, newIdx) => {
      if (exerciseNotes[oldIdx] !== undefined) {
        reorderedNotes[newIdx] = exerciseNotes[oldIdx];
      }
    });
    setExerciseNotes(reorderedNotes);
    
    // Check if the exercise at the current index has changed
    // newOrder[currentExerciseIndex] gives the original index of the exercise now at currentExerciseIndex
    const currentSlotOriginalIndex = newOrder[currentExerciseIndex];
    
    // If the exercise at the current slot changed, reset to the first incomplete set of the new exercise
    if (currentSlotOriginalIndex !== currentExerciseIndex) {
      const newExerciseSets = reorderedResults[currentExerciseIndex];
      const firstIncompleteSetIndex = newExerciseSets.findIndex(s => !s.completed);
      // Default to 0 if all completed or none found, otherwise jump to first incomplete
      setCurrentSetIndex(firstIncompleteSetIndex !== -1 ? firstIncompleteSetIndex : 0);
    }

    // NOTE: We do NOT update currentExerciseIndex here. 
    // If the user moves the current exercise away, they effectively want to work on the 
    // exercise that replaced it at the current slot.
  }, [orderedExercises, setResults, exerciseNotes, currentExerciseIndex]);

  // Get indices of exercises with ALL sets completed
  const getCompletedExerciseIndices = useCallback(() => {
    return setResults
      .map((exerciseSets, idx) => {
        // Ensure there are sets and all are completed
        if (exerciseSets.length === 0) return -1;
        return exerciseSets.every(set => set.completed) ? idx : -1;
      })
      .filter(idx => idx !== -1);
  }, [setResults]);

  return {
    currentExerciseIndex,
    currentSetIndex,
    currentExercise,
    currentSet,
    currentResult,
    setResults,
    setSetResults,
    updateCurrentResult,
    markSetComplete,
    moveToNext,
    moveToPrevious,
    isLastSet,
    isLastExercise,
    isFirstStep,
    totalSets,
    completedSets,
    exerciseNotes,
    updateExerciseNote,
    orderedExercises,
    reorderExercises,
    getCompletedExerciseIndices,
  };
}
