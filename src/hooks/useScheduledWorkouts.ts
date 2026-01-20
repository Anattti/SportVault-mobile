import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ScheduledWorkout,
  ScheduledWorkoutInsert,
  ScheduledWorkoutUpdate,
} from '@/types/calendar';

// Query keys
export const scheduledWorkoutKeys = {
  all: ['scheduled_workouts'] as const,
  list: (userId: string | undefined) => [...scheduledWorkoutKeys.all, userId] as const,
  range: (userId: string | undefined, startDate: string, endDate: string) =>
    [...scheduledWorkoutKeys.all, userId, startDate, endDate] as const,
};

// Fetch scheduled workouts for a date range
async function fetchScheduledWorkouts(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ScheduledWorkout[]> {
  const { data, error } = await supabase
    .from('scheduled_workouts')
    .select(`
      id,
      user_id,
      workout_id,
      scheduled_date,
      scheduled_time,
      status,
      notes,
      reminder_minutes,
      created_at,
      updated_at,
      workouts (
        id,
        program,
        workout_type
      )
    `)
    .eq('user_id', userId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  // Gracefully handle missing table (returns empty array instead of error)
  if (error) {
    // Table doesn't exist yet - return empty array
    if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
      console.warn('[Calendar] scheduled_workouts table not found - run migration first');
      return [];
    }
    throw new Error(`Failed to fetch scheduled workouts: ${error.message}`);
  }

  return (data || []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    workoutId: item.workout_id,
    scheduledDate: item.scheduled_date,
    scheduledTime: item.scheduled_time ?? undefined,
    status: item.status as 'pending' | 'completed' | 'skipped',
    notes: item.notes ?? undefined,
    reminderMinutes: item.reminder_minutes ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    workout: item.workouts ? {
      id: (item.workouts as any).id,
      program: (item.workouts as any).program,
      workoutType: (item.workouts as any).workout_type,
    } : undefined,
  }));
}

// Hook for fetching scheduled workouts
export function useScheduledWorkouts(startDate: string, endDate: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scheduledWorkoutKeys.range(user?.id, startDate, endDate),
    queryFn: () => fetchScheduledWorkouts(user!.id, startDate, endDate),
    enabled: !!user?.id && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scheduledWorkoutKeys.all });
  }, [queryClient]);

  return {
    scheduledWorkouts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidateCache,
  };
}

// Hook for scheduling a workout
export function useScheduleWorkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduledWorkoutInsert) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: result, error } = await supabase
        .from('scheduled_workouts')
        .insert({
          user_id: user.id,
          workout_id: data.workoutId,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          notes: data.notes,
          reminder_minutes: data.reminderMinutes,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to schedule workout: ${error.message}`);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledWorkoutKeys.all });
    },
  });
}

// Hook for updating a scheduled workout
export function useUpdateScheduledWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ScheduledWorkoutUpdate }) => {
      const { data, error } = await supabase
        .from('scheduled_workouts')
        .update({
          scheduled_date: updates.scheduledDate,
          scheduled_time: updates.scheduledTime,
          status: updates.status,
          notes: updates.notes,
          reminder_minutes: updates.reminderMinutes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update scheduled workout: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledWorkoutKeys.all });
    },
  });
}

// Hook for deleting a scheduled workout
export function useDeleteScheduledWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete scheduled workout: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledWorkoutKeys.all });
    },
  });
}
