# Supabase Type Definitions Reference

Tämä tiedosto on generoitu `src/types/supabase.ts` pohjalta helpottamaan tietokantamuutosten seurantaa.

## Public Tables

### exercise_sets

| Column        | Type    | Nullable | References   |
| ------------- | ------- | -------- | ------------ |
| id            | uuid    | NO       | -            |
| exercise_id   | uuid    | NO       | exercises.id |
| sets          | number  | YES      | -            |
| reps          | number  | NO       | -            |
| weight        | number  | NO       | -            |
| rest_time     | number  | NO       | -            |
| rpe           | number  | YES      | -            |
| is_bodyweight | boolean | YES      | -            |
| target_type   | string  | YES      | -            |
| created_at    | string  | NO       | -            |

### exercises

| Column         | Type   | Nullable | References  |
| -------------- | ------ | -------- | ----------- |
| id             | uuid   | NO       | -           |
| workout_id     | uuid   | NO       | workouts.id |
| name           | string | NO       | -           |
| category       | string | YES      | -           |
| superset_group | number | YES      | -           |
| created_at     | string | NO       | -           |

### goals

| Column        | Type    | Nullable | References |
| ------------- | ------- | -------- | ---------- |
| id            | uuid    | NO       | -          |
| user_id       | uuid    | NO       | -          |
| title         | string  | NO       | -          |
| type          | string  | NO       | -          |
| target_value  | number  | NO       | -          |
| current_value | number  | NO       | -          |
| unit          | string  | NO       | -          |
| exercise_name | string  | YES      | -          |
| deadline      | string  | YES      | -          |
| is_completed  | boolean | NO       | -          |
| created_at    | string  | NO       | -          |

### session_exercises

| Column      | Type   | Nullable | References          |
| ----------- | ------ | -------- | ------------------- |
| id          | uuid   | NO       | -                   |
| session_id  | uuid   | YES      | workout_sessions.id |
| exercise_id | uuid   | YES      | exercises.id        |
| name        | string | NO       | -                   |
| notes       | string | YES      | -                   |
| order_index | number | YES      | -                   |
| created_at  | string | YES      | -                   |

### session_sets

| Column              | Type    | Nullable | References           |
| ------------------- | ------- | -------- | -------------------- |
| id                  | uuid    | NO       | -                    |
| session_exercise_id | uuid    | YES      | session_exercises.id |
| sets_completed      | number  | YES      | -                    |
| reps_completed      | number  | YES      | -                    |
| weight_used         | number  | YES      | -                    |
| rest_time_taken     | number  | YES      | -                    |
| rpe                 | number  | YES      | -                    |
| completed_at        | string  | YES      | -                    |
| \_offline           | boolean | YES      | -                    |
| \_pendingsync       | boolean | YES      | -                    |
| created_at          | string  | YES      | -                    |

### shared_workouts

| Column      | Type   | Nullable | References  |
| ----------- | ------ | -------- | ----------- |
| id          | uuid   | NO       | -           |
| workout_id  | uuid   | NO       | workouts.id |
| created_by  | uuid   | NO       | -           |
| share_token | string | NO       | -           |
| created_at  | string | NO       | -           |

### user_profiles

| Column           | Type   | Nullable | References |
| ---------------- | ------ | -------- | ---------- |
| id               | uuid   | NO       | -          |
| age              | number | YES      | -          |
| experience_level | string | YES      | -          |
| fitness_goals    | string | YES      | -          |
| height           | number | YES      | -          |
| weight           | number | YES      | -          |
| nickname         | string | YES      | -          |
| created_at       | string | YES      | -          |
| updated_at       | string | YES      | -          |

### workout_results

| Column       | Type   | Nullable | References  |
| ------------ | ------ | -------- | ----------- |
| id           | uuid   | NO       | -           |
| user_id      | uuid   | NO       | -           |
| workout_id   | uuid   | YES      | workouts.id |
| duration     | number | NO       | -           |
| warmup       | json   | YES      | -           |
| cooldown     | json   | YES      | -           |
| notes        | json   | YES      | -           |
| completed_at | string | YES      | -           |
| created_at   | string | YES      | -           |

### workout_sessions

| Column        | Type    | Nullable | References  |
| ------------- | ------- | -------- | ----------- |
| id            | uuid    | NO       | -           |
| user_id       | uuid    | YES      | -           |
| workout_id    | uuid    | YES      | workouts.id |
| date          | string  | YES      | -           |
| duration      | number  | YES      | -           |
| feeling       | number  | YES      | -           |
| rpe_average   | number  | YES      | -           |
| total_volume  | number  | YES      | -           |
| notes         | string  | YES      | -           |
| \_offline     | boolean | YES      | -           |
| \_pendingsync | boolean | YES      | -           |
| created_at    | string  | YES      | -           |

### workout_set_results

| Column            | Type   | Nullable | References         |
| ----------------- | ------ | -------- | ------------------ |
| id                | uuid   | NO       | -                  |
| workout_result_id | uuid   | NO       | workout_results.id |
| exercise_name     | string | NO       | -                  |
| exercise_index    | number | NO       | -                  |
| set_index         | number | NO       | -                  |
| sets              | number | NO       | -                  |
| reps              | number | NO       | -                  |
| weight            | number | NO       | -                  |
| rpe               | number | YES      | -                  |
| superset_group    | number | YES      | -                  |
| notes             | string | YES      | -                  |
| created_at        | string | YES      | -                  |

### workouts

| Column                 | Type   | Nullable | References |
| ---------------------- | ------ | -------- | ---------- |
| id                     | uuid   | NO       | -          |
| user_id                | uuid   | NO       | -          |
| date                   | string | NO       | -          |
| duration               | number | NO       | -          |
| feeling                | number | NO       | -          |
| notes                  | string | YES      | -          |
| program                | string | NO       | -          |
| progression            | string | YES      | -          |
| progression_percentage | string | YES      | -          |
| display_order          | number | YES      | -          |
| workout_type           | string | NO       | -          |
| created_at             | string | NO       | -          |

## Functions

### get_shared_workout

- Args: `p_share_token: string`
- Returns: `Json`

### insert_workout_with_children

- Args: `p_date, p_duration, p_exercises, p_feeling, p_notes, p_program, p_progression, p_progression_percentage, p_user_id, p_workout_type`
- Returns: `workout_created_at, workout_id`

### upsert_workout_with_children

- Args: `p_date, p_duration, p_exercises, p_feeling, p_notes, p_program, p_progression, p_progression_percentage, p_user_id, p_workout_id, p_workout_type`
- Returns: `workout_created_at, workout_id`
