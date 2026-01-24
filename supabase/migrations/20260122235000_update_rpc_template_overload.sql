-- Migration: Update save_full_workout_session to support Progressive Overload (Template Update)
-- Description: When a session is saved, update the corresponding workout template's sets (weight and reps) 
-- to match the values performed in the session. This ensures the next workout starts with the updated values.

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
      id, session_exercise_id, sets_completed, reps_completed, weight_used, rpe, rest_time_taken, notes, created_at, completed_at, _offline, _pendingsync
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
      false
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
      _pendingsync = false;
  end if;

  -- 4. UPDATE TEMPLATE (Progressive Overload)
  -- Logic: Match completed session sets to template sets by order (rank) and update weight/reps.
  -- Only considers exercises that are part of this session.
  
  WITH session_stats AS (
      SELECT
          se.exercise_id as template_exercise_id,
          ss.weight_used,
          ss.reps_completed,
          ROW_NUMBER() OVER (
              PARTITION BY se.exercise_id 
              ORDER BY ss.created_at ASC, ss.completed_at ASC
          ) as set_rank
      FROM public.session_exercises se
      JOIN public.session_sets ss ON ss.session_exercise_id = se.id
      WHERE se.session_id = v_session_id
      AND ss.reps_completed > 0 -- Only count actual sets
  ),
  template_stats AS (
      SELECT
          es.id as set_id,
          es.exercise_id,
          ROW_NUMBER() OVER (
              PARTITION BY es.exercise_id 
              ORDER BY es.created_at ASC
          ) as set_rank
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
  JOIN session_stats s ON s.template_exercise_id = t.exercise_id AND s.set_rank = t.set_rank
  WHERE es.id = t.set_id;

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
