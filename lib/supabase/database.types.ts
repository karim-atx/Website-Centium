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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_emails: {
        Row: {
          attempts: number
          created_at: string
          first_name: string | null
          id: string
          initiated_by: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          profile_id: string
          provider_id: string | null
          recipient_email: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          first_name?: string | null
          id?: string
          initiated_by: string
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          profile_id: string
          provider_id?: string | null
          recipient_email?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          first_name?: string | null
          id?: string
          initiated_by?: string
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          profile_id?: string
          provider_id?: string | null
          recipient_email?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          description: string
          group_key: string | null
          icon: string
          key: string
          level: Database["public"]["Enums"]["achievement_level"] | null
          points: number
          sort_order: number
          threshold: number
          title: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description: string
          group_key?: string | null
          icon: string
          key: string
          level?: Database["public"]["Enums"]["achievement_level"] | null
          points: number
          sort_order: number
          threshold: number
          title: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          description?: string
          group_key?: string | null
          icon?: string
          key?: string
          level?: Database["public"]["Enums"]["achievement_level"] | null
          points?: number
          sort_order?: number
          threshold?: number
          title?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_account_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_account_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      admin_users: {
        Row: {
          granted_at: string
          id: string
          note: string | null
          owner_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          note?: string | null
          owner_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          note?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      ambassador_grants: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          profile_id: string
          reason: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          profile_id: string
          reason: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          profile_id?: string
          reason?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambassador_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambassador_grants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ambassador_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      app_preferences: {
        Row: {
          created_at: string
          hide_read_receipts: boolean
          id: string
          language: Database["public"]["Enums"]["app_language"]
          notification_meal_reminders: boolean
          notification_professional_messages: boolean
          notification_streak_alerts: boolean
          notification_weekly_summary: boolean
          notification_workout_reminders: boolean
          owner_id: string
          reminders_paused: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          hide_read_receipts?: boolean
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          notification_meal_reminders?: boolean
          notification_professional_messages?: boolean
          notification_streak_alerts?: boolean
          notification_weekly_summary?: boolean
          notification_workout_reminders?: boolean
          owner_id: string
          reminders_paused?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          hide_read_receipts?: boolean
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          notification_meal_reminders?: boolean
          notification_professional_messages?: boolean
          notification_streak_alerts?: boolean
          notification_weekly_summary?: boolean
          notification_workout_reminders?: boolean
          owner_id?: string
          reminders_paused?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_preferences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      app_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          route: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          route?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          route?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      blood_markers: {
        Row: {
          blood_panel_id: string
          created_at: string
          id: string
          name: string
          range_high: number | null
          range_low: number | null
          status: Database["public"]["Enums"]["blood_marker_status"] | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          blood_panel_id: string
          created_at?: string
          id?: string
          name: string
          range_high?: number | null
          range_low?: number | null
          status?: Database["public"]["Enums"]["blood_marker_status"] | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          blood_panel_id?: string
          created_at?: string
          id?: string
          name?: string
          range_high?: number | null
          range_low?: number | null
          status?: Database["public"]["Enums"]["blood_marker_status"] | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_markers_panel_fkey"
            columns: ["blood_panel_id", "user_id"]
            isOneToOne: false
            referencedRelation: "blood_panels"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blood_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      blood_panels: {
        Row: {
          created_at: string
          id: string
          panel_date: string
          source_image_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          panel_date: string
          source_image_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          panel_date?: string
          source_image_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blood_panels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      blood_pressure_readings: {
        Row: {
          arm: string | null
          created_at: string
          diastolic: number
          id: string
          notes: string | null
          position: string | null
          pulse: number | null
          recorded_at: string
          source: Database["public"]["Enums"]["health_metric_source"]
          systolic: number
          user_id: string
        }
        Insert: {
          arm?: string | null
          created_at?: string
          diastolic: number
          id?: string
          notes?: string | null
          position?: string | null
          pulse?: number | null
          recorded_at: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          systolic: number
          user_id: string
        }
        Update: {
          arm?: string | null
          created_at?: string
          diastolic?: number
          id?: string
          notes?: string | null
          position?: string | null
          pulse?: number | null
          recorded_at?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          systolic?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blood_pressure_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          route: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          route?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          route?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bug_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_class_bookings: {
        Row: {
          business_class_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          business_class_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          business_class_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_class_bookings_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "business_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "marketplace_classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_bookings_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_classes: {
        Row: {
          business_id: string
          class_type: string | null
          created_at: string
          end_time: string
          event_date: string
          id: string
          max_capacity: number
          notes: string | null
          payment_type: string | null
          price: number | null
          professional_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          class_type?: string | null
          created_at?: string
          end_time: string
          event_date: string
          id?: string
          max_capacity: number
          notes?: string | null
          payment_type?: string | null
          price?: number | null
          professional_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          class_type?: string | null
          created_at?: string
          end_time?: string
          event_date?: string
          id?: string
          max_capacity?: number
          notes?: string | null
          payment_type?: string | null
          price?: number | null
          professional_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_directory_entries: {
        Row: {
          business_name: string
          created_at: string
          id: string
          tier: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          id?: string
          tier?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          tier?: string | null
        }
        Relationships: []
      }
      business_discounts: {
        Row: {
          business_id: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_discounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_employees: {
        Row: {
          business_id: string
          created_at: string
          id: string
          professional_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          professional_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_member_codes: {
        Row: {
          business_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          membership_plan_id: string | null
          redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          membership_plan_id?: string | null
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          membership_plan_id?: string | null
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_member_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_member_codes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_member_codes_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_member_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_members: {
        Row: {
          accepted: boolean | null
          business_id: string
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          member_id: string
          membership_plan_id: string | null
          responded_at: string | null
        }
        Insert: {
          accepted?: boolean | null
          business_id: string
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          member_id: string
          membership_plan_id?: string | null
          responded_at?: string | null
        }
        Update: {
          accepted?: boolean | null
          business_id?: string
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          invited_at?: string
          invited_by?: string | null
          member_id?: string
          membership_plan_id?: string | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_members_ended_by_fkey"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_members_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offerings: {
        Row: {
          business_id: string
          category: Database["public"]["Enums"]["offering_category"]
          created_at: string
          description: string | null
          id: string
          price: number | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category: Database["public"]["Enums"]["offering_category"]
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: Database["public"]["Enums"]["offering_category"]
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_offerings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_offerings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          active: boolean
          bio: string | null
          branch_type: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          id: string
          location: string | null
          members_reached: number
          perk: string | null
          profile_id: string
          public_email: string | null
          public_phone: string | null
          public_website: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          branch_type?: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          created_at?: string
          id?: string
          location?: string | null
          members_reached?: number
          perk?: string | null
          profile_id: string
          public_email?: string | null
          public_phone?: string | null
          public_website?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          branch_type?: string | null
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          id?: string
          location?: string | null
          members_reached?: number
          perk?: string | null
          profile_id?: string
          public_email?: string | null
          public_phone?: string | null
          public_website?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      calendar_event_invitees: {
        Row: {
          accepted: boolean | null
          calendar_event_id: string
          id: string
          invited_at: string
          invited_by: string | null
          invited_user_id: string
          responded_at: string | null
        }
        Insert: {
          accepted?: boolean | null
          calendar_event_id: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          invited_user_id: string
          responded_at?: string | null
        }
        Update: {
          accepted?: boolean | null
          calendar_event_id?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          invited_user_id?: string
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_invitees_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calendar_event_invitees_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          attachment_path: string | null
          color: string | null
          created_at: string
          created_by_client: boolean
          end_time: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          owner_id: string
          repeat: Database["public"]["Enums"]["calendar_repeat"]
          source_template_assignment_id: string | null
          start_time: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          all_day?: boolean
          attachment_path?: string | null
          color?: string | null
          created_at?: string
          created_by_client?: boolean
          end_time?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id: string
          repeat?: Database["public"]["Enums"]["calendar_repeat"]
          source_template_assignment_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          all_day?: boolean
          attachment_path?: string | null
          color?: string | null
          created_at?: string
          created_by_client?: boolean
          end_time?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string
          repeat?: Database["public"]["Enums"]["calendar_repeat"]
          source_template_assignment_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calendar_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "calendar_events_source_template_assignment_id_fkey"
            columns: ["source_template_assignment_id"]
            isOneToOne: false
            referencedRelation: "workout_template_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          callee_id: string | null
          caller_id: string | null
          cap_seconds: number
          created_at: string
          duration_sec: number | null
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["call_kind"]
          livekit_room_name: string
          started_at: string | null
          status: Database["public"]["Enums"]["call_status"]
          thread_id: string
        }
        Insert: {
          callee_id?: string | null
          caller_id?: string | null
          cap_seconds: number
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["call_kind"]
          livekit_room_name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          thread_id: string
        }
        Update: {
          callee_id?: string | null
          caller_id?: string | null
          cap_seconds?: number
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["call_kind"]
          livekit_room_name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "calls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "calls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          owner_id: string
          price: number
          quantity: number
          store_item_id: string | null
          store_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          owner_id: string
          price: number
          quantity?: number
          store_item_id?: string | null
          store_name: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          owner_id?: string
          price?: number
          quantity?: number
          store_item_id?: string | null
          store_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cart_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "cart_items_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_reviews: {
        Row: {
          approved_at: string | null
          certification_path: string
          id: string
          professional_id: string
          rejected_at: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          submitted_at: string
        }
        Insert: {
          approved_at?: string | null
          certification_path: string
          id?: string
          professional_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Update: {
          approved_at?: string | null
          certification_path?: string
          id?: string
          professional_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certification_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "certification_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      client_access_grants: {
        Row: {
          category: Database["public"]["Enums"]["access_category"]
          client_id: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          professional_id: string
          revoked_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["access_category"]
          client_id: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          professional_id: string
          revoked_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["access_category"]
          client_id?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          professional_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_access_grants_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      client_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          professional_id: string
          redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          professional_id: string
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          professional_id?: string
          redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_codes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      client_health_notes: {
        Row: {
          client_id: string
          comorbidities_note: string | null
          created_at: string
          current_injuries_note: string | null
          id: string
          medications_note: string | null
          personality_type_note: string | null
          previous_surgeries_note: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          comorbidities_note?: string | null
          created_at?: string
          current_injuries_note?: string | null
          id?: string
          medications_note?: string | null
          personality_type_note?: string | null
          previous_surgeries_note?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          comorbidities_note?: string | null
          created_at?: string
          current_injuries_note?: string | null
          id?: string
          medications_note?: string | null
          personality_type_note?: string | null
          previous_surgeries_note?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_health_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_health_notes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      comorbidities: {
        Row: {
          condition: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comorbidities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          ack_sent_at: string | null
          ack_skipped_reason: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string
          message: string
          name: string
          notified_at: string | null
          notify_suppressed_reason: string | null
          status: string
          status_changed_at: string | null
          topic: string
        }
        Insert: {
          ack_sent_at?: string | null
          ack_skipped_reason?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash: string
          message: string
          name: string
          notified_at?: string | null
          notify_suppressed_reason?: string | null
          status?: string
          status_changed_at?: string | null
          topic: string
        }
        Update: {
          ack_sent_at?: string | null
          ack_skipped_reason?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string
          message?: string
          name?: string
          notified_at?: string | null
          notify_suppressed_reason?: string | null
          status?: string
          status_changed_at?: string | null
          topic?: string
        }
        Relationships: []
      }
      contraception_events: {
        Row: {
          created_at: string
          event: Database["public"]["Enums"]["contraception_event"]
          id: string
          notes: string | null
          occurred_at: string | null
          occurred_on: string
          plan_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: Database["public"]["Enums"]["contraception_event"]
          id?: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on: string
          plan_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: Database["public"]["Enums"]["contraception_event"]
          id?: string
          notes?: string | null
          occurred_at?: string | null
          occurred_on?: string
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contraception_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "contraception_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contraception_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      contraception_plans: {
        Row: {
          active_days: number | null
          break_days: number | null
          change_weekday: number | null
          created_at: string
          ended_on: string | null
          first_applied_on: string | null
          id: string
          inserted_on: string | null
          interval_weeks: number | null
          last_given_on: string | null
          method: Database["public"]["Enums"]["contraception_method"]
          pack_start_date: string | null
          patch_free_week: boolean | null
          reminder_time: string | null
          replace_by: string | null
          started_on: string
          updated_at: string
          user_id: string
          weeks_in: number | null
          weeks_out: number | null
        }
        Insert: {
          active_days?: number | null
          break_days?: number | null
          change_weekday?: number | null
          created_at?: string
          ended_on?: string | null
          first_applied_on?: string | null
          id?: string
          inserted_on?: string | null
          interval_weeks?: number | null
          last_given_on?: string | null
          method: Database["public"]["Enums"]["contraception_method"]
          pack_start_date?: string | null
          patch_free_week?: boolean | null
          reminder_time?: string | null
          replace_by?: string | null
          started_on: string
          updated_at?: string
          user_id: string
          weeks_in?: number | null
          weeks_out?: number | null
        }
        Update: {
          active_days?: number | null
          break_days?: number | null
          change_weekday?: number | null
          created_at?: string
          ended_on?: string | null
          first_applied_on?: string | null
          id?: string
          inserted_on?: string | null
          interval_weeks?: number | null
          last_given_on?: string | null
          method?: Database["public"]["Enums"]["contraception_method"]
          pack_start_date?: string | null
          patch_free_week?: boolean | null
          reminder_time?: string | null
          replace_by?: string | null
          started_on?: string
          updated_at?: string
          user_id?: string
          weeks_in?: number | null
          weeks_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contraception_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      custom_exercise_library_items: {
        Row: {
          category: Database["public"]["Enums"]["muscle_group"] | null
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at: string
          id: string
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          owner_id: string
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          source_custom_exercise_id: string | null
          tags: string[]
          updated_at: string
          breathing: string | null
          common_mistakes: string[]
          cues: string[]
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation: string | null
          harder_variation: string | null
          instructions_reviewed: boolean
          safety_notes: string[]
          setup: string[]
          steps: string[]
        }
        Insert: {
          category?: Database["public"]["Enums"]["muscle_group"] | null
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          owner_id: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          source_custom_exercise_id?: string | null
          tags?: string[]
          updated_at?: string
          breathing?: string | null
          common_mistakes?: string[]
          cues?: string[]
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          instructions_reviewed?: boolean
          safety_notes?: string[]
          setup?: string[]
          steps?: string[]
        }
        Update: {
          category?: Database["public"]["Enums"]["muscle_group"] | null
          classification?: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          owner_id?: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          source_custom_exercise_id?: string | null
          tags?: string[]
          updated_at?: string
          breathing?: string | null
          common_mistakes?: string[]
          cues?: string[]
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          instructions_reviewed?: boolean
          safety_notes?: string[]
          setup?: string[]
          steps?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "custom_exercise_library_items_source_custom_exercise_id_fkey"
            columns: ["source_custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_foods: {
        Row: {
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"]
          created_at: string
          fat_g: number
          id: string
          logo_tone: number | null
          name: string
          name_ar: string | null
          nutrients: Json | null
          overrides_food_id: string | null
          owner_id: string
          protein_g: number
          scoped_to_client_id: string | null
          serving_label: string
          updated_at: string
        }
        Insert: {
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"]
          created_at?: string
          fat_g: number
          id?: string
          logo_tone?: number | null
          name: string
          name_ar?: string | null
          nutrients?: Json | null
          overrides_food_id?: string | null
          owner_id: string
          protein_g: number
          scoped_to_client_id?: string | null
          serving_label: string
          updated_at?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          fat_g?: number
          id?: string
          logo_tone?: number | null
          name?: string
          name_ar?: string | null
          nutrients?: Json | null
          overrides_food_id?: string | null
          owner_id?: string
          protein_g?: number
          scoped_to_client_id?: string | null
          serving_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_foods_overrides_food_id_fkey"
            columns: ["overrides_food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_foods_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      custom_meal_items: {
        Row: {
          created_at: string
          custom_food_id: string | null
          custom_meal_id: string
          food_id: string | null
          id: string
          position: number
          quantity: number
          unit: Database["public"]["Enums"]["food_unit"]
        }
        Insert: {
          created_at?: string
          custom_food_id?: string | null
          custom_meal_id: string
          food_id?: string | null
          id?: string
          position: number
          quantity: number
          unit: Database["public"]["Enums"]["food_unit"]
        }
        Update: {
          created_at?: string
          custom_food_id?: string | null
          custom_meal_id?: string
          food_id?: string | null
          id?: string
          position?: number
          quantity?: number
          unit?: Database["public"]["Enums"]["food_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "custom_meal_items_custom_food_id_fkey"
            columns: ["custom_food_id"]
            isOneToOne: false
            referencedRelation: "custom_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meal_items_custom_meal_id_fkey"
            columns: ["custom_meal_id"]
            isOneToOne: false
            referencedRelation: "custom_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_meals: {
        Row: {
          created_at: string
          id: string
          meal_type: Database["public"]["Enums"]["meal_slot"] | null
          owner_id: string
          scoped_to_client_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_slot"] | null
          owner_id: string
          scoped_to_client_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_slot"] | null
          owner_id?: string
          scoped_to_client_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_meals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_meals_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      cycle_day_logs: {
        Row: {
          bbt_celsius: number | null
          cervical_mucus: Database["public"]["Enums"]["cervical_mucus"] | null
          created_at: string
          energy: number | null
          flow: Database["public"]["Enums"]["cycle_flow"] | null
          id: string
          is_period: boolean
          lh_test: Database["public"]["Enums"]["lh_test_result"] | null
          log_date: string
          mood: string[]
          notes: string | null
          pregnancy_test:
            | Database["public"]["Enums"]["pregnancy_test_result"]
            | null
          sex_activity: Database["public"]["Enums"]["sex_activity"] | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bbt_celsius?: number | null
          cervical_mucus?: Database["public"]["Enums"]["cervical_mucus"] | null
          created_at?: string
          energy?: number | null
          flow?: Database["public"]["Enums"]["cycle_flow"] | null
          id?: string
          is_period?: boolean
          lh_test?: Database["public"]["Enums"]["lh_test_result"] | null
          log_date: string
          mood?: string[]
          notes?: string | null
          pregnancy_test?:
            | Database["public"]["Enums"]["pregnancy_test_result"]
            | null
          sex_activity?: Database["public"]["Enums"]["sex_activity"] | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bbt_celsius?: number | null
          cervical_mucus?: Database["public"]["Enums"]["cervical_mucus"] | null
          created_at?: string
          energy?: number | null
          flow?: Database["public"]["Enums"]["cycle_flow"] | null
          id?: string
          is_period?: boolean
          lh_test?: Database["public"]["Enums"]["lh_test_result"] | null
          log_date?: string
          mood?: string[]
          notes?: string | null
          pregnancy_test?:
            | Database["public"]["Enums"]["pregnancy_test_result"]
            | null
          sex_activity?: Database["public"]["Enums"]["sex_activity"] | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cycle_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      cycle_settings: {
        Row: {
          conditions: string[]
          luteal_length: number
          method_reminders: boolean
          notification_detail: Database["public"]["Enums"]["notification_detail_level"]
          pill_reminder: boolean
          shown_for_any_sex: boolean
          timezone: string
          tracker_chosen_at: string | null
          tracker_enabled: boolean
          typical_cycle_length: number
          typical_period_length: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conditions?: string[]
          luteal_length?: number
          method_reminders?: boolean
          notification_detail?: Database["public"]["Enums"]["notification_detail_level"]
          pill_reminder?: boolean
          shown_for_any_sex?: boolean
          timezone?: string
          tracker_chosen_at?: string | null
          tracker_enabled?: boolean
          typical_cycle_length?: number
          typical_period_length?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conditions?: string[]
          luteal_length?: number
          method_reminders?: boolean
          notification_detail?: Database["public"]["Enums"]["notification_detail_level"]
          pill_reminder?: boolean
          shown_for_any_sex?: boolean
          timezone?: string
          tracker_chosen_at?: string | null
          tracker_enabled?: boolean
          typical_cycle_length?: number
          typical_period_length?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cycle_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      device_presentation_settings: {
        Row: {
          color_theme: Database["public"]["Enums"]["color_theme"]
          created_at: string
          id: string
          larger_text: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          reduce_motion: boolean
          theme: Database["public"]["Enums"]["theme_mode"]
          updated_at: string
        }
        Insert: {
          color_theme?: Database["public"]["Enums"]["color_theme"]
          created_at?: string
          id?: string
          larger_text?: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          reduce_motion?: boolean
          theme?: Database["public"]["Enums"]["theme_mode"]
          updated_at?: string
        }
        Update: {
          color_theme?: Database["public"]["Enums"]["color_theme"]
          created_at?: string
          id?: string
          larger_text?: boolean
          owner_id?: string
          platform?: Database["public"]["Enums"]["app_platform"]
          reduce_motion?: boolean
          theme?: Database["public"]["Enums"]["theme_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "device_presentation_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      dietary_restrictions: {
        Row: {
          created_at: string
          id: string
          restriction: Database["public"]["Enums"]["dietary_restriction"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restriction: Database["public"]["Enums"]["dietary_restriction"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restriction?: Database["public"]["Enums"]["dietary_restriction"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dietary_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at: string
          id: string
          is_verified: boolean
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          tags: string[]
          updated_at: string
          breathing: string | null
          common_mistakes: string[]
          cues: string[]
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation: string | null
          harder_variation: string | null
          instructions_reviewed: boolean
          safety_notes: string[]
          setup: string[]
          steps: string[]
        }
        Insert: {
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          is_verified?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          tags?: string[]
          updated_at?: string
          breathing?: string | null
          common_mistakes?: string[]
          cues?: string[]
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          instructions_reviewed?: boolean
          safety_notes?: string[]
          setup?: string[]
          steps?: string[]
        }
        Update: {
          category?: Database["public"]["Enums"]["muscle_group"]
          classification?: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          is_verified?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          tags?: string[]
          updated_at?: string
          breathing?: string | null
          common_mistakes?: string[]
          cues?: string[]
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          instructions_reviewed?: boolean
          safety_notes?: string[]
          setup?: string[]
          steps?: string[]
        }
        Relationships: []
      }
      feature_milestones: {
        Row: {
          first_at: string
          milestone: string
          user_id: string
        }
        Insert: {
          first_at?: string
          milestone: string
          user_id: string
        }
        Update: {
          first_at?: string
          milestone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      food_log_entries: {
        Row: {
          external_fetched_at: string | null
          external_ref: string | null
          external_source: Database["public"]["Enums"]["external_food_source"] | null
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"] | null
          created_at: string
          custom_food_id: string | null
          fat_g: number
          food_id: string | null
          id: string
          is_lebanese: boolean | null
          logged_date: string
          logged_via: Database["public"]["Enums"]["food_log_source"] | null
          meal: Database["public"]["Enums"]["meal_slot"]
          name: string
          nutrients: Json | null
          protein_g: number
          quantity: number
          serving_label: string | null
          unit: Database["public"]["Enums"]["food_unit"]
          user_id: string
        }
        Insert: {
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?: Database["public"]["Enums"]["external_food_source"] | null
          calories: number
          carbs_g: number
          category?: Database["public"]["Enums"]["food_category"] | null
          created_at?: string
          custom_food_id?: string | null
          fat_g: number
          food_id?: string | null
          id?: string
          is_lebanese?: boolean | null
          logged_date?: string
          logged_via?: Database["public"]["Enums"]["food_log_source"] | null
          meal: Database["public"]["Enums"]["meal_slot"]
          name: string
          nutrients?: Json | null
          protein_g: number
          quantity: number
          serving_label?: string | null
          unit: Database["public"]["Enums"]["food_unit"]
          user_id: string
        }
        Update: {
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?: Database["public"]["Enums"]["external_food_source"] | null
          calories?: number
          carbs_g?: number
          category?: Database["public"]["Enums"]["food_category"] | null
          created_at?: string
          custom_food_id?: string | null
          fat_g?: number
          food_id?: string | null
          id?: string
          is_lebanese?: boolean | null
          logged_date?: string
          logged_via?: Database["public"]["Enums"]["food_log_source"] | null
          meal?: Database["public"]["Enums"]["meal_slot"]
          name?: string
          nutrients?: Json | null
          protein_g?: number
          quantity?: number
          serving_label?: string | null
          unit?: Database["public"]["Enums"]["food_unit"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_log_entries_custom_food_id_fkey"
            columns: ["custom_food_id"]
            isOneToOne: false
            referencedRelation: "custom_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "food_log_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      food_nutrients: {
        Row: {
          fdc_description: string | null
          fdc_id: number | null
          food_id: string
          imported_at: string
          match_confidence: string
          nutrients: Json
        }
        Insert: {
          fdc_description?: string | null
          fdc_id?: number | null
          food_id: string
          imported_at?: string
          match_confidence?: string
          nutrients?: Json
        }
        Update: {
          fdc_description?: string | null
          fdc_id?: number | null
          food_id?: string
          imported_at?: string
          match_confidence?: string
          nutrients?: Json
        }
        Relationships: [
          {
            foreignKeyName: "food_nutrients_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: true
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"]
          created_at: string
          fat_g: number
          id: string
          is_lebanese: boolean
          is_verified: boolean
          name: string
          name_ar: string | null
          protein_g: number
          serving_label: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"]
          created_at?: string
          fat_g: number
          id?: string
          is_lebanese?: boolean
          is_verified?: boolean
          name: string
          name_ar?: string | null
          protein_g: number
          serving_label: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          calories?: number
          carbs_g?: number
          category?: Database["public"]["Enums"]["food_category"]
          created_at?: string
          fat_g?: number
          id?: string
          is_lebanese?: boolean
          is_verified?: boolean
          name?: string
          name_ar?: string | null
          protein_g?: number
          serving_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      gym_pricing_plans: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          plan: string
          price: number
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          plan: string
          price: number
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          plan?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_pricing_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_purchases: {
        Row: {
          created_at: string
          expires_at: string | null
          gym_id: string
          id: string
          one_time: boolean
          owner_id: string
          plan: string
          price_paid: number
          purchased_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          gym_id: string
          id?: string
          one_time: boolean
          owner_id: string
          plan: string
          price_paid: number
          purchased_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          gym_id?: string
          id?: string
          one_time?: boolean
          owner_id?: string
          plan?: string
          price_paid?: number
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_purchases_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_purchases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      gyms: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          location: string
          name: string
          perk: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          location: string
          name: string
          perk?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          location?: string
          name?: string
          perk?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_item_id: string
          id: string
        }
        Insert: {
          completed_date: string
          created_at?: string
          habit_item_id: string
          id?: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_item_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_item_id_fkey"
            columns: ["habit_item_id"]
            isOneToOne: false
            referencedRelation: "habit_items"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_items: {
        Row: {
          created_at: string
          icon: Database["public"]["Enums"]["habit_icon"]
          id: string
          label: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon: Database["public"]["Enums"]["habit_icon"]
          id?: string
          label: string
          owner_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: Database["public"]["Enums"]["habit_icon"]
          id?: string
          label?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "habit_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      health_data_reset_requests: {
        Row: {
          cancelled_at: string | null
          execute_after: string
          executed_at: string | null
          id: string
          purge_storage: boolean
          requested_at: string
          requested_by: string | null
          scope_all: boolean
          scope_tables: string[]
          storage_purged_at: string | null
          storage_targets: Json
          target_user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          execute_after: string
          executed_at?: string | null
          id?: string
          purge_storage?: boolean
          requested_at?: string
          requested_by?: string | null
          scope_all?: boolean
          scope_tables: string[]
          storage_purged_at?: string | null
          storage_targets?: Json
          target_user_id: string
        }
        Update: {
          cancelled_at?: string | null
          execute_after?: string
          executed_at?: string | null
          id?: string
          purge_storage?: boolean
          requested_at?: string
          requested_by?: string | null
          scope_all?: boolean
          scope_tables?: string[]
          storage_purged_at?: string | null
          storage_targets?: Json
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_data_reset_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      health_integrations: {
        Row: {
          connected: boolean
          created_at: string
          id: string
          last_synced_at: string | null
          provider: Database["public"]["Enums"]["health_provider"]
          scopes_granted: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: Database["public"]["Enums"]["health_provider"]
          scopes_granted?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: Database["public"]["Enums"]["health_provider"]
          scopes_granted?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          created_at: string
          id: string
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          recorded_at: string
          source: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          recorded_at: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_type?: Database["public"]["Enums"]["health_metric_type"]
          recorded_at?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      imaging_records: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          imaging_date: string
          imaging_type: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          imaging_date: string
          imaging_type: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          imaging_date?: string
          imaging_type?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "imaging_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          entry_date: string
          folder_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          entry_date: string
          folder_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          entry_date?: string
          folder_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "journal_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      legacy_certificate_quarantine: {
        Row: {
          byte_length: number
          noted_at: string
          professional_id: string
        }
        Insert: {
          byte_length: number
          noted_at?: string
          professional_id: string
        }
        Update: {
          byte_length?: number
          noted_at?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "legacy_certificate_quarantine_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      logged_exercises: {
        Row: {
          block_result_id: string | null
          created_at: string
          custom_exercise_id: string | null
          endurance_result: Json | null
          exercise_id: string | null
          id: string
          name: string
          position: number
          workout_session_id: string
        }
        Insert: {
          block_result_id?: string | null
          created_at?: string
          custom_exercise_id?: string | null
          endurance_result?: Json | null
          exercise_id?: string | null
          id?: string
          name: string
          position: number
          workout_session_id: string
        }
        Update: {
          block_result_id?: string | null
          created_at?: string
          custom_exercise_id?: string | null
          endurance_result?: Json | null
          exercise_id?: string | null
          id?: string
          name?: string
          position?: number
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logged_exercises_block_result_id_fkey"
            columns: ["block_result_id"]
            isOneToOne: false
            referencedRelation: "workout_block_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_exercises_custom_exercise_id_fkey"
            columns: ["custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_exercises_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      logged_sets: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          is_pr: boolean
          logged_exercise_id: string
          mood: number | null
          notes: string | null
          outcome: Database["public"]["Enums"]["set_outcome"] | null
          pain: number | null
          reps: number | null
          rpe: number | null
          set_number: number
          set_type: Database["public"]["Enums"]["set_type"] | null
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          is_pr?: boolean
          logged_exercise_id: string
          mood?: number | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["set_outcome"] | null
          pain?: number | null
          reps?: number | null
          rpe?: number | null
          set_number: number
          set_type?: Database["public"]["Enums"]["set_type"] | null
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          is_pr?: boolean
          logged_exercise_id?: string
          mood?: number | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["set_outcome"] | null
          pain?: number | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          set_type?: Database["public"]["Enums"]["set_type"] | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logged_sets_logged_exercise_id_fkey"
            columns: ["logged_exercise_id"]
            isOneToOne: false
            referencedRelation: "logged_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_goals: {
        Row: {
          goal: Database["public"]["Enums"]["measurement_goal"]
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          goal: Database["public"]["Enums"]["measurement_goal"]
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          goal?: Database["public"]["Enums"]["measurement_goal"]
          metric_type?: Database["public"]["Enums"]["health_metric_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          created_at: string
          dose: string
          id: string
          name: string
          notes: string | null
          notify_enabled: boolean
          route: Database["public"]["Enums"]["medication_route"]
          times: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose: string
          id?: string
          name: string
          notes?: string | null
          notify_enabled?: boolean
          route: Database["public"]["Enums"]["medication_route"]
          times?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose?: string
          id?: string
          name?: string
          notes?: string | null
          notify_enabled?: boolean
          route?: Database["public"]["Enums"]["medication_route"]
          times?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "medications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      meditation_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number
          id: string
          kind: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed: boolean
          created_at?: string
          duration_seconds: number
          id?: string
          kind: string
          started_at: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number
          id?: string
          kind?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          billing: Database["public"]["Enums"]["billing_period"]
          business_id: string
          created_at: string
          id: string
          name: string
          payment_type: string | null
          price: number
          updated_at: string
        }
        Insert: {
          billing: Database["public"]["Enums"]["billing_period"]
          business_id: string
          created_at?: string
          id?: string
          name: string
          payment_type?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          billing?: Database["public"]["Enums"]["billing_period"]
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          payment_type?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      message_attachment_purges: {
        Row: {
          message_id: string
          object_name: string
          purged_at: string | null
          requested_at: string
          requested_by: string | null
        }
        Insert: {
          message_id: string
          object_name: string
          purged_at?: string | null
          requested_at?: string
          requested_by?: string | null
        }
        Update: {
          message_id?: string
          object_name?: string
          purged_at?: string | null
          requested_at?: string
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachment_purges_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachment_purges_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
        ]
      }
      message_flags: {
        Row: {
          created_at: string
          flag: Database["public"]["Enums"]["message_flag"]
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flag: Database["public"]["Enums"]["message_flag"]
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          flag?: Database["public"]["Enums"]["message_flag"]
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_flags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      message_push_sends: {
        Row: {
          attempts: number
          body: string
          chat_group: string | null
          delivered_at: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          message_id: string
          queued_at: string
          recipient_id: string
          thread_id: string
          title: string
        }
        Insert: {
          attempts?: number
          body: string
          chat_group?: string | null
          delivered_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id: string
          queued_at?: string
          recipient_id: string
          thread_id: string
          title: string
        }
        Update: {
          attempts?: number
          body?: string
          chat_group?: string | null
          delivered_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id?: string
          queued_at?: string
          recipient_id?: string
          thread_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_push_sends_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_push_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_push_sends_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "message_push_sends_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_push_sends_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      message_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          detail: string | null
          id: string
          message_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          message_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          message_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      message_stars: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_stars_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      message_threads: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["thread_kind"]
          name?: string | null
          participant_one_id?: string | null
          participant_two_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["thread_kind"]
          name?: string | null
          participant_one_id?: string | null
          participant_two_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_bytes: number | null
          attachment_kind: Database["public"]["Enums"]["attachment_kind"] | null
          attachment_mime: string | null
          attachment_name: string | null
          attachment_purged_at: string | null
          attachment_url: string | null
          authored_by: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edit_count: number
          edited_at: string | null
          forwarded: boolean
          id: string
          image_height: number | null
          image_width: number | null
          read_at: string | null
          redacted_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          text: string | null
          thread_id: string
          voice_note_seconds: number | null
          voice_waveform: number[] | null
        }
        Insert: {
          attachment_bytes?: number | null
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_purged_at?: string | null
          attachment_url?: string | null
          authored_by?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edit_count?: number
          edited_at?: string | null
          forwarded?: boolean
          id?: string
          image_height?: number | null
          image_width?: number | null
          read_at?: string | null
          redacted_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id: string
          voice_note_seconds?: number | null
          voice_waveform?: number[] | null
        }
        Update: {
          attachment_bytes?: number | null
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_purged_at?: string | null
          attachment_url?: string | null
          authored_by?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edit_count?: number
          edited_at?: string | null
          forwarded?: boolean
          id?: string
          image_height?: number | null
          image_width?: number | null
          read_at?: string | null
          redacted_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id?: string
          voice_note_seconds?: number | null
          voice_waveform?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      mind_content: {
        Row: {
          content_type: Database["public"]["Enums"]["mind_content_type"]
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["mind_difficulty"] | null
          id: string
          name: string
          phases: Json | null
          seconds: number | null
          stretch_type: Database["public"]["Enums"]["mind_stretch_type"] | null
          target: string | null
          updated_at: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["mind_content_type"]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mind_difficulty"] | null
          id?: string
          name: string
          phases?: Json | null
          seconds?: number | null
          stretch_type?: Database["public"]["Enums"]["mind_stretch_type"] | null
          target?: string | null
          updated_at?: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["mind_content_type"]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["mind_difficulty"] | null
          id?: string
          name?: string
          phases?: Json | null
          seconds?: number | null
          stretch_type?: Database["public"]["Enums"]["mind_stretch_type"] | null
          target?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          carbs_pct: number
          created_at: string
          desired_weight_confirmed: boolean
          desired_weight_kg: number | null
          fat_pct: number
          id: string
          is_current: boolean
          plan_type: Database["public"]["Enums"]["nutrition_plan_type"]
          protein_pct: number
          target_calories: number
          user_id: string
          weekly_rate_kg: number
          weight_goal: Database["public"]["Enums"]["weight_goal"]
        }
        Insert: {
          carbs_pct: number
          created_at?: string
          desired_weight_confirmed?: boolean
          desired_weight_kg?: number | null
          fat_pct: number
          id?: string
          is_current?: boolean
          plan_type: Database["public"]["Enums"]["nutrition_plan_type"]
          protein_pct: number
          target_calories: number
          user_id: string
          weekly_rate_kg: number
          weight_goal: Database["public"]["Enums"]["weight_goal"]
        }
        Update: {
          carbs_pct?: number
          created_at?: string
          desired_weight_confirmed?: boolean
          desired_weight_kg?: number | null
          fat_pct?: number
          id?: string
          is_current?: boolean
          plan_type?: Database["public"]["Enums"]["nutrition_plan_type"]
          protein_pct?: number
          target_calories?: number
          user_id?: string
          weekly_rate_kg?: number
          weight_goal?: Database["public"]["Enums"]["weight_goal"]
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "nutrition_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      paused_workout_sessions: {
        Row: {
          created_at: string
          elapsed_sec: number
          id: string
          logged_state: Json
          routine_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elapsed_sec?: number
          id?: string
          logged_state?: Json
          routine_id: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elapsed_sec?: number
          id?: string
          logged_state?: Json
          routine_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paused_workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "paused_workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      pending_client_requests: {
        Row: {
          customer_id: string
          id: string
          professional_id: string
          requested_at: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          customer_id: string
          id?: string
          professional_id: string
          requested_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          customer_id?: string
          id?: string
          professional_id?: string
          requested_at?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_client_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_client_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          custom_exercise_id: string | null
          estimated_one_rep_max_kg: number
          exercise_id: string | null
          id: string
          source_logged_set_id: string | null
          user_id: string
        }
        Insert: {
          achieved_at: string
          created_at?: string
          custom_exercise_id?: string | null
          estimated_one_rep_max_kg: number
          exercise_id?: string | null
          id?: string
          source_logged_set_id?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          custom_exercise_id?: string | null
          estimated_one_rep_max_kg?: number
          exercise_id?: string | null
          id?: string
          source_logged_set_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_custom_exercise_id_fkey"
            columns: ["custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_source_logged_set_id_fkey"
            columns: ["source_logged_set_id"]
            isOneToOne: false
            referencedRelation: "logged_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      pinned_messages: {
        Row: {
          message_id: string
          pinned_at: string
          pinned_by: string
          thread_id: string
        }
        Insert: {
          message_id: string
          pinned_at?: string
          pinned_by: string
          thread_id: string
        }
        Update: {
          message_id?: string
          pinned_at?: string
          pinned_by?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "pinned_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "pinned_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: boolean
          marketplace_revenue_share_pct: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          marketplace_revenue_share_pct: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          marketplace_revenue_share_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      point_tiers: {
        Row: {
          min_points: number
          name: string
          sort_order: number
        }
        Insert: {
          min_points: number
          name: string
          sort_order: number
        }
        Update: {
          min_points?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          owner_id: string
          source: Database["public"]["Enums"]["points_source"]
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          source: Database["public"]["Enums"]["points_source"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          source?: Database["public"]["Enums"]["points_source"]
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      pregnancies: {
        Row: {
          created_at: string
          due_date: string | null
          ended_on: string | null
          id: string
          lmp_date: string | null
          outcome: Database["public"]["Enums"]["pregnancy_outcome"] | null
          postpartum_until: string | null
          status: Database["public"]["Enums"]["pregnancy_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          ended_on?: string | null
          id?: string
          lmp_date?: string | null
          outcome?: Database["public"]["Enums"]["pregnancy_outcome"] | null
          postpartum_until?: string | null
          status?: Database["public"]["Enums"]["pregnancy_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          ended_on?: string | null
          id?: string
          lmp_date?: string | null
          outcome?: Database["public"]["Enums"]["pregnancy_outcome"] | null
          postpartum_until?: string | null
          status?: Database["public"]["Enums"]["pregnancy_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pregnancies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      pregnancy_contractions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          pregnancy_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id: string
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          pregnancy_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_contractions_pregnancy_id_fkey"
            columns: ["pregnancy_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pregnancy_contractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      pregnancy_kick_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          kicks: number
          pregnancy_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kicks?: number
          pregnancy_id: string
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kicks?: number
          pregnancy_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_kick_sessions_pregnancy_id_fkey"
            columns: ["pregnancy_id"]
            isOneToOne: false
            referencedRelation: "pregnancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pregnancy_kick_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_awards: {
        Row: {
          awarded_on: string | null
          created_at: string
          description: string | null
          id: string
          issuer: string | null
          position: number
          professional_id: string
          title: string
          updated_at: string
        }
        Insert: {
          awarded_on?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          position: number
          professional_id: string
          title: string
          updated_at?: string
        }
        Update: {
          awarded_on?: string | null
          created_at?: string
          description?: string | null
          id?: string
          issuer?: string | null
          position?: number
          professional_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_clients: {
        Row: {
          assigned_food_template_id: string | null
          assigned_program_id: string | null
          client_id: string
          communication_boundaries: string | null
          contact_style: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          joined_at: string
          prefix: string | null
          professional_id: string
          pronouns: string | null
          reminder_preference: string | null
        }
        Insert: {
          assigned_food_template_id?: string | null
          assigned_program_id?: string | null
          client_id: string
          communication_boundaries?: string | null
          contact_style?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          joined_at?: string
          prefix?: string | null
          professional_id: string
          pronouns?: string | null
          reminder_preference?: string | null
        }
        Update: {
          assigned_food_template_id?: string | null
          assigned_program_id?: string | null
          client_id?: string
          communication_boundaries?: string | null
          contact_style?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          joined_at?: string
          prefix?: string | null
          professional_id?: string
          pronouns?: string | null
          reminder_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_education: {
        Row: {
          created_at: string
          degree: string | null
          description: string | null
          end_on: string | null
          field: string | null
          id: string
          institution: string
          position: number
          professional_id: string
          start_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_on?: string | null
          field?: string | null
          id?: string
          institution: string
          position: number
          professional_id: string
          start_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_on?: string | null
          field?: string | null
          id?: string
          institution?: string
          position?: number
          professional_id?: string
          start_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_experience: {
        Row: {
          created_at: string
          description: string | null
          end_on: string | null
          id: string
          location: string | null
          organisation: string
          position: number
          professional_id: string
          start_on: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_on?: string | null
          id?: string
          location?: string | null
          organisation: string
          position: number
          professional_id: string
          start_on: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_on?: string | null
          id?: string
          location?: string | null
          organisation?: string
          position?: number
          professional_id?: string
          start_on?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_languages: {
        Row: {
          created_at: string
          id: string
          language: string
          position: number
          professional_id: string
          proficiency: Database["public"]["Enums"]["language_proficiency"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          position: number
          professional_id: string
          proficiency: Database["public"]["Enums"]["language_proficiency"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          position?: number
          professional_id?: string
          proficiency?: Database["public"]["Enums"]["language_proficiency"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_licence_reviews: {
        Row: {
          approved_at: string | null
          document_path: string
          id: string
          licence_id: string
          professional_id: string
          rejected_at: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          submitted_at: string
        }
        Insert: {
          approved_at?: string | null
          document_path: string
          id?: string
          licence_id: string
          professional_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Update: {
          approved_at?: string | null
          document_path?: string
          id?: string
          licence_id?: string
          professional_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_licence_reviews_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "professional_licences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "public_professional_licences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_licence_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_licences: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          document_path: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          issuing_body: string | null
          mirrors_certification_url: boolean
          name: string | null
          no_expiry: boolean
          position: number
          professional_id: string
          show_when_expired: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuing_body?: string | null
          mirrors_certification_url?: boolean
          name?: string | null
          no_expiry?: boolean
          position: number
          professional_id: string
          show_when_expired?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuing_body?: string | null
          mirrors_certification_url?: boolean
          name?: string | null
          no_expiry?: boolean
          position?: number
          professional_id?: string
          show_when_expired?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_links: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          professional_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position: number
          professional_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          professional_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          affiliated_business_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_label: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          headline: string | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          show_volunteering: boolean
          skills: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          x: string | null
        }
        Insert: {
          affiliated_business_id?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          area_label?: string | null
          bio?: string | null
          certification_url?: string | null
          certification_verified?: boolean
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          headline?: string | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id: string
          show_volunteering?: boolean
          skills?: string[]
          specialty?: string | null
          updated_at?: string
          website?: string | null
          x?: string | null
        }
        Update: {
          affiliated_business_id?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          area_label?: string | null
          bio?: string | null
          certification_url?: string | null
          certification_verified?: boolean
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          headline?: string | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id?: string
          show_volunteering?: boolean
          skills?: string[]
          specialty?: string | null
          updated_at?: string
          website?: string | null
          x?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_affiliated_business_id_fkey"
            columns: ["affiliated_business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_affiliated_business_id_fkey"
            columns: ["affiliated_business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_publications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          position: number
          professional_id: string
          published_on: string | null
          publisher: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          position: number
          professional_id: string
          published_on?: string | null
          publisher?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          professional_id?: string
          published_on?: string | null
          publisher?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          body: string | null
          created_at: string
          edited_at: string | null
          id: string
          professional_id: string
          rating: number
          redacted_at: string | null
          redacted_body: string | null
          redacted_by: string | null
          redaction_reason: string | null
          reviewer_id: string
          reviewer_name_visible: boolean
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          professional_id: string
          rating: number
          redacted_at?: string | null
          redacted_body?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          reviewer_id: string
          reviewer_name_visible?: boolean
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          professional_id?: string
          rating?: number
          redacted_at?: string | null
          redacted_body?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          reviewer_id?: string
          reviewer_name_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_reviews_redacted_by_fkey"
            columns: ["redacted_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_volunteering: {
        Row: {
          created_at: string
          description: string | null
          end_on: string | null
          id: string
          organisation: string
          position: number
          professional_id: string
          role: string
          start_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_on?: string | null
          id?: string
          organisation: string
          position: number
          professional_id: string
          role: string
          start_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_on?: string | null
          id?: string
          organisation?: string
          position?: number
          professional_id?: string
          role?: string
          start_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          avatar_url: string | null
          created_at: string
          customer_subtype:
            | Database["public"]["Enums"]["customer_subtype"]
            | null
          date_of_birth: string | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          last_active_at: string
          onboarded: boolean
          phone: string | null
          plant_species: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          shares_presence: boolean
          storage_bytes_used: number
          storage_purged_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          avatar_url?: string | null
          created_at?: string
          customer_subtype?:
            | Database["public"]["Enums"]["customer_subtype"]
            | null
          date_of_birth?: string | null
          deletion_requested_at?: string | null
          email?: string | null
          first_name?: string | null
          goals?: string[]
          height_cm?: number | null
          id: string
          last_active_at?: string
          onboarded?: boolean
          phone?: string | null
          plant_species?: string | null
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
          shares_presence?: boolean
          storage_bytes_used?: number
          storage_purged_at?: string | null
          tracking_preferences?: string[]
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          avatar_url?: string | null
          created_at?: string
          customer_subtype?:
            | Database["public"]["Enums"]["customer_subtype"]
            | null
          date_of_birth?: string | null
          deletion_requested_at?: string | null
          email?: string | null
          first_name?: string | null
          goals?: string[]
          height_cm?: number | null
          id?: string
          last_active_at?: string
          onboarded?: boolean
          phone?: string | null
          plant_species?: string | null
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
          shares_presence?: boolean
          storage_bytes_used?: number
          storage_purged_at?: string | null
          tracking_preferences?: string[]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          consecutive_failures: number
          created_at: string
          endpoint: string
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          owner_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          consecutive_failures?: number
          created_at?: string
          endpoint: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          owner_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          consecutive_failures?: number
          created_at?: string
          endpoint?: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          owner_id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      rate_limit_attempts: {
        Row: {
          action: Database["public"]["Enums"]["rate_limited_action"]
          actor_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["rate_limited_action"]
          actor_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["rate_limited_action"]
          actor_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rate_limit_attempts_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          created_at: string
          custom_food_id: string | null
          food_id: string | null
          id: string
          note: string | null
          position: number
          quantity: number
          recipe_id: string
          unit: Database["public"]["Enums"]["food_unit"]
        }
        Insert: {
          created_at?: string
          custom_food_id?: string | null
          food_id?: string | null
          id?: string
          note?: string | null
          position: number
          quantity: number
          recipe_id: string
          unit?: Database["public"]["Enums"]["food_unit"]
        }
        Update: {
          created_at?: string
          custom_food_id?: string | null
          food_id?: string | null
          id?: string
          note?: string | null
          position?: number
          quantity?: number
          recipe_id?: string
          unit?: Database["public"]["Enums"]["food_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_custom_food_id_fkey"
            columns: ["custom_food_id"]
            isOneToOne: false
            referencedRelation: "custom_foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          scoped_to_client_id: string | null
          servings: number
          steps: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          scoped_to_client_id?: string | null
          servings: number
          steps?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          scoped_to_client_id?: string | null
          servings?: number
          steps?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recipes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recipes_scoped_to_client_id_fkey"
            columns: ["scoped_to_client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      recovery_mode_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          intro_seen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          intro_seen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          intro_seen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recovery_mode_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          redeemed: boolean
          redeemed_at: string | null
          referee_discount_pct: number
          referee_id: string | null
          referrer_bonus_points: number
          referrer_discount_pct: number
          referrer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
          referee_discount_pct?: number
          referee_id?: string | null
          referrer_bonus_points?: number
          referrer_discount_pct?: number
          referrer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          redeemed?: boolean
          redeemed_at?: string | null
          referee_discount_pct?: number
          referee_id?: string | null
          referrer_bonus_points?: number
          referrer_discount_pct?: number
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      reminder_sends: {
        Row: {
          attempts: number
          body: string
          delivered_at: string | null
          due_date: string
          id: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          queued_at: string
          title: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          delivered_at?: string | null
          due_date: string
          id?: string
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          queued_at?: string
          title: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          delivered_at?: string | null
          due_date?: string
          id?: string
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          queued_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reminder_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      routine_exercise_blocks: {
        Row: {
          created_at: string
          id: string
          interval_seconds: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label: string | null
          rounds: number | null
          routine_id: string
          time_cap_seconds: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          rounds?: number | null
          routine_id: string
          time_cap_seconds?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          kind?: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          rounds?: number | null
          routine_id?: string
          time_cap_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercise_blocks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          block_id: string | null
          cardio_avg_heart_rate: number | null
          cardio_distance_km: number | null
          cardio_duration_min: number | null
          cardio_incline_pct: number | null
          cardio_pace_min_per_km: number | null
          created_at: string
          custom_exercise_id: string | null
          duration_seconds: number | null
          endurance_plan: Json | null
          estimated_one_rep_max_kg: number | null
          exercise_id: string | null
          id: string
          intensity_pct: number | null
          max_reps: number | null
          max_sets: number | null
          min_reps: number | null
          min_sets: number | null
          pinned_note: string | null
          position: number
          rep_max_kg: number | null
          rep_max_update_mode:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps: number | null
          rest_seconds: number | null
          routine_id: string
          rpe: number | null
          sets: number | null
          tempo: string | null
          weight_kg: number | null
        }
        Insert: {
          block_id?: string | null
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
          duration_seconds?: number | null
          endurance_plan?: Json | null
          estimated_one_rep_max_kg?: number | null
          exercise_id?: string | null
          id?: string
          intensity_pct?: number | null
          max_reps?: number | null
          max_sets?: number | null
          min_reps?: number | null
          min_sets?: number | null
          pinned_note?: string | null
          position: number
          rep_max_kg?: number | null
          rep_max_update_mode?:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps?: number | null
          rest_seconds?: number | null
          routine_id: string
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
        }
        Update: {
          block_id?: string | null
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
          duration_seconds?: number | null
          endurance_plan?: Json | null
          estimated_one_rep_max_kg?: number | null
          exercise_id?: string | null
          id?: string
          intensity_pct?: number | null
          max_reps?: number | null
          max_sets?: number | null
          min_reps?: number | null
          min_sets?: number | null
          pinned_note?: string | null
          position?: number
          rep_max_kg?: number | null
          rep_max_update_mode?:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps?: number | null
          rest_seconds?: number | null
          routine_id?: string
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "routine_exercise_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_custom_exercise_id_fkey"
            columns: ["custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          position: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "routine_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "routine_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          assigned_by_professional_id: string | null
          coach_note: string | null
          coach_note_read_at: string | null
          coach_note_updated_at: string | null
          color: string | null
          created_at: string
          estimated_duration_min: number | null
          folder_id: string | null
          id: string
          name: string
          owner_id: string
          position: number
          source_template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by_professional_id?: string | null
          coach_note?: string | null
          coach_note_read_at?: string | null
          coach_note_updated_at?: string | null
          color?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          folder_id?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number
          source_template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by_professional_id?: string | null
          coach_note?: string | null
          coach_note_read_at?: string | null
          coach_note_updated_at?: string | null
          color?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          folder_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          source_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routines_assigned_by_professional_id_fkey"
            columns: ["assigned_by_professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "routines_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "routine_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "routines_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_details: {
        Row: {
          awake_min: number | null
          created_at: string
          deep_min: number | null
          id: string
          light_min: number | null
          rem_min: number | null
          score: number | null
          sleep_date: string
          summary: string | null
          user_id: string
        }
        Insert: {
          awake_min?: number | null
          created_at?: string
          deep_min?: number | null
          id?: string
          light_min?: number | null
          rem_min?: number | null
          score?: number | null
          sleep_date: string
          summary?: string | null
          user_id: string
        }
        Update: {
          awake_min?: number | null
          created_at?: string
          deep_min?: number | null
          id?: string
          light_min?: number | null
          rem_min?: number | null
          score?: number | null
          sleep_date?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sleep_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      storage_purge_buckets: {
        Row: {
          bucket_id: string
          path_shape: string
          uid_segment: number
        }
        Insert: {
          bucket_id: string
          path_shape: string
          uid_segment: number
        }
        Update: {
          bucket_id?: string
          path_shape?: string
          uid_segment?: number
        }
        Relationships: []
      }
      store_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          store_listing_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          store_listing_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          store_listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_store_listing_id_fkey"
            columns: ["store_listing_id"]
            isOneToOne: false
            referencedRelation: "store_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      store_listings: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          offer: string | null
          owner_type: Database["public"]["Enums"]["store_owner_type"]
          professional_id: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          offer?: string | null
          owner_type: Database["public"]["Enums"]["store_owner_type"]
          professional_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          offer?: string | null
          owner_type?: Database["public"]["Enums"]["store_owner_type"]
          professional_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "store_listings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      streaks: {
        Row: {
          auto: boolean
          created_at: string
          current_days: number
          goal_days: number | null
          habit_item_id: string | null
          id: string
          label: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          auto?: boolean
          created_at?: string
          current_days?: number
          goal_days?: number | null
          habit_item_id?: string | null
          id?: string
          label: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          auto?: boolean
          created_at?: string
          current_days?: number
          goal_days?: number | null
          habit_item_id?: string | null
          id?: string
          label?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_item_id_fkey"
            columns: ["habit_item_id"]
            isOneToOne: false
            referencedRelation: "habit_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "streaks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      subscription_states: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          premium_plan: Database["public"]["Enums"]["premium_plan"] | null
          renews_at: string | null
          seat_blocks: number
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          tier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          premium_plan?: Database["public"]["Enums"]["premium_plan"] | null
          renews_at?: string | null
          seat_blocks?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          premium_plan?: Database["public"]["Enums"]["premium_plan"] | null
          renews_at?: string | null
          seat_blocks?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_states_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "subscription_states_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          created_at: string
          id: string
          is_addon: boolean
          is_business_seat_plan: boolean
          is_default: boolean
          max_clients: number | null
          max_employees: number | null
          monthly_price: number
          name: string
          seats_per_unit: number | null
          tier_type: Database["public"]["Enums"]["subscription_tier_type"]
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_addon?: boolean
          is_business_seat_plan?: boolean
          is_default?: boolean
          max_clients?: number | null
          max_employees?: number | null
          monthly_price: number
          name: string
          seats_per_unit?: number | null
          tier_type: Database["public"]["Enums"]["subscription_tier_type"]
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_addon?: boolean
          is_business_seat_plan?: boolean
          is_default?: boolean
          max_clients?: number | null
          max_employees?: number | null
          monthly_price?: number
          name?: string
          seats_per_unit?: number | null
          tier_type?: Database["public"]["Enums"]["subscription_tier_type"]
          yearly_price?: number | null
        }
        Relationships: []
      }
      support_thread_reads: {
        Row: {
          last_logged_read_at: string | null
          last_read_at: string
          last_read_by: string | null
          thread_id: string
        }
        Insert: {
          last_logged_read_at?: string | null
          last_read_at?: string
          last_read_by?: string | null
          thread_id: string
        }
        Update: {
          last_logged_read_at?: string | null
          last_read_at?: string
          last_read_by?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "support_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      surgeries: {
        Row: {
          created_at: string
          id: string
          name: string
          surgery_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          surgery_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          surgery_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "surgeries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      system_identities: {
        Row: {
          created_at: string
          label: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          label: string
          profile_id: string
        }
        Update: {
          created_at?: string
          label?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_identities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      thread_read_marks: {
        Row: {
          last_read_at: string
          reader_id: string
          thread_id: string
        }
        Insert: {
          last_read_at?: string
          reader_id: string
          thread_id: string
        }
        Update: {
          last_read_at?: string
          reader_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_read_marks_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "thread_read_marks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "thread_read_marks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_marks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      thread_user_settings: {
        Row: {
          archived_at: string | null
          created_at: string
          left_at: string | null
          muted_always: boolean
          muted_until: string | null
          pinned_at: string | null
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          left_at?: string | null
          muted_always?: boolean
          muted_until?: string | null
          pinned_at?: string | null
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          left_at?: string | null
          muted_always?: boolean
          muted_until?: string | null
          pinned_at?: string | null
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_user_settings_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "thread_user_settings_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_user_settings_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          points_awarded: number
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      welcome_emails: {
        Row: {
          attempts: number
          last_attempt_at: string | null
          last_error: string | null
          profile_id: string
          provider_id: string | null
          queued_at: string
          sent_at: string | null
          skipped_reason: string | null
          status: string
        }
        Insert: {
          attempts?: number
          last_attempt_at?: string | null
          last_error?: string | null
          profile_id: string
          provider_id?: string | null
          queued_at?: string
          sent_at?: string | null
          skipped_reason?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          last_attempt_at?: string | null
          last_error?: string | null
          profile_id?: string
          provider_id?: string | null
          queued_at?: string
          sent_at?: string | null
          skipped_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "welcome_emails_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      widget_configs: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          position: number
          size: Database["public"]["Enums"]["widget_size"]
          updated_at: string
          visible: boolean
          widget_type: Database["public"]["Enums"]["widget_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          position: number
          size?: Database["public"]["Enums"]["widget_size"]
          updated_at?: string
          visible?: boolean
          widget_type: Database["public"]["Enums"]["widget_type"]
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          platform?: Database["public"]["Enums"]["app_platform"]
          position?: number
          size?: Database["public"]["Enums"]["widget_size"]
          updated_at?: string
          visible?: boolean
          widget_type?: Database["public"]["Enums"]["widget_type"]
        }
        Relationships: [
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "widget_configs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      workout_block_results: {
        Row: {
          capped: boolean | null
          created_at: string
          extra_reps: number | null
          id: string
          interval_seconds: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label: string | null
          notes: string | null
          rounds: number | null
          rounds_completed: number | null
          time_cap_seconds: number | null
          time_seconds: number | null
          workout_session_id: string
        }
        Insert: {
          capped?: boolean | null
          created_at?: string
          extra_reps?: number | null
          id?: string
          interval_seconds?: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          notes?: string | null
          rounds?: number | null
          rounds_completed?: number | null
          time_cap_seconds?: number | null
          time_seconds?: number | null
          workout_session_id: string
        }
        Update: {
          capped?: boolean | null
          created_at?: string
          extra_reps?: number | null
          id?: string
          interval_seconds?: number | null
          kind?: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          notes?: string | null
          rounds?: number | null
          rounds_completed?: number | null
          time_cap_seconds?: number | null
          time_seconds?: number | null
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_block_results_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          activity_date: string | null
          created_at: string
          duration_sec: number | null
          ended_at: string | null
          id: string
          notes: string | null
          routine_id: string | null
          routine_name: string
          started_at: string
          total_volume_kg: number | null
          user_id: string
        }
        Insert: {
          activity_date?: string | null
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          routine_name: string
          started_at?: string
          total_volume_kg?: number | null
          user_id: string
        }
        Update: {
          activity_date?: string | null
          created_at?: string
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          routine_name?: string
          started_at?: string
          total_volume_kg?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      workout_template_assignments: {
        Row: {
          assigned_at: string
          assigned_day: string | null
          client_id: string
          created_at: string
          id: string
          routine_id: string | null
          workout_template_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_day?: string | null
          client_id: string
          created_at?: string
          id?: string
          routine_id?: string | null
          workout_template_id: string
        }
        Update: {
          assigned_at?: string
          assigned_day?: string | null
          client_id?: string
          created_at?: string
          id?: string
          routine_id?: string | null
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_template_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "workout_template_assignments_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_assignments_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercise_blocks: {
        Row: {
          created_at: string
          id: string
          interval_seconds: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label: string | null
          rounds: number | null
          time_cap_seconds: number | null
          updated_at: string
          workout_template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          kind: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          rounds?: number | null
          time_cap_seconds?: number | null
          updated_at?: string
          workout_template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_seconds?: number | null
          kind?: Database["public"]["Enums"]["block_kind"]
          label?: string | null
          rounds?: number | null
          time_cap_seconds?: number | null
          updated_at?: string
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercise_blocks_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          block_id: string | null
          cardio_avg_heart_rate: number | null
          cardio_distance_km: number | null
          cardio_duration_min: number | null
          cardio_incline_pct: number | null
          cardio_pace_min_per_km: number | null
          created_at: string
          custom_exercise_id: string | null
          duration_seconds: number | null
          endurance_plan: Json | null
          estimated_one_rep_max_kg: number | null
          exercise_id: string | null
          id: string
          intensity_pct: number | null
          max_reps: number | null
          max_sets: number | null
          min_reps: number | null
          min_sets: number | null
          position: number
          rep_max_kg: number | null
          rep_max_update_mode:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          sets: number | null
          tempo: string | null
          weight_kg: number | null
          workout_template_id: string
        }
        Insert: {
          block_id?: string | null
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
          duration_seconds?: number | null
          endurance_plan?: Json | null
          estimated_one_rep_max_kg?: number | null
          exercise_id?: string | null
          id?: string
          intensity_pct?: number | null
          max_reps?: number | null
          max_sets?: number | null
          min_reps?: number | null
          min_sets?: number | null
          position: number
          rep_max_kg?: number | null
          rep_max_update_mode?:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
          workout_template_id: string
        }
        Update: {
          block_id?: string | null
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
          duration_seconds?: number | null
          endurance_plan?: Json | null
          estimated_one_rep_max_kg?: number | null
          exercise_id?: string | null
          id?: string
          intensity_pct?: number | null
          max_reps?: number | null
          max_sets?: number | null
          min_reps?: number | null
          min_sets?: number | null
          position?: number
          rep_max_kg?: number | null
          rep_max_update_mode?:
            | Database["public"]["Enums"]["rep_max_update_mode"]
            | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
          workout_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercise_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_custom_exercise_id_fkey"
            columns: ["custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          position: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_template_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "workout_template_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workout_template_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          coach_note: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          folder_id: string | null
          id: string
          is_public: boolean
          is_verified: boolean
          level: Database["public"]["Enums"]["template_level"] | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          coach_note?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          folder_id?: string | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          level?: Database["public"]["Enums"]["template_level"] | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          coach_note?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          folder_id?: string | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          level?: Database["public"]["Enums"]["template_level"] | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "workout_template_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workout_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
    }
    Views: {
      active_professional_clients: {
        Row: {
          assigned_food_template_id: string | null
          assigned_program_id: string | null
          client_id: string | null
          communication_boundaries: string | null
          contact_style: string | null
          created_at: string | null
          disconnected_at: string | null
          id: string | null
          joined_at: string | null
          prefix: string | null
          professional_id: string | null
          pronouns: string | null
          reminder_preference: string | null
        }
        Insert: {
          assigned_food_template_id?: string | null
          assigned_program_id?: string | null
          client_id?: string | null
          communication_boundaries?: string | null
          contact_style?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string | null
          joined_at?: string | null
          prefix?: string | null
          professional_id?: string | null
          pronouns?: string | null
          reminder_preference?: string | null
        }
        Update: {
          assigned_food_template_id?: string | null
          assigned_program_id?: string | null
          client_id?: string | null
          communication_boundaries?: string | null
          contact_style?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          id?: string | null
          joined_at?: string | null
          prefix?: string | null
          professional_id?: string | null
          pronouns?: string | null
          reminder_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_clients_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      admin_account_threads: {
        Row: {
          attachment_count: number | null
          created_at: string | null
          last_message_at: string | null
          message_count: number | null
          participant_one_email: string | null
          participant_one_first_name: string | null
          participant_one_id: string | null
          participant_two_email: string | null
          participant_two_first_name: string | null
          participant_two_id: string | null
          redacted_count: number | null
          thread_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_participant_one_id_fkey"
            columns: ["participant_one_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_participant_two_id_fkey"
            columns: ["participant_two_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      connected_professional_summary: {
        Row: {
          avatar_url: string | null
          bio: string | null
          first_name: string | null
          has_verified_licence: boolean | null
          headline: string | null
          id: string | null
          location: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          skills: string[] | null
          specialty: string | null
        }
        Relationships: []
      }
      current_health_metrics: {
        Row: {
          created_at: string | null
          id: string | null
          metric_type: Database["public"]["Enums"]["health_metric_type"] | null
          recorded_at: string | null
          source: Database["public"]["Enums"]["health_metric_source"] | null
          user_id: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      current_personal_records: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          custom_exercise_id: string | null
          estimated_one_rep_max_kg: number | null
          exercise_id: string | null
          id: string | null
          source_logged_set_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_custom_exercise_id_fkey"
            columns: ["custom_exercise_id"]
            isOneToOne: false
            referencedRelation: "custom_exercise_library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_source_logged_set_id_fkey"
            columns: ["source_logged_set_id"]
            isOneToOne: false
            referencedRelation: "logged_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      marketplace_classes: {
        Row: {
          booked_count: number | null
          business_id: string | null
          business_name: string | null
          class_id: string | null
          class_type: string | null
          end_time: string | null
          event_date: string | null
          is_full: boolean | null
          location: string | null
          max_capacity: number | null
          notes: string | null
          payment_type: string | null
          price: number | null
          spots_remaining: number | null
          start_time: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      marketplace_venues: {
        Row: {
          bio: string | null
          can_host_classes: boolean | null
          created_at: string | null
          kind: string | null
          lat: number | null
          lng: number | null
          location: string | null
          name: string | null
          perk: string | null
          upcoming_class_count: number | null
          venue_id: string | null
          venue_type: string | null
        }
        Relationships: []
      }
      messages_visible: {
        Row: {
          attachment_bytes: number | null
          attachment_kind: Database["public"]["Enums"]["attachment_kind"] | null
          attachment_mime: string | null
          attachment_name: string | null
          attachment_purged_at: string | null
          attachment_url: string | null
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          edit_count: number | null
          edited_at: string | null
          forwarded: boolean | null
          id: string | null
          image_height: number | null
          image_width: number | null
          read_at: string | null
          redacted_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          text: string | null
          thread_id: string | null
          voice_note_seconds: number | null
          voice_waveform: number[] | null
        }
        Insert: {
          attachment_bytes?: number | null
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_purged_at?: string | null
          attachment_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: never
          edit_count?: number | null
          edited_at?: string | null
          forwarded?: boolean | null
          id?: string | null
          image_height?: number | null
          image_width?: number | null
          read_at?: never
          redacted_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id?: string | null
          voice_note_seconds?: number | null
          voice_waveform?: number[] | null
        }
        Update: {
          attachment_bytes?: number | null
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_purged_at?: string | null
          attachment_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: never
          edit_count?: number | null
          edited_at?: string | null
          forwarded?: boolean | null
          id?: string | null
          image_height?: number | null
          image_width?: number | null
          read_at?: never
          redacted_at?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id?: string | null
          voice_note_seconds?: number | null
          voice_waveform?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      my_business_memberships: {
        Row: {
          accepted: boolean | null
          business_active: boolean | null
          business_id: string | null
          business_name: string | null
          ended_at: string | null
          id: string | null
          invited_at: string | null
          member_id: string | null
          membership_plan_id: string | null
          plan_name: string | null
          responded_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_members_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      my_class_schedule: {
        Row: {
          booked_at: string | null
          booking_id: string | null
          business_active: boolean | null
          business_id: string | null
          business_name: string | null
          class_id: string | null
          class_type: string | null
          end_time: string | null
          event_date: string | null
          max_capacity: number | null
          notes: string | null
          payment_type: string | null
          price: number | null
          professional_id: string | null
          start_time: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_classes_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      points_balance: {
        Row: {
          balance: number | null
          entry_count: number | null
          last_entry_at: string | null
          owner_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "points_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_rating_summary: {
        Row: {
          average_rating: number | null
          professional_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_reviews_readable: {
        Row: {
          body: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          professional_id: string | null
          rating: number | null
          redacted_at: string | null
          redaction_reason: string | null
          reviewer_id: string | null
          reviewer_name_visible: boolean | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          redacted_at?: string | null
          redaction_reason?: string | null
          reviewer_id?: never
          reviewer_name_visible?: boolean | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          professional_id?: string | null
          rating?: number | null
          redacted_at?: string | null
          redaction_reason?: string | null
          reviewer_id?: never
          reviewer_name_visible?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_awards: {
        Row: {
          awarded_month: string | null
          description: string | null
          id: string | null
          issuer: string | null
          position: number | null
          professional_id: string | null
          title: string | null
        }
        Insert: {
          awarded_month?: never
          description?: string | null
          id?: string | null
          issuer?: string | null
          position?: number | null
          professional_id?: string | null
          title?: string | null
        }
        Update: {
          awarded_month?: never
          description?: string | null
          id?: string | null
          issuer?: string | null
          position?: number | null
          professional_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_awards_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_directory: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          consultation_rate: number | null
          created_at: string | null
          facebook: string | null
          first_name: string | null
          has_verified_licence: boolean | null
          headline: string | null
          id: string | null
          instagram: string | null
          location: string | null
          monthly_rate: number | null
          payment_modalities:
            | Database["public"]["Enums"]["payment_modality"][]
            | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          profile_id: string | null
          review_count: number | null
          skills: string[] | null
          specialty: string | null
          updated_at: string | null
          website: string | null
          x: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_education: {
        Row: {
          degree: string | null
          description: string | null
          end_month: string | null
          field: string | null
          id: string | null
          institution: string | null
          position: number | null
          professional_id: string | null
          start_month: string | null
        }
        Insert: {
          degree?: string | null
          description?: string | null
          end_month?: never
          field?: string | null
          id?: string | null
          institution?: string | null
          position?: number | null
          professional_id?: string | null
          start_month?: never
        }
        Update: {
          degree?: string | null
          description?: string | null
          end_month?: never
          field?: string | null
          id?: string | null
          institution?: string | null
          position?: number | null
          professional_id?: string | null
          start_month?: never
        }
        Relationships: [
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_education_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_experience: {
        Row: {
          description: string | null
          end_month: string | null
          id: string | null
          location: string | null
          organisation: string | null
          position: number | null
          professional_id: string | null
          start_month: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          end_month?: never
          id?: string | null
          location?: string | null
          organisation?: string | null
          position?: number | null
          professional_id?: string | null
          start_month?: never
          title?: string | null
        }
        Update: {
          description?: string | null
          end_month?: never
          id?: string | null
          location?: string | null
          organisation?: string | null
          position?: number | null
          professional_id?: string | null
          start_month?: never
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_experience_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_languages: {
        Row: {
          id: string | null
          language: string | null
          position: number | null
          professional_id: string | null
          proficiency:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
        }
        Insert: {
          id?: string | null
          language?: string | null
          position?: number | null
          professional_id?: string | null
          proficiency?:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
        }
        Update: {
          id?: string | null
          language?: string | null
          position?: number | null
          professional_id?: string | null
          proficiency?:
            | Database["public"]["Enums"]["language_proficiency"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_languages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_licences: {
        Row: {
          credential_url: string | null
          expired: boolean | null
          expires_month: string | null
          id: string | null
          issued_month: string | null
          issuing_body: string | null
          name: string | null
          no_expiry: boolean | null
          position: number | null
          professional_id: string | null
          verified: boolean | null
        }
        Insert: {
          credential_url?: string | null
          expired?: never
          expires_month?: never
          id?: string | null
          issued_month?: never
          issuing_body?: string | null
          name?: string | null
          no_expiry?: boolean | null
          position?: number | null
          professional_id?: string | null
          verified?: never
        }
        Update: {
          credential_url?: string | null
          expired?: never
          expires_month?: never
          id?: string | null
          issued_month?: never
          issuing_body?: string | null
          name?: string | null
          no_expiry?: boolean | null
          position?: number | null
          professional_id?: string | null
          verified?: never
        }
        Relationships: [
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_licences_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_links: {
        Row: {
          id: string | null
          label: string | null
          position: number | null
          professional_id: string | null
          url: string | null
        }
        Insert: {
          id?: string | null
          label?: string | null
          position?: number | null
          professional_id?: string | null
          url?: string | null
        }
        Update: {
          id?: string | null
          label?: string | null
          position?: number | null
          professional_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_publications: {
        Row: {
          description: string | null
          id: string | null
          position: number | null
          professional_id: string | null
          published_month: string | null
          publisher: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          position?: number | null
          professional_id?: string | null
          published_month?: never
          publisher?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          position?: number | null
          professional_id?: string | null
          published_month?: never
          publisher?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_publications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_professional_volunteering: {
        Row: {
          description: string | null
          end_month: string | null
          id: string | null
          organisation: string | null
          position: number | null
          professional_id: string | null
          role: string | null
          start_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_volunteering_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      public_profile_summary: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          first_name: string | null
          id: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      related_profile_summary: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          first_name: string | null
          id: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          first_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      storage_purge_bucket_coverage: {
        Row: {
          bucket_exists: boolean | null
          bucket_id: string | null
          path_shape: string | null
          purge_covered: boolean | null
          uid_segment: number | null
        }
        Relationships: []
      }
      storage_purge_stalls: {
        Row: {
          deletion_requested_at: string | null
          objects_remaining: number | null
          pending_for: string | null
          user_id: string | null
        }
        Insert: {
          deletion_requested_at?: string | null
          objects_remaining?: never
          pending_for?: never
          user_id?: string | null
        }
        Update: {
          deletion_requested_at?: string | null
          objects_remaining?: never
          pending_for?: never
          user_id?: string | null
        }
        Relationships: []
      }
      thread_participant_summary: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          kind: Database["public"]["Enums"]["thread_kind"] | null
          participant_id: string | null
          thread_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_client_request: {
        Args: { p_request_id: string }
        Returns: {
          assigned_food_template_id: string | null
          assigned_program_id: string | null
          client_id: string
          communication_boundaries: string | null
          contact_style: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          joined_at: string
          prefix: string | null
          professional_id: string
          pronouns: string | null
          reminder_preference: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_group_invitation: {
        Args: { p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      account_erasure_date: {
        Args: { p_requested_at: string }
        Returns: string
      }
      achievement_progress: {
        Args: { p_user: string }
        Returns: {
          achievement_key: string
          current_value: number
        }[]
      }
      add_to_broadcast_list: {
        Args: { p_list_id: string; p_user_ids: string[] }
        Returns: number
      }
      admin_approve_certification: {
        Args: { p_note?: string; p_professional_id: string }
        Returns: Json
      }
      admin_approve_licence: {
        Args: { p_licence_id: string; p_note?: string }
        Returns: Json
      }
      admin_cancel_deletion: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_cancel_health_data_reset: {
        Args: { reason?: string; request_id: string }
        Returns: string
      }
      admin_clear_subscription_tier: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_contact_submissions: {
        Args: never
        Returns: {
          ack_sent_at: string
          ack_skipped_reason: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notified_at: string
          notify_suppressed_reason: string
          status: string
          status_changed_at: string
          topic: string
        }[]
      }
      admin_delete_contact_submission: {
        Args: { reason: string; submission_id: string }
        Returns: string
      }
      admin_grant_ambassador_status: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: Json
      }
      admin_health_data_reset_requests: {
        Args: never
        Returns: {
          cancelled_at: string
          execute_after: string
          executed_at: string
          id: string
          is_due: boolean
          purge_storage: boolean
          requested_at: string
          requested_by: string
          requested_by_email: string
          scope_all: boolean
          scope_tables: string[]
          status: string
          storage_objects_pending: number
          storage_purged_at: string
          table_count: number
          target_email: string
          target_first_name: string
          target_user_id: string
        }[]
      }
      admin_log_certification_view: {
        Args: { p_path: string; p_professional_id: string; p_reason: string }
        Returns: undefined
      }
      admin_log_licence_view: {
        Args: { p_licence_id: string; p_reason: string }
        Returns: {
          document_path: string
          professional_id: string
        }[]
      }
      admin_message_reports: {
        Args: { p_status?: Database["public"]["Enums"]["report_status"] }
        Returns: {
          admin_notes: string
          created_at: string
          detail: string
          message_created_at: string
          message_has_attachment: boolean
          message_id: string
          message_redacted: boolean
          message_text: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string
          reported_email: string
          reported_id: string
          reporter_email: string
          reporter_id: string
          reports_against_this_account: number
          reports_for_this_message: number
          resolved_at: string
          resolved_by: string
          status: Database["public"]["Enums"]["report_status"]
          thread_id: string
        }[]
      }
      admin_pending_licence_reviews: {
        Args: never
        Returns: {
          document_path: string
          is_legacy_certificate: boolean
          issuing_body: string
          licence_id: string
          licence_name: string
          previous_attempts: number
          professional_email: string
          professional_id: string
          professional_name: string
          review_id: string
          submitted_at: string
        }[]
      }
      admin_read_professional_reviews: {
        Args: { p_professional_id: string; p_reason: string }
        Returns: {
          body: string
          created_at: string
          edited_at: string
          professional_id: string
          rating: number
          redacted_at: string
          redacted_body: string
          redacted_by: string
          redaction_reason: string
          redactor_email: string
          review_id: string
          reviewer_email: string
          reviewer_first_name: string
          reviewer_id: string
        }[]
      }
      admin_read_support_thread: {
        Args: { thread_id: string }
        Returns: {
          authored_by: string
          created_at: string
          id: string
          read_at: string
          redacted_at: string
          sender_email: string
          sender_first_name: string
          sender_id: string
          sender_is_support: boolean
          text: string
        }[]
      }
      admin_read_thread_messages: {
        Args: { reason: string; thread_id: string }
        Returns: {
          attachment_purge_queued_at: string
          attachment_purged_at: string
          created_at: string
          forwarded: boolean
          has_attachment: boolean
          id: string
          redacted_at: string
          reply_to_id: string
          sender_email: string
          sender_first_name: string
          sender_id: string
          text: string
          voice_note_seconds: number
        }[]
      }
      admin_redact_message: {
        Args: {
          clear_attachment: boolean
          clear_text: boolean
          message_id: string
          reason?: string
        }
        Returns: string
      }
      admin_redact_professional_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: Json
      }
      admin_reject_certification: {
        Args: { p_professional_id: string; p_reason: string }
        Returns: Json
      }
      admin_reject_licence: {
        Args: { p_licence_id: string; p_reason: string }
        Returns: Json
      }
      admin_request_health_data_reset: {
        Args: {
          purge_storage?: boolean
          reason?: string
          scope: Json
          target_user_id: string
        }
        Returns: string
      }
      admin_reset_mfa: {
        Args: { p_factor_ids?: string[]; p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_reset_onboarding: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_resolve_message_report: {
        Args: {
          p_notes?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: Json
      }
      admin_revoke_ambassador_status: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: Json
      }
      admin_schedule_deletion: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_send_support_message: {
        Args: { body: string; reason?: string; thread_id: string }
        Returns: string
      }
      admin_set_contact_status: {
        Args: { new_status: string; reason?: string; submission_id: string }
        Returns: string
      }
      admin_set_subscription_tier: {
        Args: {
          force?: boolean
          reason?: string
          seat_blocks?: number
          target_user_id: string
          tier_id: string
        }
        Returns: string
      }
      admin_start_support_thread: {
        Args: { reason: string; target_user_id: string }
        Returns: string
      }
      admin_suspend_account: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_unsuspend_account: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_user_overview: {
        Args: never
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          active_clients: number
          active_professionals: number
          banned_until: string
          call_count: number
          certification_path: string
          certification_status: string
          customer_subtype: Database["public"]["Enums"]["customer_subtype"]
          deletion_requested_at: string
          email: string
          first_name: string
          id: string
          last_active_at: string
          message_count: number
          onboarded: boolean
          premium_plan: Database["public"]["Enums"]["premium_plan"]
          professional_subtype: Database["public"]["Enums"]["professional_subtype"]
          seat_blocks: number
          seats_used: number
          shared_consent_categories: string[]
          signed_up_at: string
          subscription_renews_at: string
          subscription_source: Database["public"]["Enums"]["professional_plan_source"]
          subscription_status: string
          subscription_tier: string
        }[]
      }
      adopt_workout_template: {
        Args: { p_template_id: string }
        Returns: {
          assigned_by_professional_id: string | null
          coach_note: string | null
          color: string | null
          created_at: string
          estimated_duration_min: number | null
          folder_id: string | null
          id: string
          name: string
          owner_id: string
          source_template_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_auto_streaks: { Args: never; Returns: number }
      am_i_blocked_with: { Args: { p_other: string }; Returns: boolean }
      assert_health_reset_coverage: { Args: never; Returns: undefined }
      assert_subscription_price_list: { Args: never; Returns: undefined }
      assert_workout_copy_complete: { Args: never; Returns: undefined }
      assign_template_to_client: {
        Args: {
          p_assigned_day?: string
          p_client_id: string
          p_confirm_overwrite?: boolean
          p_template_id: string
        }
        Returns: {
          assigned_by_professional_id: string | null
          coach_note: string | null
          color: string | null
          created_at: string
          estimated_duration_min: number | null
          folder_id: string | null
          id: string
          name: string
          owner_id: string
          source_template_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      broadcast_attachment_paths: {
        Args: { p_list_id: string; p_object_leaf: string }
        Returns: {
          destination_path: string
          is_source: boolean
          recipient_id: string
          thread_id: string
        }[]
      }
      broadcast_list_people: {
        Args: { p_list_id: string }
        Returns: {
          added_at: string
          avatar_url: string
          first_name: string
          user_id: string
        }[]
      }
      business_invite_member: {
        Args: {
          p_business_id: string
          p_member_id: string
          p_membership_plan_id?: string
        }
        Returns: {
          accepted: boolean | null
          business_id: string
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          member_id: string
          membership_plan_id: string | null
          responded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      business_is_listed: { Args: { p_business_id: string }; Returns: boolean }
      business_seat_capacity: {
        Args: { p_business_id: string }
        Returns: number
      }
      can_enroll_client_in_class: {
        Args: { p_class_id: string; p_client_id: string }
        Returns: boolean
      }
      can_invite_to_calendar: {
        Args: { p_invitee: string; p_inviter: string }
        Returns: boolean
      }
      can_review_professional: {
        Args: { p_professional: string; p_reviewer: string }
        Returns: boolean
      }
      can_see_store_listing: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      cancel_account_deletion: {
        Args: never
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          avatar_url: string | null
          created_at: string
          customer_subtype:
            | Database["public"]["Enums"]["customer_subtype"]
            | null
          date_of_birth: string | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          last_active_at: string
          onboarded: boolean
          phone: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          storage_bytes_used: number
          storage_purged_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_rate_limit: {
        Args: {
          p_action: Database["public"]["Enums"]["rate_limited_action"]
          p_max_attempts: number
          p_window: string
        }
        Returns: undefined
      }
      class_booked_count: { Args: { p_class_id: string }; Returns: number }
      clear_approximate_location: {
        Args: never
        Returns: {
          affiliated_business_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_label: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          headline: string | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          show_volunteering: boolean
          skills: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      client_cycle_phase: {
        Args: { p_client: string }
        Returns: Database["public"]["Enums"]["cycle_phase_kind"]
      }
      client_pregnancy_status: {
        Args: { p_client: string }
        Returns: {
          status: string
          trimester: number
        }[]
      }
      close_group: {
        Args: { p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      contraception_is_hormonal: { Args: { p_user: string }; Returns: boolean }
      create_broadcast_list: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_business_member_code: {
        Args: {
          p_business_id: string
          p_membership_plan_id?: string
          p_valid_for?: string
        }
        Returns: {
          business_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          membership_plan_id: string | null
          redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_member_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_client_code: {
        Args: { p_valid_for?: string }
        Returns: {
          code: string
          created_at: string
          expires_at: string
          id: string
          professional_id: string
          redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "client_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_group: {
        Args: { p_name: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_referral: {
        Args: { p_valid_for?: string }
        Returns: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          redeemed: boolean
          redeemed_at: string | null
          referee_discount_pct: number
          referee_id: string | null
          referrer_bonus_points: number
          referrer_discount_pct: number
          referrer_id: string
        }
        SetofOptions: {
          from: "*"
          to: "referrals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cycle_prediction: {
        Args: { p_on: string; p_user: string }
        Returns: {
          confidence: Database["public"]["Enums"]["cycle_confidence"]
          cycle_day: number
          fertile_from: string
          fertile_to: string
          flags: string[]
          irregular: boolean
          next_period_from: string
          next_period_start: string
          next_period_to: string
          ovulation_estimate: string
          phase: Database["public"]["Enums"]["cycle_phase_kind"]
          pregnancy_day: number
          pregnancy_week: number
          trimester: number
        }[]
      }
      cycle_today: { Args: { p_user: string }; Returns: string }
      decline_group_invitation: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      delete_broadcast_list: { Args: { p_list_id: string }; Returns: undefined }
      delete_message_for_everyone: {
        Args: { p_message_id: string }
        Returns: {
          attachment_bytes: number | null
          attachment_kind: Database["public"]["Enums"]["attachment_kind"] | null
          attachment_mime: string | null
          attachment_name: string | null
          attachment_purged_at: string | null
          attachment_url: string | null
          authored_by: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edit_count: number
          edited_at: string | null
          forwarded: boolean
          id: string
          image_height: number | null
          image_width: number | null
          read_at: string | null
          redacted_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          text: string | null
          thread_id: string
          voice_note_seconds: number | null
          voice_waveform: number[] | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_cycle_data: { Args: never; Returns: undefined }
      disconnect_client_relationship: {
        Args: { p_relationship_id: string }
        Returns: {
          assigned_food_template_id: string | null
          assigned_program_id: string | null
          client_id: string
          communication_boundaries: string | null
          contact_style: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          joined_at: string
          prefix: string | null
          professional_id: string
          pronouns: string | null
          reminder_preference: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      display_name_is_reserved: { Args: { p_name: string }; Returns: boolean }
      edit_message: {
        Args: { p_message_id: string; p_text: string }
        Returns: {
          attachment_bytes: number | null
          attachment_kind: Database["public"]["Enums"]["attachment_kind"] | null
          attachment_mime: string | null
          attachment_name: string | null
          attachment_purged_at: string | null
          attachment_url: string | null
          authored_by: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edit_count: number
          edited_at: string | null
          forwarded: boolean
          id: string
          image_height: number | null
          image_width: number | null
          read_at: string | null
          redacted_at: string | null
          reply_to_id: string | null
          sender_id: string | null
          text: string | null
          thread_id: string
          voice_note_seconds: number | null
          voice_waveform: number[] | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      effective_professional_tier: {
        Args: { p_professional_id: string }
        Returns: {
          max_clients: number
          source: Database["public"]["Enums"]["professional_plan_source"]
          tier_id: string
          tier_name: string
        }[]
      }
      end_business_membership: {
        Args: { p_membership_id: string }
        Returns: {
          accepted: boolean | null
          business_id: string
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          member_id: string
          membership_plan_id: string | null
          responded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_achievements: {
        Args: { p_user: string }
        Returns: {
          awarded_key: string
          awarded_points: number
        }[]
      }
      expire_stale_ringing_calls: { Args: never; Returns: number }
      finalize_health_data_storage_purge: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      finalize_message_attachment_purge: {
        Args: { p_message_id: string }
        Returns: boolean
      }
      finalize_storage_purge: { Args: { p_user_id: string }; Returns: boolean }
      find_or_create_food_by_barcode: {
        Args: {
          p_barcode: string
          p_calories: number
          p_carbs_g: number
          p_category: Database["public"]["Enums"]["food_category"]
          p_fat_g: number
          p_is_lebanese?: boolean
          p_name: string
          p_name_ar?: string
          p_protein_g: number
          p_serving_label: string
        }
        Returns: {
          barcode: string | null
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"]
          created_at: string
          fat_g: number
          id: string
          is_lebanese: boolean
          is_verified: boolean
          name: string
          name_ar: string | null
          protein_g: number
          serving_label: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gallery_attachments: {
        Args: {
          p_before?: string
          p_before_id?: string
          p_kind?: Database["public"]["Enums"]["attachment_kind"]
          p_limit?: number
          p_thread_id: string
        }
        Returns: {
          attachment_bytes: number
          attachment_kind: Database["public"]["Enums"]["attachment_kind"]
          attachment_mime: string
          attachment_name: string
          attachment_url: string
          created_at: string
          forwarded: boolean
          image_height: number
          image_width: number
          message_id: string
          sender_id: string
          voice_note_seconds: number
          voice_waveform: number[]
        }[]
      }
      generate_business_member_code: {
        Args: { p_prefix: string }
        Returns: string
      }
      generate_client_code: { Args: { p_prefix: string }; Returns: string }
      generate_referral_code: { Args: { p_prefix: string }; Returns: string }
      group_members: {
        Args: { p_thread_id: string }
        Returns: {
          avatar_url: string
          first_name: string
          joined_at: string
          role: Database["public"]["Enums"]["thread_member_role"]
          status: Database["public"]["Enums"]["thread_member_status"]
          user_id: string
        }[]
      }
      group_message_read_count: {
        Args: { p_message_id: string }
        Returns: number
      }
      group_message_readers: {
        Args: { p_message_id: string }
        Returns: {
          avatar_url: string
          first_name: string
          read_at: string
          user_id: string
        }[]
      }
      has_class_booking: { Args: { p_class_id: string }; Returns: boolean }
      has_client_access: {
        Args: {
          p_category: Database["public"]["Enums"]["access_category"]
          p_client_id: string
        }
        Returns: boolean
      }
      health_data_reset_eligible_tables: { Args: never; Returns: string[] }
      health_data_reset_excluded_tables: {
        Args: never
        Returns: {
          reason: string
          table_name: string
        }[]
      }
      health_data_reset_storage_map: {
        Args: never
        Returns: {
          bucket_id: string
          file_column: string
          table_name: string
        }[]
      }
      invite_to_group: {
        Args: { p_thread_id: string; p_user_ids: string[] }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_ambassador: { Args: { p_profile_id: string }; Returns: boolean }
      is_business_insider: { Args: { p_business_id: string }; Returns: boolean }
      is_calendar_invitee: { Args: { p_event_id: string }; Returns: boolean }
      is_disposable_email: { Args: { email: string }; Returns: boolean }
      is_thread_participant: {
        Args: { p_thread_id: string; p_user: string }
        Returns: boolean
      }
      leave_group: { Args: { p_thread_id: string }; Returns: undefined }
      licence_is_verified: { Args: { p_licence_id: string }; Returns: boolean }
      list_pending_health_data_storage_purges: {
        Args: never
        Returns: {
          bucket_id: string
          object_name: string
          request_id: string
          user_id: string
        }[]
      }
      list_pending_message_attachment_purges: {
        Args: never
        Returns: {
          bucket_id: string
          message_id: string
          object_name: string
        }[]
      }
      list_pending_storage_purges: {
        Args: never
        Returns: {
          bucket_id: string
          object_name: string
          user_id: string
        }[]
      }
      listing_needs_date_of_birth: { Args: never; Returns: boolean }
      mark_thread_read: { Args: { p_thread_id: string }; Returns: string }
      may_open_message_attachment: {
        Args: { p_name: string }
        Returns: boolean
      }
      may_use_thread_channel: { Args: { p_topic: string }; Returns: boolean }
      message_is_editable: {
        Args: { p_message_id: string; p_user: string }
        Returns: boolean
      }
      my_achievements: {
        Args: never
        Returns: {
          category: Database["public"]["Enums"]["achievement_category"]
          current_value: number
          description: string
          earned_at: string
          group_key: string
          icon: string
          key: string
          level: Database["public"]["Enums"]["achievement_level"]
          newly_earned: boolean
          points: number
          sort_order: number
          threshold: number
          title: string
        }[]
      }
      my_broadcast_lists: {
        Args: never
        Returns: {
          created_at: string
          id: string
          last_sent_at: string
          member_count: number
          name: string
        }[]
      }
      my_broadcasts: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          list_id: string
          list_name: string
          sent_at: string
          sent_count: number
          skipped_count: number
        }[]
      }
      my_business_seat_capacity: {
        Args: never
        Returns: {
          business_id: string
          capacity: number
          seat_blocks: number
          seats_per_unit: number
          seats_used: number
        }[]
      }
      my_contraception_status: {
        Args: never
        Returns: {
          days_until: number
          method: Database["public"]["Enums"]["contraception_method"]
          next_event_kind: string
          next_event_on: string
          pack_day: number
          pack_phase: string
          pill_taken_today: boolean
        }[]
      }
      my_conversations: {
        Args: never
        Returns: {
          kind: Database["public"]["Enums"]["thread_kind"]
          last_message_at: string
          last_message_deleted: boolean
          last_message_has_attachment: boolean
          last_message_id: string
          last_message_is_voice_note: boolean
          last_message_redacted: boolean
          last_message_sender_id: string
          last_message_text: string
          last_read_at: string
          other_avatar_url: string
          other_first_name: string
          other_participant_id: string
          thread_id: string
          thread_name: string
          unread_count: number
        }[]
      }
      my_cycle_prediction: {
        Args: { p_on?: string }
        Returns: {
          confidence: Database["public"]["Enums"]["cycle_confidence"]
          cycle_day: number
          fertile_from: string
          fertile_to: string
          flags: string[]
          irregular: boolean
          next_period_from: string
          next_period_start: string
          next_period_to: string
          ovulation_estimate: string
          phase: Database["public"]["Enums"]["cycle_phase_kind"]
          pregnancy_day: number
          pregnancy_week: number
          trimester: number
        }[]
      }
      my_effective_professional_tier: {
        Args: never
        Returns: {
          max_clients: number
          source: Database["public"]["Enums"]["professional_plan_source"]
          tier_id: string
          tier_name: string
        }[]
      }
      my_group_invitations: {
        Args: never
        Returns: {
          group_name: string
          invited_at: string
          invited_by_avatar_url: string
          invited_by_first_name: string
          invited_by_id: string
          member_count: number
          thread_id: string
        }[]
      }
      my_meditation_summary: {
        Args: never
        Returns: {
          current_streak_days: number
          local_today: string
          minutes_this_week: number
          minutes_today: number
          seconds_this_week: number
          seconds_today: number
          sessions_this_week: number
        }[]
      }
      my_professional_plan: {
        Args: never
        Returns: {
          free_period_ended: boolean
          free_period_ends_at: string
          max_clients: number
          may_connect_clients: boolean
          source: Database["public"]["Enums"]["professional_plan_source"]
          tier_id: string
          tier_name: string
        }[]
      }
      my_points_summary: {
        Args: never
        Returns: {
          achievement_points: number
          achievements_earned: number
          balance: number
          next_tier_min_points: number
          next_tier_name: string
          other_points: number
          points_to_next_tier: number
          referral_points: number
          tier_min_points: number
          tier_name: string
        }[]
      }
      normalise_display_name: { Args: { p_name: string }; Returns: string }
      preview_client_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          expires_at: string
          professional_avatar_url: string
          professional_first_name: string
          professional_id: string
          professional_subtype: Database["public"]["Enums"]["professional_subtype"]
          redeemed: boolean
        }[]
      }
      preview_referral: {
        Args: { p_code: string }
        Returns: {
          code: string
          redeemed: boolean
          referee_discount_pct: number
          referrer_avatar_url: string
          referrer_discount_pct: number
          referrer_first_name: string
          referrer_id: string
        }[]
      }
      process_health_data_resets: { Args: never; Returns: number }
      process_scheduled_account_deletions: { Args: never; Returns: number }
      professional_cv_is_visible: {
        Args: { p_professional_id: string }
        Returns: boolean
      }
      professional_has_verified_licence: {
        Args: { p_professional_id: string }
        Returns: boolean
      }
      professional_is_affiliated: {
        Args: { p_professional_id: string }
        Returns: boolean
      }
      professional_is_listed: {
        Args: { p_professional_id: string }
        Returns: boolean
      }
      professionals_in_area: {
        Args: {
          p_before_band?: number
          p_before_id?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
          p_subtype?: Database["public"]["Enums"]["professional_subtype"]
        }
        Returns: {
          approx_lat: number
          approx_lng: number
          area_label: string
          avatar_url: string
          average_rating: number
          band_rank: number
          bio: string
          consultation_rate: number
          distance_band: string
          facebook: string
          first_name: string
          has_verified_licence: boolean
          headline: string
          instagram: string
          location: string
          monthly_rate: number
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          professional_id: string
          professional_subtype: Database["public"]["Enums"]["professional_subtype"]
          review_count: number
          skills: string[]
          specialty: string
          website: string
          x: string
        }[]
      }
      purge_contact_submissions: { Args: never; Returns: Json }
      queue_account_email: { Args: { p_id: string }; Returns: boolean }
      queue_contraception_reminders: { Args: never; Returns: number }
      reconcile_storage_usage: {
        Args: { p_user_id?: string }
        Returns: {
          actual_bytes: number
          corrected: boolean
          stored_bytes: number
          user_id: string
        }[]
      }
      record_push_failure: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      redact_admin_actions_for_erasure: {
        Args: { p_user_id: string }
        Returns: number
      }
      redact_erased_identifiers: {
        Args: { p_details: Json; p_scrub_text: boolean; p_user_id: string }
        Returns: Json
      }
      redeem_business_member_code: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["redeem_business_member_code_result"]
        SetofOptions: {
          from: "*"
          to: "redeem_business_member_code_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_client_code: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["redeem_client_code_result"]
        SetofOptions: {
          from: "*"
          to: "redeem_client_code_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_referral: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["redeem_referral_result"]
        SetofOptions: {
          from: "*"
          to: "redeem_referral_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_client_request: {
        Args: { p_request_id: string }
        Returns: {
          customer_id: string
          id: string
          professional_id: string
          requested_at: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "pending_client_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_from_broadcast_list: {
        Args: { p_list_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_group_member: {
        Args: { p_thread_id: string; p_user_id: string }
        Returns: undefined
      }
      rename_broadcast_list: {
        Args: { p_list_id: string; p_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "broadcast_lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rename_group: {
        Args: { p_name: string; p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          name: string | null
          participant_one_id: string | null
          participant_two_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_account_deletion: {
        Args: never
        Returns: {
          account_type: Database["public"]["Enums"]["account_type"]
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          avatar_url: string | null
          created_at: string
          customer_subtype:
            | Database["public"]["Enums"]["customer_subtype"]
            | null
          date_of_birth: string | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          last_active_at: string
          onboarded: boolean
          phone: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          storage_bytes_used: number
          storage_purged_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_business_membership: {
        Args: { p_accept: boolean; p_membership_id: string }
        Returns: {
          accepted: boolean | null
          business_id: string
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          member_id: string
          membership_plan_id: string | null
          responded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_account_emails: { Args: never; Returns: number }
      retry_undelivered_reminders: { Args: never; Returns: number }
      retry_welcome_emails: { Args: never; Returns: number }
      review_author_names: {
        Args: { p_review_ids: string[] }
        Returns: {
          first_name: string
          review_id: string
        }[]
      }
      review_reviewer_id: { Args: { p_review_id: string }; Returns: string }
      scrub_account_email_personal_data: { Args: never; Returns: number }
      search_messages: {
        Args: {
          p_before?: string
          p_before_id?: string
          p_limit?: number
          p_query: string
          p_thread_id?: string
        }
        Returns: {
          attachment_kind: Database["public"]["Enums"]["attachment_kind"]
          attachment_name: string
          created_at: string
          edited_at: string
          matched_in: string
          message_id: string
          sender_id: string
          text: string
          thread_id: string
        }[]
      }
      send_broadcast: {
        Args: { p_list_id: string; p_text: string }
        Returns: {
          id: string
          list_id: string | null
          list_name: string
          owner_id: string
          sent_at: string
          sent_count: number
          skipped_count: number
        }
        SetofOptions: {
          from: "*"
          to: "broadcasts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_approximate_location: {
        Args: { p_label?: string; p_lat: number; p_lng: number }
        Returns: {
          affiliated_business_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_label: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          headline: string | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          show_volunteering: boolean
          skills: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_business_member_plan: {
        Args: { p_membership_id: string; p_plan_id: string }
        Returns: {
          accepted: boolean | null
          business_id: string
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          invited_at: string
          invited_by: string | null
          member_id: string
          membership_plan_id: string | null
          responded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_public_listing: {
        Args: { p_listed: boolean }
        Returns: {
          affiliated_business_id: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          specialty: string | null
          updated_at: string
          website: string | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      star_messages: { Args: { p_message_ids: string[] }; Returns: number }
      start_message_thread: {
        Args: { p_other_user_id: string }
        Returns: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          participant_one_id: string | null
          participant_two_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "message_threads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storage_cap_bytes: { Args: { p_user_id: string }; Returns: number }
      storage_object_owner: {
        Args: { p_bucket: string; p_name: string }
        Returns: string
      }
      storage_objects_for_user: {
        Args: { p_user_id: string }
        Returns: {
          bucket_id: string
          object_name: string
        }[]
      }
      storage_path_token: {
        Args: { p_index: number; p_name: string }
        Returns: string
      }
      storage_path_uuid: {
        Args: { p_index: number; p_name: string }
        Returns: string
      }
      storage_usage: {
        Args: never
        Returns: {
          cap_bytes: number
          remaining_bytes: number
          used_bytes: number
        }[]
      }
      sweep_achievements: { Args: never; Returns: number }
      system_support_identity: { Args: never; Returns: string }
      thread_allows_attachments: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      thread_allows_calls: {
        Args: { p_caller_id: string; p_thread_id: string }
        Returns: boolean
      }
      thread_channel_topic: { Args: { p_thread_id: string }; Returns: string }
      thread_is_muted: {
        Args: { p_thread_id: string; p_user: string }
        Returns: boolean
      }
      thread_participants: {
        Args: { p_thread_id: string }
        Returns: {
          user_id: string
        }[]
      }
      thread_read_through: {
        Args: { p_thread_id: string; p_user: string }
        Returns: string
      }
      thread_shows_read_receipts: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      touch_last_active: { Args: never; Returns: string }
      trigger_call_cap_sweep: { Args: never; Returns: number }
      trigger_health_data_storage_purge: { Args: never; Returns: number }
      trigger_message_attachment_purge: { Args: never; Returns: number }
      trigger_storage_purge: { Args: never; Returns: number }
      user_timezone: { Args: { p_user: string }; Returns: string }
      user_today: { Args: { p_user: string }; Returns: string }
      users_are_blocked: {
        Args: { p_one: string; p_two: string }
        Returns: boolean
      }
      users_have_active_relationship: {
        Args: { p_one: string; p_two: string }
        Returns: boolean
      }
      valid_endurance_plan: { Args: { p: Json }; Returns: boolean }
      valid_endurance_result: { Args: { r: Json }; Returns: boolean }
      valid_endurance_step: { Args: { s: Json }; Returns: boolean }
      valid_endurance_target: { Args: { t: Json }; Returns: boolean }
      valid_exercise_tags: { Args: { t: string[] }; Returns: boolean }
      valid_string_set: {
        Args: { allowed: string[]; v: string[] }
        Returns: boolean
      }
    }
    Enums: {
      access_category:
        | "food_diary"
        | "workout_activity"
        | "weight"
        | "progress"
        | "health_metrics"
        | "lab_results"
        | "medical_history"
        | "body_measurements"
        | "blood_pressure"
        | "cycle_phase"
        | "pregnancy"
      account_type: "customer" | "professional" | "business"
      achievement_category:
        | "getting_started"
        | "nutrition"
        | "training"
        | "health"
        | "mind"
        | "consistency"
        | "community"
        | "explorer"
      achievement_level: "bronze" | "silver" | "gold"
      activity_level:
        | "sedentary"
        | "light"
        | "moderate"
        | "very_active"
        | "athlete"
      app_language: "en" | "ar"
      app_platform: "web" | "mobile"
      attachment_kind: "image" | "voice" | "file"
      billing_period: "daily" | "monthly" | "annually"
      block_kind: "superset" | "amrap" | "emom" | "for_time"
      blood_marker_status: "low" | "normal" | "high"
      business_type:
        | "gym"
        | "store"
        | "supplement_store"
        | "equipment_seller"
        | "wellness_service"
        | "clothing_store"
        | "meal_prep_service"
      calendar_repeat: "none" | "daily" | "weekly" | "monthly"
      call_kind: "video" | "voice"
      call_status:
        | "ringing"
        | "answered"
        | "declined"
        | "missed"
        | "completed"
        | "cap_ended"
        | "failed"
      cervical_mucus: "dry" | "sticky" | "creamy" | "watery" | "egg_white"
      color_theme: "centium" | "ocean" | "sunset" | "berry"
      contraception_event:
        | "pill_taken"
        | "pill_missed"
        | "pill_late"
        | "ring_inserted"
        | "ring_removed"
        | "patch_applied"
        | "patch_removed"
        | "injection_given"
        | "device_inserted"
        | "device_removed"
      contraception_method:
        | "none"
        | "pill_combined"
        | "pill_progestin"
        | "iud_hormonal"
        | "iud_copper"
        | "implant"
        | "injection"
        | "ring"
        | "patch"
        | "condom"
        | "other"
      customer_subtype: "client" | "regular" | "athlete" | "general"
      cycle_confidence: "low" | "medium" | "high"
      cycle_flow: "none" | "spotting" | "light" | "medium" | "heavy"
      cycle_phase_kind:
        | "menstrual"
        | "follicular"
        | "ovulatory"
        | "luteal"
        | "hormonal_contraception"
        | "pregnant"
        | "unavailable"
      dietary_restriction:
        | "vegetarian"
        | "vegan"
        | "gluten_free"
        | "dairy_free"
        | "nut_free"
        | "low_carb"
        | "pescatarian"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      external_food_source: "open_food_facts"
      exercise_classification:
        | "barbell"
        | "dumbbell"
        | "machine_other"
        | "weighted_bodyweight"
        | "assisted_bodyweight"
        | "reps_only"
        | "cardio"
        | "duration"
      food_category:
        | "traditional"
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snacks"
        | "drinks"
        | "restaurant"
        | "homemade"
        | "ingredients"
        | "meal_prep"
      food_log_source: "search" | "ai" | "scan" | "barcode" | "recent" | "quick"
      food_unit: "serving" | "g" | "ml" | "cup" | "tbsp" | "tsp"
      habit_icon:
        | "water"
        | "steps"
        | "workout"
        | "journal"
        | "meditation"
        | "sleep"
        | "book"
        | "custom"
      health_metric_source: "manual" | "apple_health" | "android_health"
      health_metric_type:
        | "weight"
        | "heart_rate"
        | "steps"
        | "sleep"
        | "water"
        | "calories_burned"
        | "waist"
        | "hips"
        | "chest"
        | "neck"
        | "shoulders"
        | "arm_left"
        | "arm_right"
        | "forearm_left"
        | "forearm_right"
        | "thigh_left"
        | "thigh_right"
        | "calf_left"
        | "calf_right"
        | "body_fat_pct"
      health_provider: "apple_health" | "android_health"
      language_proficiency:
        | "native"
        | "fluent"
        | "professional"
        | "conversational"
        | "basic"
      lh_test_result: "negative" | "positive" | "peak"
      meal_slot: "breakfast" | "lunch" | "snack" | "dinner"
      measurement_goal: "decrease" | "increase" | "maintain"
      medication_route: "oral" | "injectable" | "topical" | "inhaled" | "other"
      message_flag: "starred" | "hidden"
      mind_content_type: "breathing" | "stretch" | "yoga"
      mind_difficulty: "beginner" | "intermediate" | "advanced"
      mind_stretch_type: "static" | "dynamic"
      muscle_group:
        | "back"
        | "bicep"
        | "calves"
        | "cardio"
        | "chest"
        | "core"
        | "forearms"
        | "glutes"
        | "hamstrings"
        | "olympic"
        | "other"
        | "quads"
        | "shoulders"
        | "tricep"
      notification_detail_level: "neutral" | "detailed"
      nutrition_plan_type: "custom" | "existing"
      offering_category:
        | "gyms"
        | "classes"
        | "stores"
        | "clothing"
        | "equipment"
        | "supplements"
        | "wellness"
        | "meal_prep"
      payment_modality: "cash" | "card" | "whish"
      points_source:
        | "streak"
        | "referral"
        | "manual_adjustment"
        | "other"
        | "achievement"
      pregnancy_outcome: "birth" | "loss" | "other"
      pregnancy_status: "active" | "ended"
      pregnancy_test_result: "negative" | "positive"
      premium_plan: "monthly" | "yearly"
      professional_plan_source: "own_subscription" | "business_seat" | "default"
      professional_subtype:
        | "trainer"
        | "physiotherapist"
        | "dietitian"
        | "doctor"
        | "other"
      rate_limited_action:
        | "create_client_code"
        | "redeem_client_code"
        | "preview_client_code"
        | "create_referral"
        | "redeem_referral"
        | "preview_referral"
        | "create_food_by_barcode"
        | "create_business_member_code"
        | "redeem_business_member_code"
        | "lookup_barcode"
        | "check_disposable_email"
        | "start_conversation"
        | "send_message"
        | "forward_message"
        | "create_group"
        | "invite_to_group"
        | "send_broadcast"
      rep_max_update_mode: "no_update" | "prompt" | "prompt_with_estimate"
      report_reason:
        | "harassment"
        | "spam"
        | "inappropriate_content"
        | "impersonation"
        | "safety_concern"
      report_status: "open" | "actioned" | "dismissed"
      request_status: "pending" | "accepted" | "rejected"
      set_outcome: "completed" | "skipped" | "failed"
      set_type: "normal" | "warmup" | "failure" | "dropset" | "superset" | "pr"
      sex: "female" | "male" | "other"
      sex_activity: "none" | "protected" | "unprotected"
      store_owner_type: "business" | "professional"
      subscription_status: "active" | "cancelled" | "expired"
      subscription_tier_type: "professional" | "business" | "client"
      template_level: "beginner" | "intermediate" | "advanced"
      theme_mode: "light" | "dark" | "auto"
      thread_kind: "peer" | "official_support" | "group"
      thread_member_role: "owner" | "member"
      thread_member_status:
        | "invited"
        | "joined"
        | "declined"
        | "left"
        | "removed"
      weight_goal: "lose" | "gain" | "maintain"
      widget_size: "small" | "large"
      widget_type:
        | "steps"
        | "weight"
        | "water"
        | "sleep"
        | "nutrition"
        | "workout"
        | "body_fat"
        | "heart_rate"
        | "habits"
        | "journal"
        | "meditation"
        | "gym_passes"
    }
    CompositeTypes: {
      redeem_business_member_code_result: {
        success: boolean | null
        message: string | null
        membership:
          | Database["public"]["Tables"]["business_members"]["Row"]
          | null
      }
      redeem_client_code_result: {
        success: boolean | null
        message: string | null
        relationship:
          | Database["public"]["Tables"]["professional_clients"]["Row"]
          | null
      }
      redeem_referral_result: {
        success: boolean | null
        message: string | null
        referral: Database["public"]["Tables"]["referrals"]["Row"] | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_category: [
        "food_diary",
        "workout_activity",
        "weight",
        "progress",
        "health_metrics",
        "lab_results",
        "medical_history",
        "body_measurements",
        "blood_pressure",
        "cycle_phase",
        "pregnancy",
      ],
      account_type: ["customer", "professional", "business"],
      achievement_category: [
        "getting_started",
        "nutrition",
        "training",
        "health",
        "mind",
        "consistency",
        "community",
        "explorer",
      ],
      achievement_level: ["bronze", "silver", "gold"],
      activity_level: [
        "sedentary",
        "light",
        "moderate",
        "very_active",
        "athlete",
      ],
      app_language: ["en", "ar"],
      app_platform: ["web", "mobile"],
      attachment_kind: ["image", "voice", "file"],
      billing_period: ["daily", "monthly", "annually"],
      block_kind: ["superset", "amrap", "emom", "for_time"],
      blood_marker_status: ["low", "normal", "high"],
      business_type: [
        "gym",
        "store",
        "supplement_store",
        "equipment_seller",
        "wellness_service",
        "clothing_store",
        "meal_prep_service",
      ],
      calendar_repeat: ["none", "daily", "weekly", "monthly"],
      call_kind: ["video", "voice"],
      call_status: [
        "ringing",
        "answered",
        "declined",
        "missed",
        "completed",
        "cap_ended",
        "failed",
      ],
      cervical_mucus: ["dry", "sticky", "creamy", "watery", "egg_white"],
      color_theme: ["centium", "ocean", "sunset", "berry"],
      contraception_event: [
        "pill_taken",
        "pill_missed",
        "pill_late",
        "ring_inserted",
        "ring_removed",
        "patch_applied",
        "patch_removed",
        "injection_given",
        "device_inserted",
        "device_removed",
      ],
      contraception_method: [
        "none",
        "pill_combined",
        "pill_progestin",
        "iud_hormonal",
        "iud_copper",
        "implant",
        "injection",
        "ring",
        "patch",
        "condom",
        "other",
      ],
      customer_subtype: ["client", "regular", "athlete", "general"],
      cycle_confidence: ["low", "medium", "high"],
      cycle_flow: ["none", "spotting", "light", "medium", "heavy"],
      cycle_phase_kind: [
        "menstrual",
        "follicular",
        "ovulatory",
        "luteal",
        "hormonal_contraception",
        "pregnant",
        "unavailable",
      ],
      dietary_restriction: [
        "vegetarian",
        "vegan",
        "gluten_free",
        "dairy_free",
        "nut_free",
        "low_carb",
        "pescatarian",
      ],
      exercise_classification: [
        "barbell",
        "dumbbell",
        "machine_other",
        "weighted_bodyweight",
        "assisted_bodyweight",
        "reps_only",
        "cardio",
        "duration",
      ],
      food_category: [
        "traditional",
        "breakfast",
        "lunch",
        "dinner",
        "snacks",
        "drinks",
        "restaurant",
        "homemade",
        "ingredients",
        "meal_prep",
      ],
      food_log_source: ["search", "ai", "scan", "barcode", "recent", "quick"],
      food_unit: ["serving", "g", "ml", "cup", "tbsp", "tsp"],
      habit_icon: [
        "water",
        "steps",
        "workout",
        "journal",
        "meditation",
        "sleep",
        "book",
        "custom",
      ],
      health_metric_source: ["manual", "apple_health", "android_health"],
      health_metric_type: [
        "weight",
        "heart_rate",
        "steps",
        "sleep",
        "water",
        "calories_burned",
        "waist",
        "hips",
        "chest",
        "neck",
        "shoulders",
        "arm_left",
        "arm_right",
        "forearm_left",
        "forearm_right",
        "thigh_left",
        "thigh_right",
        "calf_left",
        "calf_right",
        "body_fat_pct",
      ],
      health_provider: ["apple_health", "android_health"],
      language_proficiency: [
        "native",
        "fluent",
        "professional",
        "conversational",
        "basic",
      ],
      lh_test_result: ["negative", "positive", "peak"],
      meal_slot: ["breakfast", "lunch", "snack", "dinner"],
      measurement_goal: ["decrease", "increase", "maintain"],
      medication_route: ["oral", "injectable", "topical", "inhaled", "other"],
      message_flag: ["starred", "hidden"],
      mind_content_type: ["breathing", "stretch", "yoga"],
      mind_difficulty: ["beginner", "intermediate", "advanced"],
      mind_stretch_type: ["static", "dynamic"],
      muscle_group: [
        "back",
        "bicep",
        "calves",
        "cardio",
        "chest",
        "core",
        "forearms",
        "glutes",
        "hamstrings",
        "olympic",
        "other",
        "quads",
        "shoulders",
        "tricep",
      ],
      notification_detail_level: ["neutral", "detailed"],
      nutrition_plan_type: ["custom", "existing"],
      offering_category: [
        "gyms",
        "classes",
        "stores",
        "clothing",
        "equipment",
        "supplements",
        "wellness",
        "meal_prep",
      ],
      payment_modality: ["cash", "card", "whish"],
      points_source: [
        "streak",
        "referral",
        "manual_adjustment",
        "other",
        "achievement",
      ],
      pregnancy_outcome: ["birth", "loss", "other"],
      pregnancy_status: ["active", "ended"],
      pregnancy_test_result: ["negative", "positive"],
      premium_plan: ["monthly", "yearly"],
      professional_plan_source: [
        "own_subscription",
        "business_seat",
        "default",
      ],
      professional_subtype: [
        "trainer",
        "physiotherapist",
        "dietitian",
        "doctor",
        "other",
      ],
      rate_limited_action: [
        "create_client_code",
        "redeem_client_code",
        "preview_client_code",
        "create_referral",
        "redeem_referral",
        "preview_referral",
        "create_food_by_barcode",
        "create_business_member_code",
        "redeem_business_member_code",
        "lookup_barcode",
        "check_disposable_email",
        "start_conversation",
        "send_message",
        "forward_message",
        "create_group",
        "invite_to_group",
        "send_broadcast",
      ],
      rep_max_update_mode: ["no_update", "prompt", "prompt_with_estimate"],
      report_reason: [
        "harassment",
        "spam",
        "inappropriate_content",
        "impersonation",
        "safety_concern",
      ],
      report_status: ["open", "actioned", "dismissed"],
      request_status: ["pending", "accepted", "rejected"],
      set_outcome: ["completed", "skipped", "failed"],
      set_type: ["normal", "warmup", "failure", "dropset", "superset", "pr"],
      sex: ["female", "male", "other"],
      sex_activity: ["none", "protected", "unprotected"],
      store_owner_type: ["business", "professional"],
      subscription_status: ["active", "cancelled", "expired"],
      subscription_tier_type: ["professional", "business", "client"],
      template_level: ["beginner", "intermediate", "advanced"],
      theme_mode: ["light", "dark", "auto"],
      thread_kind: ["peer", "official_support", "group"],
      thread_member_role: ["owner", "member"],
      thread_member_status: [
        "invited",
        "joined",
        "declined",
        "left",
        "removed",
      ],
      weight_goal: ["lose", "gain", "maintain"],
      widget_size: ["small", "large"],
      widget_type: [
        "steps",
        "weight",
        "water",
        "sleep",
        "nutrition",
        "workout",
        "body_fat",
        "heart_rate",
        "habits",
        "journal",
        "meditation",
        "gym_passes",
      ],
    },
  },
} as const
