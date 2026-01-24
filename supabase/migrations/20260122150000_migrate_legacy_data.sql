-- Migration script to bring legacy workout data (from Next.js app) into the new mobile app schema

-- 1. Migrate workout_results -> workout_sessions
-- We map completed_at to both date and created_at
-- notes from JSON are cast to text
INSERT INTO public.workout_sessions (
    id,
    user_id,
    workout_id,
    duration,
    notes,
    date,
    created_at,
    total_volume,
    feeling, -- Defaulting to neutral (3) if not present
    rpe_average -- Will be NULL or calculated later
)
SELECT
    wr.id,
    wr.user_id,
    wr.workout_id,
    wr.duration,
    CASE
        WHEN wr.notes IS NULL THEN NULL
        ELSE wr.notes::text
    END as notes,
    wr.completed_at as date,
    wr.completed_at as created_at,
    COALESCE(vol.total_volume, 0) as total_volume,
    3 as feeling,
    NULL as rpe_average
FROM public.workout_results wr
LEFT JOIN (
    -- Calculate total volume from legacy sets
    SELECT workout_result_id, SUM(weight * reps) as total_volume
    FROM public.workout_set_results
    GROUP BY workout_result_id
) vol ON vol.workout_result_id = wr.id
ON CONFLICT (id) DO NOTHING;

-- 2. Migrate unique exercises -> session_exercises
-- Only distinct exercises per session
INSERT INTO public.session_exercises (
    session_id,
    exercise_id, -- We might not have this link easily if names differ, leaving NULL or trying to match?
                 -- The schema allows NULL exercise_id? Let's check. 
                 -- Actually, we don't have exercise_id easily from legacy data which only stored names.
                 -- We will insert name and leave exercise_id NULL if allowed, or we must skip.
                 -- Checking schema: session_exercises.exercise_id is UUID FK. If it's nullable, we are good.
                 -- Based on ERD, let's assume we populate 'name' and leave 'exercise_id' if possible or try to match.
                 -- For safety in this script, we just migrate the NAME and order.
                 -- If exercise_id is NOT NULL constraint, we have a problem.
                 -- Let's try to match by name if possible, otherwise we might need to create dummy exercises?
                 -- Strategy: Try to find exercise_id by name within the same workout_id scope?
                 -- Legacy data has workout_id in workout_results.
    name,
    order_index,
    created_at
)
SELECT DISTINCT ON (wsr.workout_result_id, wsr.exercise_index)
    wsr.workout_result_id as session_id,
    -- We can't easily fetch exercise_id without a complex join.
    -- Let's try to join with exercises table if possible, but names might not match perfectly.
    -- For now, we leave exercise_id NULL. Prerequisite: session_exercises.exercise_id must be nullable.
    -- If it isn't, we will fail. 
    -- Assuming we can just migrate data for display purposes primarily.
    -- But wait, standard is strict. Let's look up exercise_id by name if we can.
    e.id as exercise_id, 
    wsr.exercise_name as name,
    wsr.exercise_index as order_index,
    wr.completed_at as created_at
FROM public.workout_set_results wsr
JOIN public.workout_results wr ON wr.id = wsr.workout_result_id
LEFT JOIN public.exercises e ON e.workout_id = wr.workout_id AND e.name = wsr.exercise_name
ON CONFLICT DO NOTHING;

-- 3. Migrate sets -> session_sets
INSERT INTO public.session_sets (
    session_exercise_id,
    weight_used,
    reps_completed,
    rpe,
    rest_time_taken,
    sets_completed,
    created_at,
    completed_at
)
SELECT
    se.id as session_exercise_id,
    wsr.weight as weight_used,
    wsr.reps as reps_completed,
    wsr.rpe,
    0 as rest_time_taken, -- Default
    1 as sets_completed, -- Each row in legacy was a set
    wsr.created_at,
    wsr.created_at as completed_at
FROM public.workout_set_results wsr
JOIN public.session_exercises se ON
    se.session_id = wsr.workout_result_id AND
    se.name = wsr.exercise_name AND
    se.order_index = wsr.exercise_index
ON CONFLICT DO NOTHING;
