-- Create RPC function to safely delete a workout session and its children
create or replace function delete_workout_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
as $$
begin
  -- 1. Delete sets related to this session (via session_exercises)
  delete from public.session_sets
  where session_exercise_id in (
    select id from public.session_exercises where session_id = p_session_id
  );

  -- 2. Delete exercises related to this session
  delete from public.session_exercises
  where session_id = p_session_id;

  -- 3. Delete the session itself
  delete from public.workout_sessions
  where id = p_session_id;

  return jsonb_build_object('success', true);
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
