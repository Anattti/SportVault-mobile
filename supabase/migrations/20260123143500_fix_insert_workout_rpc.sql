-- Migration: Fix and Redefine insert_workout_with_children
-- Description: Updates the RPC to explicitly support order_index and robust set handling.

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
  v_sets_item jsonb;
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
        insert into public.exercise_sets (
          exercise_id, sets, reps, weight, rest_time, rpe, is_bodyweight, target_type
        )
        select
          v_exercise_id,
          (set_item->>'sets')::int,
          (set_item->>'reps')::int,
          (set_item->>'weight')::numeric,
          coalesce((set_item->>'rest_time')::int, (set_item->>'restTime')::int, 60), -- Support both keys
          (set_item->>'rpe')::numeric,
          coalesce((set_item->>'isBodyweight')::boolean, (set_item->>'weight')::numeric = 0), -- Fallback logic
          set_item->>'target_type'
        from jsonb_array_elements(v_exercise_item->'sets') as set_item;
      end if;
    end loop;
  end if;

  return jsonb_build_object('success', true, 'workout_id', v_workout_id);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
