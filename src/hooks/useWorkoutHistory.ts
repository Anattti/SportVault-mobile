import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Database } from "@/types/supabase";

// Types
export type WorkoutSessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
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

// Query key factory for consistent cache management
export const workoutHistoryKeys = {
  all: ["workout_history"] as const,
  list: (userId: string | undefined) => [...workoutHistoryKeys.all, userId] as const,
  detail: (sessionId: string) => [...workoutHistoryKeys.all, "detail", sessionId] as const,
};

// Data fetching function
async function fetchWorkoutHistory(userId: string): Promise<WorkoutSession[]> {
  // Fetch only from workout_sessions (primary table)
  const { data: sessionData, error: sessionError } = await supabase
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

  if (sessionError) {
    throw new Error(`Failed to fetch workout sessions: ${sessionError.message}`);
  }

  if (!sessionData) {
    return [];
  }

  return sessionData.map((session) => ({
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

// Utility functions
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k kg`;
  }
  return `${kg} kg`;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
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
