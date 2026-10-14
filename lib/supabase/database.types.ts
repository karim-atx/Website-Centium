export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          reminder_days: number | null
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
          reminder_days?: number | null
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
          reminder_days?: number | null
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
      activity_daily: {
        Row: {
          active_minutes: number | null
          created_at: string
          distance_m: number | null
          floors: number | null
          id: string
          kcal_burned: number | null
          local_date: string
          resting_bpm: number | null
          source: Database["public"]["Enums"]["health_metric_source"]
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minutes?: number | null
          created_at?: string
          distance_m?: number | null
          floors?: number | null
          id?: string
          kcal_burned?: number | null
          local_date: string
          resting_bpm?: number | null
          source?: Database["public"]["Enums"]["health_metric_source"]
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minutes?: number | null
          created_at?: string
          distance_m?: number | null
          floors?: number | null
          id?: string
          kcal_burned?: number | null
          local_date?: string
          resting_bpm?: number | null
          source?: Database["public"]["Enums"]["health_metric_source"]
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      activity_hourly: {
        Row: {
          created_at: string
          hour: number
          id: string
          kcal: number | null
          local_date: string
          source: Database["public"]["Enums"]["health_metric_source"]
          steps: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          hour: number
          id?: string
          kcal?: number | null
          local_date: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          steps?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          hour?: number
          id?: string
          kcal?: number | null
          local_date?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          steps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_hourly_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
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
          display_name: string | null
          granted_at: string
          id: string
          note: string | null
          owner_id: string
        }
        Insert: {
          display_name?: string | null
          granted_at?: string
          id?: string
          note?: string | null
          owner_id: string
        }
        Update: {
          display_name?: string | null
          granted_at?: string
          id?: string
          note?: string | null
          owner_id?: string
        }
        Relationships: []
      }
      advanced_monitoring: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "advanced_monitoring_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
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
        ]
      }
      app_preferences: {
        Row: {
          created_at: string
          hide_read_receipts: boolean
          id: string
          language: Database["public"]["Enums"]["app_language"]
          message_push_preview: boolean
          notification_allow: boolean
          notification_business_bookings: boolean
          notification_business_members: boolean
          notification_business_orders: boolean
          notification_business_payments: boolean
          notification_business_reviews: boolean
          notification_business_team: boolean
          notification_calendar_events: boolean
          notification_forum_replies: boolean
          notification_habits: boolean
          notification_health_checks: boolean
          notification_journal: boolean
          notification_meal_reminders: boolean
          notification_medications: boolean
          notification_memberships: boolean
          notification_mentions: boolean
          notification_orders: boolean
          notification_professional_messages: boolean
          notification_referral_rewards: boolean
          notification_reviews: boolean
          notification_streak_alerts: boolean
          notification_water: boolean
          notification_weekly_summary: boolean
          notification_workout_reminders: boolean
          owner_id: string
          quiet_hours_enabled: boolean
          quiet_hours_from: string
          quiet_hours_to: string
          reminders_paused: boolean
          unit_system: Database["public"]["Enums"]["unit_system"]
          updated_at: string
          water_unit: Database["public"]["Enums"]["water_unit"]
        }
        Insert: {
          created_at?: string
          hide_read_receipts?: boolean
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          message_push_preview?: boolean
          notification_allow?: boolean
          notification_business_bookings?: boolean
          notification_business_members?: boolean
          notification_business_orders?: boolean
          notification_business_payments?: boolean
          notification_business_reviews?: boolean
          notification_business_team?: boolean
          notification_calendar_events?: boolean
          notification_forum_replies?: boolean
          notification_habits?: boolean
          notification_health_checks?: boolean
          notification_journal?: boolean
          notification_meal_reminders?: boolean
          notification_medications?: boolean
          notification_memberships?: boolean
          notification_mentions?: boolean
          notification_orders?: boolean
          notification_professional_messages?: boolean
          notification_referral_rewards?: boolean
          notification_reviews?: boolean
          notification_streak_alerts?: boolean
          notification_water?: boolean
          notification_weekly_summary?: boolean
          notification_workout_reminders?: boolean
          owner_id: string
          quiet_hours_enabled?: boolean
          quiet_hours_from?: string
          quiet_hours_to?: string
          reminders_paused?: boolean
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          water_unit?: Database["public"]["Enums"]["water_unit"]
        }
        Update: {
          created_at?: string
          hide_read_receipts?: boolean
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          message_push_preview?: boolean
          notification_allow?: boolean
          notification_business_bookings?: boolean
          notification_business_members?: boolean
          notification_business_orders?: boolean
          notification_business_payments?: boolean
          notification_business_reviews?: boolean
          notification_business_team?: boolean
          notification_calendar_events?: boolean
          notification_forum_replies?: boolean
          notification_habits?: boolean
          notification_health_checks?: boolean
          notification_journal?: boolean
          notification_meal_reminders?: boolean
          notification_medications?: boolean
          notification_memberships?: boolean
          notification_mentions?: boolean
          notification_orders?: boolean
          notification_professional_messages?: boolean
          notification_referral_rewards?: boolean
          notification_reviews?: boolean
          notification_streak_alerts?: boolean
          notification_water?: boolean
          notification_weekly_summary?: boolean
          notification_workout_reminders?: boolean
          owner_id?: string
          quiet_hours_enabled?: boolean
          quiet_hours_from?: string
          quiet_hours_to?: string
          reminders_paused?: boolean
          unit_system?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
          water_unit?: Database["public"]["Enums"]["water_unit"]
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
      barcode_lookup_misses: {
        Row: {
          barcode: string
          checked_at: string
        }
        Insert: {
          barcode: string
          checked_at?: string
        }
        Update: {
          barcode?: string
          checked_at?: string
        }
        Relationships: []
      }
      blood_markers: {
        Row: {
          blood_panel_id: string | null
          created_at: string
          id: string
          marker_key: string | null
          name: string
          range_high: number | null
          range_low: number | null
          result_date: string | null
          source: string | null
          status: Database["public"]["Enums"]["blood_marker_status"] | null
          unit: string
          user_id: string
          value: number
        }
        Insert: {
          blood_panel_id?: string | null
          created_at?: string
          id?: string
          marker_key?: string | null
          name: string
          range_high?: number | null
          range_low?: number | null
          result_date?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["blood_marker_status"] | null
          unit: string
          user_id: string
          value: number
        }
        Update: {
          blood_panel_id?: string | null
          created_at?: string
          id?: string
          marker_key?: string | null
          name?: string
          range_high?: number | null
          range_low?: number | null
          result_date?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["blood_marker_status"] | null
          unit?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_markers_marker_key_fkey"
            columns: ["marker_key"]
            isOneToOne: false
            referencedRelation: "lab_markers"
            referencedColumns: ["key"]
          },
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
          file_bytes: number | null
          file_name: string | null
          file_pages: number | null
          file_type: string | null
          id: string
          name: string | null
          panel_date: string
          source_image_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_bytes?: number | null
          file_name?: string | null
          file_pages?: number | null
          file_type?: string | null
          id?: string
          name?: string | null
          panel_date: string
          source_image_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_bytes?: number | null
          file_name?: string | null
          file_pages?: number | null
          file_type?: string | null
          id?: string
          name?: string | null
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
          edited_at: string | null
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
          edited_at?: string | null
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
          edited_at?: string | null
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
      broadcast_deliveries: {
        Row: {
          broadcast_id: string
          message_id: string
          recipient_id: string | null
        }
        Insert: {
          broadcast_id: string
          message_id: string
          recipient_id?: string | null
        }
        Update: {
          broadcast_id?: string
          message_id?: string
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_deliveries_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "broadcast_deliveries_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      broadcast_list_members: {
        Row: {
          added_at: string
          list_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          list_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "broadcast_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "broadcast_list_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      broadcast_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "broadcast_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          id: string
          list_id: string | null
          list_name: string
          owner_id: string
          sent_at: string
          sent_count: number
          skipped_count: number
        }
        Insert: {
          id?: string
          list_id?: string | null
          list_name: string
          owner_id: string
          sent_at?: string
          sent_count?: number
          skipped_count?: number
        }
        Update: {
          id?: string
          list_id?: string | null
          list_name?: string
          owner_id?: string
          sent_at?: string
          sent_count?: number
          skipped_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "broadcast_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "broadcasts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          route: string | null
          screenshot_path: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          route?: string | null
          screenshot_path?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          route?: string | null
          screenshot_path?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
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
          calendar_event_id: string | null
          client_id: string
          created_at: string
          id: string
          marked_paid_by: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          price_agreed: number | null
          updated_at: string
        }
        Insert: {
          business_class_id: string
          calendar_event_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          marked_paid_by?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          price_agreed?: number | null
          updated_at?: string
        }
        Update: {
          business_class_id?: string
          calendar_event_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          marked_paid_by?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          price_agreed?: number | null
          updated_at?: string
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
            foreignKeyName: "business_class_bookings_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_class_bookings_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_class_cancellations: {
        Row: {
          business_class_id: string
          cancelled_at: string
          client_id: string
          hours_before: number
          id: string
          was_free: boolean
        }
        Insert: {
          business_class_id: string
          cancelled_at?: string
          client_id: string
          hours_before: number
          id?: string
          was_free: boolean
        }
        Update: {
          business_class_id?: string
          cancelled_at?: string
          client_id?: string
          hours_before?: number
          id?: string
          was_free?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_class_cancellations_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "business_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_cancellations_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "marketplace_classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_cancellations_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_class_cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_class_waitlist: {
        Row: {
          business_class_id: string
          client_id: string
          id: string
          joined_at: string
          offer_expires_at: string | null
          offered_at: string | null
          resolved_at: string | null
          state: Database["public"]["Enums"]["class_waitlist_state"]
        }
        Insert: {
          business_class_id: string
          client_id: string
          id?: string
          joined_at?: string
          offer_expires_at?: string | null
          offered_at?: string | null
          resolved_at?: string | null
          state?: Database["public"]["Enums"]["class_waitlist_state"]
        }
        Update: {
          business_class_id?: string
          client_id?: string
          id?: string
          joined_at?: string
          offer_expires_at?: string | null
          offered_at?: string | null
          resolved_at?: string | null
          state?: Database["public"]["Enums"]["class_waitlist_state"]
        }
        Relationships: [
          {
            foreignKeyName: "business_class_waitlist_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "business_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_waitlist_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "marketplace_classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_waitlist_business_class_id_fkey"
            columns: ["business_class_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_class_waitlist_client_id_fkey"
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
          cancellation_hours: number | null
          class_type: string | null
          created_at: string
          end_time: string
          event_date: string
          gym_id: string | null
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
          cancellation_hours?: number | null
          class_type?: string | null
          created_at?: string
          end_time: string
          event_date: string
          gym_id?: string | null
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
          cancellation_hours?: number | null
          class_type?: string | null
          created_at?: string
          end_time?: string
          event_date?: string
          gym_id?: string | null
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
            foreignKeyName: "business_classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
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
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invite_message: string | null
          invited_by: string | null
          pay_rate_per_class: number | null
          permissions: string[]
          professional_id: string
          role: Database["public"]["Enums"]["business_role"]
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invite_message?: string | null
          invited_by?: string | null
          pay_rate_per_class?: number | null
          permissions?: string[]
          professional_id: string
          role?: Database["public"]["Enums"]["business_role"]
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invite_message?: string | null
          invited_by?: string | null
          pay_rate_per_class?: number | null
          permissions?: string[]
          professional_id?: string
          role?: Database["public"]["Enums"]["business_role"]
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
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_employees_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_employees_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      business_join_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          message: string | null
          professional_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["join_request_status"]
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          message?: string | null
          professional_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          message?: string | null
          professional_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "business_join_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_join_requests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "business_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
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
          business_code: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          categories: string[]
          cover_url: string | null
          created_at: string
          deactivated_at: string | null
          id: string
          instagram: string | null
          location: string | null
          logo_url: string | null
          members_reached: number
          perk: string | null
          profile_id: string
          public_email: string | null
          public_phone: string | null
          public_website: string | null
          short_description: string | null
          slug: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          branch_type?: string | null
          business_code?: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          categories?: string[]
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          instagram?: string | null
          location?: string | null
          logo_url?: string | null
          members_reached?: number
          perk?: string | null
          profile_id: string
          public_email?: string | null
          public_phone?: string | null
          public_website?: string | null
          short_description?: string | null
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          branch_type?: string | null
          business_code?: string | null
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          categories?: string[]
          cover_url?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          instagram?: string | null
          location?: string | null
          logo_url?: string | null
          members_reached?: number
          perk?: string | null
          profile_id?: string
          public_email?: string | null
          public_phone?: string | null
          public_website?: string | null
          short_description?: string | null
          slug?: string | null
          timezone?: string
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
      business_store_settings: {
        Row: {
          allow_exchanges: boolean
          business_id: string
          created_at: string
          delivery_enabled: boolean
          delivery_fee: number | null
          delivery_time_text: string | null
          free_delivery_over: number | null
          offers_appointments: boolean
          pickup_enabled: boolean
          returns_policy: string | null
          sells_products: boolean
          updated_at: string
        }
        Insert: {
          allow_exchanges?: boolean
          business_id: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee?: number | null
          delivery_time_text?: string | null
          free_delivery_over?: number | null
          offers_appointments?: boolean
          pickup_enabled?: boolean
          returns_policy?: string | null
          sells_products?: boolean
          updated_at?: string
        }
        Update: {
          allow_exchanges?: boolean
          business_id?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee?: number | null
          delivery_time_text?: string | null
          free_delivery_over?: number | null
          offers_appointments?: boolean
          pickup_enabled?: boolean
          returns_policy?: string | null
          sells_products?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_store_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_store_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_verifications: {
        Row: {
          business_id: string
          created_at: string
          file_paths: string[]
          id: string
          items: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          file_paths?: string[]
          id?: string
          items?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          file_paths?: string[]
          id?: string
          items?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      calendar_event_exceptions: {
        Row: {
          calendar_event_id: string
          cancelled: boolean
          created_at: string
          occurrence_date: string
          override: Json | null
          updated_at: string
        }
        Insert: {
          calendar_event_id: string
          cancelled?: boolean
          created_at?: string
          occurrence_date: string
          override?: Json | null
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string
          cancelled?: boolean
          created_at?: string
          occurrence_date?: string
          override?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_exceptions_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_invitees: {
        Row: {
          accepted: boolean | null
          alert: Database["public"]["Enums"]["calendar_alert"]
          calendar_event_id: string
          id: string
          invited_at: string
          invited_by: string | null
          invited_user_id: string
          responded_at: string | null
        }
        Insert: {
          accepted?: boolean | null
          alert?: Database["public"]["Enums"]["calendar_alert"]
          calendar_event_id: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          invited_user_id: string
          responded_at?: string | null
        }
        Update: {
          accepted?: boolean | null
          alert?: Database["public"]["Enums"]["calendar_alert"]
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
          alert: Database["public"]["Enums"]["calendar_alert"]
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
          repeat_until: string | null
          source_id: string | null
          source_kind: string | null
          source_template_assignment_id: string | null
          start_time: string | null
          starts_at: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          alert?: Database["public"]["Enums"]["calendar_alert"]
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
          repeat_until?: string | null
          source_id?: string | null
          source_kind?: string | null
          source_template_assignment_id?: string | null
          start_time?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          alert?: Database["public"]["Enums"]["calendar_alert"]
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
          repeat_until?: string | null
          source_id?: string | null
          source_kind?: string | null
          source_template_assignment_id?: string | null
          start_time?: string | null
          starts_at?: string | null
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
      clinical_sources: {
        Row: {
          citation: string | null
          created_at: string
          feature: string
          informs: string
          key: string
          organisation: string
          published_year: number | null
          sort_order: number
          title: string
          url: string
          url_verified_on: string
        }
        Insert: {
          citation?: string | null
          created_at?: string
          feature: string
          informs: string
          key: string
          organisation: string
          published_year?: number | null
          sort_order: number
          title: string
          url: string
          url_verified_on: string
        }
        Update: {
          citation?: string | null
          created_at?: string
          feature?: string
          informs?: string
          key?: string
          organisation?: string
          published_year?: number | null
          sort_order?: number
          title?: string
          url?: string
          url_verified_on?: string
        }
        Relationships: []
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
          ack_failed_at: string | null
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
          support_thread_id: string | null
          topic: string
        }
        Insert: {
          ack_failed_at?: string | null
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
          support_thread_id?: string | null
          topic: string
        }
        Update: {
          ack_failed_at?: string | null
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
          support_thread_id?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_support_thread_id_fkey"
            columns: ["support_thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "contact_submissions_support_thread_id_fkey"
            columns: ["support_thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_submissions_support_thread_id_fkey"
            columns: ["support_thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
        ]
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
      course_categories: {
        Row: {
          created_at: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          key: string
          name: string
          sort_order: number
        }
        Update: {
          created_at?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      course_certificates: {
        Row: {
          course_id: string
          enrolment_id: string
          id: string
          issued_at: string
          learner_id: string
          serial: string
          shared: boolean
        }
        Insert: {
          course_id: string
          enrolment_id: string
          id?: string
          issued_at?: string
          learner_id: string
          serial: string
          shared?: boolean
        }
        Update: {
          course_id?: string
          enrolment_id?: string
          id?: string
          issued_at?: string
          learner_id?: string
          serial?: string
          shared?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: true
            referencedRelation: "course_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_certificates_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      course_enrolments: {
        Row: {
          commission_percent: number | null
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          last_seen_at: string | null
          learner_id: string
          price_cents_paid: number
          tier: string
        }
        Insert: {
          commission_percent?: number | null
          course_id: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          last_seen_at?: string | null
          learner_id: string
          price_cents_paid?: number
          tier?: string
        }
        Update: {
          commission_percent?: number | null
          course_id?: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          last_seen_at?: string | null
          learner_id?: string
          price_cents_paid?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrolments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_enrolments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      course_lesson_progress: {
        Row: {
          completed_at: string
          enrolment_id: string
          lesson_id: string
        }
        Insert: {
          completed_at?: string
          enrolment_id: string
          lesson_id: string
        }
        Update: {
          completed_at?: string
          enrolment_id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_progress_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "course_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          minutes: number | null
          module_id: string
          pass_mark: number | null
          pdf_path: string | null
          position: number
          revision_id: string | null
          title: string
          video_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          minutes?: number | null
          module_id: string
          pass_mark?: number | null
          pdf_path?: string | null
          position: number
          revision_id?: string | null
          title: string
          video_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          minutes?: number | null
          module_id?: string
          pass_mark?: number | null
          pdf_path?: string | null
          position?: number
          revision_id?: string | null
          title?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "course_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          revision_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position: number
          revision_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          revision_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_modules_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "course_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_pdfs: {
        Row: {
          attached_at: string | null
          course_id: string
          created_at: string
          path: string
          uploaded_by: string | null
        }
        Insert: {
          attached_at?: string | null
          course_id: string
          created_at?: string
          path: string
          uploaded_by?: string | null
        }
        Update: {
          attached_at?: string | null
          course_id?: string
          created_at?: string
          path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_pdfs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_pdfs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      course_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          body: string
          course_id: string
          created_at: string
          enrolment_id: string
          id: string
          lesson_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          body: string
          course_id: string
          created_at?: string
          enrolment_id: string
          id?: string
          lesson_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          body?: string
          course_id?: string
          created_at?: string
          enrolment_id?: string
          id?: string
          lesson_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_questions_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "course_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_attempts: {
        Row: {
          attempted_at: string
          enrolment_id: string
          id: string
          lesson_id: string
          passed: boolean
          score_percent: number
        }
        Insert: {
          attempted_at?: string
          enrolment_id: string
          id?: string
          lesson_id: string
          passed: boolean
          score_percent: number
        }
        Update: {
          attempted_at?: string
          enrolment_id?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_attempts_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "course_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_options: {
        Row: {
          body: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
        }
        Insert: {
          body: string
          id?: string
          is_correct?: boolean
          position: number
          question_id: string
        }
        Update: {
          body?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "course_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_questions: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          position: number
          prompt: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          position: number
          prompt: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_ratings: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          learner_id: string
          stars: number
          updated_at: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          learner_id: string
          stars: number
          updated_at?: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          learner_id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_ratings_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      course_reports: {
        Row: {
          admin_notes: string | null
          course_id: string
          created_at: string
          detail: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_notes?: string | null
          course_id: string
          created_at?: string
          detail?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_notes?: string | null
          course_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "course_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "course_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      course_revisions: {
        Row: {
          category_key: string | null
          content_changed: boolean
          course_id: string
          cover_colour: string | null
          created_at: string
          id: string
          learn_points: string[] | null
          level: string | null
          price_cents: number | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          subtitle: string | null
          title: string | null
          weekly_hours: number | null
        }
        Insert: {
          category_key?: string | null
          content_changed?: boolean
          course_id: string
          cover_colour?: string | null
          created_at?: string
          id?: string
          learn_points?: string[] | null
          level?: string | null
          price_cents?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          subtitle?: string | null
          title?: string | null
          weekly_hours?: number | null
        }
        Update: {
          category_key?: string | null
          content_changed?: boolean
          course_id?: string
          cover_colour?: string | null
          created_at?: string
          id?: string
          learn_points?: string[] | null
          level?: string | null
          price_cents?: number | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          subtitle?: string | null
          title?: string | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_revisions_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "course_revisions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string | null
          category_key: string
          cover_colour: string
          created_at: string
          currency: string
          id: string
          learn_points: string[]
          level: string
          price_cents: number
          published_at: string | null
          review_reason: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          subtitle: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          weekly_hours: number | null
        }
        Insert: {
          author_id?: string | null
          category_key: string
          cover_colour?: string
          created_at?: string
          currency?: string
          id?: string
          learn_points?: string[]
          level?: string
          price_cents?: number
          published_at?: string | null
          review_reason?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          subtitle?: string | null
          title: string
          unpublished_at?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Update: {
          author_id?: string | null
          category_key?: string
          cover_colour?: string
          created_at?: string
          currency?: string
          id?: string
          learn_points?: string[]
          level?: string
          price_cents?: number
          published_at?: string | null
          review_reason?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          subtitle?: string | null
          title?: string
          unpublished_at?: string | null
          updated_at?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "courses_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      custom_exercise_library_items: {
        Row: {
          breathing: string | null
          category: Database["public"]["Enums"]["muscle_group"] | null
          classification: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes: string[] | null
          created_at: string
          cues: string[] | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation: string | null
          harder_variation: string | null
          id: string
          instructions_reviewed: boolean
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          owner_id: string
          safety_notes: string[] | null
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          setup: string[] | null
          source_custom_exercise_id: string | null
          steps: string[] | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          breathing?: string | null
          category?: Database["public"]["Enums"]["muscle_group"] | null
          classification: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes?: string[] | null
          created_at?: string
          cues?: string[] | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          id?: string
          instructions_reviewed?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          owner_id: string
          safety_notes?: string[] | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          setup?: string[] | null
          source_custom_exercise_id?: string | null
          steps?: string[] | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          breathing?: string | null
          category?: Database["public"]["Enums"]["muscle_group"] | null
          classification?: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes?: string[] | null
          created_at?: string
          cues?: string[] | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          id?: string
          instructions_reviewed?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          owner_id?: string
          safety_notes?: string[] | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          setup?: string[] | null
          source_custom_exercise_id?: string | null
          steps?: string[] | null
          tags?: string[]
          updated_at?: string
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
          external_fetched_at: string | null
          external_ref: string | null
          external_source:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
      custom_health_checks: {
        Row: {
          created_at: string
          done_on: string | null
          id: string
          interval_months: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_on?: string | null
          id?: string
          interval_months: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_on?: string | null
          id?: string
          interval_months?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "custom_health_checks_user_id_fkey"
            columns: ["user_id"]
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
          period_reminder: boolean
          period_reminder_days: number
          pill_reminder: boolean
          shown_for_any_sex: boolean
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
          period_reminder?: boolean
          period_reminder_days?: number
          pill_reminder?: boolean
          shown_for_any_sex?: boolean
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
          period_reminder?: boolean
          period_reminder_days?: number
          pill_reminder?: boolean
          shown_for_any_sex?: boolean
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
      daily_active_snapshots: {
        Row: {
          active_1d: number
          active_30d: number
          active_7d: number
          captured_at: string
          new_accounts: number
          pending_deletions: number
          snapshot_on: string
          total_accounts: number
        }
        Insert: {
          active_1d: number
          active_30d: number
          active_7d: number
          captured_at?: string
          new_accounts: number
          pending_deletions: number
          snapshot_on: string
          total_accounts: number
        }
        Update: {
          active_1d?: number
          active_30d?: number
          active_7d?: number
          captured_at?: string
          new_accounts?: number
          pending_deletions?: number
          snapshot_on?: string
          total_accounts?: number
        }
        Relationships: []
      }
      device_presentation_settings: {
        Row: {
          bigger_tap_targets: boolean
          color_theme: Database["public"]["Enums"]["color_theme"]
          created_at: string
          high_contrast: boolean
          id: string
          larger_text: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          reduce_motion: boolean
          theme: Database["public"]["Enums"]["theme_mode"]
          updated_at: string
        }
        Insert: {
          bigger_tap_targets?: boolean
          color_theme?: Database["public"]["Enums"]["color_theme"]
          created_at?: string
          high_contrast?: boolean
          id?: string
          larger_text?: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["app_platform"]
          reduce_motion?: boolean
          theme?: Database["public"]["Enums"]["theme_mode"]
          updated_at?: string
        }
        Update: {
          bigger_tap_targets?: boolean
          color_theme?: Database["public"]["Enums"]["color_theme"]
          created_at?: string
          high_contrast?: boolean
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
      disposable_email_domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
        }
        Relationships: []
      }
      email_domain_allowlist: {
        Row: {
          added_at: string
          domain: string
          reason: string
        }
        Insert: {
          added_at?: string
          domain: string
          reason: string
        }
        Update: {
          added_at?: string
          domain?: string
          reason?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          aliases: string[]
          breathing: string | null
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes: string[] | null
          created_at: string
          cues: string[] | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation: string | null
          harder_variation: string | null
          id: string
          instructions_reviewed: boolean
          is_verified: boolean
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          safety_notes: string[] | null
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          setup: string[] | null
          steps: string[] | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          breathing?: string | null
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes?: string[] | null
          created_at?: string
          cues?: string[] | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          id?: string
          instructions_reviewed?: boolean
          is_verified?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          safety_notes?: string[] | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          setup?: string[] | null
          steps?: string[] | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          breathing?: string | null
          category?: Database["public"]["Enums"]["muscle_group"]
          classification?: Database["public"]["Enums"]["exercise_classification"]
          common_mistakes?: string[] | null
          created_at?: string
          cues?: string[] | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"] | null
          easier_variation?: string | null
          harder_variation?: string | null
          id?: string
          instructions_reviewed?: boolean
          is_verified?: boolean
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          safety_notes?: string[] | null
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          setup?: string[] | null
          steps?: string[] | null
          tags?: string[]
          updated_at?: string
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
          calories: number
          carbs_g: number
          category: Database["public"]["Enums"]["food_category"] | null
          created_at: string
          custom_food_id: string | null
          external_fetched_at: string | null
          external_ref: string | null
          external_source:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
          calories: number
          carbs_g: number
          category?: Database["public"]["Enums"]["food_category"] | null
          created_at?: string
          custom_food_id?: string | null
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
          calories?: number
          carbs_g?: number
          category?: Database["public"]["Enums"]["food_category"] | null
          created_at?: string
          custom_food_id?: string | null
          external_fetched_at?: string | null
          external_ref?: string | null
          external_source?:
            | Database["public"]["Enums"]["external_food_source"]
            | null
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
          source: Database["public"]["Enums"]["food_source"]
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
          source?: Database["public"]["Enums"]["food_source"]
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
          source?: Database["public"]["Enums"]["food_source"]
          updated_at?: string
        }
        Relationships: []
      }
      forum_block_labels: {
        Row: {
          block_ref: string
          blocked_id: string
          blocker_id: string
          created_at: string
          label: string
        }
        Insert: {
          block_ref?: string
          blocked_id: string
          blocker_id: string
          created_at?: string
          label: string
        }
        Update: {
          block_ref?: string
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_block_labels_block_fkey"
            columns: ["blocker_id", "blocked_id"]
            isOneToOne: true
            referencedRelation: "user_blocks"
            referencedColumns: ["blocker_id", "blocked_id"]
          },
        ]
      }
      forum_blocked_terms: {
        Row: {
          created_at: string
          kind: string
          term: string
        }
        Insert: {
          created_at?: string
          kind?: string
          term: string
        }
        Update: {
          created_at?: string
          kind?: string
          term?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string
          key: string
          name: string
          sensitivity: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          key: string
          name: string
          sensitivity?: string
          sort_order: number
        }
        Update: {
          created_at?: string
          key?: string
          name?: string
          sensitivity?: string
          sort_order?: number
        }
        Relationships: []
      }
      forum_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_by: string
          mentioned_user_id: string
          reply_id: string | null
          thread_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_by: string
          mentioned_user_id: string
          reply_id?: string | null
          thread_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_by?: string
          mentioned_user_id?: string
          reply_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_mentions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mentions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_nicknames: {
        Row: {
          created_at: string
          nickname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nickname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nickname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_nicknames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      forum_photos: {
        Row: {
          attached_at: string | null
          created_at: string
          last_attempt_at: string | null
          path: string
          purge_after: string | null
          purge_attempts: number
          purged_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attached_at?: string | null
          created_at?: string
          last_attempt_at?: string | null
          path: string
          purge_after?: string | null
          purge_attempts?: number
          purged_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attached_at?: string | null
          created_at?: string
          last_attempt_at?: string | null
          path?: string
          purge_after?: string | null
          purge_attempts?: number
          purged_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          emoji: string
          reply_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          reply_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          edit_count: number
          edited_at: string | null
          id: string
          identity: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          status: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          identity: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          identity?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          detail: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reply_id: string | null
          reported_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          thread_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reply_id?: string | null
          reported_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reply_id?: string | null
          reported_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies_readable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reserved_nicknames: {
        Row: {
          created_at: string
          term: string
        }
        Insert: {
          created_at?: string
          term: string
        }
        Update: {
          created_at?: string
          term?: string
        }
        Relationships: []
      }
      forum_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string
          until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          until: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          until?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string | null
          body: string
          category_key: string
          created_at: string
          deleted_at: string | null
          edit_count: number
          edited_at: string | null
          id: string
          identity: string
          locked_at: string | null
          locked_by: string | null
          photo_path: string | null
          pinned_at: string | null
          pinned_by: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          category_key: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          identity: string
          locked_at?: string | null
          locked_by?: string | null
          photo_path?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          category_key?: string
          created_at?: string
          deleted_at?: string | null
          edit_count?: number
          edited_at?: string | null
          id?: string
          identity?: string
          locked_at?: string | null
          locked_by?: string | null
          photo_path?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "forum_threads_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      forum_warnings: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      gym_area_hours: {
        Row: {
          area_name: string
          closed: boolean
          closes_at: string | null
          created_at: string
          gym_id: string
          id: string
          open_24h: boolean
          opens_at: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          area_name: string
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          open_24h?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          area_name?: string
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          open_24h?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_area_hours_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_hours: {
        Row: {
          closed: boolean
          closes_at: string | null
          created_at: string
          gym_id: string
          id: string
          open_24h: boolean
          opens_at: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          gym_id: string
          id?: string
          open_24h?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          closed?: boolean
          closes_at?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          open_24h?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_hours_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_memberships: {
        Row: {
          cancel_at_period_end: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ended_by: string | null
          expires_on: string | null
          gym_id: string
          id: string
          marked_paid_by: string | null
          member_id: string
          paid_at: string | null
          pass_token: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_id: string | null
          price_agreed: number
          renewed_from_id: string | null
          started_on: string
          status: Database["public"]["Enums"]["gym_membership_status"]
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ended_by?: string | null
          expires_on?: string | null
          gym_id: string
          id?: string
          marked_paid_by?: string | null
          member_id: string
          paid_at?: string | null
          pass_token: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          plan_id?: string | null
          price_agreed: number
          renewed_from_id?: string | null
          started_on?: string
          status?: Database["public"]["Enums"]["gym_membership_status"]
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ended_by?: string | null
          expires_on?: string | null
          gym_id?: string
          id?: string
          marked_paid_by?: string | null
          member_id?: string
          paid_at?: string | null
          pass_token?: string
          payment_method?: Database["public"]["Enums"]["venue_payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          plan_id?: string | null
          price_agreed?: number
          renewed_from_id?: string | null
          started_on?: string
          status?: Database["public"]["Enums"]["gym_membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_memberships_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "gym_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_renewed_from_fkey"
            columns: ["renewed_from_id"]
            isOneToOne: false
            referencedRelation: "gym_memberships"
            referencedColumns: ["id"]
          },
        ]
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
      gym_review_helpful_votes: {
        Row: {
          review_id: string
          voted_at: string
          voter_id: string
        }
        Insert: {
          review_id: string
          voted_at?: string
          voter_id: string
        }
        Update: {
          review_id?: string
          voted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gym_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_review_helpful_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      gym_reviews: {
        Row: {
          author_id: string
          author_name_visible: boolean
          body: string
          created_at: string
          edited_at: string | null
          gym_id: string
          id: string
          rating: number
          redacted_at: string | null
          redacted_by: string | null
          redaction_reason: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name_visible?: boolean
          body: string
          created_at?: string
          edited_at?: string | null
          gym_id: string
          id?: string
          rating: number
          redacted_at?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name_visible?: boolean
          body?: string
          created_at?: string
          edited_at?: string | null
          gym_id?: string
          id?: string
          rating?: number
          redacted_at?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gym_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "gym_reviews_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          access_bluetooth: boolean
          access_nfc: boolean
          access_qr: boolean
          bio: string | null
          business_id: string | null
          cover_url: string | null
          created_at: string
          default_cancellation_hours: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          lat: number
          lng: number
          location: string
          logo_url: string | null
          name: string
          perk: string | null
          public_email: string | null
          public_phones: string[]
          public_website: string | null
          timezone: string
          updated_at: string
          venue_kind: Database["public"]["Enums"]["venue_kind"]
        }
        Insert: {
          access_bluetooth?: boolean
          access_nfc?: boolean
          access_qr?: boolean
          bio?: string | null
          business_id?: string | null
          cover_url?: string | null
          created_at?: string
          default_cancellation_hours?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          lat: number
          lng: number
          location: string
          logo_url?: string | null
          name: string
          perk?: string | null
          public_email?: string | null
          public_phones?: string[]
          public_website?: string | null
          timezone?: string
          updated_at?: string
          venue_kind?: Database["public"]["Enums"]["venue_kind"]
        }
        Update: {
          access_bluetooth?: boolean
          access_nfc?: boolean
          access_qr?: boolean
          bio?: string | null
          business_id?: string | null
          cover_url?: string | null
          created_at?: string
          default_cancellation_hours?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          lat?: number
          lng?: number
          location?: string
          logo_url?: string | null
          name?: string
          perk?: string | null
          public_email?: string | null
          public_phones?: string[]
          public_website?: string | null
          timezone?: string
          updated_at?: string
          venue_kind?: Database["public"]["Enums"]["venue_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "gyms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
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
          archived_at: string | null
          colour: Database["public"]["Enums"]["habit_colour"]
          created_at: string
          icon: Database["public"]["Enums"]["habit_icon"]
          id: string
          label: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          colour?: Database["public"]["Enums"]["habit_colour"]
          created_at?: string
          icon: Database["public"]["Enums"]["habit_icon"]
          id?: string
          label: string
          owner_id: string
          position: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          colour?: Database["public"]["Enums"]["habit_colour"]
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
      health_check_reminders: {
        Row: {
          active: boolean
          created_at: string
          custom_check_id: string | null
          every_n: number | null
          id: string
          remind_at: string
          remind_on: string
          repeat: string
          state_key: Database["public"]["Enums"]["health_check_key"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_check_id?: string | null
          every_n?: number | null
          id?: string
          remind_at?: string
          remind_on: string
          repeat?: string
          state_key?: Database["public"]["Enums"]["health_check_key"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_check_id?: string | null
          every_n?: number | null
          id?: string
          remind_at?: string
          remind_on?: string
          repeat?: string
          state_key?: Database["public"]["Enums"]["health_check_key"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_check_reminders_custom_check_id_fkey"
            columns: ["custom_check_id"]
            isOneToOne: false
            referencedRelation: "custom_health_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_check_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      health_check_states: {
        Row: {
          check_key: Database["public"]["Enums"]["health_check_key"]
          done_on: string | null
          hidden: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          check_key: Database["public"]["Enums"]["health_check_key"]
          done_on?: string | null
          hidden?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          check_key?: Database["public"]["Enums"]["health_check_key"]
          done_on?: string | null
          hidden?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_check_states_user_id_fkey"
            columns: ["user_id"]
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
          access_state:
            | Database["public"]["Enums"]["health_access_state"]
            | null
          connected: boolean
          created_at: string
          id: string
          last_error_at: string | null
          last_synced_at: string | null
          priority: number | null
          provider: Database["public"]["Enums"]["health_provider"]
          scopes_granted: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_state?:
            | Database["public"]["Enums"]["health_access_state"]
            | null
          connected?: boolean
          created_at?: string
          id?: string
          last_error_at?: string | null
          last_synced_at?: string | null
          priority?: number | null
          provider: Database["public"]["Enums"]["health_provider"]
          scopes_granted?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_state?:
            | Database["public"]["Enums"]["health_access_state"]
            | null
          connected?: boolean
          created_at?: string
          id?: string
          last_error_at?: string | null
          last_synced_at?: string | null
          priority?: number | null
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
          context: Database["public"]["Enums"]["health_metric_context"] | null
          created_at: string
          device_name: string | null
          edited_at: string | null
          external_id: string | null
          id: string
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          note: string | null
          recorded_at: string
          source: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
          value: number
        }
        Insert: {
          context?: Database["public"]["Enums"]["health_metric_context"] | null
          created_at?: string
          device_name?: string | null
          edited_at?: string | null
          external_id?: string | null
          id?: string
          metric_type: Database["public"]["Enums"]["health_metric_type"]
          note?: string | null
          recorded_at: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
          value: number
        }
        Update: {
          context?: Database["public"]["Enums"]["health_metric_context"] | null
          created_at?: string
          device_name?: string | null
          edited_at?: string | null
          external_id?: string | null
          id?: string
          metric_type?: Database["public"]["Enums"]["health_metric_type"]
          note?: string | null
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
      heart_rate_alert_events: {
        Row: {
          created_at: string
          dismissed_at: string | null
          ended_at: string | null
          id: string
          kind: Database["public"]["Enums"]["heart_rate_alert_kind"]
          peak_bpm: number | null
          source_raised: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          ended_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["heart_rate_alert_kind"]
          peak_bpm?: number | null
          source_raised?: boolean
          started_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          ended_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["heart_rate_alert_kind"]
          peak_bpm?: number | null
          source_raised?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "heart_rate_alert_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      heart_rate_alert_settings: {
        Row: {
          created_at: string
          enabled: boolean
          high_bpm: number
          low_bpm: number
          minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          high_bpm?: number
          low_bpm?: number
          minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          high_bpm?: number
          low_bpm?: number
          minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "heart_rate_alert_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      hidden_synced_readings: {
        Row: {
          external_id: string
          hidden_at: string
          id: string
          source: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
        }
        Insert: {
          external_id: string
          hidden_at?: string
          id?: string
          source: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
        }
        Update: {
          external_id?: string
          hidden_at?: string
          id?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hidden_synced_readings_user_id_fkey"
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
          file_bytes: number | null
          file_name: string | null
          file_pages: number | null
          file_type: string | null
          file_url: string | null
          id: string
          imaging_date: string
          imaging_type: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_bytes?: number | null
          file_name?: string | null
          file_pages?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          imaging_date: string
          imaging_type: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_bytes?: number | null
          file_name?: string | null
          file_pages?: number | null
          file_type?: string | null
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
      imaging_shares: {
        Row: {
          professional_id: string
          record_id: string
          shared_at: string
        }
        Insert: {
          professional_id: string
          record_id: string
          shared_at?: string
        }
        Update: {
          professional_id?: string
          record_id?: string
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "imaging_shares_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "imaging_shares_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "imaging_records"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_availability: {
        Row: {
          business_id: string
          created_at: string
          ends_at: string
          id: string
          professional_id: string
          starts_at: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          ends_at: string
          id?: string
          professional_id: string
          starts_at: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          professional_id?: string
          starts_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "instructor_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "instructor_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      instructor_unavailable_dates: {
        Row: {
          business_id: string
          created_at: string
          id: string
          on_date: string
          professional_id: string
          reason: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          on_date: string
          professional_id: string
          reason?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          on_date?: string
          professional_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_unavailable_dates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "instructor_unavailable_dates_professional_id_fkey"
            columns: ["professional_id"]
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
      journal_folder_unlocks: {
        Row: {
          expires_at: string
          folder_id: string
          owner_id: string
          unlocked_at: string
        }
        Insert: {
          expires_at: string
          folder_id: string
          owner_id: string
          unlocked_at?: string
        }
        Update: {
          expires_at?: string
          folder_id?: string
          owner_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_folder_unlocks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: true
            referencedRelation: "journal_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_folder_unlocks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      journal_folders: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          name: string
          owner_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
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
      lab_marker_aliases: {
        Row: {
          alias: string
          marker_key: string
        }
        Insert: {
          alias: string
          marker_key: string
        }
        Update: {
          alias?: string
          marker_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_marker_aliases_marker_key_fkey"
            columns: ["marker_key"]
            isOneToOne: false
            referencedRelation: "lab_markers"
            referencedColumns: ["key"]
          },
        ]
      }
      lab_marker_ranges: {
        Row: {
          applies_to_sex: Database["public"]["Enums"]["sex"] | null
          marker_key: string
          phase: string | null
          ref_high: number | null
          ref_low: number | null
          source_key: string
          source_note: string | null
        }
        Insert: {
          applies_to_sex?: Database["public"]["Enums"]["sex"] | null
          marker_key: string
          phase?: string | null
          ref_high?: number | null
          ref_low?: number | null
          source_key: string
          source_note?: string | null
        }
        Update: {
          applies_to_sex?: Database["public"]["Enums"]["sex"] | null
          marker_key?: string
          phase?: string | null
          ref_high?: number | null
          ref_low?: number | null
          source_key?: string
          source_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_marker_ranges_marker_key_fkey"
            columns: ["marker_key"]
            isOneToOne: false
            referencedRelation: "lab_markers"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "lab_marker_ranges_source_fk"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "clinical_sources"
            referencedColumns: ["key"]
          },
        ]
      }
      lab_marker_units: {
        Row: {
          marker_key: string
          to_canonical_factor: number
          to_canonical_offset: number
          unit: string
        }
        Insert: {
          marker_key: string
          to_canonical_factor: number
          to_canonical_offset?: number
          unit: string
        }
        Update: {
          marker_key?: string
          to_canonical_factor?: number
          to_canonical_offset?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_marker_units_marker_key_fkey"
            columns: ["marker_key"]
            isOneToOne: false
            referencedRelation: "lab_markers"
            referencedColumns: ["key"]
          },
        ]
      }
      lab_markers: {
        Row: {
          canonical_unit: string
          category: Database["public"]["Enums"]["lab_marker_category"]
          created_at: string
          display_name: string
          key: string
          notes: string | null
          remark: string | null
          reviewed: boolean
          sort_order: number
        }
        Insert: {
          canonical_unit: string
          category: Database["public"]["Enums"]["lab_marker_category"]
          created_at?: string
          display_name: string
          key: string
          notes?: string | null
          remark?: string | null
          reviewed?: boolean
          sort_order: number
        }
        Update: {
          canonical_unit?: string
          category?: Database["public"]["Enums"]["lab_marker_category"]
          created_at?: string
          display_name?: string
          key?: string
          notes?: string | null
          remark?: string | null
          reviewed?: boolean
          sort_order?: number
        }
        Relationships: []
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
      legal_acceptances: {
        Row: {
          accepted_at: string
          document: string
          id: string
          profile_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          profile_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          profile_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
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
        Relationships: [
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "measurement_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
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
          content_id: string | null
          created_at: string
          cycles_completed: number | null
          duration_seconds: number
          id: string
          kind: string
          poses_completed: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed: boolean
          content_id?: string | null
          created_at?: string
          cycles_completed?: number | null
          duration_seconds: number
          id?: string
          kind: string
          poses_completed?: number | null
          started_at: string
          user_id: string
        }
        Update: {
          completed?: boolean
          content_id?: string | null
          created_at?: string
          cycles_completed?: number | null
          duration_seconds?: number
          id?: string
          kind?: string
          poses_completed?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meditation_sessions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "mind_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meditation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          allowed_class_types: string[] | null
          billing: Database["public"]["Enums"]["billing_period"]
          business_id: string
          converts_to_plan_id: string | null
          created_at: string
          id: string
          includes: string[] | null
          minimum_term_months: number | null
          name: string
          notice_days: number | null
          payment_methods:
            | Database["public"]["Enums"]["venue_payment_method"][]
            | null
          payment_type: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          price: number
          sessions_in_pack: number | null
          show_on_card: boolean
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string
          valid_for_days: number | null
          visible_on_explore: boolean
          visits_per_period: number | null
        }
        Insert: {
          allowed_class_types?: string[] | null
          billing: Database["public"]["Enums"]["billing_period"]
          business_id: string
          converts_to_plan_id?: string | null
          created_at?: string
          id?: string
          includes?: string[] | null
          minimum_term_months?: number | null
          name: string
          notice_days?: number | null
          payment_methods?:
            | Database["public"]["Enums"]["venue_payment_method"][]
            | null
          payment_type?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price: number
          sessions_in_pack?: number | null
          show_on_card?: boolean
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          valid_for_days?: number | null
          visible_on_explore?: boolean
          visits_per_period?: number | null
        }
        Update: {
          allowed_class_types?: string[] | null
          billing?: Database["public"]["Enums"]["billing_period"]
          business_id?: string
          converts_to_plan_id?: string | null
          created_at?: string
          id?: string
          includes?: string[] | null
          minimum_term_months?: number | null
          name?: string
          notice_days?: number | null
          payment_methods?:
            | Database["public"]["Enums"]["venue_payment_method"][]
            | null
          payment_type?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price?: number
          sessions_in_pack?: number | null
          show_on_card?: boolean
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string
          valid_for_days?: number | null
          visible_on_explore?: boolean
          visits_per_period?: number | null
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
          {
            foreignKeyName: "membership_plans_converts_to_fkey"
            columns: ["converts_to_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
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
      message_cards: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["message_card_kind"]
          message_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          kind: Database["public"]["Enums"]["message_card_kind"]
          message_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["message_card_kind"]
          message_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "message_cards_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_cards_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
        ]
      }
      message_content_history: {
        Row: {
          attachment_kind: Database["public"]["Enums"]["attachment_kind"] | null
          attachment_url: string | null
          author_id: string | null
          change: Database["public"]["Enums"]["message_content_change"]
          id: string
          message_id: string
          recorded_at: string
          text: string | null
          thread_id: string
          version: number
        }
        Insert: {
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_url?: string | null
          author_id?: string | null
          change: Database["public"]["Enums"]["message_content_change"]
          id?: string
          message_id: string
          recorded_at?: string
          text?: string | null
          thread_id: string
          version: number
        }
        Update: {
          attachment_kind?:
            | Database["public"]["Enums"]["attachment_kind"]
            | null
          attachment_url?: string | null
          author_id?: string | null
          change?: Database["public"]["Enums"]["message_content_change"]
          id?: string
          message_id?: string
          recorded_at?: string
          text?: string | null
          thread_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_content_history_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "message_content_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "message_content_history_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_content_history_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
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
          held_until: string | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          message_id: string
          queued_at: string
          recipient_id: string
          summarised_into: string | null
          thread_id: string
          title: string
        }
        Insert: {
          attempts?: number
          body: string
          chat_group?: string | null
          delivered_at?: string | null
          held_until?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id: string
          queued_at?: string
          recipient_id: string
          summarised_into?: string | null
          thread_id: string
          title: string
        }
        Update: {
          attempts?: number
          body?: string
          chat_group?: string | null
          delivered_at?: string | null
          held_until?: string | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id?: string
          queued_at?: string
          recipient_id?: string
          summarised_into?: string | null
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
            foreignKeyName: "message_push_sends_summarised_into_fkey"
            columns: ["summarised_into"]
            isOneToOne: false
            referencedRelation: "reminder_sends"
            referencedColumns: ["id"]
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
          gym_id: string | null
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
          gym_id?: string | null
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
          gym_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["thread_kind"]
          name?: string | null
          participant_one_id?: string | null
          participant_two_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
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
      metric_goals: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          metric: Database["public"]["Enums"]["health_metric_type"]
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          metric: Database["public"]["Enums"]["health_metric_type"]
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          metric?: Database["public"]["Enums"]["health_metric_type"]
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "metric_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
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
      onboarding_drafts: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          lane: string
          payload: Json
          profile_id: string
          step_key: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          lane: string
          payload?: Json
          profile_id: string
          step_key: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          lane?: string
          payload?: Json
          profile_id?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_drafts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_drafts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          business_id: string | null
          created_at: string
          dismissed_at: string | null
          done_at: string | null
          id: string
          item: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          done_at?: string | null
          id?: string
          item: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          done_at?: string | null
          id?: string
          item?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "onboarding_progress_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      ops_events: {
        Row: {
          created_at: string
          details: Json
          id: string
          kind: string
          message: string | null
          occurred_at: string
          severity: string
          source: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          kind: string
          message?: string | null
          occurred_at?: string
          severity?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          message?: string | null
          occurred_at?: string
          severity?: string
          source?: string | null
        }
        Relationships: []
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
      personal_reminders: {
        Row: {
          cadence_days: number
          created_at: string
          enabled: boolean
          next_due_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence_days: number
          created_at?: string
          enabled?: boolean
          next_due_on: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence_days?: number
          created_at?: string
          enabled?: boolean
          next_due_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personal_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          course_commission_percent: number
          id: boolean
          marketplace_revenue_share_pct: number
          paid_enrolment_enabled: boolean
          updated_at: string
        }
        Insert: {
          course_commission_percent?: number
          id?: boolean
          marketplace_revenue_share_pct: number
          paid_enrolment_enabled?: boolean
          updated_at?: string
        }
        Update: {
          course_commission_percent?: number
          id?: boolean
          marketplace_revenue_share_pct?: number
          paid_enrolment_enabled?: boolean
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
      policy_acceptances: {
        Row: {
          accepted_at: string
          person_id: string
          version_id: string
        }
        Insert: {
          accepted_at?: string
          person_id: string
          version_id: string
        }
        Update: {
          accepted_at?: string
          person_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "policy_acceptances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "policy_acceptances_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          business_id: string
          created_at: string
          current_version: number | null
          id: string
          kind: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_version?: number | null
          id?: string
          kind: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_version?: number | null
          id?: string
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "my_class_schedule"
            referencedColumns: ["business_id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          body: string
          created_at: string
          document_id: string
          id: string
          published_at: string | null
          requires_reacceptance: boolean
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          document_id: string
          id?: string
          published_at?: string | null
          requires_reacceptance?: boolean
          updated_at?: string
          version: number
        }
        Update: {
          body?: string
          created_at?: string
          document_id?: string
          id?: string
          published_at?: string | null
          requires_reacceptance?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
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
      professional_hires: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          expires_on: string | null
          id: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_id: string
          price_agreed: number
          professional_id: string
          started_on: string
          status: Database["public"]["Enums"]["hire_status"]
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["venue_payment_method"]
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          plan_id: string
          price_agreed: number
          professional_id: string
          started_on?: string
          status?: Database["public"]["Enums"]["hire_status"]
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          expires_on?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["venue_payment_method"]
          payment_status?: Database["public"]["Enums"]["venue_payment_status"]
          plan_id?: string
          price_agreed?: number
          professional_id?: string
          started_on?: string
          status?: Database["public"]["Enums"]["hire_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_hires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_hires_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_hires_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "professional_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_hires_professional_id_fkey"
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
          published_at: string | null
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
          published_at?: string | null
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
          published_at?: string | null
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
      professional_other_entries: {
        Row: {
          created_at: string
          field: string
          id: string
          profile_id: string | null
          value: string
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          profile_id?: string | null
          value: string
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          profile_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_other_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      professional_plans: {
        Row: {
          active: boolean
          billing: Database["public"]["Enums"]["billing_period"]
          created_at: string
          features: string[]
          id: string
          name: string
          position: number
          price: number
          professional_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          features?: string[]
          id?: string
          name: string
          position?: number
          price: number
          professional_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing?: Database["public"]["Enums"]["billing_period"]
          created_at?: string
          features?: string[]
          id?: string
          name?: string
          position?: number
          price?: number
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_plans_professional_id_fkey"
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
          closest_group:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          free_period_ends_at: string
          headline: string | null
          home_visit_km: number | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          other_discipline: string | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          session_formats: string[]
          session_lengths: number[]
          session_places: string[]
          show_volunteering: boolean
          skills: string[]
          specialties: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          work_mode:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
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
          closest_group?:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          free_period_ends_at?: string
          headline?: string | null
          home_visit_km?: number | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          other_discipline?: string | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id: string
          session_formats?: string[]
          session_lengths?: number[]
          session_places?: string[]
          show_volunteering?: boolean
          skills?: string[]
          specialties?: string[]
          specialty?: string | null
          updated_at?: string
          website?: string | null
          work_mode?:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
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
          closest_group?:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          free_period_ends_at?: string
          headline?: string | null
          home_visit_km?: number | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          other_discipline?: string | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id?: string
          session_formats?: string[]
          session_lengths?: number[]
          session_places?: string[]
          show_volunteering?: boolean
          skills?: string[]
          specialties?: string[]
          specialty?: string | null
          updated_at?: string
          website?: string | null
          work_mode?:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
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
      professional_review_replies: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          professional_id: string
          redacted_at: string | null
          redacted_body: string | null
          redacted_by: string | null
          redaction_reason: string | null
          review_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          professional_id: string
          redacted_at?: string | null
          redacted_body?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          review_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          professional_id?: string
          redacted_at?: string | null
          redacted_body?: string | null
          redacted_by?: string | null
          redaction_reason?: string | null
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_review_replies_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "professional_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "professional_reviews_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_review_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          detail: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string | null
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_review_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "professional_review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "professional_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "professional_reviews_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_reviews: {
        Row: {
          body: string | null
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          deletion_due_at: string | null
          deletion_notice_days: number | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          instagram: string | null
          last_active_at: string
          onboarded: boolean
          phone: string | null
          plant_species: string | null
          preferred_activities: string[]
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          shares_presence: boolean
          storage_bytes_used: number
          storage_purged_at: string | null
          timezone: string | null
          timezone_chosen_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
          x: string | null
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
          deletion_due_at?: string | null
          deletion_notice_days?: number | null
          deletion_requested_at?: string | null
          email?: string | null
          first_name?: string | null
          goals?: string[]
          height_cm?: number | null
          id: string
          instagram?: string | null
          last_active_at?: string
          onboarded?: boolean
          phone?: string | null
          plant_species?: string | null
          preferred_activities?: string[]
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
          shares_presence?: boolean
          storage_bytes_used?: number
          storage_purged_at?: string | null
          timezone?: string | null
          timezone_chosen_at?: string | null
          tracking_preferences?: string[]
          updated_at?: string
          weight_kg?: number | null
          x?: string | null
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
          deletion_due_at?: string | null
          deletion_notice_days?: number | null
          deletion_requested_at?: string | null
          email?: string | null
          first_name?: string | null
          goals?: string[]
          height_cm?: number | null
          id?: string
          instagram?: string | null
          last_active_at?: string
          onboarded?: boolean
          phone?: string | null
          plant_species?: string | null
          preferred_activities?: string[]
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
          shares_presence?: boolean
          storage_bytes_used?: number
          storage_purged_at?: string | null
          timezone?: string | null
          timezone_chosen_at?: string | null
          tracking_preferences?: string[]
          updated_at?: string
          weight_kg?: number | null
          x?: string | null
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
      referral_codes: {
        Row: {
          code: string
          created_at: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string | null
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
          code?: string | null
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
          code?: string | null
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
          calendar_event_id: string | null
          delivered_at: string | null
          due_date: string
          held_until: string | null
          id: string
          kind: string
          last_attempt_at: string | null
          last_error: string | null
          queued_at: string
          source_id: string | null
          source_kind: string | null
          summarised_into: string | null
          title: string
          user_id: string
        }
        Insert: {
          attempts?: number
          body: string
          calendar_event_id?: string | null
          delivered_at?: string | null
          due_date: string
          held_until?: string | null
          id?: string
          kind: string
          last_attempt_at?: string | null
          last_error?: string | null
          queued_at?: string
          source_id?: string | null
          source_kind?: string | null
          summarised_into?: string | null
          title: string
          user_id: string
        }
        Update: {
          attempts?: number
          body?: string
          calendar_event_id?: string | null
          delivered_at?: string | null
          due_date?: string
          held_until?: string | null
          id?: string
          kind?: string
          last_attempt_at?: string | null
          last_error?: string | null
          queued_at?: string
          source_id?: string | null
          source_kind?: string | null
          summarised_into?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_sends_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_sends_summarised_into_fkey"
            columns: ["summarised_into"]
            isOneToOne: false
            referencedRelation: "reminder_sends"
            referencedColumns: ["id"]
          },
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
          asleep_min: number | null
          awake_min: number | null
          bed_start: string | null
          created_at: string
          deep_min: number | null
          external_id: string | null
          id: string
          in_bed_min: number | null
          is_nap: boolean
          light_min: number | null
          rem_min: number | null
          score: number | null
          sleep_date: string
          source: Database["public"]["Enums"]["health_metric_source"]
          summary: string | null
          user_id: string
          wake_end: string | null
        }
        Insert: {
          asleep_min?: number | null
          awake_min?: number | null
          bed_start?: string | null
          created_at?: string
          deep_min?: number | null
          external_id?: string | null
          id?: string
          in_bed_min?: number | null
          is_nap?: boolean
          light_min?: number | null
          rem_min?: number | null
          score?: number | null
          sleep_date: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          summary?: string | null
          user_id: string
          wake_end?: string | null
        }
        Update: {
          asleep_min?: number | null
          awake_min?: number | null
          bed_start?: string | null
          created_at?: string
          deep_min?: number | null
          external_id?: string | null
          id?: string
          in_bed_min?: number | null
          is_nap?: boolean
          light_min?: number | null
          rem_min?: number | null
          score?: number | null
          sleep_date?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          summary?: string | null
          user_id?: string
          wake_end?: string | null
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
      sleep_segments: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          sleep_id: string
          stage: Database["public"]["Enums"]["sleep_stage"]
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          sleep_id: string
          stage: Database["public"]["Enums"]["sleep_stage"]
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          sleep_id?: string
          stage?: Database["public"]["Enums"]["sleep_stage"]
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_segments_sleep_id_fkey"
            columns: ["sleep_id"]
            isOneToOne: false
            referencedRelation: "sleep_details"
            referencedColumns: ["id"]
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
          id: string
          label: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          auto?: boolean
          created_at?: string
          current_days?: number
          id?: string
          label: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          auto?: boolean
          created_at?: string
          current_days?: number
          id?: string
          label?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
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
          included_seats: number | null
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
          included_seats?: number | null
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
          included_seats?: number | null
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
          date_precision: Database["public"]["Enums"]["date_precision"]
          id: string
          name: string
          surgery_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_precision?: Database["public"]["Enums"]["date_precision"]
          id?: string
          name: string
          surgery_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_precision?: Database["public"]["Enums"]["date_precision"]
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
      thread_members: {
        Row: {
          created_at: string
          ended_at: string | null
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          removed_by: string | null
          role: Database["public"]["Enums"]["thread_member_role"]
          status: Database["public"]["Enums"]["thread_member_status"]
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["thread_member_role"]
          status?: Database["public"]["Enums"]["thread_member_status"]
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["thread_member_role"]
          status?: Database["public"]["Enums"]["thread_member_status"]
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_account_threads"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["thread_id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
          cleared_at: string | null
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
          cleared_at?: string | null
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
          cleared_at?: string | null
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
      two_factor_events: {
        Row: {
          created_at: string
          details: Json
          event: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          event: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          event?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "two_factor_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "thread_participant_summary"
            referencedColumns: ["participant_id"]
          },
        ]
      }
      two_factor_recovery_codes: {
        Row: {
          batch_id: string
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          batch_id: string
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "two_factor_recovery_codes_user_id_fkey"
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
          notified_at: string | null
          points_awarded: number
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          notified_at?: string | null
          points_awarded: number
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          notified_at?: string | null
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
      water_intakes: {
        Row: {
          amount_ml: number
          backfilled: boolean
          created_at: string
          id: string
          logged_at: string
          source: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
        }
        Insert: {
          amount_ml: number
          backfilled?: boolean
          created_at?: string
          id?: string
          logged_at?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id: string
        }
        Update: {
          amount_ml?: number
          backfilled?: boolean
          created_at?: string
          id?: string
          logged_at?: string
          source?: Database["public"]["Enums"]["health_metric_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "connected_professional_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "water_intakes_user_id_fkey"
            columns: ["user_id"]
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
          kcal: number | null
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
          kcal?: number | null
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
          kcal?: number | null
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
      forum_replies_readable: {
        Row: {
          body: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          identity: string | null
          reaction_count: number | null
          status: string | null
          thread_id: string | null
          withdrawn: boolean | null
        }
        Insert: {
          body?: never
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          identity?: string | null
          reaction_count?: never
          status?: string | null
          thread_id?: string | null
          withdrawn?: never
        }
        Update: {
          body?: never
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          identity?: string | null
          reaction_count?: never
          status?: string | null
          thread_id?: string | null
          withdrawn?: never
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_readable"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads_readable: {
        Row: {
          body: string | null
          category_key: string | null
          created_at: string | null
          edited_at: string | null
          id: string | null
          identity: string | null
          locked: boolean | null
          photo_path: string | null
          pinned: boolean | null
          reaction_count: number | null
          reply_count: number | null
          status: string | null
          title: string | null
          withdrawn: boolean | null
        }
        Insert: {
          body?: never
          category_key?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          identity?: string | null
          locked?: never
          photo_path?: never
          pinned?: never
          reaction_count?: never
          reply_count?: never
          status?: string | null
          title?: never
          withdrawn?: never
        }
        Update: {
          body?: never
          category_key?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string | null
          identity?: string | null
          locked?: never
          photo_path?: never
          pinned?: never
          reaction_count?: never
          reply_count?: never
          status?: string | null
          title?: never
          withdrawn?: never
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["key"]
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
      accept_business_employment: {
        Args: { p_business_id: string }
        Returns: string
      }
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
          gym_id: string | null
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
      acknowledge_forum_warning: {
        Args: { p_warning_id: string }
        Returns: undefined
      }
      active_habit_count: { Args: { p_owner: string }; Returns: number }
      add_course_module: {
        Args: { p_course_id: string; p_revision_id?: string; p_title: string }
        Returns: string
      }
      add_course_pdf_lesson: {
        Args: { p_module_id: string; p_path: string; p_title: string }
        Returns: string
      }
      add_course_quiz_lesson: {
        Args: { p_module_id: string; p_pass_mark?: number; p_title: string }
        Returns: string
      }
      add_course_quiz_question: {
        Args: { p_lesson_id: string; p_prompt: string }
        Returns: string
      }
      add_course_reading_lesson: {
        Args: {
          p_body: string
          p_minutes?: number
          p_module_id: string
          p_title: string
        }
        Returns: string
      }
      add_course_video_lesson: {
        Args: {
          p_minutes?: number
          p_module_id: string
          p_title: string
          p_url: string
        }
        Returns: string
      }
      add_to_broadcast_list: {
        Args: { p_list_id: string; p_user_ids: string[] }
        Returns: number
      }
      admin_activity: {
        Args: {
          p_action?: string
          p_actor?: string
          p_limit?: number
          p_offset?: number
          p_target?: string
        }
        Returns: {
          action: string
          actor_first_name: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          reason: string
          target_account_id: string
          target_first_name: string
          total_count: number
        }[]
      }
      admin_apply_course_revision: {
        Args: { p_reason: string; p_revision_id: string }
        Returns: undefined
      }
      admin_approve_certification: {
        Args: { p_note?: string; p_professional_id: string }
        Returns: Json
      }
      admin_approve_licence: {
        Args: { p_licence_id: string; p_note?: string }
        Returns: Json
      }
      admin_bug_reports: {
        Args: { p_status?: string }
        Returns: {
          admin_notes: string
          created_at: string
          description: string
          report_id: string
          reporter_account_id: string
          route: string
          status: string
          status_changed_at: string
          status_changed_by: string
          user_agent: string
        }[]
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
      admin_close_group: {
        Args: { p_reason: string; p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string | null
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
      admin_contact_submissions: {
        Args: never
        Returns: {
          ack_failed_at: string
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
          support_thread_id: string
          topic: string
        }[]
      }
      admin_course_curriculum: {
        Args: { p_course_id: string }
        Returns: {
          body: string
          has_pdf: boolean
          kind: string
          lesson_id: string
          lesson_position: number
          lesson_title: string
          minutes: number
          module_id: string
          module_position: number
          module_title: string
          pass_mark: number
          video_id: string
        }[]
      }
      admin_course_header: {
        Args: { p_course_id: string }
        Returns: {
          author_email: string
          author_id: string
          author_name: string
          author_verified: boolean
          average_rating: number
          category_key: string
          course_id: string
          cover_colour: string
          created_at: string
          currency: string
          enrolled: number
          learn_points: string[]
          level: string
          open_revision_id: string
          price_cents: number
          published_at: string
          ratings: number
          reports_open: number
          review_reason: string
          reviewed_by: string
          status: string
          submitted_at: string
          subtitle: string
          title: string
          unpublished_at: string
          updated_at: string
          weekly_hours: number
        }[]
      }
      admin_course_reports: {
        Args: { p_status?: Database["public"]["Enums"]["report_status"] }
        Returns: {
          admin_notes: string
          course_id: string
          course_title: string
          created_at: string
          detail: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string
          reported_id: string
          reporter_id: string
          reports_against_this_course: number
          resolved_at: string
          resolved_by: string
          status: Database["public"]["Enums"]["report_status"]
        }[]
      }
      admin_course_review_queue: {
        Args: never
        Returns: {
          author_id: string
          author_name: string
          author_verified: boolean
          category_key: string
          content_changed: boolean
          course_id: string
          lessons: number
          level: string
          modules: number
          pdfs: number
          price_cents: number
          quizzes: number
          reports_open: number
          revision_id: string
          status: string
          submitted_at: string
          subtitle: string
          title: string
          videos: number
        }[]
      }
      admin_course_revision_curriculum: {
        Args: { p_revision_id: string }
        Returns: {
          body: string
          has_pdf: boolean
          kind: string
          lesson_id: string
          lesson_position: number
          lesson_title: string
          minutes: number
          module_id: string
          module_position: number
          module_title: string
          pass_mark: number
          video_id: string
        }[]
      }
      admin_daily_active_history: {
        Args: { p_days?: number }
        Returns: {
          active_1d: number
          active_30d: number
          active_7d: number
          new_accounts: number
          pending_deletions: number
          snapshot_on: string
          total_accounts: number
        }[]
      }
      admin_delete_contact_submission: {
        Args: { reason: string; submission_id: string }
        Returns: string
      }
      admin_extend_free_period: {
        Args: { p_professional_id: string; p_reason: string; p_until: string }
        Returns: {
          affiliated_business_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_label: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          closest_group:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          free_period_ends_at: string
          headline: string | null
          home_visit_km: number | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          other_discipline: string | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          session_formats: string[]
          session_lengths: number[]
          session_places: string[]
          show_volunteering: boolean
          skills: string[]
          specialties: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          work_mode:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_forum_held_posts: {
        Args: never
        Returns: {
          author_identity: string
          author_label: string
          body: string
          category_name: string
          created_at: string
          has_photo: boolean
          post_id: string
          post_kind: string
          thread_id: string
          title: string
        }[]
      }
      admin_forum_post_author: {
        Args: { p_reason: string; p_report_id: string }
        Returns: {
          account_id: string
          account_type: string
          email: string
          first_name: string
          posted_as: string
        }[]
      }
      admin_forum_reports: {
        Args: { p_status: Database["public"]["Enums"]["report_status"] }
        Returns: {
          admin_notes: string
          author_identity: string
          author_label: string
          category_name: string
          created_at: string
          detail: string
          has_photo: boolean
          post_body: string
          post_created_at: string
          post_id: string
          post_kind: string
          post_status: string
          post_title: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string
          reported_id: string
          reporter_id: string
          reports_against_this_account: number
          reports_for_this_post: number
          resolved_at: string
          resolved_by: string
          status: Database["public"]["Enums"]["report_status"]
          thread_id: string
          thread_locked: boolean
          thread_pinned: boolean
        }[]
      }
      admin_grant_ambassador_status: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: Json
      }
      admin_group_members: {
        Args: { p_reason: string; p_thread_id: string }
        Returns: {
          email: string
          ended_at: string
          first_name: string
          invited_at: string
          invited_by: string
          joined_at: string
          role: Database["public"]["Enums"]["thread_member_role"]
          status: Database["public"]["Enums"]["thread_member_status"]
          thread_closed_at: string
          user_id: string
        }[]
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
      admin_lock_forum_thread: {
        Args: { p_locked: boolean; p_reason: string; p_thread_id: string }
        Returns: undefined
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
      admin_message_history: {
        Args: { p_message_id: string; p_reason: string }
        Returns: {
          attachment_kind: Database["public"]["Enums"]["attachment_kind"]
          attachment_url: string
          author_email: string
          author_id: string
          change: Database["public"]["Enums"]["message_content_change"]
          recorded_at: string
          text: string
          version: number
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
          thread_closed_at: string
          thread_id: string
          thread_kind: Database["public"]["Enums"]["thread_kind"]
          thread_name: string
        }[]
      }
      admin_my_display_name: {
        Args: never
        Returns: {
          display_name: string
          effective_name: string
        }[]
      }
      admin_open_support_thread_for_submission: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: string
      }
      admin_ops_events: {
        Args: { p_kind?: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          details: Json
          id: string
          kind: string
          message: string
          occurred_at: string
          severity: string
          source: string
          total_count: number
        }[]
      }
      admin_overview_breakdowns: {
        Args: never
        Returns: {
          group_key: string
          item_key: string
          suppressed: boolean
          tracked: boolean
          value: number
        }[]
      }
      admin_overview_emails: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          status: string
          stream: string
          tracked: boolean
          value: number
        }[]
      }
      admin_overview_engagement: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          metric_key: string
          suppressed: boolean
          tracked: boolean
          value: number
        }[]
      }
      admin_overview_jobs: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          failed: number
          job_name: string
          last_failed_at: string
          succeeded: number
        }[]
      }
      admin_overview_kpis: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          metric_key: string
          prev_available: boolean
          prev_suppressed: boolean
          prev_value: number
          suppressed: boolean
          tracked: boolean
          value: number
        }[]
      }
      admin_overview_lifecycle: {
        Args: never
        Returns: {
          metric_key: string
          suppressed: boolean
          tracked: boolean
          value: number
        }[]
      }
      admin_overview_queues: {
        Args: never
        Returns: {
          amber_after: string
          oldest_at: string
          open_count: number
          queue_key: string
          red_after: string
        }[]
      }
      admin_overview_series: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          bucket_start: string
          metric_key: string
          series: string
          suppressed: boolean
          value: number
        }[]
      }
      admin_pending_licence_reviews: {
        Args: never
        Returns: {
          credential_id: string
          credential_url: string
          document_path: string
          expired: boolean
          expires_on: string
          is_legacy_certificate: boolean
          issued_on: string
          issuing_body: string
          licence_id: string
          licence_name: string
          no_expiry: boolean
          previous_attempts: number
          professional_email: string
          professional_id: string
          professional_name: string
          review_id: string
          submitted_at: string
        }[]
      }
      admin_pin_forum_thread: {
        Args: { p_pinned: boolean; p_reason: string; p_thread_id: string }
        Returns: undefined
      }
      admin_professional_licences: {
        Args: { p_professional_id: string }
        Returns: {
          credential_id: string
          credential_url: string
          decided_at: string
          document_path: string
          expired: boolean
          expires_on: string
          is_legacy_certificate: boolean
          issued_on: string
          issuing_body: string
          licence_id: string
          name: string
          no_expiry: boolean
          professional_id: string
          rejection_reason: string
          review_count: number
          review_state: string
          show_when_expired: boolean
          submitted_at: string
          verified: boolean
        }[]
      }
      admin_professional_review_queue: {
        Args: { p_filter?: string }
        Returns: {
          body: string
          created_at: string
          deleted_at: string
          edited_at: string
          open_reports: number
          professional_id: string
          rating: number
          redacted_at: string
          redaction_reason: string
          reply_body: string
          reply_created_at: string
          reply_exists: boolean
          reply_redacted: boolean
          reply_redacted_at: string
          reply_redaction_reason: string
          review_id: string
          reviewer_id: string
          total_reports: number
        }[]
      }
      admin_professional_review_reports: {
        Args: { p_review_id: string }
        Returns: {
          admin_notes: string
          created_at: string
          detail: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string
          reporter_id: string
          resolved_at: string
          resolved_by: string
          status: Database["public"]["Enums"]["report_status"]
        }[]
      }
      admin_publish_course: {
        Args: { p_course_id: string; p_reason: string }
        Returns: undefined
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
          redacted_by_name: string
          reply_to_id: string
          sender_email: string
          sender_first_name: string
          sender_id: string
          text: string
          voice_note_seconds: number
        }[]
      }
      admin_record_backup: {
        Args: { p_note?: string; p_occurred_at?: string; p_succeeded?: boolean }
        Returns: string
      }
      admin_redact_gym_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
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
      admin_redact_review_reply: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
      }
      admin_reject_certification: {
        Args: { p_professional_id: string; p_reason: string }
        Returns: Json
      }
      admin_reject_licence: {
        Args: { p_licence_id: string; p_reason: string }
        Returns: Json
      }
      admin_release_forum_post: {
        Args: { p_reason?: string; p_reply_id?: string; p_thread_id?: string }
        Returns: undefined
      }
      admin_remove_forum_post: {
        Args: { p_reason?: string; p_reply_id?: string; p_thread_id?: string }
        Returns: undefined
      }
      admin_remove_group_member: {
        Args: { p_reason: string; p_thread_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_report_original: {
        Args: { p_reason: string; p_report_id: string }
        Returns: {
          current_text: string
          message_id: string
          original_attachment_url: string
          original_recorded_at: string
          original_text: string
          report_id: string
          was_deleted: boolean
          was_edited: boolean
        }[]
      }
      admin_request_course_changes: {
        Args: { p_course_id: string; p_reason: string }
        Returns: undefined
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
      admin_request_revision_changes: {
        Args: { p_reason: string; p_revision_id: string }
        Returns: undefined
      }
      admin_reset_mfa: {
        Args: { p_factor_ids?: string[]; p_reason: string; p_user_id: string }
        Returns: Json
      }
      admin_reset_onboarding: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_resolve_course_report: {
        Args: {
          p_notes?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_resolve_forum_report: {
        Args: {
          p_notes?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_resolve_message_report: {
        Args: {
          p_notes?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: Json
      }
      admin_resolve_professional_review_report: {
        Args: {
          p_notes?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_restore_professional_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: Json
      }
      admin_restore_review_reply: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
      }
      admin_review_business_verification: {
        Args: { p_approve: boolean; p_items?: Json; p_verification_id: string }
        Returns: Database["public"]["Enums"]["verification_status"]
      }
      admin_revoke_ambassador_status: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: Json
      }
      admin_schedule_deletion: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_schedule_deletion_window: {
        Args: {
          p_notice_days: number
          p_reason: string
          p_target_user_id: string
        }
        Returns: string
      }
      admin_send_support_message: {
        Args: { body: string; reason?: string; thread_id: string }
        Returns: string
      }
      admin_set_bug_report_status: {
        Args: { p_note?: string; p_report_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_contact_status: {
        Args: { new_status: string; reason?: string; submission_id: string }
        Returns: string
      }
      admin_set_course_commission: {
        Args: { p_percent: number; p_reason: string }
        Returns: undefined
      }
      admin_set_date_of_birth: {
        Args: { p_dob: string; p_reason: string; p_user: string }
        Returns: {
          became_minor: boolean
          listing_withdrawn: boolean
          map_area_cleared: boolean
          new_date_of_birth: string
          old_date_of_birth: string
        }[]
      }
      admin_set_gym_hidden: {
        Args: { p_gym_id: string; p_hidden: boolean; p_reason?: string }
        Returns: undefined
      }
      admin_set_my_display_name: {
        Args: { p_display_name: string }
        Returns: string
      }
      admin_set_paid_enrolment: {
        Args: { p_open: boolean; p_reason: string }
        Returns: undefined
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
      admin_support_queue: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          awaiting_reply: boolean
          last_support_message_at: string
          last_user_message_at: string
          messages_total: number
          thread_id: string
          total_count: number
          user_account_type: Database["public"]["Enums"]["account_type"]
          user_email: string
          user_first_name: string
          user_id: string
          user_is_minor: boolean
          waiting_hours: number
        }[]
      }
      admin_suspend_account: {
        Args: { reason?: string; target_user_id: string }
        Returns: string
      }
      admin_suspend_from_forum: {
        Args: { p_days: number; p_reason: string; p_user_id: string }
        Returns: string
      }
      admin_unpublish_course: {
        Args: { p_course_id: string; p_reason: string }
        Returns: undefined
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
          ambassador_since: string
          banned_until: string
          call_count: number
          certification_path: string
          certification_status: string
          customer_subtype: Database["public"]["Enums"]["customer_subtype"]
          date_of_birth: string
          deletion_due_at: string
          deletion_notice_days: number
          deletion_requested_at: string
          deletion_requested_by: string
          email: string
          first_name: string
          free_period_ended: boolean
          free_period_ends_at: string
          id: string
          last_active_at: string
          licence_status: string
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
      admin_warn_forum_member: {
        Args: { p_body: string; p_reason: string; p_user_id: string }
        Returns: string
      }
      adopt_workout_template: {
        Args: { p_template_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_auto_streaks: { Args: never; Returns: number }
      am_i_blocked_with: { Args: { p_other: string }; Returns: boolean }
      answer_course_question: {
        Args: { p_answer: string; p_question_id: string }
        Returns: undefined
      }
      ask_course_question: {
        Args: { p_body: string; p_course_id: string; p_lesson_id?: string }
        Returns: string
      }
      assert_barcode_lookup_allowed: { Args: never; Returns: undefined }
      assert_broadcast_list_owner: {
        Args: { p_list_id: string; p_user: string }
        Returns: undefined
      }
      assert_business_console_consults_permissions: {
        Args: never
        Returns: string
      }
      assert_default_privileges_are_narrow: { Args: never; Returns: undefined }
      assert_employment_readers_check_acceptance: {
        Args: never
        Returns: undefined
      }
      assert_group_owner: {
        Args: { p_thread_id: string; p_user: string }
        Returns: undefined
      }
      assert_health_reset_coverage: { Args: never; Returns: undefined }
      assert_may_start_conversation: {
        Args: { p_other: string; p_starter: string }
        Returns: undefined
      }
      assert_message_columns_readable: { Args: never; Returns: undefined }
      assert_no_unqualified_updates: { Args: never; Returns: undefined }
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
        SetofOptions: {
          from: "*"
          to: "routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      before_user_created_block_disposable: {
        Args: { event: Json }
        Returns: Json
      }
      billing_period_end: {
        Args: {
          p_billing: Database["public"]["Enums"]["billing_period"]
          p_from: string
        }
        Returns: string
      }
      block_forum_author: {
        Args: { p_reply_id?: string; p_thread_id?: string }
        Returns: undefined
      }
      book_class: {
        Args: {
          p_class_id: string
          p_method?: Database["public"]["Enums"]["venue_payment_method"]
        }
        Returns: string
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
      bug_screenshot_is_own_prefix: {
        Args: { p_name: string }
        Returns: boolean
      }
      business_can: {
        Args: { p_business_id: string; p_permission: string }
        Returns: boolean
      }
      business_employs_professional: {
        Args: { p_business_id: string; p_professional_id: string }
        Returns: boolean
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
      business_permission_vocabulary: { Args: never; Returns: string[] }
      business_seat_capacity: {
        Args: { p_business_id: string }
        Returns: number
      }
      business_seats_used: { Args: { p_business_id: string }; Returns: number }
      business_setup_checklist: {
        Args: { p_business_id: string }
        Returns: {
          dismissed: boolean
          done: boolean
          item: string
        }[]
      }
      calendar_alert_offset: {
        Args: { p_alert: Database["public"]["Enums"]["calendar_alert"] }
        Returns: string
      }
      calendar_override_keys_ok: {
        Args: { p_override: Json }
        Returns: boolean
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
          deletion_due_at: string | null
          deletion_notice_days: number | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          instagram: string | null
          last_active_at: string
          onboarded: boolean
          phone: string | null
          plant_species: string | null
          preferred_activities: string[]
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          shares_presence: boolean
          storage_bytes_used: number
          storage_purged_at: string | null
          timezone: string | null
          timezone_chosen_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_class_booking: {
        Args: { p_class_id: string }
        Returns: {
          hours_before: number
          was_free: boolean
          window_hours: number
        }[]
      }
      cancel_hire: {
        Args: { p_hire_id: string; p_reason?: string }
        Returns: {
          was_free: boolean
        }[]
      }
      capture_daily_active_snapshot: { Args: never; Returns: string }
      check_rate_limit: {
        Args: {
          p_action: Database["public"]["Enums"]["rate_limited_action"]
          p_max_attempts: number
          p_window: string
        }
        Returns: undefined
      }
      class_booked_count: { Args: { p_class_id: string }; Returns: number }
      class_calendar_event_for: {
        Args: { p_class_id: string; p_client: string }
        Returns: string
      }
      class_cancellation_hours: {
        Args: { p_class_id: string }
        Returns: number
      }
      class_cancellations: {
        Args: { p_class_id: string }
        Returns: {
          cancelled_at: string
          client_id: string
          first_name: string
          hours_before: number
          was_free: boolean
        }[]
      }
      class_seats_left: { Args: { p_class_id: string }; Returns: number }
      class_starts_at: { Args: { p_class_id: string }; Returns: string }
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
          closest_group:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          free_period_ends_at: string
          headline: string | null
          home_visit_km: number | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          other_discipline: string | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          session_formats: string[]
          session_lengths: number[]
          session_places: string[]
          show_volunteering: boolean
          skills: string[]
          specialties: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          work_mode:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
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
      client_social_handles: {
        Args: { p_client_id: string }
        Returns: {
          instagram: string
          x: string
        }[]
      }
      close_group: {
        Args: { p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string | null
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
      complete_course_lesson: {
        Args: { p_lesson_id: string }
        Returns: undefined
      }
      confirm_hire_payment: { Args: { p_hire_id: string }; Returns: undefined }
      contraception_is_hormonal: { Args: { p_user: string }; Returns: boolean }
      contraception_reminder_block_reason: {
        Args: { p_kind: string; p_user: string }
        Returns: string
      }
      course_access_level: { Args: { p_course_id: string }; Returns: string }
      course_author_may_publish: { Args: { p_user: string }; Returns: boolean }
      course_certificate: {
        Args: { p_serial: string }
        Returns: {
          completed_on: string
          course_title: string
          learner_first_name: string
          professional_name: string
          serial: string
        }[]
      }
      course_commission_percent: { Args: never; Returns: number }
      course_content_is_editable: {
        Args: { p_course_id: string; p_revision_id?: string }
        Returns: boolean
      }
      course_is_mine: { Args: { p_course_id: string }; Returns: boolean }
      course_is_readable: { Args: { p_course_id: string }; Returns: boolean }
      course_lesson_is_editable: {
        Args: { p_lesson_id: string }
        Returns: boolean
      }
      course_module_is_editable: {
        Args: { p_module_id: string }
        Returns: boolean
      }
      course_net_earnings: {
        Args: { p_course_id: string }
        Returns: {
          commission_cents: number
          gross_cents: number
          net_cents: number
          sales: number
        }[]
      }
      course_next_lesson_position: {
        Args: { p_module_id: string }
        Returns: number
      }
      course_pdf_is_claimed_by_caller: {
        Args: { p_path: string }
        Returns: boolean
      }
      course_pdf_is_readable: { Args: { p_path: string }; Returns: boolean }
      course_pdf_is_unattached_claim: {
        Args: { p_path: string }
        Returns: boolean
      }
      course_pdf_path: { Args: { p_lesson_id: string }; Returns: string }
      course_question_is_editable: {
        Args: { p_question_id: string }
        Returns: boolean
      }
      course_quiz: {
        Args: { p_lesson_id: string }
        Returns: {
          option_body: string
          option_id: string
          option_position: number
          prompt: string
          question_id: string
          question_position: number
        }[]
      }
      course_quiz_for_author: {
        Args: { p_lesson_id: string }
        Returns: {
          is_correct: boolean
          option_body: string
          option_id: string
          option_position: number
          prompt: string
          question_id: string
          question_position: number
        }[]
      }
      course_revision_lesson_map: {
        Args: { p_revision_id: string }
        Returns: {
          new_lesson_id: string
          old_lesson_id: string
        }[]
      }
      course_stats: {
        Args: { p_course_ids: string[] }
        Returns: {
          average_rating: number
          course_id: string
          enrolled: number
          ratings: number
        }[]
      }
      course_tree_digest: {
        Args: { p_course_id: string; p_revision_id?: string }
        Returns: string
      }
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
      create_course: {
        Args: { p_category_key: string; p_level?: string; p_title: string }
        Returns: string
      }
      create_group: {
        Args: { p_name: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string | null
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
          code: string | null
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
      custom_exercise_usage: { Args: { p_id: string }; Returns: number }
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
      decline_group_invitation: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      default_permissions_for_role: {
        Args: { p_role: Database["public"]["Enums"]["business_role"] }
        Returns: string[]
      }
      delete_broadcast_list: { Args: { p_list_id: string }; Returns: undefined }
      delete_conversation_for_me: {
        Args: { p_thread_id: string }
        Returns: string
      }
      delete_forum_post: {
        Args: { p_reply_id?: string; p_thread_id?: string }
        Returns: undefined
      }
      delete_gym_review: { Args: { p_review_id: string }; Returns: undefined }
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
      disable_journal_folder_lock: {
        Args: { p_folder_id: string; p_password: string }
        Returns: Database["public"]["CompositeTypes"]["journal_unlock_result"]
        SetofOptions: {
          from: "*"
          to: "journal_unlock_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      disposable_email_check: { Args: { p_email: string }; Returns: boolean }
      distinct_set: { Args: { p_max: number; v: unknown }; Returns: boolean }
      edit_forum_post: {
        Args: {
          p_body?: string
          p_reply_id?: string
          p_thread_id?: string
          p_title?: string
        }
        Returns: undefined
      }
      edit_gym_review: {
        Args: { p_body: string; p_rating: number; p_review_id: string }
        Returns: undefined
      }
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
      edit_my_professional_review: {
        Args: {
          p_body?: string
          p_name_visible?: boolean
          p_rating?: number
          p_review_id: string
        }
        Returns: undefined
      }
      edit_my_review_reply: {
        Args: { p_body: string; p_review_id: string }
        Returns: undefined
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
      employee_credentials: {
        Args: { p_business_id: string }
        Returns: {
          closest_group: Database["public"]["Enums"]["professional_group"]
          credential_id: string
          expires_on: string
          first_name: string
          issued_on: string
          issuing_body: string
          licence_name: string
          no_expiry: boolean
          other_discipline: string
          professional_id: string
          professional_subtype: Database["public"]["Enums"]["professional_subtype"]
          role: Database["public"]["Enums"]["business_role"]
          uses_seat: boolean
          verified: boolean
        }[]
      }
      employee_pay_rates: {
        Args: { p_business_id: string }
        Returns: {
          employment_id: string
          first_name: string
          is_own_row: boolean
          pay_rate_per_class: number
          professional_id: string
          role: Database["public"]["Enums"]["business_role"]
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
      end_gym_membership: {
        Args: {
          p_at_period_end?: boolean
          p_membership_id: string
          p_reason?: string
        }
        Returns: Database["public"]["Enums"]["gym_membership_status"]
      }
      enrol_in_course: {
        Args: { p_course_id: string; p_tier?: string }
        Returns: string
      }
      ensure_direct_thread: {
        Args: { p_a: string; p_b: string }
        Returns: string
      }
      evaluate_achievements: {
        Args: { p_user: string }
        Returns: {
          awarded_key: string
          awarded_points: number
        }[]
      }
      expire_due_memberships: { Args: never; Returns: number }
      expire_stale_ringing_calls: { Args: never; Returns: number }
      expire_waitlist_offers: { Args: never; Returns: number }
      finalize_forum_photo_purge: { Args: { p_path: string }; Returns: boolean }
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
          source: Database["public"]["Enums"]["food_source"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "foods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      forum_author_is_verified_professional: {
        Args: { p_user: string }
        Returns: boolean
      }
      forum_author_labels: {
        Args: { p_reply_ids?: string[]; p_thread_ids?: string[] }
        Returns: {
          is_mine: boolean
          is_professional: boolean
          is_verified: boolean
          label: string
          post_id: string
          post_kind: string
          professional_id: string
        }[]
      }
      forum_is_suspended: { Args: { p_user: string }; Returns: boolean }
      forum_label_for: {
        Args: { p_author: string; p_identity: string }
        Returns: string
      }
      forum_mention_targets: {
        Args: { p_author: string; p_body: string }
        Returns: string[]
      }
      forum_my_reactions: {
        Args: { p_reply_ids?: string[]; p_thread_ids?: string[] }
        Returns: {
          emoji: string
          post_id: string
          post_kind: string
        }[]
      }
      forum_photo_is_claimed_by_caller: {
        Args: { p_path: string }
        Returns: boolean
      }
      forum_photo_is_unattached_claim: {
        Args: { p_path: string }
        Returns: boolean
      }
      forum_photo_is_visible: { Args: { p_path: string }; Returns: boolean }
      forum_post_has_link: { Args: { p_text: string }; Returns: boolean }
      forum_require_adult: { Args: never; Returns: undefined }
      forum_thread_is_visible: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      forward_message: {
        Args: { p_message_id: string; p_thread_id: string }
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
      generate_business_code: { Args: never; Returns: string }
      generate_business_member_code: {
        Args: { p_prefix: string }
        Returns: string
      }
      generate_client_code: { Args: { p_prefix: string }; Returns: string }
      generate_referral_code: { Args: { p_prefix: string }; Returns: string }
      generate_two_factor_recovery_codes: { Args: never; Returns: string[] }
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
      gtin_check_digit_ok: { Args: { p_gtin: string }; Returns: boolean }
      gym_hours_for: {
        Args: { p_gym_id: string }
        Returns: {
          closed: boolean
          closes_at: string
          open_24h: boolean
          opens_at: string
          weekday: number
          wraps_midnight: boolean
        }[]
      }
      gym_pass_state: {
        Args: {
          p_expires_on: string
          p_payment_status: Database["public"]["Enums"]["venue_payment_status"]
          p_status: Database["public"]["Enums"]["gym_membership_status"]
        }
        Returns: string
      }
      gym_review_summary: {
        Args: { p_gym_id: string }
        Returns: {
          average: number
          count_1: number
          count_2: number
          count_3: number
          count_4: number
          count_5: number
          total: number
        }[]
      }
      gym_reviews_page: {
        Args: {
          p_gym_id: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
        }
        Returns: {
          author_is_member: boolean
          author_name: string
          body: string
          created_at: string
          edited_at: string
          helpful_count: number
          id: string
          is_mine: boolean
          rating: number
          redacted: boolean
          viewer_found_helpful: boolean
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
      hire_professional: {
        Args: {
          p_method?: Database["public"]["Enums"]["venue_payment_method"]
          p_plan_id: string
        }
        Returns: string
      }
      invite_employee: {
        Args: {
          p_business_id: string
          p_identifier: string
          p_message?: string
          p_role: Database["public"]["Enums"]["business_role"]
        }
        Returns: string
      }
      invite_to_group: {
        Args: { p_thread_id: string; p_user_ids: string[] }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_elevated: { Args: never; Returns: boolean }
      is_ambassador: { Args: { p_profile_id: string }; Returns: boolean }
      is_business_insider: { Args: { p_business_id: string }; Returns: boolean }
      is_calendar_invitee: { Args: { p_event_id: string }; Returns: boolean }
      is_disposable_email: { Args: { email: string }; Returns: boolean }
      is_thread_participant: {
        Args: { p_thread_id: string; p_user: string }
        Returns: boolean
      }
      join_class_waitlist: { Args: { p_class_id: string }; Returns: number }
      journal_folder_is_unlocked: {
        Args: { p_folder_id: string }
        Returns: boolean
      }
      leave_class_waitlist: { Args: { p_class_id: string }; Returns: undefined }
      leave_group: { Args: { p_thread_id: string }; Returns: undefined }
      licence_is_verified: { Args: { p_licence_id: string }; Returns: boolean }
      list_abandoned_health_files: {
        Args: { p_older_than?: string }
        Returns: {
          bucket_id: string
          object_name: string
          uploaded_at: string
          user_id: string
        }[]
      }
      list_business_members: {
        Args: {
          p_business_id: string
          p_limit?: number
          p_offset?: number
          p_state?: string
        }
        Returns: {
          ended_at: string
          invited_at: string
          member_first_name: string
          member_is_minor: boolean
          membership_id: string
          plan_name: string
          plan_price: number
          responded_at: string
          state: string
          total_count: number
        }[]
      }
      list_pending_forum_photo_purges: {
        Args: never
        Returns: {
          path: string
          purge_attempts: number
        }[]
      }
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
      lock_journal_folder: { Args: { p_folder_id: string }; Returns: undefined }
      mark_achievements_notified: {
        Args: { p_keys: string[] }
        Returns: number
      }
      mark_class_booking_paid: {
        Args: { p_booking_id: string; p_reference?: string }
        Returns: undefined
      }
      mark_gym_membership_paid: {
        Args: { p_membership_id: string }
        Returns: undefined
      }
      mark_thread_read: { Args: { p_thread_id: string }; Returns: string }
      may_open_message_attachment: {
        Args: { p_name: string }
        Returns: boolean
      }
      may_share_presence_on: { Args: { p_topic: string }; Returns: boolean }
      may_use_thread_channel: { Args: { p_topic: string }; Returns: boolean }
      may_write_business_file: {
        Args: { p_owner_uid: string; p_permission: string }
        Returns: boolean
      }
      maybe_issue_course_certificate: {
        Args: { p_enrolment_id: string }
        Returns: boolean
      }
      membership_is_awaiting_payment: {
        Args: {
          p_payment_status: Database["public"]["Enums"]["venue_payment_status"]
          p_status: Database["public"]["Enums"]["gym_membership_status"]
        }
        Returns: boolean
      }
      message_forward_paths: {
        Args: { p_message_id: string; p_thread_id: string }
        Returns: {
          destination_path: string
          source_path: string
        }[]
      }
      message_is_editable: {
        Args: { p_message_id: string; p_user: string }
        Returns: boolean
      }
      message_push_is_wanted: {
        Args: { p_recipient: string; p_sender: string; p_thread: string }
        Returns: boolean
      }
      metric_goal_on: {
        Args: {
          p_metric: Database["public"]["Enums"]["health_metric_type"]
          p_on: string
        }
        Returns: number
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
          notified_at: string
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
      my_business_employments: {
        Args: never
        Returns: {
          accepted_at: string
          business_id: string
          business_name: string
          invited_at: string
        }[]
      }
      my_business_seat_capacity: {
        Args: never
        Returns: {
          business_id: string
          seat_blocks: number
          seats_invited: number
          seats_per_unit: number
          seats_total: number
          seats_used: number
        }[]
      }
      my_class_waitlist_position: {
        Args: { p_class_id: string }
        Returns: number
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
          cleared_at: string
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
          last_sender_first_name: string
          other_avatar_url: string
          other_first_name: string
          other_participant_id: string
          other_role: string
          thread_id: string
          thread_name: string
          unread_count: number
          venue_id: string
          venue_initials: string
          venue_logo_url: string
          venue_name: string
        }[]
      }
      my_course_revision: {
        Args: { p_course_id: string }
        Returns: {
          category_key: string
          content_changed: boolean
          cover_colour: string
          created_at: string
          learn_points: string[]
          level: string
          price_cents: number
          review_reason: string
          reviewed_at: string
          revision_id: string
          status: string
          submitted_at: string
          subtitle: string
          title: string
          weekly_hours: number
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
      my_cycle_stats: {
        Args: never
        Returns: {
          avg_cycle_length: number
          avg_period_length: number
          cycles_observed: number
          last_period_start: string
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
      my_forum_blocks: {
        Args: never
        Returns: {
          block_ref: string
          blocked_at: string
          label: string
        }[]
      }
      my_forum_warnings: {
        Args: never
        Returns: {
          body: string
          created_at: string
          id: string
          seen_at: string
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
      my_gym_memberships: {
        Args: never
        Returns: {
          access_bluetooth: boolean
          access_nfc: boolean
          access_qr: boolean
          cancel_at_period_end: boolean
          expires_on: string
          gym_id: string
          gym_name: string
          id: string
          pass_state: string
          pass_token: string
          pass_valid: boolean
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_name: string
          price_agreed: number
          started_on: string
          status: Database["public"]["Enums"]["gym_membership_status"]
        }[]
      }
      my_hires: {
        Args: never
        Returns: {
          cancelled_at: string
          confirmed_at: string
          expires_on: string
          id: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_name: string
          price_agreed: number
          professional_first_name: string
          professional_id: string
          started_on: string
          status: Database["public"]["Enums"]["hire_status"]
        }[]
      }
      my_journal_week: {
        Args: never
        Returns: {
          entries: number
          week_start: string
          words: number
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
      my_referral_code: { Args: never; Returns: string }
      my_reviewable_professionals: {
        Args: never
        Returns: {
          connected_now: boolean
          first_name: string
          listed_publicly: boolean
          my_rating: number
          my_review_id: string
          my_review_status: string
          professional_id: string
        }[]
      }
      my_support_thread: {
        Args: never
        Returns: {
          created_at: string
          last_from_support: boolean
          last_message_at: string
          messages_total: number
          thread_id: string
          unread_count: number
        }[]
      }
      my_venues: {
        Args: never
        Returns: {
          active_members: number
          business_id: string
          gym_id: string
          hidden_at: string
          is_open_now: boolean
          location: string
          logo_url: string
          memberships_awaiting_payment: number
          name: string
          reviews_average: number
          reviews_count: number
          timezone: string
          upcoming_classes: number
          venue_kind: Database["public"]["Enums"]["venue_kind"]
        }[]
      }
      my_workout_week: {
        Args: never
        Returns: {
          done: number
          scheduled: number
          week_start: string
        }[]
      }
      needs_date_of_birth: { Args: never; Returns: boolean }
      new_course_pdf_path: { Args: { p_course_id: string }; Returns: string }
      new_forum_photo_path: { Args: { p_extension?: string }; Returns: string }
      normalise_display_name: { Args: { p_name: string }; Returns: string }
      normalize_gtin: { Args: { p_input: string }; Returns: string }
      notification_decision: {
        Args: { p_kind: string; p_user: string }
        Returns: string
      }
      notification_family: { Args: { p_kind: string }; Returns: string }
      notification_quiet_policy: { Args: { p_kind: string }; Returns: string }
      nutrition_goal_on: {
        Args: { p_date: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "nutrition_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      offer_next_waitlist_spot: {
        Args: { p_class_id: string }
        Returns: string
      }
      open_course_revision: { Args: { p_course_id: string }; Returns: string }
      overview_range: {
        Args: { p_range: string; p_tz: string }
        Returns: {
          bucket: string
          cur_end: string
          cur_start: string
          prev_end: string
          prev_start: string
        }[]
      }
      overview_suppress: { Args: { n: number }; Returns: number }
      owns_calendar_event: { Args: { p_event_id: string }; Returns: boolean }
      owns_imaging_record: { Args: { p_record_id: string }; Returns: boolean }
      paid_enrolment_is_open: { Args: never; Returns: boolean }
      pending_policies: {
        Args: { p_business_id: string }
        Returns: {
          document_id: string
          kind: string
          requires_reacceptance: boolean
          version: number
          version_id: string
        }[]
      }
      phone_list_is_valid: { Args: { p_phones: string[] }; Returns: boolean }
      plan_expiry_from: {
        Args: {
          p_billing: Database["public"]["Enums"]["billing_period"]
          p_from: string
          p_valid_for_days: number
        }
        Returns: string
      }
      plan_has_live_members: { Args: { p_plan_id: string }; Returns: number }
      plan_types_for_business_type: {
        Args: { p_type: Database["public"]["Enums"]["business_type"] }
        Returns: Database["public"]["Enums"]["plan_type"][]
      }
      post_plans_card: {
        Args: { p_plan_ids?: string[]; p_thread_id: string }
        Returns: string
      }
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
      preview_referral_code: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["referral_preview_result"]
        SetofOptions: {
          from: "*"
          to: "referral_preview_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      probe_rows_remaining: { Args: { p_id: string }; Returns: string }
      process_health_data_resets: { Args: never; Returns: number }
      process_scheduled_account_deletions: { Args: never; Returns: number }
      professional_can_take_client: {
        Args: { p_professional: string }
        Returns: string
      }
      professional_cv_is_visible: {
        Args: { p_professional_id: string }
        Returns: boolean
      }
      professional_free_period_expired: {
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
      professional_pending_hires: {
        Args: never
        Returns: {
          client_first_name: string
          client_id: string
          created_at: string
          id: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          plan_name: string
          price_agreed: number
        }[]
      }
      professional_plans_for: {
        Args: { p_professional: string }
        Returns: {
          billing: Database["public"]["Enums"]["billing_period"]
          features: string[]
          id: string
          is_hired: boolean
          name: string
          position: number
          price: number
        }[]
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
      purchase_gym_membership: {
        Args: {
          p_gym_id: string
          p_method?: Database["public"]["Enums"]["venue_payment_method"]
          p_plan_id: string
        }
        Returns: string
      }
      purge_barcode_lookup_misses: { Args: never; Returns: number }
      purge_contact_submissions: { Args: never; Returns: Json }
      purge_daily_active_snapshots: { Args: never; Returns: number }
      purge_message_content_history: { Args: never; Returns: number }
      purge_ops_events: { Args: never; Returns: number }
      queue_account_email: { Args: { p_id: string }; Returns: boolean }
      queue_activity_reminders: { Args: never; Returns: number }
      queue_calendar_event_alerts: { Args: never; Returns: number }
      queue_contraception_reminders: { Args: never; Returns: number }
      queue_deletion_reminders: { Args: never; Returns: number }
      queue_event_notification: {
        Args: {
          p_body: string
          p_kind: string
          p_source_id?: string
          p_source_kind?: string
          p_title: string
          p_user: string
        }
        Returns: string
      }
      queue_health_check_reminders: { Args: never; Returns: number }
      queue_licence_expiry_notices: { Args: never; Returns: number }
      queue_medication_reminders: { Args: never; Returns: number }
      queue_membership_notifications: { Args: never; Returns: number }
      queue_period_reminders: { Args: never; Returns: number }
      queue_personal_reminders: { Args: never; Returns: number }
      queue_renewal_payment_reminders: { Args: never; Returns: number }
      queue_streak_alerts: { Args: never; Returns: number }
      queue_weekly_summary: { Args: never; Returns: number }
      quiet_hours_end_at: { Args: { p_user: string }; Returns: string }
      rate_course: {
        Args: { p_body?: string; p_course_id: string; p_stars: number }
        Returns: undefined
      }
      reconcile_storage_usage: {
        Args: { p_user_id?: string }
        Returns: {
          actual_bytes: number
          corrected: boolean
          stored_bytes: number
          user_id: string
        }[]
      }
      record_ops_event: {
        Args: {
          p_details?: Json
          p_kind: string
          p_message?: string
          p_occurred_at?: string
          p_severity?: string
          p_source?: string
        }
        Returns: string
      }
      record_push_failure: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      record_reminder_failure: {
        Args: { p_reason: string; p_reminder_id: string }
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
      redeem_referral_code: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["referral_redeem_result"]
        SetofOptions: {
          from: "*"
          to: "referral_redeem_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      redeem_two_factor_recovery_code: {
        Args: { p_code: string }
        Returns: Database["public"]["CompositeTypes"]["two_factor_redeem_result"]
        SetofOptions: {
          from: "*"
          to: "two_factor_redeem_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      referral_summary: {
        Args: never
        Returns: {
          code: string
          code_created_at: string
          i_was_referred: boolean
          last_redeemed_at: string
          my_discount_pct: number
          points_earned: number
          redemptions: number
        }[]
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
      release_held_notifications: { Args: never; Returns: number }
      remove_course_lesson: {
        Args: { p_lesson_id: string }
        Returns: undefined
      }
      remove_course_module: {
        Args: { p_module_id: string }
        Returns: undefined
      }
      remove_course_quiz_question: {
        Args: { p_question_id: string }
        Returns: undefined
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
      rename_course_module: {
        Args: { p_module_id: string; p_title: string }
        Returns: undefined
      }
      rename_group: {
        Args: { p_name: string; p_thread_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string | null
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
      renew_gym_membership: {
        Args: { p_membership_id: string }
        Returns: string
      }
      reorder_course_lessons: {
        Args: { p_lesson_ids: string[]; p_module_id: string }
        Returns: undefined
      }
      reorder_course_modules: {
        Args: {
          p_course_id: string
          p_module_ids: string[]
          p_revision_id?: string
        }
        Returns: undefined
      }
      reply_to_professional_review: {
        Args: { p_body: string; p_review_id: string }
        Returns: undefined
      }
      report_course: {
        Args: {
          p_course_id: string
          p_detail?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
        }
        Returns: undefined
      }
      report_forum_post: {
        Args: {
          p_detail?: string
          p_reason?: Database["public"]["Enums"]["report_reason"]
          p_reply_id?: string
          p_thread_id?: string
        }
        Returns: undefined
      }
      report_professional_review: {
        Args: {
          p_detail?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_review_id: string
        }
        Returns: undefined
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
          deletion_due_at: string | null
          deletion_notice_days: number | null
          deletion_requested_at: string | null
          email: string | null
          first_name: string | null
          goals: string[]
          height_cm: number | null
          id: string
          instagram: string | null
          last_active_at: string
          onboarded: boolean
          phone: string | null
          plant_species: string | null
          preferred_activities: string[]
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
          shares_presence: boolean
          storage_bytes_used: number
          storage_purged_at: string | null
          timezone: string | null
          timezone_chosen_at: string | null
          tracking_preferences: string[]
          updated_at: string
          weight_kg: number | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_to_join_business: { Args: { p_code: string }; Returns: string }
      require_admin: { Args: never; Returns: undefined }
      respond_join_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: Database["public"]["Enums"]["join_request_status"]
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
      role_uses_seat: {
        Args: { p_role: Database["public"]["Enums"]["business_role"] }
        Returns: boolean
      }
      save_lab_report: {
        Args: { p_markers: Json; p_panel: Json }
        Returns: string
      }
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
      seat_capacity_for: {
        Args: { p_blocks: number; p_included: number; p_per: number }
        Returns: number
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
      send_broadcast_attachment: {
        Args: {
          p_attachment_bytes?: number
          p_attachment_mime?: string
          p_attachment_name?: string
          p_list_id: string
          p_object_leaf: string
          p_text?: string
        }
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
      session_is_aal2: { Args: never; Returns: boolean }
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
          closest_group:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          free_period_ends_at: string
          headline: string | null
          home_visit_km: number | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          other_discipline: string | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          session_formats: string[]
          session_lengths: number[]
          session_places: string[]
          show_volunteering: boolean
          skills: string[]
          specialties: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          work_mode:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
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
      set_business_paused: {
        Args: { p_business_id: string; p_paused: boolean }
        Returns: string
      }
      set_certificate_sharing: {
        Args: { p_certificate_id: string; p_shared: boolean }
        Returns: undefined
      }
      set_course_quiz_options: {
        Args: { p_options: Json; p_question_id: string }
        Returns: undefined
      }
      set_employee_terms: {
        Args: {
          p_clear_pay_rate?: boolean
          p_employment_id: string
          p_pay_rate_per_class?: number
          p_permissions?: string[]
          p_role?: Database["public"]["Enums"]["business_role"]
        }
        Returns: string
      }
      set_forum_nickname: { Args: { p_nickname: string }; Returns: undefined }
      set_public_listing: {
        Args: { p_listed: boolean }
        Returns: {
          affiliated_business_id: string | null
          approx_lat: number | null
          approx_lng: number | null
          area_label: string | null
          bio: string | null
          certification_url: string | null
          certification_verified: boolean
          closest_group:
            | Database["public"]["Enums"]["professional_group"]
            | null
          consultation_rate: number | null
          created_at: string
          facebook: string | null
          free_period_ends_at: string
          headline: string | null
          home_visit_km: number | null
          id: string
          instagram: string | null
          listed_publicly: boolean
          location: string | null
          monthly_rate: number | null
          other_discipline: string | null
          payment_modalities: Database["public"]["Enums"]["payment_modality"][]
          phone: string | null
          profile_id: string
          session_formats: string[]
          session_lengths: number[]
          session_places: string[]
          show_volunteering: boolean
          skills: string[]
          specialties: string[]
          specialty: string | null
          updated_at: string
          website: string | null
          work_mode:
            | Database["public"]["Enums"]["professional_work_mode"]
            | null
          x: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_routine_exercises: {
        Args: { p_items: Json; p_routine_id: string }
        Returns: number
      }
      should_notify: {
        Args: { p_kind: string; p_user: string }
        Returns: boolean
      }
      star_messages: { Args: { p_message_ids: string[] }; Returns: number }
      start_message_thread: {
        Args: { p_other_user_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          gym_id: string | null
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
      start_support_thread: { Args: never; Returns: string }
      start_venue_thread: { Args: { p_gym_id: string }; Returns: string }
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
      submit_course_for_review: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      submit_course_quiz: {
        Args: { p_answers: Json; p_lesson_id: string }
        Returns: {
          passed: boolean
          score_percent: number
        }[]
      }
      submit_course_revision: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      sweep_achievements: { Args: never; Returns: number }
      system_support_identity: { Args: never; Returns: string }
      text_set_entries_ok: {
        Args: { p_max_len: number; v: string[] }
        Returns: boolean
      }
      thread_allows_attachments: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      thread_allows_calls: {
        Args: { p_caller_id: string; p_thread_id: string }
        Returns: boolean
      }
      thread_blocks_sender: {
        Args: { p_sender: string; p_thread_id: string }
        Returns: boolean
      }
      thread_channel_topic: { Args: { p_thread_id: string }; Returns: string }
      thread_id_from_channel_topic: {
        Args: { p_topic: string }
        Returns: string
      }
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
      timezone_name_is_valid: { Args: { p_name: string }; Returns: boolean }
      toggle_gym_review_helpful: {
        Args: { p_review_id: string }
        Returns: boolean
      }
      touch_last_active: { Args: never; Returns: string }
      trigger_call_cap_sweep: { Args: never; Returns: number }
      trigger_forum_photo_purge: { Args: never; Returns: number }
      trigger_health_data_storage_purge: { Args: never; Returns: number }
      trigger_message_attachment_purge: { Args: never; Returns: number }
      trigger_storage_purge: { Args: never; Returns: number }
      two_factor_code_alphabet: { Args: never; Returns: string }
      two_factor_code_normalise: { Args: { p_raw: string }; Returns: string }
      two_factor_new_code: { Args: never; Returns: string }
      two_factor_recovery_status: {
        Args: never
        Returns: {
          factor_added_at: string
          generated_at: string
          last_used_at: string
          remaining: number
          total: number
          two_factor_enabled: boolean
        }[]
      }
      unblock_forum_block: { Args: { p_block_ref: string }; Returns: undefined }
      unlock_journal_folder: {
        Args: { p_folder_id: string; p_password: string }
        Returns: Database["public"]["CompositeTypes"]["journal_unlock_result"]
        SetofOptions: {
          from: "*"
          to: "journal_unlock_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_course_details: {
        Args: {
          p_category_key?: string
          p_course_id: string
          p_cover_colour?: string
          p_learn_points?: string[]
          p_level?: string
          p_price_cents?: number
          p_revision_id?: string
          p_subtitle?: string
          p_title?: string
          p_weekly_hours?: number
        }
        Returns: undefined
      }
      update_course_lesson: {
        Args: {
          p_body?: string
          p_lesson_id: string
          p_minutes?: number
          p_pass_mark?: number
          p_pdf_path?: string
          p_title?: string
          p_url?: string
        }
        Returns: undefined
      }
      update_course_quiz_question: {
        Args: { p_prompt: string; p_question_id: string }
        Returns: undefined
      }
      user_is_confirmed_adult: { Args: { p_user: string }; Returns: boolean }
      user_is_minor: { Args: { p_user: string }; Returns: boolean }
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
      venue_class_roster: {
        Args: { p_class_id: string }
        Returns: {
          at: string
          client_first_name: string
          client_is_minor: boolean
          entry_kind: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          price_agreed: number
          waitlist_position: number
        }[]
      }
      venue_dashboard: {
        Args: { p_gym_id: string }
        Returns: {
          active_members: number
          amount_awaiting_payment: number
          amount_marked_paid_this_month: number
          bookings_this_week: number
          cancellations_this_week: number
          classes_this_week: number
          gym_id: string
          is_open_now: boolean
          members_total: number
          memberships_awaiting_payment: number
          name: string
          reviews_average: number
          reviews_count: number
          waitlist_waiting: number
        }[]
      }
      venue_initials: { Args: { p_name: string }; Returns: string }
      venue_is_open_at: {
        Args: { p_at?: string; p_gym_id: string }
        Returns: boolean
      }
      venue_members: {
        Args: {
          p_gym_id: string
          p_limit?: number
          p_offset?: number
          p_status?: Database["public"]["Enums"]["gym_membership_status"]
        }
        Returns: {
          expires_on: string
          joined_at: string
          marked_paid_by: string
          member_first_name: string
          member_is_minor: boolean
          membership_id: string
          paid_at: string
          pass_state: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_name: string
          price_agreed: number
          started_on: string
          status: Database["public"]["Enums"]["gym_membership_status"]
          total_count: number
        }[]
      }
      venue_pending_payments: {
        Args: { p_gym_id: string }
        Returns: {
          amount: number
          description: string
          id: string
          kind: string
          payment_method: Database["public"]["Enums"]["venue_payment_method"]
          person_first_name: string
          person_is_minor: boolean
          since: string
        }[]
      }
      venue_renewal_stats: {
        Args: { p_from?: string; p_gym_id: string; p_to?: string }
        Returns: {
          cancelled: number
          due: number
          lapsed: number
          period_from: string
          period_to: string
          renewal_rate: number
          renewed: number
        }[]
      }
      venue_renewals_due: {
        Args: { p_days?: number; p_gym_id: string }
        Returns: {
          already_renewed: boolean
          cancel_at_period_end: boolean
          days_left: number
          expires_on: string
          member_first_name: string
          member_is_minor: boolean
          membership_id: string
          payment_status: Database["public"]["Enums"]["venue_payment_status"]
          plan_name: string
          total_count: number
        }[]
      }
      verify_gym_pass: {
        Args: { p_token: string }
        Returns: {
          expires_on: string
          gym_id: string
          member_first_name: string
          member_is_minor: boolean
          membership_id: string
          pass_state: string
          valid: boolean
        }[]
      }
      viewer_uses_gym: { Args: { p_gym_id: string }; Returns: boolean }
      withdraw_course_revision: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      withdraw_my_professional_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      withdraw_my_review_reply: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      write_gym_review: {
        Args: { p_body: string; p_gym_id: string; p_rating: number }
        Returns: string
      }
      youtube_video_id: { Args: { p_url: string }; Returns: string }
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
      billing_period:
        | "daily"
        | "monthly"
        | "annually"
        | "quarterly"
        | "semiannually"
      block_kind: "superset" | "amrap" | "emom" | "for_time"
      blood_marker_status: "low" | "normal" | "high"
      business_role:
        | "instructor"
        | "trainer"
        | "front_desk"
        | "manager"
        | "staff"
        | "shop_assistant"
      business_type:
        | "gym"
        | "store"
        | "supplement_store"
        | "equipment_seller"
        | "wellness_service"
        | "clothing_store"
        | "meal_prep_service"
        | "studio"
      calendar_alert:
        | "none"
        | "at_time"
        | "min_5"
        | "min_10"
        | "min_15"
        | "min_30"
        | "hour_1"
        | "hour_2"
        | "day_1"
        | "day_2"
        | "week_1"
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
      class_waitlist_state:
        | "waiting"
        | "offered"
        | "converted"
        | "left"
        | "expired"
      color_theme:
        | "centium"
        | "ocean"
        | "sunset"
        | "berry"
        | "sky_slate"
        | "rose_blush"
        | "gold_amber"
        | "coral_terracotta"
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
      date_precision: "day" | "month" | "year"
      dietary_restriction:
        | "vegetarian"
        | "vegan"
        | "gluten_free"
        | "dairy_free"
        | "nut_free"
        | "low_carb"
        | "pescatarian"
      exercise_classification:
        | "barbell"
        | "dumbbell"
        | "machine_other"
        | "weighted_bodyweight"
        | "assisted_bodyweight"
        | "reps_only"
        | "cardio"
        | "duration"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      external_food_source: "open_food_facts"
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
      food_source: "fdc" | "curated" | "user_submitted"
      food_unit: "serving" | "g" | "ml" | "cup" | "tbsp" | "tsp"
      gym_membership_status: "active" | "expired" | "cancelled" | "upcoming"
      habit_colour: "lavender" | "teal" | "gold" | "rose" | "sky"
      habit_icon:
        | "water"
        | "steps"
        | "workout"
        | "journal"
        | "meditation"
        | "sleep"
        | "book"
        | "custom"
        | "glass_water"
        | "moon"
        | "sun"
        | "apple"
        | "salad"
        | "coffee"
        | "bike"
        | "heart"
        | "smile"
        | "music"
        | "phone_off"
        | "timer"
      health_access_state: "ok" | "access_off" | "error"
      health_check_key:
        | "bp"
        | "glucose"
        | "cholesterol"
        | "hepatitis_c"
        | "hiv"
        | "bowel"
        | "mammogram"
        | "cervical"
        | "psa"
      health_metric_context: "rest" | "workout"
      health_metric_source:
        | "manual"
        | "apple_health"
        | "android_health"
        | "whoop"
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
      health_provider: "apple_health" | "android_health" | "whoop"
      heart_rate_alert_kind: "high" | "low"
      hire_status: "pending" | "active" | "cancelled" | "expired"
      join_request_status: "pending" | "approved" | "denied" | "withdrawn"
      lab_marker_category:
        | "blood_count"
        | "lipids"
        | "liver"
        | "kidney"
        | "hormones"
        | "metabolic"
        | "other"
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
      message_card_kind: "plans_offer" | "hire_confirmed"
      message_content_change: "edit" | "delete"
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
      plan_status: "active" | "paused" | "archived"
      plan_type:
        | "membership"
        | "day_pass"
        | "class_pack"
        | "intro_offer"
        | "drop_in"
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
      professional_group: "fitness" | "clinical" | "nutrition" | "other"
      professional_plan_source: "own_subscription" | "business_seat" | "default"
      professional_subtype:
        | "trainer"
        | "physiotherapist"
        | "dietitian"
        | "doctor"
        | "other"
      professional_work_mode: "in_person" | "online" | "both"
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
        | "nearby_search"
        | "meditation_session_log"
        | "create_forum_post"
        | "create_forum_reply"
        | "report_forum_post"
        | "create_course"
        | "submit_course_for_review"
        | "ask_course_question"
        | "rate_course"
        | "review_professional"
        | "edit_professional_review"
        | "report_professional_review"
        | "reply_to_professional_review"
        | "generate_two_factor_recovery_codes"
        | "redeem_two_factor_recovery_code"
        | "unlock_journal_folder"
        | "review_gym"
        | "invite_employee"
        | "request_to_join_business"
      rep_max_update_mode: "no_update" | "prompt" | "prompt_with_estimate"
      report_reason:
        | "harassment"
        | "spam"
        | "inappropriate_content"
        | "impersonation"
        | "safety_concern"
        | "harmful_health_advice"
      report_status: "open" | "actioned" | "dismissed"
      request_status: "pending" | "accepted" | "rejected"
      set_outcome: "completed" | "skipped" | "failed"
      set_type: "normal" | "warmup" | "failure" | "dropset" | "superset" | "pr"
      sex: "female" | "male" | "other"
      sex_activity: "none" | "protected" | "unprotected"
      sleep_stage: "awake" | "light" | "deep" | "rem"
      store_owner_type: "business" | "professional"
      subscription_status: "active" | "cancelled" | "expired"
      subscription_tier_type: "professional" | "business" | "client"
      template_level: "beginner" | "intermediate" | "advanced"
      theme_mode: "light" | "dark" | "auto"
      thread_kind: "peer" | "official_support" | "group" | "venue"
      thread_member_role: "owner" | "member"
      thread_member_status:
        | "invited"
        | "joined"
        | "declined"
        | "left"
        | "removed"
      unit_system: "metric" | "imperial"
      venue_kind: "gym" | "studio" | "store" | "wellness"
      venue_payment_method: "cash" | "whish"
      venue_payment_status: "pending" | "paid" | "refunded"
      verification_status: "pending" | "approved" | "rejected"
      water_unit: "ml" | "l" | "fl_oz"
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
        | "cycle"
    }
    CompositeTypes: {
      journal_unlock_result: {
        success: boolean | null
        message: string | null
        unlocked_until: string | null
      }
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
      referral_preview_result: {
        ok: boolean | null
        reason: string | null
        referrer_first_name: string | null
        referee_discount_pct: number | null
        referrer_discount_pct: number | null
      }
      referral_redeem_result: {
        ok: boolean | null
        reason: string | null
        message: string | null
        referral_id: string | null
        referee_discount_pct: number | null
        referrer_discount_pct: number | null
        points_awarded: number | null
      }
      two_factor_redeem_result: {
        success: boolean | null
        message: string | null
        remaining: number | null
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
      billing_period: [
        "daily",
        "monthly",
        "annually",
        "quarterly",
        "semiannually",
      ],
      block_kind: ["superset", "amrap", "emom", "for_time"],
      blood_marker_status: ["low", "normal", "high"],
      business_role: [
        "instructor",
        "trainer",
        "front_desk",
        "manager",
        "staff",
        "shop_assistant",
      ],
      business_type: [
        "gym",
        "store",
        "supplement_store",
        "equipment_seller",
        "wellness_service",
        "clothing_store",
        "meal_prep_service",
        "studio",
      ],
      calendar_alert: [
        "none",
        "at_time",
        "min_5",
        "min_10",
        "min_15",
        "min_30",
        "hour_1",
        "hour_2",
        "day_1",
        "day_2",
        "week_1",
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
      class_waitlist_state: [
        "waiting",
        "offered",
        "converted",
        "left",
        "expired",
      ],
      color_theme: [
        "centium",
        "ocean",
        "sunset",
        "berry",
        "sky_slate",
        "rose_blush",
        "gold_amber",
        "coral_terracotta",
      ],
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
      date_precision: ["day", "month", "year"],
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
      exercise_difficulty: ["beginner", "intermediate", "advanced"],
      external_food_source: ["open_food_facts"],
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
      food_source: ["fdc", "curated", "user_submitted"],
      food_unit: ["serving", "g", "ml", "cup", "tbsp", "tsp"],
      gym_membership_status: ["active", "expired", "cancelled", "upcoming"],
      habit_colour: ["lavender", "teal", "gold", "rose", "sky"],
      habit_icon: [
        "water",
        "steps",
        "workout",
        "journal",
        "meditation",
        "sleep",
        "book",
        "custom",
        "glass_water",
        "moon",
        "sun",
        "apple",
        "salad",
        "coffee",
        "bike",
        "heart",
        "smile",
        "music",
        "phone_off",
        "timer",
      ],
      health_access_state: ["ok", "access_off", "error"],
      health_check_key: [
        "bp",
        "glucose",
        "cholesterol",
        "hepatitis_c",
        "hiv",
        "bowel",
        "mammogram",
        "cervical",
        "psa",
      ],
      health_metric_context: ["rest", "workout"],
      health_metric_source: [
        "manual",
        "apple_health",
        "android_health",
        "whoop",
      ],
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
      health_provider: ["apple_health", "android_health", "whoop"],
      heart_rate_alert_kind: ["high", "low"],
      hire_status: ["pending", "active", "cancelled", "expired"],
      join_request_status: ["pending", "approved", "denied", "withdrawn"],
      lab_marker_category: [
        "blood_count",
        "lipids",
        "liver",
        "kidney",
        "hormones",
        "metabolic",
        "other",
      ],
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
      message_card_kind: ["plans_offer", "hire_confirmed"],
      message_content_change: ["edit", "delete"],
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
      plan_status: ["active", "paused", "archived"],
      plan_type: [
        "membership",
        "day_pass",
        "class_pack",
        "intro_offer",
        "drop_in",
      ],
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
      professional_group: ["fitness", "clinical", "nutrition", "other"],
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
      professional_work_mode: ["in_person", "online", "both"],
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
        "nearby_search",
        "meditation_session_log",
        "create_forum_post",
        "create_forum_reply",
        "report_forum_post",
        "create_course",
        "submit_course_for_review",
        "ask_course_question",
        "rate_course",
        "review_professional",
        "edit_professional_review",
        "report_professional_review",
        "reply_to_professional_review",
        "generate_two_factor_recovery_codes",
        "redeem_two_factor_recovery_code",
        "unlock_journal_folder",
        "review_gym",
        "invite_employee",
        "request_to_join_business",
      ],
      rep_max_update_mode: ["no_update", "prompt", "prompt_with_estimate"],
      report_reason: [
        "harassment",
        "spam",
        "inappropriate_content",
        "impersonation",
        "safety_concern",
        "harmful_health_advice",
      ],
      report_status: ["open", "actioned", "dismissed"],
      request_status: ["pending", "accepted", "rejected"],
      set_outcome: ["completed", "skipped", "failed"],
      set_type: ["normal", "warmup", "failure", "dropset", "superset", "pr"],
      sex: ["female", "male", "other"],
      sex_activity: ["none", "protected", "unprotected"],
      sleep_stage: ["awake", "light", "deep", "rem"],
      store_owner_type: ["business", "professional"],
      subscription_status: ["active", "cancelled", "expired"],
      subscription_tier_type: ["professional", "business", "client"],
      template_level: ["beginner", "intermediate", "advanced"],
      theme_mode: ["light", "dark", "auto"],
      thread_kind: ["peer", "official_support", "group", "venue"],
      thread_member_role: ["owner", "member"],
      thread_member_status: [
        "invited",
        "joined",
        "declined",
        "left",
        "removed",
      ],
      unit_system: ["metric", "imperial"],
      venue_kind: ["gym", "studio", "store", "wellness"],
      venue_payment_method: ["cash", "whish"],
      venue_payment_status: ["pending", "paid", "refunded"],
      verification_status: ["pending", "approved", "rejected"],
      water_unit: ["ml", "l", "fl_oz"],
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
        "cycle",
      ],
    },
  },
} as const

