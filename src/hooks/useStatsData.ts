import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  weekEnd.setHours(0, 0, 0, 0);
  
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

export function useStatsData() {
  const { user } = useAuth();

  return useQuery<StatsData>({
    queryKey: ["stats_data", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const currentWeekBounds = getWeekBounds(0);
      const previousWeekBounds = getWeekBounds(1);

      // Fetch sessions from last 2 weeks
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", previousWeekBounds.start.toISOString())
        .lt("date", currentWeekBounds.end.toISOString())
        .order("date", { ascending: false });

      if (sessionsError) throw sessionsError;

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
        progressionPercent = 100; // First week with volume
      }

      // Fetch user goals
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      if (goalsError) throw goalsError;

      return {
        currentWeek,
        previousWeek,
        progressionPercent,
        goals: goals || [],
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
