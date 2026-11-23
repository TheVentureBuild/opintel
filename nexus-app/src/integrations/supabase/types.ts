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
      activity_log: {
        Row: {
          actor: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          kind: string
          message: string
          metadata: Json
          target: string | null
        }
        Insert: {
          actor?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          message: string
          metadata?: Json
          target?: string | null
        }
        Update: {
          actor?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          message?: string
          metadata?: Json
          target?: string | null
        }
        Relationships: []
      }
      apply_as_founder: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      client_data_settings: {
        Row: {
          id: boolean
          last_applied_at: string | null
          last_applied_by: string | null
          refresh_minutes: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          last_applied_at?: string | null
          last_applied_by?: string | null
          refresh_minutes?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          last_applied_at?: string | null
          last_applied_by?: string | null
          refresh_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_field_visibility: {
        Row: {
          field_key: string
          first_seen_at: string
          hidden: boolean
          hidden_applied: boolean
          label: string
          last_seen_at: string
          note_count: number
          sample: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          field_key: string
          first_seen_at?: string
          hidden?: boolean
          hidden_applied?: boolean
          label: string
          last_seen_at?: string
          note_count?: number
          sample?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          field_key?: string
          first_seen_at?: string
          hidden?: boolean
          hidden_applied?: boolean
          label?: string
          last_seen_at?: string
          note_count?: number
          sample?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customer_requests: {
        Row: {
          am_response: string | null
          company_name: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          message: string | null
          metadata: Json | null
          related_perk: string | null
          request_type: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          am_response?: string | null
          company_name?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          related_perk?: string | null
          request_type: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          am_response?: string | null
          company_name?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          related_perk?: string | null
          request_type?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cxo_candidates: {
        Row: {
          conflicts: Json
          created_at: string
          decision: string
          duplicate_kind: string | null
          duplicate_of: string | null
          evidence: Json
          fields: Json
          id: string
          match_score: number
          name: string
          published: boolean
          reasons: Json
          run_id: string
          selected: boolean
          source_label: string
          source_url: string | null
          stage: string
          status: string
        }
        Insert: {
          conflicts?: Json
          created_at?: string
          decision?: string
          duplicate_kind?: string | null
          duplicate_of?: string | null
          evidence?: Json
          fields?: Json
          id?: string
          match_score?: number
          name: string
          published?: boolean
          reasons?: Json
          run_id: string
          selected?: boolean
          source_label: string
          source_url?: string | null
          stage: string
          status?: string
        }
        Update: {
          conflicts?: Json
          created_at?: string
          decision?: string
          duplicate_kind?: string | null
          duplicate_of?: string | null
          evidence?: Json
          fields?: Json
          id?: string
          match_score?: number
          name?: string
          published?: boolean
          reasons?: Json
          run_id?: string
          selected?: boolean
          source_label?: string
          source_url?: string | null
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_candidates_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "cxo_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cxo_candidates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cxo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_icps: {
        Row: {
          created_at: string
          criteria: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cxo_people: {
        Row: {
          decision: string
          evidence: Json
          fields: Json
          first_seen: string
          id: string
          last_seen: string
          match_score: number
          notes: string
          saved: boolean
          sources: Json
        }
        Insert: {
          decision?: string
          evidence?: Json
          fields?: Json
          first_seen?: string
          id: string
          last_seen?: string
          match_score?: number
          notes?: string
          saved?: boolean
          sources?: Json
        }
        Update: {
          decision?: string
          evidence?: Json
          fields?: Json
          first_seen?: string
          id?: string
          last_seen?: string
          match_score?: number
          notes?: string
          saved?: boolean
          sources?: Json
        }
        Relationships: []
      }
      cxo_runs: {
        Row: {
          created_at: string
          error: string | null
          events: Json
          icp_id: string | null
          icp_snapshot: Json
          id: string
          max_searches: number
          published_count: number
          queries: Json
          results_per_search: number
          searches_used: number
          stage: string
          stage_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          events?: Json
          icp_id?: string | null
          icp_snapshot?: Json
          id?: string
          max_searches?: number
          published_count?: number
          queries?: Json
          results_per_search?: number
          searches_used?: number
          stage?: string
          stage_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          events?: Json
          icp_id?: string | null
          icp_snapshot?: Json
          id?: string
          max_searches?: number
          published_count?: number
          queries?: Json
          results_per_search?: number
          searches_used?: number
          stage?: string
          stage_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_runs_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "cxo_icps"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_search_batches: {
        Row: {
          batch_no: number
          created_at: string
          error: string | null
          id: string
          query: string
          results_count: number
          run_id: string
          status: string
        }
        Insert: {
          batch_no: number
          created_at?: string
          error?: string | null
          id?: string
          query: string
          results_count?: number
          run_id: string
          status?: string
        }
        Update: {
          batch_no?: number
          created_at?: string
          error?: string | null
          id?: string
          query?: string
          results_count?: number
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_search_batches_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cxo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_site_credentials: {
        Row: {
          secret: Json
          site_id: string
          updated_at: string
        }
        Insert: {
          secret: Json
          site_id: string
          updated_at?: string
        }
        Update: {
          secret?: Json
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_site_credentials_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "cxo_trusted_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_source_files: {
        Row: {
          created_at: string
          error: string | null
          id: string
          name: string
          people_found: number
          run_id: string | null
          size_bytes: number
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          name: string
          people_found?: number
          run_id?: string | null
          size_bytes?: number
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          name?: string
          people_found?: number
          run_id?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_source_files_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cxo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_tasks: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json
          ref_id: string | null
          run_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json
          ref_id?: string | null
          run_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json
          ref_id?: string | null
          run_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cxo_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cxo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      cxo_trusted_sites: {
        Row: {
          access_method: string
          created_at: string
          id: string
          last_checked: string | null
          matches: number
          name: string
          people_found: number
          status: string
          status_detail: string | null
          url: string
        }
        Insert: {
          access_method?: string
          created_at?: string
          id?: string
          last_checked?: string | null
          matches?: number
          name: string
          people_found?: number
          status?: string
          status_detail?: string | null
          url: string
        }
        Update: {
          access_method?: string
          created_at?: string
          id?: string
          last_checked?: string | null
          matches?: number
          name?: string
          people_found?: number
          status?: string
          status_detail?: string | null
          url?: string
        }
        Relationships: []
      }
      dashboard_presets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          layout: Json
          name: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          layout?: Json
          name: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      ecosystem_columns: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_builtin: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_builtin?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_builtin?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ecosystem_contacts: {
        Row: {
          auth_user_id: string | null
          city: string | null
          comments: string | null
          company: string | null
          company_stage: string | null
          company2: string | null
          country: string | null
          created_at: string
          email: string | null
          extra: Json
          id: string
          linkedin: string | null
          member_status: string
          name: string | null
          persona: string | null
          phone: string | null
          role: string | null
          sector: string | null
          tier: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          auth_user_id?: string | null
          city?: string | null
          comments?: string | null
          company?: string | null
          company_stage?: string | null
          company2?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          extra?: Json
          id?: string
          linkedin?: string | null
          member_status?: string
          name?: string | null
          persona?: string | null
          phone?: string | null
          role?: string | null
          sector?: string | null
          tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          auth_user_id?: string | null
          city?: string | null
          comments?: string | null
          company?: string | null
          company_stage?: string | null
          company2?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          extra?: Json
          id?: string
          linkedin?: string | null
          member_status?: string
          name?: string | null
          persona?: string | null
          phone?: string | null
          role?: string | null
          sector?: string | null
          tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      hl_store: {
        Row: {
          id: string
          state: Json
          updated_at: string
        }
        Insert: {
          id: string
          state?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      internal_sync_secret: {
        Row: {
          created_at: string
          id: boolean
          secret: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          secret?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          secret?: string
        }
        Relationships: []
      }
      login_log: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      member_enrollments: {
        Row: {
          cost_cents: number | null
          cost_currency: string
          created_at: string
          end_date: string | null
          enrolled_by: string | null
          id: string
          member_note: string | null
          notes: string | null
          payment_url: string | null
          payment_url_enabled: boolean
          perk_id: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_cents?: number | null
          cost_currency?: string
          created_at?: string
          end_date?: string | null
          enrolled_by?: string | null
          id?: string
          member_note?: string | null
          notes?: string | null
          payment_url?: string | null
          payment_url_enabled?: boolean
          perk_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_cents?: number | null
          cost_currency?: string
          created_at?: string
          end_date?: string | null
          enrolled_by?: string | null
          id?: string
          member_note?: string | null
          notes?: string | null
          payment_url?: string | null
          payment_url_enabled?: boolean
          perk_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_enrollments_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "perks_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_opportunity_access: {
        Row: {
          created_at: string
          id: string
          person_name: string
          portfolio_companies: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_name: string
          portfolio_companies?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_name?: string
          portfolio_companies?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_opportunity_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nominate_a_company: {
        Row: {
          company_name: string
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          email: string
          id?: string
          name: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          created_at: string
          data: Json
          screen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          screen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          screen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          companies: string[]
          company_ids: string[]
          contact_ids: string[]
          contacts: string[]
          created_at: string
          current_stage: string[]
          date_of_next_step: string | null
          end_customer: string[]
          field_hidden: Json
          id: string
          interaction_summary: string | null
          introduced: string[]
          last_synced_commit_sha: string | null
          needs_review: boolean
          next_step_owner: string | null
          next_steps: string | null
          notes: string | null
          opp_id: string | null
          opp_name: string
          partner: string | null
          portfolio: string[]
          record_hidden: boolean
          review_reason: string | null
          source: string[]
          source_file_path: string | null
          status: string[]
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at: string
          vault_source: string
        }
        Insert: {
          companies?: string[]
          company_ids?: string[]
          contact_ids?: string[]
          contacts?: string[]
          created_at?: string
          current_stage?: string[]
          date_of_next_step?: string | null
          end_customer?: string[]
          field_hidden?: Json
          id?: string
          interaction_summary?: string | null
          introduced?: string[]
          last_synced_commit_sha?: string | null
          needs_review?: boolean
          next_step_owner?: string | null
          next_steps?: string | null
          notes?: string | null
          opp_id?: string | null
          opp_name: string
          partner?: string | null
          portfolio?: string[]
          record_hidden?: boolean
          review_reason?: string | null
          source?: string[]
          source_file_path?: string | null
          status?: string[]
          type?: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          vault_source?: string
        }
        Update: {
          companies?: string[]
          company_ids?: string[]
          contact_ids?: string[]
          contacts?: string[]
          created_at?: string
          current_stage?: string[]
          date_of_next_step?: string | null
          end_customer?: string[]
          field_hidden?: Json
          id?: string
          interaction_summary?: string | null
          introduced?: string[]
          last_synced_commit_sha?: string | null
          needs_review?: boolean
          next_step_owner?: string | null
          next_steps?: string | null
          notes?: string | null
          opp_id?: string | null
          opp_name?: string
          partner?: string | null
          portfolio?: string[]
          record_hidden?: boolean
          review_reason?: string | null
          source?: string[]
          source_file_path?: string | null
          status?: string[]
          type?: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          vault_source?: string
        }
        Relationships: []
      }
      opportunity_client_fields: {
        Row: {
          data: Json
          source_file_path: string
          updated_at: string
        }
        Insert: {
          data?: Json
          source_file_path: string
          updated_at?: string
        }
        Update: {
          data?: Json
          source_file_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunity_sync_settings: {
        Row: {
          branch: string
          folders: string[]
          id: boolean
          last_sync_error: string | null
          last_synced_at: string | null
          last_webhook_at: string | null
          repo_url: string | null
          source: string
          updated_at: string
          webhook_connected: boolean
        }
        Insert: {
          branch?: string
          folders?: string[]
          id?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          last_webhook_at?: string | null
          repo_url?: string | null
          source?: string
          updated_at?: string
          webhook_connected?: boolean
        }
        Update: {
          branch?: string
          folders?: string[]
          id?: boolean
          last_sync_error?: string | null
          last_synced_at?: string | null
          last_webhook_at?: string | null
          repo_url?: string | null
          source?: string
          updated_at?: string
          webhook_connected?: boolean
        }
        Relationships: []
      }
      page_route_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          client_timezone: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          occurred_at: string
          old_value: Json | null
          reason: string | null
          route_id: string | null
          slug: string
          tz_offset: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          client_timezone?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          reason?: string | null
          route_id?: string | null
          slug: string
          tz_offset?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          client_timezone?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          reason?: string | null
          route_id?: string | null
          slug?: string
          tz_offset?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      page_routes: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          component_key: string
          created_at: string
          delisted_at: string | null
          delisted_by: string | null
          group_name: string
          id: string
          label: string
          lineage: string | null
          listed_at: string | null
          listed_by: string | null
          notes: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          component_key: string
          created_at?: string
          delisted_at?: string | null
          delisted_by?: string | null
          group_name?: string
          id?: string
          label: string
          lineage?: string | null
          listed_at?: string | null
          listed_by?: string | null
          notes?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          component_key?: string
          created_at?: string
          delisted_at?: string | null
          delisted_by?: string | null
          group_name?: string
          id?: string
          label?: string
          lineage?: string | null
          listed_at?: string | null
          listed_by?: string | null
          notes?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      partner_meetings: {
        Row: {
          created_at: string
          ends_at: string | null
          google_event_id: string
          guest_email: string
          id: string
          starts_at: string | null
          status: string
          status_source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          google_event_id: string
          guest_email: string
          id?: string
          starts_at?: string | null
          status?: string
          status_source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          google_event_id?: string
          guest_email?: string
          id?: string
          starts_at?: string | null
          status?: string
          status_source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_registrations: {
        Row: {
          agreement_valid: boolean
          company: string | null
          company_missing: boolean
          company_path: string | null
          contact_missing: boolean
          contact_path: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          in_ecosystem: boolean
          last_reconciled_at: string | null
          notes: string | null
          phone: string | null
          prospect_missing: boolean
          prospect_path: string | null
          retry_count: number
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          updated_at: string
          user_id: string
          vault_sync_error: string | null
          vault_sync_status: string
          website: string | null
        }
        Insert: {
          agreement_valid?: boolean
          company?: string | null
          company_missing?: boolean
          company_path?: string | null
          contact_missing?: boolean
          contact_path?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          in_ecosystem?: boolean
          last_reconciled_at?: string | null
          notes?: string | null
          phone?: string | null
          prospect_missing?: boolean
          prospect_path?: string | null
          retry_count?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
          vault_sync_error?: string | null
          vault_sync_status?: string
          website?: string | null
        }
        Update: {
          agreement_valid?: boolean
          company?: string | null
          company_missing?: boolean
          company_path?: string | null
          contact_missing?: boolean
          contact_path?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          in_ecosystem?: boolean
          last_reconciled_at?: string | null
          notes?: string | null
          phone?: string | null
          prospect_missing?: boolean
          prospect_path?: string | null
          retry_count?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
          vault_sync_error?: string | null
          vault_sync_status?: string
          website?: string | null
        }
        Relationships: []
      }
      perks_catalog: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          fulfillment_company: string | null
          id: string
          kind: string
          name: string
          slug: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          fulfillment_company?: string | null
          id?: string
          kind: string
          name: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          fulfillment_company?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_engagement: {
        Row: {
          applied: boolean | null
          comment: string | null
          company: string | null
          contact_uid: string | null
          created_at: string
          id: string
          item_title: string | null
          item_uid: string
          kind: string
          rating: number | null
          section: string
          url: string | null
          user_id: string
        }
        Insert: {
          applied?: boolean | null
          comment?: string | null
          company?: string | null
          contact_uid?: string | null
          created_at?: string
          id?: string
          item_title?: string | null
          item_uid: string
          kind: string
          rating?: number | null
          section: string
          url?: string | null
          user_id: string
        }
        Update: {
          applied?: boolean | null
          comment?: string | null
          company?: string | null
          contact_uid?: string | null
          created_at?: string
          id?: string
          item_title?: string | null
          item_uid?: string
          kind?: string
          rating?: number | null
          section?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_manager_id: string | null
          active_perks: string[]
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarded_at: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          account_manager_id?: string | null
          active_perks?: string[]
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarded_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          account_manager_id?: string | null
          active_perks?: string[]
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarded_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      ps_companies: {
        Row: {
          created_at: string
          founder: string | null
          icp_buyer: string | null
          icp_channel_need: string | null
          icp_deal_size: string | null
          icp_geo: string | null
          id: string
          name: string
          orbit: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder?: string | null
          icp_buyer?: string | null
          icp_channel_need?: string | null
          icp_deal_size?: string | null
          icp_geo?: string | null
          id: string
          name: string
          orbit?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder?: string | null
          icp_buyer?: string | null
          icp_channel_need?: string | null
          icp_deal_size?: string | null
          icp_geo?: string | null
          id?: string
          name?: string
          orbit?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ps_contacts: {
        Row: {
          asks_last_90d: number
          category: string
          consent: string
          created_at: string
          fit_scores: Json
          id: string
          name: string
          org: string | null
          owner: string | null
          sector: string | null
          source: string | null
          subtype: string | null
          temp: string
          updated_at: string
        }
        Insert: {
          asks_last_90d?: number
          category: string
          consent?: string
          created_at?: string
          fit_scores?: Json
          id: string
          name: string
          org?: string | null
          owner?: string | null
          sector?: string | null
          source?: string | null
          subtype?: string | null
          temp?: string
          updated_at?: string
        }
        Update: {
          asks_last_90d?: number
          category?: string
          consent?: string
          created_at?: string
          fit_scores?: Json
          id?: string
          name?: string
          org?: string | null
          owner?: string | null
          sector?: string | null
          source?: string | null
          subtype?: string | null
          temp?: string
          updated_at?: string
        }
        Relationships: []
      }
      ps_introductions: {
        Row: {
          company_id: string
          completed_date: string | null
          contact_id: string
          created_at: string
          email_draft: string | null
          id: string
          outcome: string | null
          rationale: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          contact_id: string
          created_at?: string
          email_draft?: string | null
          id?: string
          outcome?: string | null
          rationale?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          contact_id?: string
          created_at?: string
          email_draft?: string | null
          id?: string
          outcome?: string | null
          rationale?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_introductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ps_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ps_introductions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ps_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_opportunities: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          deal_value: string | null
          id: string
          introduction_id: string | null
          outcome: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          deal_value?: string | null
          id?: string
          introduction_id?: string | null
          outcome?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          deal_value?: string | null
          id?: string
          introduction_id?: string | null
          outcome?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ps_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "ps_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ps_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ps_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ps_opportunities_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: false
            referencedRelation: "ps_introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      ps_sources: {
        Row: {
          created_at: string
          description: string | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      relationship_column_settings: {
        Row: {
          column_key: string
          updated_at: string
          visible_to_user: boolean
        }
        Insert: {
          column_key: string
          updated_at?: string
          visible_to_user?: boolean
        }
        Update: {
          column_key?: string
          updated_at?: string
          visible_to_user?: boolean
        }
        Relationships: []
      }
      relationship_threads: {
        Row: {
          created_at: string
          current_status: string | null
          external_id: string | null
          id: string
          last_activity_date: string | null
          next_followup_date: string | null
          notes: string | null
          outcome_summary: string | null
          owner: string | null
          primary_org: string | null
          primary_person_name: string | null
          primary_person_type: string | null
          primary_user_id: string | null
          secondary_org: string | null
          secondary_person_name: string | null
          secondary_person_type: string | null
          secondary_user_id: string | null
          status: string | null
          thread_start_date: string | null
          thread_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_status?: string | null
          external_id?: string | null
          id?: string
          last_activity_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          outcome_summary?: string | null
          owner?: string | null
          primary_org?: string | null
          primary_person_name?: string | null
          primary_person_type?: string | null
          primary_user_id?: string | null
          secondary_org?: string | null
          secondary_person_name?: string | null
          secondary_person_type?: string | null
          secondary_user_id?: string | null
          status?: string | null
          thread_start_date?: string | null
          thread_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_status?: string | null
          external_id?: string | null
          id?: string
          last_activity_date?: string | null
          next_followup_date?: string | null
          notes?: string | null
          outcome_summary?: string | null
          owner?: string | null
          primary_org?: string | null
          primary_person_name?: string | null
          primary_person_type?: string | null
          primary_user_id?: string | null
          secondary_org?: string | null
          secondary_person_name?: string | null
          secondary_person_type?: string | null
          secondary_user_id?: string | null
          status?: string | null
          thread_start_date?: string | null
          thread_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_threads_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_threads_secondary_user_id_fkey"
            columns: ["secondary_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          amount_cents: number | null
          company_name: string | null
          created_at: string
          currency: string | null
          customer_email: string
          customer_name: string | null
          id: string
          metadata: Json | null
          plan: string | null
          service: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          metadata?: Json | null
          plan?: string | null
          service: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          company_name?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          metadata?: Json | null
          plan?: string | null
          service?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_bases: {
        Row: {
          base_name: string
          created_at: string
          file_path: string
          id: string
          is_active: boolean
          last_seen_sha: string | null
          raw_yaml: string
          source: string
          updated_at: string
          views: Json
        }
        Insert: {
          base_name: string
          created_at?: string
          file_path: string
          id?: string
          is_active?: boolean
          last_seen_sha?: string | null
          raw_yaml?: string
          source?: string
          updated_at?: string
          views?: Json
        }
        Update: {
          base_name?: string
          created_at?: string
          file_path?: string
          id?: string
          is_active?: boolean
          last_seen_sha?: string | null
          raw_yaml?: string
          source?: string
          updated_at?: string
          views?: Json
        }
        Relationships: []
      }
      vault_discrepancy_dismissals: {
        Row: {
          created_at: string
          dismissed_by: string | null
          issue_key: string
        }
        Insert: {
          created_at?: string
          dismissed_by?: string | null
          issue_key: string
        }
        Update: {
          created_at?: string
          dismissed_by?: string | null
          issue_key?: string
        }
        Relationships: []
      }
      vault_field_registry: {
        Row: {
          active: boolean
          area: string
          created_at: string
          field_key: string
          first_seen_at: string
          id: string
          kind: string
          label: string
          last_seen_at: string
          sort_order: number
          source: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          active?: boolean
          area: string
          created_at?: string
          field_key: string
          first_seen_at?: string
          id?: string
          kind?: string
          label: string
          last_seen_at?: string
          sort_order?: number
          source?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          active?: boolean
          area?: string
          created_at?: string
          field_key?: string
          first_seen_at?: string
          id?: string
          kind?: string
          label?: string
          last_seen_at?: string
          sort_order?: number
          source?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      vault_files: {
        Row: {
          blob_sha: string | null
          category: string
          created_at: string
          created_at_git: string | null
          fm_sha: string | null
          folder: string
          frontmatter_data: Json
          id: string
          last_seen_at: string
          modified_at_git: string | null
          name: string
          next_step_date: string | null
          note_body: string
          note_date: string | null
          path: string
          source: string
          task_finish: string | null
          task_start: string | null
          updated_at: string
        }
        Insert: {
          blob_sha?: string | null
          category?: string
          created_at?: string
          created_at_git?: string | null
          fm_sha?: string | null
          folder?: string
          frontmatter_data?: Json
          id?: string
          last_seen_at?: string
          modified_at_git?: string | null
          name: string
          next_step_date?: string | null
          note_body?: string
          note_date?: string | null
          path: string
          source?: string
          task_finish?: string | null
          task_start?: string | null
          updated_at?: string
        }
        Update: {
          blob_sha?: string | null
          category?: string
          created_at?: string
          created_at_git?: string | null
          fm_sha?: string | null
          folder?: string
          frontmatter_data?: Json
          id?: string
          last_seen_at?: string
          modified_at_git?: string | null
          name?: string
          next_step_date?: string | null
          note_body?: string
          note_date?: string | null
          path?: string
          source?: string
          task_finish?: string | null
          task_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vault_saved_views: {
        Row: {
          area: string
          created_at: string
          created_by: string | null
          filter_tree: Json
          id: string
          is_default: boolean
          name: string
          sort_rules: Json
          source: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          created_by?: string | null
          filter_tree?: Json
          id?: string
          is_default?: boolean
          name: string
          sort_rules?: Json
          source?: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          created_by?: string | null
          filter_tree?: Json
          id?: string
          is_default?: boolean
          name?: string
          sort_rules?: Json
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      vault_scan_state: {
        Row: {
          created_at: string
          files_seen: number
          history_backfilled: boolean
          id: boolean
          last_commit_sha: string | null
          last_scan_error: string | null
          last_scanned_at: string | null
          last_trigger: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          files_seen?: number
          history_backfilled?: boolean
          id?: boolean
          last_commit_sha?: string | null
          last_scan_error?: string | null
          last_scanned_at?: string | null
          last_trigger?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          files_seen?: number
          history_backfilled?: boolean
          id?: boolean
          last_commit_sha?: string | null
          last_scan_error?: string | null
          last_scanned_at?: string | null
          last_trigger?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_client_field_visibility: { Args: never; Returns: number }
      auth_has_password: { Args: { _email: string }; Returns: boolean }
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      check_ecosystem_email: { Args: { _email: string }; Returns: boolean }
      fm_values: { Args: { _j: Json }; Returns: string[] }
      get_my_account_manager: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
      get_my_companies: {
        Args: never
        Returns: {
          agreement_valid: boolean
          company_id: string
          name: string
          path: string
        }[]
      }
      get_my_opportunities: {
        Args: { _company?: string; _company_id?: string }
        Returns: {
          current_stage: string[]
          date_of_next_step: string
          extra: Json
          id: string
          opp_name: string
          other_party: string[]
          status: string[]
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at: string
        }[]
      }
      get_visible_relationship_threads: {
        Args: never
        Returns: {
          created_at: string
          current_status: string | null
          external_id: string | null
          id: string
          last_activity_date: string | null
          next_followup_date: string | null
          notes: string | null
          outcome_summary: string | null
          owner: string | null
          primary_org: string | null
          primary_person_name: string | null
          primary_person_type: string | null
          primary_user_id: string | null
          secondary_org: string | null
          secondary_person_name: string | null
          secondary_person_type: string | null
          secondary_user_id: string | null
          status: string | null
          thread_start_date: string | null
          thread_type: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "relationship_threads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_personal_email: { Args: { _email: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_member_profiles: {
        Args: never
        Returns: {
          account_manager_id: string
          active_perks: string[]
          company_name: string
          created_at: string
          display_name: string
          email: string
          id: string
          status: string
          tier: string
        }[]
      }
      list_team_members: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
      match_profile_by_name: { Args: { _name: string }; Returns: string }
      my_portal_access: {
        Args: never
        Returns: {
          agreement_valid: boolean
          company_id: string
          name: string
          portal_access: boolean
          premium: boolean
        }[]
      }
      my_premium_access: { Args: never; Returns: boolean }
      norm_wikilink: { Args: { _v: string }; Returns: string }
      portal_access_on: { Args: { fm: Json }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "member"
        | "owner"
        | "editor"
        | "viewer"
        | "collaborator"
      opportunity_type: "direct" | "indirect"
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
  public: {
    Enums: {
      app_role: [
        "admin",
        "customer",
        "member",
        "owner",
        "editor",
        "viewer",
        "collaborator",
      ],
      opportunity_type: ["direct", "indirect"],
    },
  },
} as const
