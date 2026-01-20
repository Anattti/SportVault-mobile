import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWorkoutTimerOptions {
  initialRestTime?: number;
  onRestComplete?: () => void;
}

export function useWorkoutTimer(options: UseWorkoutTimerOptions = {}) {
  const { initialRestTime = 120, onRestComplete } = options;
  
  const [totalRestTime, setTotalRestTime] = useState(initialRestTime);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTimer, setRestTimer] = useState(initialRestTime);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  
  const workoutIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Workout timer - always running
  useEffect(() => {
    workoutIntervalRef.current = setInterval(() => {
      setWorkoutTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
      }
    };
  }, []);

  const onRestCompleteRef = useRef(onRestComplete);

  useEffect(() => {
    onRestCompleteRef.current = onRestComplete;
  }, [onRestComplete]);

  // Rest timer - only when active
  useEffect(() => {
    if (isRestTimerActive) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsRestTimerActive(false);
            onRestCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
    };
  }, [isRestTimerActive]);

  const initRestTimer = useCallback((seconds: number) => {
    setTotalRestTime(seconds);
    setRestTimer(seconds);
  }, []);

  const startRestTimer = useCallback((seconds?: number) => {
    const timeToSet = seconds ?? initialRestTime;
    setTotalRestTime(timeToSet);
    setRestTimer(timeToSet);
    setIsRestTimerActive(true);
  }, [initialRestTime]);

  const adjustRestTimer = useCallback((seconds: number) => {
    setRestTimer(prev => {
      const newTime = Math.max(0, prev + seconds);
      // If we add time, we might want to extend the total time too if it exceeds it,
      // or just let the progress go back. Let's update total time if we exceed it
      // so the ring doesn't look weird (e.g. > 100%).
      setTotalRestTime(currentTotal => Math.max(currentTotal, newTime));
      return newTime;
    });
  }, []);

  const skipRestTimer = useCallback(() => {
    setRestTimer(0);
    setIsRestTimerActive(false);
  }, []);

  const toggleRestTimer = useCallback(() => {
    setIsRestTimerActive(prev => {
      const nextActive = !prev;
      if (nextActive) {
        setRestTimer(current => {
          if (current === 0) {
            setTotalRestTime(initialRestTime);
            return initialRestTime;
          }
          return current;
        });
      }
      return nextActive;
    });
  }, [initialRestTime]);

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
    setRestTimer,
    toggleRestTimer,
  };
}
