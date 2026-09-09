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
      app_preferences: {
        Row: {
          created_at: string
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
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
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
            foreignKeyName: "calendar_events_source_template_assignment_id_fkey"
            columns: ["source_template_assignment_id"]
            isOneToOne: false
            referencedRelation: "workout_template_assignments"
            referencedColumns: ["id"]
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
            foreignKeyName: "cart_items_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
        Relationships: [
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
          name: string
          name_ar: string | null
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
          name: string
          name_ar?: string | null
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
          name?: string
          name_ar?: string | null
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
        ]
      }
      exercises: {
        Row: {
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at: string
          id: string
          muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          name: string
          secondary_muscle_groups: Database["public"]["Enums"]["muscle_group"][]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["muscle_group"]
          classification: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["muscle_group"]
          classification?: Database["public"]["Enums"]["exercise_classification"]
          created_at?: string
          id?: string
          muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          name?: string
          secondary_muscle_groups?: Database["public"]["Enums"]["muscle_group"][]
          updated_at?: string
        }
        Relationships: []
      }
      extracted_biomarkers: {
        Row: {
          created_at: string
          id: string
          name: string
          selected: boolean
          source_image_url: string | null
          unit: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          selected?: boolean
          source_image_url?: string | null
          unit?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          selected?: boolean
          source_image_url?: string | null
          unit?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_biomarkers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_biomarkers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_biomarkers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "related_profile_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_biomarkers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "storage_purge_stalls"
            referencedColumns: ["user_id"]
          },
        ]
      }
      food_log_entries: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          custom_food_id: string | null
          fat_g: number
          food_id: string | null
          id: string
          logged_date: string
          logged_via: Database["public"]["Enums"]["food_log_source"] | null
          meal: Database["public"]["Enums"]["meal_slot"]
          name: string
          protein_g: number
          quantity: number
          unit: Database["public"]["Enums"]["food_unit"]
          user_id: string
        }
        Insert: {
          calories: number
          carbs_g: number
          created_at?: string
          custom_food_id?: string | null
          fat_g: number
          food_id?: string | null
          id?: string
          logged_date?: string
          logged_via?: Database["public"]["Enums"]["food_log_source"] | null
          meal: Database["public"]["Enums"]["meal_slot"]
          name: string
          protein_g: number
          quantity: number
          unit: Database["public"]["Enums"]["food_unit"]
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          custom_food_id?: string | null
          fat_g?: number
          food_id?: string | null
          id?: string
          logged_date?: string
          logged_via?: Database["public"]["Enums"]["food_log_source"] | null
          meal?: Database["public"]["Enums"]["meal_slot"]
          name?: string
          protein_g?: number
          quantity?: number
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
          entry_date?: string
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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          position: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          position?: number
        }
        Relationships: [
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
        ]
      }
      logged_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          name: string
          position: number
          workout_session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          name: string
          position: number
          workout_session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          name?: string
          position?: number
          workout_session_id?: string
        }
        Relationships: [
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
          logged_exercise_id: string
          mood: number | null
          notes: string | null
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
          logged_exercise_id: string
          mood?: number | null
          notes?: string | null
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
          logged_exercise_id?: string
          mood?: number | null
          notes?: string | null
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
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          participant_one_id: string | null
          participant_two_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          participant_one_id?: string | null
          participant_two_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          participant_one_id?: string | null
          participant_two_id?: string | null
        }
        Relationships: [
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
        ]
      }
      messages: {
        Row: {
          attachment_purged_at: string | null
          attachment_url: string | null
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
          text: string | null
          thread_id: string
          voice_note_seconds: number | null
        }
        Insert: {
          attachment_purged_at?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id: string
          voice_note_seconds?: number | null
        }
        Update: {
          attachment_purged_at?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          text?: string | null
          thread_id?: string
          voice_note_seconds?: number | null
        }
        Relationships: [
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
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mind_content: {
        Row: {
          content_type: Database["public"]["Enums"]["mind_content_type"]
          created_at: string
          description: string | null
          id: string
          name: string
          phases: Json | null
          updated_at: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["mind_content_type"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phases?: Json | null
          updated_at?: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["mind_content_type"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phases?: Json | null
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
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          estimated_one_rep_max_kg: number
          exercise_id: string
          id: string
          source_logged_set_id: string | null
          user_id: string
        }
        Insert: {
          achieved_at: string
          created_at?: string
          estimated_one_rep_max_kg: number
          exercise_id: string
          id?: string
          source_logged_set_id?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          estimated_one_rep_max_kg?: number
          exercise_id?: string
          id?: string
          source_logged_set_id?: string | null
          user_id?: string
        }
        Relationships: [
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
        ]
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
        ]
      }
      professional_profiles: {
        Row: {
          affiliated_business_id: string | null
          bio: string | null
          certification_url: string | null
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
        Insert: {
          affiliated_business_id?: string | null
          bio?: string | null
          certification_url?: string | null
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id: string
          specialty?: string | null
          updated_at?: string
          website?: string | null
          x?: string | null
        }
        Update: {
          affiliated_business_id?: string | null
          bio?: string | null
          certification_url?: string | null
          consultation_rate?: number | null
          created_at?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          listed_publicly?: boolean
          location?: string | null
          monthly_rate?: number | null
          payment_modalities?: Database["public"]["Enums"]["payment_modality"][]
          phone?: string | null
          profile_id?: string
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
          onboarded: boolean
          phone: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
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
          onboarded?: boolean
          phone?: string | null
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
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
          onboarded?: boolean
          phone?: string | null
          professional_subtype?:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex?: Database["public"]["Enums"]["sex"] | null
          storage_purged_at?: string | null
          tracking_preferences?: string[]
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
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
        ]
      }
      routine_exercises: {
        Row: {
          cardio_avg_heart_rate: number | null
          cardio_distance_km: number | null
          cardio_duration_min: number | null
          cardio_incline_pct: number | null
          cardio_pace_min_per_km: number | null
          created_at: string
          custom_exercise_id: string | null
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
          routine_id: string
          rpe: number | null
          sets: number | null
          tempo: string | null
          weight_kg: number | null
        }
        Insert: {
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
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
          routine_id: string
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
        }
        Update: {
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
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
          routine_id?: string
          rpe?: number | null
          sets?: number | null
          tempo?: string | null
          weight_kg?: number | null
        }
        Relationships: [
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
        Insert: {
          assigned_by_professional_id?: string | null
          coach_note?: string | null
          color?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          folder_id?: string | null
          id?: string
          name: string
          owner_id: string
          source_template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by_professional_id?: string | null
          coach_note?: string | null
          color?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          folder_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          source_template_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
        ]
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
        ]
      }
      subscription_states: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          premium_plan: Database["public"]["Enums"]["premium_plan"] | null
          renews_at: string | null
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
          max_clients: number | null
          max_employees: number | null
          monthly_price: number
          name: string
          tier_type: Database["public"]["Enums"]["subscription_tier_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          max_clients?: number | null
          max_employees?: number | null
          monthly_price: number
          name: string
          tier_type: Database["public"]["Enums"]["subscription_tier_type"]
        }
        Update: {
          created_at?: string
          id?: string
          max_clients?: number | null
          max_employees?: number | null
          monthly_price?: number
          name?: string
          tier_type?: Database["public"]["Enums"]["subscription_tier_type"]
        }
        Relationships: []
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
        ]
      }
      workout_sessions: {
        Row: {
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
        ]
      }
      workout_template_assignments: {
        Row: {
          assigned_day: string | null
          client_id: string
          created_at: string
          id: string
          routine_id: string | null
          workout_template_id: string
        }
        Insert: {
          assigned_day?: string | null
          client_id: string
          created_at?: string
          id?: string
          routine_id?: string | null
          workout_template_id: string
        }
        Update: {
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
      workout_template_exercises: {
        Row: {
          cardio_avg_heart_rate: number | null
          cardio_distance_km: number | null
          cardio_duration_min: number | null
          cardio_incline_pct: number | null
          cardio_pace_min_per_km: number | null
          created_at: string
          custom_exercise_id: string | null
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
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
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
          cardio_avg_heart_rate?: number | null
          cardio_distance_km?: number | null
          cardio_duration_min?: number | null
          cardio_incline_pct?: number | null
          cardio_pace_min_per_km?: number | null
          created_at?: string
          custom_exercise_id?: string | null
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
        ]
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
        ]
      }
      current_personal_records: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          estimated_one_rep_max_kg: number | null
          exercise_id: string | null
          id: string | null
          source_logged_set_id: string | null
          user_id: string | null
        }
        Relationships: [
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
        ]
      }
      public_professional_directory: {
        Row: {
          avatar_url: string | null
          bio: string | null
          consultation_rate: number | null
          created_at: string | null
          facebook: string | null
          first_name: string | null
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
      assign_template_to_client: {
        Args: {
          p_assigned_day?: string
          p_client_id: string
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
          onboarded: boolean
          phone: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
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
      generate_client_code: { Args: { p_prefix: string }; Returns: string }
      generate_referral_code: { Args: { p_prefix: string }; Returns: string }
      has_client_access: {
        Args: {
          p_category: Database["public"]["Enums"]["access_category"]
          p_client_id: string
        }
        Returns: boolean
      }
      list_pending_storage_purges: {
        Args: never
        Returns: {
          bucket_id: string
          object_name: string
          user_id: string
        }[]
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
      process_scheduled_account_deletions: { Args: never; Returns: number }
      professional_is_affiliated: {
        Args: { p_professional_id: string }
        Returns: boolean
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
          onboarded: boolean
          phone: string | null
          professional_subtype:
            | Database["public"]["Enums"]["professional_subtype"]
            | null
          sex: Database["public"]["Enums"]["sex"] | null
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
      set_public_listing: {
        Args: { p_listed: boolean }
        Returns: {
          affiliated_business_id: string | null
          bio: string | null
          certification_url: string | null
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
      start_message_thread: {
        Args: { p_other_user_id: string }
        Returns: {
          created_at: string
          id: string
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
      storage_path_token: {
        Args: { p_index: number; p_name: string }
        Returns: string
      }
      storage_path_uuid: {
        Args: { p_index: number; p_name: string }
        Returns: string
      }
      trigger_storage_purge: { Args: never; Returns: number }
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
      account_type: "customer" | "professional" | "business"
      activity_level:
        | "sedentary"
        | "light"
        | "moderate"
        | "very_active"
        | "athlete"
      app_language: "en" | "ar"
      app_platform: "web" | "mobile"
      billing_period: "daily" | "monthly" | "annually"
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
      color_theme: "centium" | "ocean" | "sunset" | "berry"
      customer_subtype: "client" | "regular" | "athlete" | "general"
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
      health_provider: "apple_health" | "android_health"
      meal_slot: "breakfast" | "lunch" | "snack" | "dinner"
      medication_route: "oral" | "injectable" | "topical" | "inhaled" | "other"
      mind_content_type: "breathing" | "stretch" | "yoga"
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
      points_source: "streak" | "referral" | "manual_adjustment" | "other"
      premium_plan: "monthly" | "yearly"
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
      rep_max_update_mode: "no_update" | "prompt" | "prompt_with_estimate"
      request_status: "pending" | "accepted" | "rejected"
      set_type: "normal" | "warmup" | "failure" | "dropset" | "superset" | "pr"
      sex: "female" | "male" | "other"
      store_owner_type: "business" | "professional"
      subscription_status: "active" | "cancelled" | "expired"
      subscription_tier_type: "professional" | "business"
      template_level: "beginner" | "intermediate" | "advanced"
      theme_mode: "light" | "dark" | "auto"
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
      ],
      account_type: ["customer", "professional", "business"],
      activity_level: [
        "sedentary",
        "light",
        "moderate",
        "very_active",
        "athlete",
      ],
      app_language: ["en", "ar"],
      app_platform: ["web", "mobile"],
      billing_period: ["daily", "monthly", "annually"],
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
      color_theme: ["centium", "ocean", "sunset", "berry"],
      customer_subtype: ["client", "regular", "athlete", "general"],
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
      ],
      health_provider: ["apple_health", "android_health"],
      meal_slot: ["breakfast", "lunch", "snack", "dinner"],
      medication_route: ["oral", "injectable", "topical", "inhaled", "other"],
      mind_content_type: ["breathing", "stretch", "yoga"],
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
      points_source: ["streak", "referral", "manual_adjustment", "other"],
      premium_plan: ["monthly", "yearly"],
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
      ],
      rep_max_update_mode: ["no_update", "prompt", "prompt_with_estimate"],
      request_status: ["pending", "accepted", "rejected"],
      set_type: ["normal", "warmup", "failure", "dropset", "superset", "pr"],
      sex: ["female", "male", "other"],
      store_owner_type: ["business", "professional"],
      subscription_status: ["active", "cancelled", "expired"],
      subscription_tier_type: ["professional", "business"],
      template_level: ["beginner", "intermediate", "advanced"],
      theme_mode: ["light", "dark", "auto"],
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
