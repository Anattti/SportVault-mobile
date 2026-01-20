// Workout Session Types

export interface WorkoutExercise {
  id: string;
  name: string;
  category: string | null;
  supersetGroup: number | null;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  restTime: number;
  rpe: number | null;
  isBodyweight: boolean;
  targetType: string | null;
}

export interface SetResult {
  weight: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
  notes?: string;
  originalWeight?: number;
  originalReps?: number;
}

export interface ActiveSession {
  workoutId: string;
  workoutName: string;
  startTime: number;
  currentExerciseIndex: number;
  currentSetIndex: number;
  setResults: SetResult[][];
  exercises: WorkoutExercise[];
}
