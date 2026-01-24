-- Migration: Fix Foreign Key Constraints for Deletion
-- Description: Changes foreign key constraints to ON DELETE SET NULL to allow deleting workouts/exercises without losing session history.

-- 1. Modify session_exercises (links to exercises)
ALTER TABLE public.session_exercises
DROP CONSTRAINT IF EXISTS session_exercises_exercise_id_fkey,
ADD CONSTRAINT session_exercises_exercise_id_fkey
    FOREIGN KEY (exercise_id)
    REFERENCES public.exercises(id)
    ON DELETE SET NULL;

-- 2. Modify workout_sessions (links to workouts)
ALTER TABLE public.workout_sessions
DROP CONSTRAINT IF EXISTS workout_sessions_workout_id_fkey,
ADD CONSTRAINT workout_sessions_workout_id_fkey
    FOREIGN KEY (workout_id)
    REFERENCES public.workouts(id)
    ON DELETE SET NULL;

-- 3. Modify workout_results (legacy, links to workouts)
ALTER TABLE public.workout_results
DROP CONSTRAINT IF EXISTS workout_results_workout_id_fkey,
ADD CONSTRAINT workout_results_workout_id_fkey
    FOREIGN KEY (workout_id)
    REFERENCES public.workouts(id)
    ON DELETE SET NULL;
