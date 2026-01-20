/**
 * Plateau Detection
 * Identifies exercises where progress has stalled
 */

import { findBestE1RM } from './e1rmCalculations';

export interface PlateauWarning {
  exerciseName: string;
  metric: 'weight' | 'reps' | 'e1rm';
  stagnantWeeks: number;
  lastProgression: Date | null;
  currentValue: number;
  previousBest: number;
  suggestion: string;
}

interface ExerciseHistory {
  exerciseName: string;
  sessions: {
    date: string;
    sets: { weight_used: number; reps_completed: number }[];
  }[];
}

/**
 * Detect plateaus across all exercises
 * A plateau is defined as no improvement in e1RM for 3+ weeks
 */
export function detectPlateaus(
  exerciseHistories: ExerciseHistory[],
  minWeeksStagnant: number = 3
): PlateauWarning[] {
  const warnings: PlateauWarning[] = [];
  const now = new Date();

  for (const { exerciseName, sessions } of exerciseHistories) {
    if (sessions.length < 4) continue; // Need enough data

    // Sort by date
    const sorted = [...sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate e1RM for each session
    const e1rms: { date: Date; e1rm: number }[] = [];
    for (const session of sorted) {
      const best = findBestE1RM(session.sets);
      if (best) {
        e1rms.push({
          date: new Date(session.date),
          e1rm: best.average,
        });
      }
    }

    if (e1rms.length < 4) continue;

    // Find when the PR was set
    let prE1RM = 0;
    let prDate: Date | null = null;

    for (const entry of e1rms) {
      if (entry.e1rm > prE1RM) {
        prE1RM = entry.e1rm;
        prDate = entry.date;
      }
    }

    if (!prDate) continue;

    // Calculate weeks since PR
    const weeksSincePR = Math.floor(
      (now.getTime() - prDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Check if current performance is below PR for extended period
    const recentE1RM = e1rms[e1rms.length - 1].e1rm;
    const isStagnant = recentE1RM < prE1RM * 1.01; // Allow 1% tolerance

    if (isStagnant && weeksSincePR >= minWeeksStagnant) {
      warnings.push({
        exerciseName,
        metric: 'e1rm',
        stagnantWeeks: weeksSincePR,
        lastProgression: prDate,
        currentValue: recentE1RM,
        previousBest: prE1RM,
        suggestion: getSuggestion(weeksSincePR, exerciseName),
      });
    }
  }

  // Sort by stagnation duration (worst first)
  return warnings.sort((a, b) => b.stagnantWeeks - a.stagnantWeeks);
}

/**
 * Get training suggestion based on plateau duration
 */
function getSuggestion(weeks: number, exerciseName: string): string {
  if (weeks >= 6) {
    return `Kokeile periodisointia tai deload-viikkoa. ${exerciseName} on ollut paikallaan ${weeks} viikkoa.`;
  } else if (weeks >= 4) {
    return `Vaihda rep range tai lisää intensiivisyyttä (RPE). Kokeile esim. pause-toistoja.`;
  } else {
    return `Lisää 1-2 apuliikettä ${exerciseName}-liikkeelle tai tarkista palautumisesi.`;
  }
}

/**
 * Check if user might be overtraining based on volume and frequency
 */
export function checkOvertrainingRisk(
  weeklySessionCounts: number[],
  weeklyVolumes: number[]
): { atRisk: boolean; reason: string } {
  if (weeklySessionCounts.length < 3 || weeklyVolumes.length < 3) {
    return { atRisk: false, reason: '' };
  }

  // Check for volume spike >30% for 2+ consecutive weeks
  const recentVolumes = weeklyVolumes.slice(-3);
  const baseline = recentVolumes[0];
  
  let consecutiveHighWeeks = 0;
  for (let i = 1; i < recentVolumes.length; i++) {
    const increase = ((recentVolumes[i] - baseline) / baseline) * 100;
    if (increase > 30) {
      consecutiveHighWeeks++;
    }
  }

  if (consecutiveHighWeeks >= 2) {
    return {
      atRisk: true,
      reason: 'Volyymi on kasvanut yli 30% kahtena peräkkäisenä viikkona. Harkitse deload-viikkoa.',
    };
  }

  // Check for high frequency (>6 sessions per week for 2+ weeks)
  const recentSessions = weeklySessionCounts.slice(-2);
  if (recentSessions.every(count => count > 6)) {
    return {
      atRisk: true,
      reason: 'Treenifrekvenssi on korkea (>6 treeniä/viikko). Varmista riittävä palautuminen.',
    };
  }

  return { atRisk: false, reason: '' };
}
