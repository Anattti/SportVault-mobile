# Supabase Database Schema - SportVault

Tämä tiedosto sisältää kuvauksen SportVault-sovelluksen tietokantarakenteesta ja sen suhteista.

## ER-kaavio (Entity-Relationship Diagram)

```mermaid
erDiagram
    workouts ||--o{ exercises : "contains"
    exercises ||--o{ exercise_sets : "has"
    workouts ||--o{ workout_sessions : "has sessions"
    workouts ||--o{ workout_results : "has results"
    workouts ||--o{ shared_workouts : "can be shared"
    workouts ||--o{ scheduled_workouts : "can be scheduled"

    workout_sessions ||--o{ session_exercises : "recorded exercises"
    session_exercises ||--o{ session_sets : "recorded sets"
    exercises |o--o{ session_exercises : "referenced in session"

    workout_results ||--o{ workout_set_results : "contains set results"

    user_profiles ||--o{ workouts : "owns"
    user_profiles ||--o{ goals : "has"
    user_profiles ||--o{ workout_sessions : "performs"
    user_profiles ||--o{ workout_results : "achieves"
    user_profiles ||--o{ scheduled_workouts : "schedules"

    user_profiles {
        uuid id PK
        int age
        string experience_level
        string fitness_goals
        float height
        string nickname
        float weight
        timestamp created_at
        timestamp updated_at
    }

    workouts {
        uuid id PK
        uuid user_id FK
        string program
        string workout_type
        int duration
        int feeling
        string notes
        string progression
        string progression_percentage
        int display_order
        timestamp date
        timestamp created_at
    }

    exercises {
        uuid id PK
        uuid workout_id FK
        string name
        string category
        int superset_group
        timestamp created_at
    }

    exercise_sets {
        uuid id PK
        uuid exercise_id FK
        int sets
        int reps
        float weight
        int rest_time
        float rpe
        boolean is_bodyweight
        string target_type
        timestamp created_at
    }

    workout_sessions {
        uuid id PK
        uuid user_id FK
        uuid workout_id FK
        timestamp date
        int duration
        int feeling
        float rpe_average
        float total_volume
        string notes
        boolean _offline
        boolean _pendingsync
        timestamp created_at
    }

    session_exercises {
        uuid id PK
        uuid session_id FK
        uuid exercise_id FK
        string name
        int order_index
        string notes
        timestamp created_at
    }

    session_sets {
        uuid id PK
        uuid session_exercise_id FK
        int sets_completed
        int reps_completed
        float weight_used
        int rest_time_taken
        float rpe
        timestamp completed_at
        boolean _offline
        boolean _pendingsync
        timestamp created_at
    }

    workout_results {
        uuid id PK
        uuid user_id FK
        uuid workout_id FK
        int duration
        json warmup
        json cooldown
        json notes
        timestamp completed_at
        timestamp created_at
    }

    workout_set_results {
        uuid id PK
        uuid workout_result_id FK
        string exercise_name
        int exercise_index
        int set_index
        int sets
        int reps
        float weight
        float rpe
        int superset_group
        string notes
        timestamp created_at
    }

    goals {
        uuid id PK
        uuid user_id FK
        string title
        string type
        float target_value
        float current_value
        string unit
        string exercise_name
        timestamp deadline
        boolean is_completed
        timestamp created_at
    }

    shared_workouts {
        uuid id PK
        uuid workout_id FK
        uuid created_by FK
        string share_token
        timestamp created_at
    }
```

## Taulut ja niiden vastuut

### Käyttäjät ja Profiilit

- **user_profiles**: Tallentaa käyttäjän biometriset tiedot (pituus, paino, ikä) ja kuntotason.

### Ohjelmat ja Harjoitukset (Malleja)

- **workouts**: Harjoituspohjat tai yksittäiset harjoitukset, jotka sisältävät useita liikkeitä.
- **exercises**: Harjoitukseen kuuluvat liikkeet.
- **exercise_sets**: Liikkeeseen määritellyt tavoitesarjat (toistot, painot, lepoajat).

### Suoritukset (Sessiot)

- **workout_sessions**: Aktiivinen tai suoritettu harjoituskerta, joka perustuu `workouts`-pohjaan.
- **session_exercises**: Sessioaikana suoritetut liikkeet.
- **session_sets**: Sessioaikana suoritetut sarjat ja niiden todelliset arvot.

### Tulokset ja Analytiikka

- **workout_results**: Kooste harjoituksen lopputuloksesta, sisältäen lämmittelyt ja jäähdyttelyt.
- **workout_set_results**: Tarkemmat tiedot jokaisesta suoritetusta sarjasta analytiikkaa varten.
- **goals**: Käyttäjän asettamat tavoitteet (esim. max paino tietyssä liikkeessä tai workout-määrä).

### Jakaminen

- **shared_workouts**: Mahdollistaa harjoitusohjelmien jakamisen muiden käyttäjien kanssa `share_tokenin` avulla.
