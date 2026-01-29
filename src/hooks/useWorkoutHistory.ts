import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Database, Json } from "@/types/supabase";

// Types
export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
export type WorkoutResultRow = Database["public"]["Tables"]["workout_results"]["Row"];
export type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];

export interface WorkoutSession {
  id: string;
  date: string | null;
  duration: number | null;
  total_volume: number | null;
  notes: string | null;
  user_id: string | null;
  workout_id: string | null;
  created_at: string | null;
  workoutName: string | null;
  workoutType: string | null;
  completionPercentage: number;
}

export type SessionExercise = Database["public"]["Tables"]["session_exercises"]["Row"] & {
  sets: Database["public"]["Tables"]["session_sets"]["Row"][];
};

export type FullWorkoutSession = {
  // We use the simpler interface for the session part to support both sources
  session: WorkoutSessionRow & { workouts: { program: string } | null };
  exercises: SessionExercise[];
};

// Query key factory for consistent cache management
export const workoutHistoryKeys = {
  all: ["workout_history"] as const,
  list: (userId: string | undefined) => [...workoutHistoryKeys.all, userId] as const,
  range: (userId: string | undefined, start: string, end: string) => [...workoutHistoryKeys.all, "range", userId, start, end] as const,
  detail: (sessionId: string) => [...workoutHistoryKeys.all, "detail", sessionId] as const,
  avgDuration: (workoutId: string) => [...workoutHistoryKeys.all, "avg_duration", workoutId] as const,
};

// Data fetching function
async function fetchWorkoutHistory(userId: string): Promise<WorkoutSession[]> {
  // Fetch from unified workout_sessions table
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id,
      date,
      duration,
      total_volume,
      notes,
      user_id,
      workout_id,
      created_at,
      workouts (
        program,
        workout_type
      )
    `)
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch workout sessions: ${error.message}`);
  }

  return (data || []).map((session) => ({
    id: session.id,
    date: session.date,
    duration: session.duration,
    total_volume: session.total_volume,
    notes: session.notes,
    user_id: session.user_id,
    workout_id: session.workout_id,
    created_at: session.created_at,
    workoutName: (session.workouts as any)?.program ?? null,
    workoutType: (session.workouts as any)?.workout_type ?? null,
    completionPercentage: 100,
  }));
}

// Hook
export function useWorkoutHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: workoutHistoryKeys.list(user?.id),
    queryFn: () => fetchWorkoutHistory(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - reduces unnecessary refetches while staying fresh
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const refresh = useCallback(() => {
    return query.refetch();
  }, [query.refetch]);

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: workoutHistoryKeys.all });
  }, [queryClient]);

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refresh,
    invalidateCache,
  };
}

/**
 * Hook to fetch a single session with exercises and sets
 */
export function useWorkoutSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: workoutHistoryKeys.detail(sessionId),
    queryFn: async (): Promise<FullWorkoutSession | null> => {
      // 1. Fetch from workout_sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from("workout_sessions")
        .select(`*, workouts (program)`)
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) return null;

      // 2. Fetch exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("session_exercises")
        .select("*")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true });

      if (exercisesError) throw exercisesError;

      // 3. Fetch sets
      let exercises: SessionExercise[] = [];
      if (exercisesData && exercisesData.length > 0) {
        const exerciseIds = exercisesData.map(ex => ex.id);
        const { data: setsData, error: setsError } = await supabase
          .from("session_sets")
          .select("*")
          .in("session_exercise_id", exerciseIds)
          .order("created_at", { ascending: true });

        if (setsError) throw setsError;

        exercises = exercisesData.map(ex => ({
          ...ex,
          sets: (setsData?.filter(s => s.session_exercise_id === ex.id) || []).sort((a, b) => {
            // Sort by set_index if available
            const idxA = (a as any).set_index ?? 0;
            const idxB = (b as any).set_index ?? 0;
            if (idxA !== idxB) return idxA - idxB;
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          })
        }));
      }

      return { session: sessionData as any, exercises };
    },
    enabled: !!sessionId,
  });
}

/**
 * Hook to fetch sessions within a specific date range (for stats)
 */
export function useWorkoutStats(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: workoutHistoryKeys.range(user?.id, startDate, endDate),
    queryFn: async (): Promise<WorkoutSession[]> => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          date,
          duration,
          total_volume,
          notes,
          user_id,
          workout_id,
          created_at,
          workouts (
            program,
            workout_type
          )
        `)
        .eq("user_id", user!.id)
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((session) => ({
        id: session.id,
        date: session.date,
        duration: session.duration,
        total_volume: session.total_volume,
        notes: session.notes,
        user_id: session.user_id,
        workout_id: session.workout_id,
        created_at: session.created_at,
        workoutName: (session.workouts as any)?.program ?? null,
        workoutType: (session.workouts as any)?.workout_type ?? null,
        completionPercentage: 100,
      }));
    },
    enabled: !!user?.id && !!startDate && !!endDate,
  });
}

/**
 * Hook to calculate average duration for a specific workout template
 */
export function useWorkoutAvgDuration(workoutId: string, baseDuration: number) {
  return useQuery({
    queryKey: workoutHistoryKeys.avgDuration(workoutId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("duration")
        .eq("workout_id", workoutId)
        .not('duration', 'is', null);

      if (error || !data || data.length === 0) return baseDuration;
      
      const total = data.reduce((sum, s) => sum + (s.duration || 0), 0);
      return Math.round(total / data.length);
    },
    enabled: !!workoutId,
  });
}

// Utility functions
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k kg`;
  }
  return `${kg} kg`;
}

export function formatDuration(totalSeconds: number, t?: (key: string) => string): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  
  const hUnit = t ? t('workouts.hours') : 'h';
  const mUnit = t ? t('workouts.minutes') : 'min';

  return h > 0 ? `${h}${hUnit} ${m}${mUnit}` : `${m}${mUnit}`;
}

export function formatDateShort(dateString: string, locale: string = 'fi-FI'): string {
  const date = new Date(dateString);
  if (locale === 'en-US' || locale.startsWith('en')) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export function getWorkoutEmoji(workoutType: string | null): string {
  const types: Record<string, string> = {
    legs: "🦵",
    arms: "💪",
    cardio: "🫀",
    core: "🎯",
    back: "🔙",
    chest: "⭐",
    shoulders: "🔄",
    full: "💯",
    booty: "🍑",
  };
  return workoutType ? types[workoutType] || "🏋️" : "🏋️";
}

export function getCompletionColor(percentage: number): {
  text: string;
  bgColor: string;
  borderColor: string;
} {
  if (percentage >= 90) {
    return {
      text: "#FFD700",
      bgColor: "rgba(255, 215, 0, 0.1)",
      borderColor: "rgba(255, 215, 0, 0.2)",
    };
  }
  if (percentage >= 70) {
    return {
      text: "#00FF41",
      bgColor: "rgba(0, 255, 65, 0.1)",
      borderColor: "rgba(0, 255, 65, 0.2)",
    };
  }
  if (percentage >= 50) {
    return {
      text: "#EAB308",
      bgColor: "rgba(234, 179, 8, 0.1)",
      borderColor: "rgba(234, 179, 8, 0.2)",
    };
  }
  return {
    text: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  };
}
