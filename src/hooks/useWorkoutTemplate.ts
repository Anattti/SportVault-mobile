import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/supabase";

type ExerciseWithSets = Database["public"]["Tables"]["exercises"]["Row"] & {
  exercise_sets: Database["public"]["Tables"]["exercise_sets"]["Row"][];
};

export type WorkoutTemplate = Database["public"]["Tables"]["workouts"]["Row"] & {
  exercises: ExerciseWithSets[];
};

export const workoutTemplateKeys = {
  all: ["workout_template"] as const,
  detail: (id: string) => [...workoutTemplateKeys.all, id] as const,
};

export function useWorkoutTemplate(id: string | undefined) {
  return useQuery({
    queryKey: workoutTemplateKeys.detail(id || ""),
    queryFn: async (): Promise<WorkoutTemplate | null> => {
      if (!id) return null;

      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (workoutError) throw workoutError;

      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select(`*, exercise_sets (*)`)
        .eq("workout_id", id)
        .order("order_index", { ascending: true });

      if (exerciseError) throw exerciseError;

      // Sort sets inside exercises (supabase can't easily order nested relations in one go usually)
      const exercises = (exerciseData as ExerciseWithSets[]).map(ex => ({
          ...ex,
          exercise_sets: ex.exercise_sets.sort((a, b) => {
              // Assuming created_at or id based sort if no order_index for sets? 
              // Schema usually has set order. Let's assume creation time or standard DB order for now.
              // If there is an order field, use it. `exercise_sets` usually implies ordered by creation/id.
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          })
      }));

      return {
        ...workoutData,
        exercises: exercises,
      };
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes (Templates don't change often)
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
  });
}
