-- Migration: Add order_index to exercises table
-- Description: Adds an order_index column to the exercises table to support manual ordering of exercises within a workout.

ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Optional: Update existing rows to have a default order based on created_at
WITH ordered_exercises AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workout_id ORDER BY created_at) - 1 as new_order
  FROM public.exercises
)
UPDATE public.exercises
SET order_index = ordered_exercises.new_order
FROM ordered_exercises
WHERE public.exercises.id = ordered_exercises.id;
