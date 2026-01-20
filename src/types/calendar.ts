import { WorkoutExercise } from './index';

// Scheduled Workout Types
export interface ScheduledWorkout {
  id: string;
  userId: string;
  workoutId: string;
  scheduledDate: string; // ISO date string (YYYY-MM-DD)
  scheduledTime?: string; // HH:MM format
  status: 'pending' | 'completed' | 'skipped';
  notes?: string;
  reminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
  // Joined data from workouts table
  workout?: {
    id: string;
    program: string;
    workoutType: string;
  };
}

export interface ScheduledWorkoutInsert {
  workoutId: string;
  scheduledDate: string;
  scheduledTime?: string;
  notes?: string;
  reminderMinutes?: number;
}

export interface ScheduledWorkoutUpdate {
  scheduledDate?: string;
  scheduledTime?: string;
  status?: 'pending' | 'completed' | 'skipped';
  notes?: string;
  reminderMinutes?: number;
}

// Completed Session Type (for displaying in calendar)
export interface CompletedSession {
  id: string;
  workoutName: string;
  workoutType: string | null;
  duration: number | null;
  completedAt: string;
}

// Calendar Types
export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  scheduledWorkouts: ScheduledWorkout[];
  completedSessionsCount: number;
  completedSessions: CompletedSession[];
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  days: CalendarDay[];
}

// Helper type for workout with schedule info
export interface WorkoutWithSchedule {
  id: string;
  program: string;
  workoutType: string;
  displayOrder: number;
  isScheduled: boolean;
  nextScheduledDate?: string;
}
