import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseWorkoutTimerOptions {
  initialRestTime?: number;
  onRestComplete?: (msSinceCompletion?: number) => void;
  // External state for sync
  sessionStartTime?: number;
  restTimerTarget?: number | null;
  restTimerDuration?: number | null;
  onRestTimerChange?: (target: number | null, duration: number | null) => void;
}

export function useWorkoutTimer(options: UseWorkoutTimerOptions = {}) {
  const { 
    initialRestTime = 120, 
    onRestComplete,
    sessionStartTime,
    restTimerTarget,
    restTimerDuration,
    onRestTimerChange
  } = options;
  
  // Local state for UI updates
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(initialRestTime);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  
  // Refs for callbacks to avoid effect dependencies
  const onRestCompleteRef = useRef(onRestComplete);
  const onRestTimerChangeRef = useRef(onRestTimerChange);
  const restTimerTargetRef = useRef(restTimerTarget);

  useEffect(() => {
    onRestCompleteRef.current = onRestComplete;
  }, [onRestComplete]);

  useEffect(() => {
    onRestTimerChangeRef.current = onRestTimerChange;
  }, [onRestTimerChange]);

  // Sync with external props
  useEffect(() => {
    restTimerTargetRef.current = restTimerTarget;
    if (restTimerTarget && restTimerTarget > Date.now()) {
      setIsRestTimerActive(true);
      if (restTimerDuration) setTotalRestTime(restTimerDuration);
      updateTimers(); // Immediate update
    } else if (restTimerTarget && restTimerTarget <= Date.now()) {
      // Timer finished while we were looking away or mounting
      setIsRestTimerActive(false);
      setRestTimer(0);
    } else {
      setIsRestTimerActive(false);
      setRestTimer(0);
    }
  }, [restTimerTarget, restTimerDuration]);

  const updateTimers = useCallback(() => {
    const now = Date.now();

    // Update workout time
    if (sessionStartTime) {
      setWorkoutTime(Math.floor((now - sessionStartTime) / 1000));
    }

    // Update rest timer
    if (restTimerTargetRef.current) {
      const remaining = Math.max(0, Math.ceil((restTimerTargetRef.current - now) / 1000));
      setRestTimer(remaining);

      if (remaining <= 0 && isRestTimerActive) {
        setIsRestTimerActive(false);
        // Important: Notify parent to clear the target
        if (onRestTimerChangeRef.current) {
           onRestTimerChangeRef.current(null, null);
        }
        if (onRestCompleteRef.current) {
          const msSinceCompletion = now - restTimerTargetRef.current;
          onRestCompleteRef.current(msSinceCompletion);
        }
      }
    }
  }, [sessionStartTime, isRestTimerActive]);

  // Main Interval
  useEffect(() => {
    // Initial update
    updateTimers();

    const interval = setInterval(updateTimers, 1000);

    // AppState listener for immediate updates when returning from background
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateTimers();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateTimers]);


  const initRestTimer = useCallback((seconds: number) => {
    setTotalRestTime(seconds);
    setRestTimer(seconds);
    // Note: init doesn't start it, just sets suggestion? 
    // Based on previous code: "initRestTimer" set total and current.
    // Ensure we don't accidentally start it in the persistent model if 'init' just means 'prepare'.
    // If init means "prepare but don't run", we shouldn't set a target yet.
  }, []);

  const startRestTimer = useCallback((seconds?: number) => {
    const duration = seconds ?? initialRestTime;
    const target = Date.now() + duration * 1000;
    
    setTotalRestTime(duration);
    setRestTimer(duration);
    setIsRestTimerActive(true);
    
    // Notify parent to save state
    if (onRestTimerChangeRef.current) {
      onRestTimerChangeRef.current(target, duration);
    }
  }, [initialRestTime]);

  const adjustRestTimer = useCallback((seconds: number) => {
    if (!restTimerTargetRef.current) return;

    // Adjust target
    const newTarget = restTimerTargetRef.current + (seconds * 1000);
    // Be careful not to go back in time? Or allow it? 
    // Usually +30s or -30s.
    
    // Also update duration if we extend beyond original?
    // Let's keep it simple: expand total time if we exceed it, similar to before.
    setTotalRestTime(prev => {
        const remaining = Math.ceil((newTarget - Date.now()) / 1000);
        return Math.max(prev, remaining);
    });

    if (onRestTimerChangeRef.current) {
      // Retrieve current duration from state or ref? 
      // We can just pass the current totalRestTime as approximation or update it.
       onRestTimerChangeRef.current(newTarget, totalRestTime); // Might be slightly off if total didn't update yet
    }
  }, [totalRestTime]);

  const skipRestTimer = useCallback(() => {
    setRestTimer(0);
    setIsRestTimerActive(false);
    if (onRestTimerChangeRef.current) {
      onRestTimerChangeRef.current(null, null);
    }
  }, []);

  const toggleRestTimer = useCallback(() => {
    if (isRestTimerActive) {
      // Pause? Or Stop? Previous implementation:
      // "setRestTimer(0); setIsRestTimerActive(false);" -> It stopped it.
      // And then "if (nextActive) setRestTimer(initial)" -> Started fresh.
      // So toggle was effectively "Stop" / "Start new".
      skipRestTimer();
    } else {
      startRestTimer(initialRestTime);
    }
  }, [isRestTimerActive, initialRestTime, skipRestTimer, startRestTimer]);

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    workoutTime,
    formattedWorkoutTime: formatTime(workoutTime),
    restTimer,
    totalRestTime,
    formattedRestTime: formatTime(restTimer),
    isRestTimerActive,
    initRestTimer,
    startRestTimer,
    adjustRestTimer,
    skipRestTimer,
    setRestTimer, // Careful with this one in new model
    toggleRestTimer,
  };
}
