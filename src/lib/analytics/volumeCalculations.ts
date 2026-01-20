/**
 * Volume Calculations
 * Track training volume over time (weekly, monthly, per muscle group)
 */

export interface WorkoutSessionWithSets {
  id: string;
  date: string;
  duration: number;
  total_volume: number;
  exercises: {
    name: string;
    category: string | null;
    sets: {
      weight_used: number;
      reps_completed: number;
    }[];
  }[];
}

export interface VolumeTrendPoint {
  date: string;
  label: string;
  volume: number;
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  volume: number;
  sessionCount: number;
}

/**
 * Calculate volume for a single session
 */
export function calculateSessionVolume(
  sets: { weight_used: number; reps_completed: number }[]
): number {
  return sets.reduce((sum, set) => sum + (set.weight_used * set.reps_completed), 0);
}

/**
 * Get weekly volume trend for the last N weeks
 */
export function getWeeklyVolumeTrend(
  sessions: WorkoutSessionWithSets[],
  weeks: number = 8
): VolumeTrendPoint[] {
  const now = new Date();
  const trend: VolumeTrendPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= weekStart && sessionDate < weekEnd;
    });

    const weekVolume = weekSessions.reduce((sum, s) => sum + (s.total_volume || 0), 0);

    // Format week label (e.g., "Vko 3")
    const weekNumber = getWeekNumber(weekStart);

    trend.push({
      date: weekStart.toISOString(),
      label: `Vko ${weekNumber}`,
      volume: weekVolume,
    });
  }

  return trend;
}

/**
 * Get monthly volume trend for the last N months
 */
export function getMonthlyVolumeTrend(
  sessions: WorkoutSessionWithSets[],
  months: number = 6
): VolumeTrendPoint[] {
  const now = new Date();
  const trend: VolumeTrendPoint[] = [];

  const monthNames = ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä', 
                      'Heinä', 'Elo', 'Syys', 'Loka', 'Marras', 'Joulu'];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const monthSessions = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= monthStart && sessionDate < monthEnd;
    });

    const monthVolume = monthSessions.reduce((sum, s) => sum + (s.total_volume || 0), 0);

    trend.push({
      date: monthStart.toISOString(),
      label: monthNames[monthDate.getMonth()],
      volume: monthVolume,
    });
  }

  return trend;
}

/**
 * Get volume by muscle group / exercise category
 */
export function getVolumeByMuscleGroup(
  sessions: WorkoutSessionWithSets[]
): MuscleGroupVolume[] {
  const volumeMap = new Map<string, { volume: number; sessions: Set<string> }>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const category = exercise.category || 'Muu';
      const exerciseVolume = calculateSessionVolume(exercise.sets);

      const current = volumeMap.get(category) || { volume: 0, sessions: new Set() };
      current.volume += exerciseVolume;
      current.sessions.add(session.id);
      volumeMap.set(category, current);
    }
  }

  return Array.from(volumeMap.entries())
    .map(([muscleGroup, data]) => ({
      muscleGroup,
      volume: data.volume,
      sessionCount: data.sessions.size,
    }))
    .sort((a, b) => b.volume - a.volume);
}

/**
 * Detect volume spike (>20% increase from baseline)
 */
export function detectVolumeSpike(
  sessions: WorkoutSessionWithSets[],
  thresholdPercent: number = 20
): { hasSpike: boolean; currentWeekVolume: number; baselineAverage: number; percentChange: number } {
  if (sessions.length < 4) {
    return { hasSpike: false, currentWeekVolume: 0, baselineAverage: 0, percentChange: 0 };
  }

  const weeklyVolumes = getWeeklyVolumeTrend(sessions, 4);
  
  if (weeklyVolumes.length < 4) {
    return { hasSpike: false, currentWeekVolume: 0, baselineAverage: 0, percentChange: 0 };
  }

  const currentWeekVolume = weeklyVolumes[weeklyVolumes.length - 1].volume;
  const previousWeeks = weeklyVolumes.slice(0, -1);
  const baselineAverage = previousWeeks.reduce((sum, w) => sum + w.volume, 0) / previousWeeks.length;

  if (baselineAverage === 0) {
    return { hasSpike: false, currentWeekVolume, baselineAverage: 0, percentChange: 0 };
  }

  const percentChange = ((currentWeekVolume - baselineAverage) / baselineAverage) * 100;

  return {
    hasSpike: percentChange > thresholdPercent,
    currentWeekVolume,
    baselineAverage,
    percentChange,
  };
}

/**
 * Helper: Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
