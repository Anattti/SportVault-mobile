export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      exercise_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_bodyweight: boolean | null
          reps: number
          rest_time: number
          rpe: number | null
          sets: number
          target_type: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_bodyweight?: boolean | null
          reps: number
          rest_time: number
          rpe?: number | null
          sets?: number
          target_type?: string | null
          weight: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_bodyweight?: boolean | null
          reps?: number
          rest_time?: number
          rpe?: number | null
          sets?: number
          target_type?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          superset_group: number | null
          workout_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          superset_group?: number | null
          workout_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          superset_group?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          deadline: string | null
          exercise_name: string | null
          id: string
          is_completed: boolean
          target_value: number
          title: string
          type: string
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          deadline?: string | null
          exercise_name?: string | null
          id?: string
          is_completed?: boolean
          target_value: number
          title: string
          type: string
          unit: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          deadline?: string | null
          exercise_name?: string | null
          id?: string
          is_completed?: boolean
          target_value?: number
          title?: string
          type?: string
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          name: string
          notes: string | null
          order_index: number | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          _offline: boolean | null
          _pendingsync: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          reps_completed: number | null
          rest_time_taken: number | null
          rpe: number | null
          session_exercise_id: string | null
          sets_completed: number | null
          weight_used: number | null
        }
        Insert: {
          _offline?: boolean | null
          _pendingsync?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rest_time_taken?: number | null
          rpe?: number | null
          session_exercise_id?: string | null
          sets_completed?: number | null
          weight_used?: number | null
        }
        Update: {
          _offline?: boolean | null
          _pendingsync?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rest_time_taken?: number | null
          rpe?: number | null
          session_exercise_id?: string | null
          sets_completed?: number | null
          weight_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_workouts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          share_token: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          share_token: string
          workout_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          share_token?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          age: number | null
          created_at: string | null
          experience_level: string | null
          fitness_goals: string | null
          height: number | null
          id: string
          nickname: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          experience_level?: string | null
          fitness_goals?: string | null
          height?: number | null
          id: string
          nickname?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          experience_level?: string | null
          fitness_goals?: string | null
          height?: number | null
          id?: string
          nickname?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      workout_results: {
        Row: {
          completed_at: string | null
          cooldown: Json | null
          created_at: string | null
          duration: number
          id: string
          notes: Json | null
          user_id: string
          warmup: Json | null
          workout_id: string | null
        }
        Insert: {
          completed_at?: string | null
          cooldown?: Json | null
          created_at?: string | null
          duration: number
          id?: string
          notes?: Json | null
          user_id: string
          warmup?: Json | null
          workout_id?: string | null
        }
        Update: {
          completed_at?: string | null
          cooldown?: Json | null
          created_at?: string | null
          duration?: number
          id?: string
          notes?: Json | null
          user_id?: string
          warmup?: Json | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_results_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          _offline: boolean | null
          _pendingsync: boolean | null
          created_at: string | null
          date: string | null
          duration: number | null
          feeling: number | null
          id: string
          notes: string | null
          rpe_average: number | null
          total_volume: number | null
          user_id: string | null
          workout_id: string | null
        }
        Insert: {
          _offline?: boolean | null
          _pendingsync?: boolean | null
          created_at?: string | null
          date?: string | null
          duration?: number | null
          feeling?: number | null
          id?: string
          notes?: string | null
          rpe_average?: number | null
          total_volume?: number | null
          user_id?: string | null
          workout_id?: string | null
        }
        Update: {
          _offline?: boolean | null
          _pendingsync?: boolean | null
          created_at?: string | null
          date?: string | null
          duration?: number | null
          feeling?: number | null
          id?: string
          notes?: string | null
          rpe_average?: number | null
          total_volume?: number | null
          user_id?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_set_results: {
        Row: {
          created_at: string | null
          exercise_index: number
          exercise_name: string
          id: string
          notes: string | null
          reps: number
          rpe: number | null
          set_index: number
          sets: number
          superset_group: number | null
          weight: number
          workout_result_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_index: number
          exercise_name: string
          id?: string
          notes?: string | null
          reps: number
          rpe?: number | null
          set_index: number
          sets?: number
          superset_group?: number | null
          weight: number
          workout_result_id: string
        }
        Update: {
          created_at?: string | null
          exercise_index?: number
          exercise_name?: string
          id?: string
          notes?: string | null
          reps?: number
          rpe?: number | null
          set_index?: number
          sets?: number
          superset_group?: number | null
          weight?: number
          workout_result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_results_workout_result_id_fkey"
            columns: ["workout_result_id"]
            isOneToOne: false
            referencedRelation: "workout_results"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          display_order: number | null
          duration: number
          feeling: number
          id: string
          notes: string | null
          program: string
          progression: string | null
          progression_percentage: string | null
          user_id: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          date: string
          display_order?: number | null
          duration: number
          feeling: number
          id?: string
          notes?: string | null
          program: string
          progression?: string | null
          progression_percentage?: string | null
          user_id: string
          workout_type: string
        }
        Update: {
          created_at?: string
          date?: string
          display_order?: number | null
          duration?: number
          feeling?: number
          id?: string
          notes?: string | null
          program?: string
          progression?: string | null
          progression_percentage?: string | null
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_workout: { Args: { p_share_token: string }; Returns: Json }
      insert_workout_with_children: {
        Args: {
          p_date: string
          p_duration: number
          p_exercises: Json
          p_feeling: number
          p_notes?: string
          p_program: string
          p_progression?: string
          p_progression_percentage?: string
          p_user_id: string
          p_workout_type: string
        }
        Returns: {
          workout_created_at: string
          workout_id: string
        }[]
      }
      upsert_workout_with_children: {
        Args: {
          p_date: string
          p_duration: number
          p_exercises: Json
          p_feeling: number
          p_notes?: string
          p_program: string
          p_progression?: string
          p_progression_percentage?: string
          p_user_id: string
          p_workout_id?: string
          p_workout_type: string
        }
        Returns: {
          workout_created_at: string
          workout_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
