import { useMemo } from "react";
import { useWorkoutStats } from "./useWorkoutHistory";
import { useAuth } from "@/context/AuthContext";
import { Database } from "@/types/supabase";

type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
type Goal = Database["public"]["Tables"]["goals"]["Row"];

interface WeeklyStats {
  sessionCount: number;
  totalDuration: number; // in seconds
  totalVolume: number; // in kg
}

interface StatsData {
  currentWeek: WeeklyStats;
  previousWeek: WeeklyStats;
  progressionPercent: number;
  goals: Goal[];
  isLoading: boolean;
  isError: boolean;
}

function getWeekBounds(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diffToMonday - (weeksAgo * 7));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999); // Inclusion of full Sunday
  
  return { start: weekStart, end: weekEnd };
}

function calculateWeeklyStats(sessions: WorkoutSession[]): WeeklyStats {
  return sessions.reduce(
    (acc, session) => ({
      sessionCount: acc.sessionCount + 1,
      totalDuration: acc.totalDuration + (session.duration || 0),
      totalVolume: acc.totalVolume + (session.total_volume || 0),
    }),
    { sessionCount: 0, totalDuration: 0, totalVolume: 0 }
  );
}

export function useStatsData(): StatsData {
  const { user } = useAuth();
  
  const currentWeekBounds = useMemo(() => getWeekBounds(0), []);
  const previousWeekBounds = useMemo(() => getWeekBounds(1), []);

  // Use the centralized hook for data fetching
  const { data: sessions, isLoading: sessionsLoading, isError: sessionsError } = useWorkoutStats(
    previousWeekBounds.start.toISOString(),
    currentWeekBounds.end.toISOString()
  );

  // Fetch goals (remains local as it's specific to stats/dashboard)
  const { data: goals, isLoading: goalsLoading, isError: goalsError } = useQuery({
    queryKey: ["goals_data", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    if (!sessions) return null;

    // Split sessions by week
    const currentWeekSessions = (sessions || []).filter((s) => {
      const sessionDate = new Date(s.date || s.created_at || "");
      return sessionDate >= currentWeekBounds.start && sessionDate < currentWeekBounds.end;
    });

    const previousWeekSessions = (sessions || []).filter((s) => {
      const sessionDate = new Date(s.date || s.created_at || "");
      return sessionDate >= previousWeekBounds.start && sessionDate < previousWeekBounds.end;
    });

    const currentWeek = calculateWeeklyStats(currentWeekSessions);
    const previousWeek = calculateWeeklyStats(previousWeekSessions);

    // Calculate progression (volume comparison)
    let progressionPercent = 0;
    if (previousWeek.totalVolume > 0) {
      progressionPercent = ((currentWeek.totalVolume - previousWeek.totalVolume) / previousWeek.totalVolume) * 100;
    } else if (currentWeek.totalVolume > 0) {
      progressionPercent = 100;
    }

    return { currentWeek, previousWeek, progressionPercent };
  }, [sessions, currentWeekBounds, previousWeekBounds]);

  return {
    currentWeek: stats?.currentWeek || { sessionCount: 0, totalDuration: 0, totalVolume: 0 },
    previousWeek: stats?.previousWeek || { sessionCount: 0, totalDuration: 0, totalVolume: 0 },
    progressionPercent: stats?.progressionPercent || 0,
    goals: goals || [],
    isLoading: sessionsLoading || goalsLoading,
    isError: sessionsError || goalsError,
  };
}

import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
