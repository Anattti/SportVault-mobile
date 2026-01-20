/**
 * Analytics Module Index
 * Re-exports all analytics utilities
 */

export {
  calculateSessionVolume,
  getWeeklyVolumeTrend,
  getMonthlyVolumeTrend,
  getVolumeByMuscleGroup,
  detectVolumeSpike,
  type WorkoutSessionWithSets,
  type VolumeTrendPoint,
  type MuscleGroupVolume,
} from './volumeCalculations';

export {
  calculateBrzycki,
  calculateEpley,
  calculateLander,
  calculateE1RM,
  findBestE1RM,
  generatePercentageTable,
  getExerciseE1RMTrend,
  type E1RMResult,
  type ExerciseE1RMTrend,
} from './e1rmCalculations';

export {
  detectPlateaus,
  checkOvertrainingRisk,
  type PlateauWarning,
} from './plateauDetection';
