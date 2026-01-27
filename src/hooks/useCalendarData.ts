import { useMemo } from 'react';
import { CalendarDay, CalendarMonth, ScheduledWorkout, CompletedSession } from '@/types/calendar';
import { useScheduledWorkouts } from './useScheduledWorkouts';
import { useWorkoutHistory, WorkoutSession, useWorkoutStats } from './useWorkoutHistory';

// Helper functions
function getMonthStartEnd(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
  };
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Generate calendar grid for a month (including padding days)
// OPTIMIZED: Pre-index sessions and scheduled workouts by date for O(1) lookups
function generateCalendarDays(
  year: number,
  month: number,
  scheduledWorkouts: ScheduledWorkout[],
  completedSessions: WorkoutSession[]
): CalendarDay[] {
  const today = new Date();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // PRE-INDEX: Build lookup maps for O(1) access instead of O(n) filter per day
  const sessionsByDate = new Map<string, WorkoutSession[]>();
  for (const session of completedSessions) {
    if (session.date) {
      // Create date object from UTC string to get local time representation
      const dateObj = new Date(session.date);
      const dateKey = toLocalDateString(dateObj); 
      const existing = sessionsByDate.get(dateKey) || [];
      existing.push(session);
      sessionsByDate.set(dateKey, existing);
    }
  }
  
  const scheduledByDate = new Map<string, ScheduledWorkout[]>();
  for (const scheduled of scheduledWorkouts) {
    // Scheduled workouts typically store literal date string "YYYY-MM-DD"
    // So we can use it directly OR ensure consistency if it's full ISO
    // Assuming scheduledDate is "YYYY-MM-DD":
    const dateKey = scheduled.scheduledDate.split('T')[0]; 
    const existing = scheduledByDate.get(dateKey) || [];
    existing.push(scheduled);
    scheduledByDate.set(dateKey, existing);
  }
  
  // Helper to create day data with O(1) lookups
  const createDayData = (date: Date, isCurrentMonth: boolean): CalendarDay => {
    const dateString = toLocalDateString(date);
    const daySessions = sessionsByDate.get(dateString) || [];
    const dayScheduled = scheduledByDate.get(dateString) || [];
    
    return {
      date,
      dateString,
      isCurrentMonth,
      isToday: isSameDay(date, today),
      scheduledWorkouts: dayScheduled,
      completedSessionsCount: daySessions.length,
      completedSessions: daySessions.map(s => ({
        id: s.id,
        workoutName: s.workoutName || 'Treeni',
        workoutType: s.workoutType,
        duration: s.duration,
        completedAt: s.date || dateString,
      })),
    };
  };
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, ...)
  // Adjust to start week on Monday (0 = Monday, 6 = Sunday)
  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  const days: CalendarDay[] = [];
  
  // Add previous month's trailing days
  for (let i = startDay - 1; i >= 0; i--) {
    days.push(createDayData(new Date(year, month, -i), false));
  }
  
  // Add current month's days
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    days.push(createDayData(new Date(year, month, day), true));
  }
  
  // Add next month's leading days to complete the grid (6 rows * 7 days = 42)
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(createDayData(new Date(year, month + 1, i), false));
  }
  
  return days;
}

// Main hook for calendar data
export function useCalendarData(year: number, month: number) {
  const { startDate, endDate } = useMemo(
    () => getMonthStartEnd(year, month),
    [year, month]
  );

  const {
    scheduledWorkouts,
    isLoading: isLoadingScheduled,
    error: scheduledError,
  } = useScheduledWorkouts(startDate, endDate);

  const {
    data: monthSessions,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useWorkoutStats(startDate, endDate);

  const calendarDays = useMemo(() => {
    return generateCalendarDays(year, month, scheduledWorkouts, monthSessions || []);
  }, [year, month, scheduledWorkouts, monthSessions]);

  const calendarMonth: CalendarMonth = useMemo(() => ({
    year,
    month,
    days: calendarDays,
  }), [year, month, calendarDays]);

  return {
    calendarMonth,
    scheduledWorkouts,
    completedSessions: monthSessions || [],
    isLoading: isLoadingScheduled || isLoadingHistory,
    error: scheduledError || historyError,
  };
}

// Get month name in Finnish
export function getMonthName(month: number): string {
  const months = [
    'Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu',
    'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu',
    'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'
  ];
  return months[month];
}

// Get weekday names in Finnish
export function getWeekdayNames(): string[] {
  return ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
}
