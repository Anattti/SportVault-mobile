import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { findBestE1RM } from "@/lib/analytics/e1rmCalculations";

export function useExerciseBestE1RM(exerciseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercise_best_1rm', exerciseId, user?.id],
    queryFn: async () => {
      if (!exerciseId || !user) return null;

      // 1. Fetch all session exercises for this exercise ID
      const { data: sessionExercises, error: exError } = await supabase
        .from("session_exercises")
        .select("id")
        .eq("exercise_id", exerciseId);

      if (exError) throw exError;
      if (!sessionExercises || sessionExercises.length === 0) return 0;

      const sessionExerciseIds = sessionExercises.map(ex => ex.id);

      // 2. Fetch all sets for these session exercises
      const { data: sets, error: setsError } = await supabase
        .from("session_sets")
        .select("weight_used, reps_completed")
        .in("session_exercise_id", sessionExerciseIds);

      if (setsError) throw setsError;
      if (!sets || sets.length === 0) return 0;

      // 3. Calculate best estimated 1RM
      const validatedSets = sets.map(s => ({
        weight_used: s.weight_used || 0,
        reps_completed: s.reps_completed || 0
      }));

      const best = findBestE1RM(validatedSets);
      return best ? best.average : 0;
    },
    enabled: !!exerciseId && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
