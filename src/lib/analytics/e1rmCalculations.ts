/**
 * e1RM Calculations
 * Estimate one-rep max using various formulas
 */

export interface E1RMResult {
  weight: number;
  reps: number;
  brzycki: number;
  epley: number;
  lander: number;
  average: number;
}

export interface ExerciseE1RMTrend {
  exerciseName: string;
  data: {
    date: string;
    e1rm: number;
  }[];
  currentE1RM: number;
  bestE1RM: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Brzycki formula: 1RM = weight × (36 / (37 - reps))
 * Most accurate for reps 1-10
 */
export function calculateBrzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps >= 37) return weight; // Edge case
  return Math.round(weight * (36 / (37 - reps)));
}

/**
 * Epley formula: 1RM = weight × (1 + reps / 30)
 * Simple and widely used
 */
export function calculateEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Lander formula: 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
 * Good for moderate rep ranges
 */
export function calculateLander(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  const divisor = 101.3 - 2.67123 * reps;
  if (divisor <= 0) return weight;
  return Math.round((100 * weight) / divisor);
}

/**
 * Calculate e1RM using all formulas
 */
export function calculateE1RM(weight: number, reps: number): E1RMResult {
  const brzycki = calculateBrzycki(weight, reps);
  const epley = calculateEpley(weight, reps);
  const lander = calculateLander(weight, reps);
  const average = Math.round((brzycki + epley + lander) / 3);

  return {
    weight,
    reps,
    brzycki,
    epley,
    lander,
    average,
  };
}

/**
 * Find the best e1RM from a set of sets (highest calculated 1RM)
 */
export function findBestE1RM(
  sets: { weight_used: number; reps_completed: number }[]
): E1RMResult | null {
  if (sets.length === 0) return null;

  let best: E1RMResult | null = null;

  for (const set of sets) {
    if (set.weight_used > 0 && set.reps_completed > 0) {
      const result = calculateE1RM(set.weight_used, set.reps_completed);
      if (!best || result.average > best.average) {
        best = result;
      }
    }
  }

  return best;
}

/**
 * Generate percentage table based on e1RM
 */
export function generatePercentageTable(e1rm: number): { percent: number; weight: number; reps: string }[] {
  const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  const repRanges: Record<number, string> = {
    100: '1',
    95: '2-3',
    90: '3-4',
    85: '5-6',
    80: '6-8',
    75: '8-10',
    70: '10-12',
    65: '12-15',
    60: '15-20',
    55: '20+',
    50: '25+',
  };

  return percentages.map(percent => ({
    percent,
    weight: Math.round((e1rm * percent) / 100),
    reps: repRanges[percent] || '-',
  }));
}

interface SessionExerciseData {
  date: string;
  sets: { weight_used: number; reps_completed: number }[];
}

/**
 * Get e1RM progression trend for a specific exercise
 */
export function getExerciseE1RMTrend(
  exerciseName: string,
  sessionsWithExercise: SessionExerciseData[]
): ExerciseE1RMTrend {
  const data: { date: string; e1rm: number }[] = [];
  let bestE1RM = 0;

  // Sort by date
  const sorted = [...sessionsWithExercise].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const session of sorted) {
    const best = findBestE1RM(session.sets);
    if (best) {
      data.push({
        date: session.date,
        e1rm: best.average,
      });
      if (best.average > bestE1RM) {
        bestE1RM = best.average;
      }
    }
  }

  // Determine trend (compare last 3 sessions)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (data.length >= 3) {
    const recent = data.slice(-3);
    const oldest = recent[0].e1rm;
    const newest = recent[recent.length - 1].e1rm;
    const change = ((newest - oldest) / oldest) * 100;

    if (change > 2) trend = 'up';
    else if (change < -2) trend = 'down';
  }

  return {
    exerciseName,
    data,
    currentE1RM: data.length > 0 ? data[data.length - 1].e1rm : 0,
    bestE1RM,
    trend,
  };
}
