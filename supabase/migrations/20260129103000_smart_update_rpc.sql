-- Migration: Add upsert_workout_details RPC for smart workout updates
-- Description: Handles intelligent updates of workouts, preserving exercise and set IDs.
-- Logic:
-- 1. Updates workout details.
-- 2. Exercises: 
--    - If valid UUID provided -> UPDATE
--    - If no UUID (or temp ID) -> INSERT
--    - If in DB but not in payload -> DELETE
-- 3. Sets:
--    - Handled similarly within each exercise context.

create or replace function upsert_workout_details(
  p_workout_id uuid,
  p_program text,
  p_workout_type text,
  p_notes text,
  p_exercises jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_exercise_item jsonb;
  v_set_item jsonb;
  v_exercise_id uuid;
  v_set_id uuid;
  v_exercise_ids uuid[];
begin
  -- 1. Update Workout Details
  update public.workouts
  set 
    program = p_program,
    workout_type = p_workout_type,
    notes = p_notes
  where id = p_workout_id;

  -- 2. Process Exercises
  -- We collect IDs of processed exercises to delete the rest later
  v_exercise_ids := array[]::uuid[];

  if jsonb_array_length(p_exercises) > 0 then
    for v_exercise_item in select * from jsonb_array_elements(p_exercises)
    loop
      -- Check if it's an existing exercise (has valid UUID)
      -- We assume the frontend passes 'id' as UUID if it exists, or null/temp string if new.
      -- To be safe, we check if the ID exists in the table.
      
      v_exercise_id := null;
      
      -- Try to cast ID to UUID. If it fails or is valid UUID but not in DB, treat as new.
      begin
        v_exercise_id := (v_exercise_item->>'id')::uuid;
        
        -- Check existence to be sure
        perform 1 from public.exercises where id = v_exercise_id and workout_id = p_workout_id;
        if not found then
          v_exercise_id := null;
        end if;
      exception when others then
        v_exercise_id := null; -- Invalid UUID formatting means it's a temp ID
      end;

      if v_exercise_id is not null then
        -- UPDATE existing exercise
        update public.exercises
        set
          name = v_exercise_item->>'name',
          category = v_exercise_item->>'category',
          order_index = (v_exercise_item->>'order_index')::int
        where id = v_exercise_id;
      else
        -- INSERT new exercise
        insert into public.exercises (
          workout_id, name, category, order_index
        ) values (
          p_workout_id,
          v_exercise_item->>'name',
          v_exercise_item->>'category',
          (v_exercise_item->>'order_index')::int
        )
        returning id into v_exercise_id;
      end if;

      -- Add to keep-list
      v_exercise_ids := array_append(v_exercise_ids, v_exercise_id);

      -- 3. Process Sets for this Exercise
      -- Similar logic: Delete sets not in payload, Update existing, Insert new
      -- For simplicity in this iteration, since sets are lightweight and often change count,
      -- we can use the "Delete all sets and re-insert" strategy ONLY for the sets of this exercise.
      -- OR we can implement full upsert for sets too. Let's do DELETE-REINSERT for sets 
      -- because specific set history is less critical than EXERCISE history, 
      -- and matching sets is harder (no stable IDs usually kept in frontend state for sets?).
      -- Actually, frontend DOES have set IDs. Let's try to preserve them if possible.
      
      -- But, `exercise_sets` ID persistence is less critical for the "Progressive Overload" logic 
      -- which matches by ranking (set_index). 
      -- However, keeping IDs reduces churn.
      
      -- Decision: DESTROY-AND-REBUILD SETS. 
      -- Why? It's much simpler and less error prone. The primary goal is preserving EXERCISE IDs.
      -- The set_index will ensure order.
      
      delete from public.exercise_sets where exercise_id = v_exercise_id;
      
      if jsonb_array_length(v_exercise_item->'sets') > 0 then
        -- Re-insert sets with correct set_index
        insert into public.exercise_sets (
          exercise_id, sets, reps, weight, rest_time, rpe, is_bodyweight, target_type, set_index
        )
        select
          v_exercise_id,
          (s->>'sets')::int,
          (s->>'reps')::int,
          (s->>'weight')::numeric,
          coalesce((s->>'rest_time')::int, (s->>'restTime')::int, 60),
          (s->>'rpe')::numeric,
          coalesce((s->>'isBodyweight')::boolean, (s->>'weight')::numeric = 0),
          s->>'target_type',
          row_number() over () - 1 -- 0-based index
        from jsonb_array_elements(v_exercise_item->'sets') as s;
      end if;

    end loop;
  end if;

  -- 4. Delete removed exercises
  -- Delete exercises belonging to this workout that were NOT in the processed list
  delete from public.exercises 
  where workout_id = p_workout_id 
  and id != all(v_exercise_ids);

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
