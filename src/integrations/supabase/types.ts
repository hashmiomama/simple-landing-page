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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          capacity: number | null
          city: string | null
          created_at: string
          created_by: string
          description: string
          ends_at: string | null
          format: Database["public"]["Enums"]["event_format"]
          id: string
          interest_slug: string
          location: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          created_at?: string
          created_by: string
          description: string
          ends_at?: string | null
          format: Database["public"]["Enums"]["event_format"]
          id?: string
          interest_slug: string
          location?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string
          ends_at?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          interest_slug?: string
          location?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["activity_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_interest_slug_fkey"
            columns: ["interest_slug"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["slug"]
          },
        ]
      }
      activity_feedback: {
        Row: {
          activity_id: string
          comment: string | null
          created_at: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          comment?: string | null
          created_at?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          comment?: string | null
          created_at?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feedback_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: true
            referencedRelation: "activity_participants"
            referencedColumns: ["activity_id", "user_id"]
          },
        ]
      }
      activity_messages: {
        Row: {
          activity_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_messages_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_messages_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_participants"
            referencedColumns: ["activity_id", "user_id"]
          },
        ]
      }
      activity_participants: {
        Row: {
          activity_id: string
          created_at: string
          status: Database["public"]["Enums"]["participant_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          status?: Database["public"]["Enums"]["participant_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
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
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          created_at: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["identity_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["identity_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["identity_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: {
          created_at: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          activity_updates: boolean
          created_at: string
          deadline_reminders: boolean
          email_enabled: boolean
          in_app_enabled: boolean
          opportunity_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_updates?: boolean
          created_at?: string
          deadline_reminders?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          opportunity_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_updates?: boolean
          created_at?: string
          deadline_reminders?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          opportunity_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          category_slug: string
          city: string | null
          cost_or_funding: string
          country: string | null
          cover_url: string | null
          created_at: string
          deadline: string | null
          description: string
          eligibility: string
          ends_at: string | null
          format: Database["public"]["Enums"]["event_format"]
          id: string
          last_verified_at: string | null
          location: string
          organisation_id: string | null
          organisation_name: string
          source_url: string
          starts_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_slug: string
          city?: string | null
          cost_or_funding: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          eligibility: string
          ends_at?: string | null
          format: Database["public"]["Enums"]["event_format"]
          id?: string
          last_verified_at?: string | null
          location: string
          organisation_id?: string | null
          organisation_name: string
          source_url: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          city?: string | null
          cost_or_funding?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          eligibility?: string
          ends_at?: string | null
          format?: Database["public"]["Enums"]["event_format"]
          id?: string
          last_verified_at?: string | null
          location?: string
          organisation_id?: string | null
          organisation_name?: string
          source_url?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "opportunity_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "opportunities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_categories: {
        Row: {
          category_group: Database["public"]["Enums"]["category_group"]
          created_at: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_group: Database["public"]["Enums"]["category_group"]
          created_at?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_group?: Database["public"]["Enums"]["category_group"]
          created_at?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_tags: {
        Row: {
          created_at: string
          interest_slug: string
          opportunity_id: string
        }
        Insert: {
          created_at?: string
          interest_slug: string
          opportunity_id: string
        }
        Update: {
          created_at?: string
          interest_slug?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_tags_interest_slug_fkey"
            columns: ["interest_slug"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "opportunity_tags_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          activity_id: string
          created_at: string
          option_id: string
          poll_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          option_id: string
          poll_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          option_id?: string
          poll_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: false
            referencedRelation: "activity_participants"
            referencedColumns: ["activity_id", "user_id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_activity_id_fkey"
            columns: ["poll_id", "activity_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id", "activity_id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_option_id_fkey"
            columns: ["poll_id", "option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["poll_id", "id"]
          },
        ]
      }
      polls: {
        Row: {
          activity_id: string
          closes_at: string | null
          created_at: string
          created_by: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          closes_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_activity_id_created_by_fkey"
            columns: ["activity_id", "created_by"]
            isOneToOne: false
            referencedRelation: "activity_participants"
            referencedColumns: ["activity_id", "user_id"]
          },
          {
            foreignKeyName: "polls_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          date_of_birth: string | null
          gender: string | null
          legal_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          legal_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          legal_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_identity_verified: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          is_identity_verified?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_identity_verified?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          application_id: string | null
          created_at: string
          id: string
          remind_at: string
          sent_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          id?: string
          remind_at: string
          sent_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          id?: string
          remind_at?: string
          sent_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_application_id_user_id_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          activity_id: string | null
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          opportunity_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          solo_experience_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          opportunity_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          solo_experience_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          opportunity_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          solo_experience_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "activity_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_solo_experience_id_fkey"
            columns: ["solo_experience_id"]
            isOneToOne: false
            referencedRelation: "solo_experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_opportunities: {
        Row: {
          created_at: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_opportunities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_experiences: {
        Row: {
          category: string
          city: string
          cost: number | null
          created_at: string
          currency: string | null
          description: string
          duration_minutes: number | null
          id: string
          location: string
          source_url: string | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          city: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          description: string
          duration_minutes?: number | null
          id?: string
          location: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          city?: string
          cost?: number | null
          created_at?: string
          currency?: string | null
          description?: string
          duration_minutes?: number | null
          id?: string
          location?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_experiences_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          interest_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          interest_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          interest_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_interest_slug_fkey"
            columns: ["interest_slug"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          budget_preference: Database["public"]["Enums"]["budget_preference"]
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          max_budget: number | null
          onboarding_completed: boolean
          opportunity_category_slugs: string[]
          personality_type: string | null
          social_comfort: Database["public"]["Enums"]["social_comfort"] | null
          updated_at: string
          user_id: string
          wants_online: boolean
        }
        Insert: {
          budget_preference?: Database["public"]["Enums"]["budget_preference"]
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          max_budget?: number | null
          onboarding_completed?: boolean
          opportunity_category_slugs?: string[]
          personality_type?: string | null
          social_comfort?: Database["public"]["Enums"]["social_comfort"] | null
          updated_at?: string
          user_id: string
          wants_online?: boolean
        }
        Update: {
          budget_preference?: Database["public"]["Enums"]["budget_preference"]
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          max_budget?: number | null
          onboarding_completed?: boolean
          opportunity_category_slugs?: string[]
          personality_type?: string | null
          social_comfort?: Database["public"]["Enums"]["social_comfort"] | null
          updated_at?: string
          user_id?: string
          wants_online?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_reviews: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          report: Json
          reviewer_id: string | null
          reviewer_kind: Database["public"]["Enums"]["reviewer_kind"]
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          report?: Json
          reviewer_id?: string | null
          reviewer_kind: Database["public"]["Enums"]["reviewer_kind"]
          status: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          report?: Json
          reviewer_id?: string | null
          reviewer_kind?: Database["public"]["Enums"]["reviewer_kind"]
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_account: { Args: { account_id: string }; Returns: undefined }
      get_dashboard_summary: {
        Args: never
        Returns: {
          saved_count: number
          saved_due_in_14_days_count: number
          upcoming_deadlines: Json
        }[]
      }
      get_recommended_opportunities: {
        Args: { p_limit?: number }
        Returns: {
          budget_score: number
          category_score: number
          category_slug: string
          city: string
          cost_or_funding: string
          country: string
          cover_url: string
          created_at: string
          deadline: string
          description: string
          eligibility: string
          ends_at: string
          format: Database["public"]["Enums"]["event_format"]
          id: string
          interest_score: number
          last_verified_at: string
          location: string
          location_score: number
          organisation_id: string
          organisation_name: string
          recency_score: number
          social_comfort_score: number
          source_url: string
          starts_at: string
          status: Database["public"]["Enums"]["review_status"]
          submitted_by: string
          title: string
          total_score: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: { role: Database["public"]["Enums"]["app_role"]; user_id: string }
        Returns: boolean
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
    }
    Enums: {
      activity_status:
        | "proposed"
        | "recruiting"
        | "planning"
        | "confirmed"
        | "completed"
        | "cancelled"
      app_role: "member" | "organisation" | "admin"
      application_status:
        | "interested"
        | "preparing"
        | "submitted"
        | "interview"
        | "accepted"
        | "rejected"
        | "withdrawn"
      budget_preference: "free_only" | "low" | "any"
      category_group: "academic" | "professional" | "personal_development"
      event_format: "online" | "physical" | "hybrid"
      identity_status: "pending" | "verified" | "rejected" | "expired"
      participant_status: "pending" | "accepted" | "declined" | "withdrawn"
      report_status: "open" | "investigating" | "resolved" | "dismissed"
      review_status: "pending" | "approved" | "rejected" | "archived"
      reviewer_kind: "ai" | "admin"
      social_comfort: "quiet" | "small_group" | "social" | "flexible"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_status: [
        "proposed",
        "recruiting",
        "planning",
        "confirmed",
        "completed",
        "cancelled",
      ],
      app_role: ["member", "organisation", "admin"],
      application_status: [
        "interested",
        "preparing",
        "submitted",
        "interview",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      budget_preference: ["free_only", "low", "any"],
      category_group: ["academic", "professional", "personal_development"],
      event_format: ["online", "physical", "hybrid"],
      identity_status: ["pending", "verified", "rejected", "expired"],
      participant_status: ["pending", "accepted", "declined", "withdrawn"],
      report_status: ["open", "investigating", "resolved", "dismissed"],
      review_status: ["pending", "approved", "rejected", "archived"],
      reviewer_kind: ["ai", "admin"],
      social_comfort: ["quiet", "small_group", "social", "flexible"],
    },
  },
} as const
