-- Add warmup and cooldown columns to workout_sessions
ALTER TABLE public.workout_sessions
ADD COLUMN IF NOT EXISTS warmup jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS cooldown jsonb DEFAULT null;
