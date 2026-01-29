-- Migration: Add set_index to ensure deterministic ordering of sets
-- Description: Adds set_index column to exercise_sets and session_sets, backfills existing data,
-- and updates RPCs to use this index for robust template updates.

-- 1. Add columns
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS set_index INTEGER DEFAULT 0;
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS set_index INTEGER DEFAULT 0;

-- 2. Backfill exercise_sets
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY created_at ASC, id ASC) - 1 as rn
  FROM public.exercise_sets
)
UPDATE public.exercise_sets
SET set_index = ranked.rn
FROM ranked
WHERE public.exercise_sets.id = ranked.id;

-- 3. Backfill session_sets
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY session_exercise_id ORDER BY created_at ASC, id ASC) - 1 as rn
  FROM public.session_sets
)
UPDATE public.session_sets
SET set_index = ranked.rn
FROM ranked
WHERE public.session_sets.id = ranked.id;

-- 4. Update insert_workout_with_children to populate set_index
create or replace function insert_workout_with_children(
  p_user_id uuid,
  p_program text,
  p_workout_type text,
  p_date timestamp with time zone,
  p_duration int,
  p_feeling int,
  p_notes text,
  p_progression text,
  p_progression_percentage text,
  p_exercises jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_workout_id uuid;
  v_exercise_item jsonb;
  v_exercise_id uuid;
  v_set_item jsonb;
  v_set_idx int;
begin
  -- 1. Insert Workout
  insert into public.workouts (
    user_id, program, workout_type, date, duration, feeling, notes, progression, progression_percentage
  ) values (
    p_user_id, p_program, p_workout_type, p_date, p_duration, p_feeling, p_notes, p_progression, p_progression_percentage
  )
  returning id into v_workout_id;

  -- 2. Insert Exercises
  if jsonb_array_length(p_exercises) > 0 then
    for v_exercise_item in select * from jsonb_array_elements(p_exercises)
    loop
      insert into public.exercises (
        workout_id, name, category, order_index
      ) values (
        v_workout_id,
        v_exercise_item->>'name',
        v_exercise_item->>'category',
        coalesce((v_exercise_item->>'order_index')::int, 0)
      )
      returning id into v_exercise_id;

      -- 3. Insert Sets
      if jsonb_array_length(v_exercise_item->'sets') > 0 then
        -- Iterate with ordinality to get index
        v_set_idx := 0;
        for v_set_item in select * from jsonb_array_elements(v_exercise_item->'sets')
        loop
             insert into public.exercise_sets (
              exercise_id, sets, reps, weight, rest_time, rpe, is_bodyweight, target_type, set_index
            ) values (
              v_exercise_id,
              (v_set_item->>'sets')::int,
              (v_set_item->>'reps')::int,
              (v_set_item->>'weight')::numeric,
              coalesce((v_set_item->>'rest_time')::int, (v_set_item->>'restTime')::int, 60),
              (v_set_item->>'rpe')::numeric,
              coalesce((v_set_item->>'isBodyweight')::boolean, (v_set_item->>'weight')::numeric = 0),
              v_set_item->>'target_type',
              v_set_idx
            );
            v_set_idx := v_set_idx + 1;
        end loop;
      end if;
    end loop;
  end if;

  return jsonb_build_object('success', true, 'workout_id', v_workout_id);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;


-- 5. Update save_full_workout_session to use set_index
create or replace function save_full_workout_session(payload jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_exercises jsonb;
  v_sets jsonb;
  v_session_id uuid;
begin
  v_session_id := (payload->'session'->>'id')::uuid;

  -- 1. Upsert Session
  insert into public.workout_sessions (
    id, user_id, workout_id, date, duration, feeling, notes, rpe_average, total_volume, created_at, _offline, _pendingsync,
    warmup, cooldown
  )
  select
    v_session_id,
    (payload->'session'->>'user_id')::uuid,
    (payload->'session'->>'workout_id')::uuid,
    (payload->'session'->>'date')::timestamp with time zone,
    (payload->'session'->>'duration')::numeric,
    (payload->'session'->>'feeling')::numeric,
    (payload->'session'->>'notes'),
    (payload->'session'->>'rpe_average')::numeric,
    (payload->'session'->>'total_volume')::numeric,
    (payload->'session'->>'created_at')::timestamp with time zone,
    false,
    false,
    (payload->'session'->'warmup'),
    (payload->'session'->'cooldown')
  on conflict (id) do update set
    date = excluded.date,
    duration = excluded.duration,
    feeling = excluded.feeling,
    notes = excluded.notes,
    rpe_average = excluded.rpe_average,
    total_volume = excluded.total_volume,
    warmup = excluded.warmup,
    cooldown = excluded.cooldown,
    _offline = false,
    _pendingsync = false;

  -- 2. Upsert Exercises
  v_exercises := payload->'exercises';
  if jsonb_array_length(v_exercises) > 0 then
    insert into public.session_exercises (
      id, session_id, exercise_id, name, notes, order_index, created_at
    )
    select
      (item->>'id')::uuid,
      (item->>'session_id')::uuid,
      (item->>'exercise_id')::uuid,
      (item->>'name'),
      (item->>'notes'),
      (item->>'order_index')::int,
      (item->>'created_at')::timestamp with time zone
    from jsonb_array_elements(v_exercises) as item
    on conflict (id) do update set
      name = excluded.name,
      notes = excluded.notes,
      order_index = excluded.order_index;
  end if;

  -- 3. Upsert Sets
  v_sets := payload->'sets';
  if jsonb_array_length(v_sets) > 0 then
    insert into public.session_sets (
      id, session_exercise_id, sets_completed, reps_completed, weight_used, rpe, rest_time_taken, notes, created_at, completed_at, _offline, _pendingsync, set_index
    )
    select
      (item->>'id')::uuid,
      (item->>'session_exercise_id')::uuid,
      (item->>'sets_completed')::int,
      (item->>'reps_completed')::int,
      (item->>'weight_used')::numeric,
      (item->>'rpe')::numeric,
      (item->>'rest_time_taken')::int,
      (item->>'notes'),
      (item->>'created_at')::timestamp with time zone,
      (item->>'completed_at')::timestamp with time zone,
      false,
      false,
      coalesce((item->>'set_index')::int, 0)
    from jsonb_array_elements(v_sets) as item
    on conflict (id) do update set
      sets_completed = excluded.sets_completed,
      reps_completed = excluded.reps_completed,
      weight_used = excluded.weight_used,
      rpe = excluded.rpe,
      rest_time_taken = excluded.rest_time_taken,
      notes = excluded.notes,
      completed_at = excluded.completed_at,
      _offline = false,
      _pendingsync = false,
      set_index = excluded.set_index;
  end if;

  -- 4. UPDATE TEMPLATE (Progressive Overload)
  -- Logic: Match completed session sets to template sets by set_index and update weight/reps.
  
  WITH session_stats AS (
      SELECT
          se.exercise_id as template_exercise_id,
          ss.weight_used,
          ss.reps_completed,
          ss.set_index
      FROM public.session_exercises se
      JOIN public.session_sets ss ON ss.session_exercise_id = se.id
      WHERE se.session_id = v_session_id
      AND ss.reps_completed > 0 -- Only count actual sets
  ),
  template_stats AS (
      SELECT
          es.id as set_id,
          es.exercise_id,
          es.set_index
      FROM public.exercise_sets es
      WHERE es.exercise_id IN (
          SELECT distinct exercise_id 
          FROM public.session_exercises 
          WHERE session_id = v_session_id
      )
  )
  UPDATE public.exercise_sets es
  SET 
      weight = s.weight_used,
      reps = s.reps_completed
  FROM template_stats t
  JOIN session_stats s ON s.template_exercise_id = t.exercise_id AND s.set_index = t.set_index
  WHERE es.id = t.set_id;

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
