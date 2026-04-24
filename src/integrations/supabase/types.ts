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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      billing_reminders: {
        Row: {
          billing_cycle: string
          id: string
          reminder_type: string
          renter_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          billing_cycle: string
          id?: string
          reminder_type: string
          renter_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          id?: string
          reminder_type?: string
          renter_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_reminders_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_reminders_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "billing_reminders_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_reminders_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          key: string
          label: string
          updated_at: string
          user_id: string
          value_type: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          key: string
          label: string
          updated_at?: string
          user_id: string
          value_type?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
          user_id?: string
          value_type?: string
        }
        Relationships: []
      }
      custom_field_values: {
        Row: {
          boolean_value: boolean | null
          created_at: string
          date_value: string | null
          entity_id: string
          entity_type: string
          field_definition_id: string
          id: string
          number_value: number | null
          text_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          boolean_value?: boolean | null
          created_at?: string
          date_value?: string | null
          entity_id: string
          entity_type: string
          field_definition_id: string
          id?: string
          number_value?: number | null
          text_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          boolean_value?: boolean | null
          created_at?: string
          date_value?: string | null
          entity_id?: string
          entity_type?: string
          field_definition_id?: string
          id?: string
          number_value?: number | null
          text_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: {
          assigned_renter_id: string | null
          condition: string | null
          cost_basis: number | null
          created_at: string
          id: string
          laundrylord_email: string | null
          model: string | null
          notes: string | null
          prong: string | null
          serial: string | null
          sourced_from: string | null
          status: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_renter_id?: string | null
          condition?: string | null
          cost_basis?: number | null
          created_at?: string
          id?: string
          laundrylord_email?: string | null
          model?: string | null
          notes?: string | null
          prong?: string | null
          serial?: string | null
          sourced_from?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_renter_id?: string | null
          condition?: string | null
          cost_basis?: number | null
          created_at?: string
          id?: string
          laundrylord_email?: string | null
          model?: string | null
          notes?: string | null
          prong?: string | null
          serial?: string | null
          sourced_from?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          archived_at: string | null
          cost: number | null
          created_at: string
          description: string
          id: string
          issue_category: string
          machine_id: string | null
          renter_id: string | null
          reported_date: string
          resolution_notes: string | null
          resolved_date: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          issue_category: string
          machine_id?: string | null
          renter_id?: string | null
          reported_date?: string
          resolution_notes?: string | null
          resolved_date?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          issue_category?: string
          machine_id?: string | null
          renter_id?: string | null
          reported_date?: string
          resolution_notes?: string | null
          resolved_date?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "v_machines_with_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "maintenance_logs_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_settings: {
        Row: {
          business_name: string | null
          created_at: string
          default_deposit: number
          default_install_fee: number
          default_monthly_rate: number
          email_reminders_enabled: boolean
          id: string
          late_fee_after_days: number
          late_fee_amount: number
          owner_email: string | null
          reminder_days_before: number
          reminder_failed_enabled: boolean
          reminder_latefee_enabled: boolean
          reminder_upcoming_enabled: boolean
          saas_product_id: string | null
          saas_stripe_customer_id: string | null
          saas_subscribed: boolean
          saas_subscription_end: string | null
          template_failed_body: string | null
          template_failed_subject: string | null
          template_latefee_body: string | null
          template_latefee_subject: string | null
          template_upcoming_body: string | null
          template_upcoming_subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          default_deposit?: number
          default_install_fee?: number
          default_monthly_rate?: number
          email_reminders_enabled?: boolean
          id?: string
          late_fee_after_days?: number
          late_fee_amount?: number
          owner_email?: string | null
          reminder_days_before?: number
          reminder_failed_enabled?: boolean
          reminder_latefee_enabled?: boolean
          reminder_upcoming_enabled?: boolean
          saas_product_id?: string | null
          saas_stripe_customer_id?: string | null
          saas_subscribed?: boolean
          saas_subscription_end?: string | null
          template_failed_body?: string | null
          template_failed_subject?: string | null
          template_latefee_body?: string | null
          template_latefee_subject?: string | null
          template_upcoming_body?: string | null
          template_upcoming_subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          default_deposit?: number
          default_install_fee?: number
          default_monthly_rate?: number
          email_reminders_enabled?: boolean
          id?: string
          late_fee_after_days?: number
          late_fee_amount?: number
          owner_email?: string | null
          reminder_days_before?: number
          reminder_failed_enabled?: boolean
          reminder_latefee_enabled?: boolean
          reminder_upcoming_enabled?: boolean
          saas_product_id?: string | null
          saas_stripe_customer_id?: string | null
          saas_subscribed?: boolean
          saas_subscription_end?: string | null
          template_failed_body?: string | null
          template_failed_subject?: string | null
          template_latefee_body?: string | null
          template_latefee_subject?: string | null
          template_upcoming_body?: string | null
          template_upcoming_subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid_date: string | null
          payment_notes: string | null
          payment_source: string | null
          renter_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          paid_date?: string | null
          payment_notes?: string | null
          payment_source?: string | null
          renter_id: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          paid_date?: string | null
          payment_notes?: string | null
          payment_source?: string | null
          renter_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_balance_adjustments: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: string
          renter_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          kind?: string
          renter_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          renter_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renter_balance_adjustments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_balance_adjustments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "renter_balance_adjustments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_balance_adjustments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      renters: {
        Row: {
          address: string | null
          archived_at: string | null
          balance: number
          billable_until: string | null
          created_at: string
          days_late: number
          deposit_amount: number
          deposit_collected: boolean
          dryer_outlet: string | null
          email: string | null
          has_payment_method: boolean
          id: string
          install_fee: number
          install_fee_collected: boolean
          install_notes: string | null
          language: string | null
          late_fee: number
          laundrylord_email: string | null
          lease_start_date: string | null
          min_term_end_date: string | null
          monthly_rate: number
          name: string | null
          next_due_date: string | null
          notes: string | null
          paid_through_date: string | null
          phone: string | null
          rent_collected: number
          secondary_contact: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          balance?: number
          billable_until?: string | null
          created_at?: string
          days_late?: number
          deposit_amount?: number
          deposit_collected?: boolean
          dryer_outlet?: string | null
          email?: string | null
          has_payment_method?: boolean
          id?: string
          install_fee?: number
          install_fee_collected?: boolean
          install_notes?: string | null
          language?: string | null
          late_fee?: number
          laundrylord_email?: string | null
          lease_start_date?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number
          name?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number
          secondary_contact?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          balance?: number
          billable_until?: string | null
          created_at?: string
          days_late?: number
          deposit_amount?: number
          deposit_collected?: boolean
          dryer_outlet?: string | null
          email?: string | null
          has_payment_method?: boolean
          id?: string
          install_fee?: number
          install_fee_collected?: boolean
          install_notes?: string | null
          language?: string | null
          late_fee?: number
          laundrylord_email?: string | null
          lease_start_date?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number
          name?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number
          secondary_contact?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          stripe_account_id: string | null
          stripe_account_name: string | null
          stripe_livemode: boolean | null
          updated_at: string
          user_id: string
          webhook_configured_at: string | null
          webhook_endpoint_token: string
          webhook_signing_secret: string | null
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          stripe_account_id?: string | null
          stripe_account_name?: string | null
          stripe_livemode?: boolean | null
          updated_at?: string
          user_id: string
          webhook_configured_at?: string | null
          webhook_endpoint_token?: string
          webhook_signing_secret?: string | null
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          stripe_account_id?: string | null
          stripe_account_name?: string | null
          stripe_livemode?: boolean | null
          updated_at?: string
          user_id?: string
          webhook_configured_at?: string | null
          webhook_endpoint_token?: string
          webhook_signing_secret?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          processed_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          renter_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description: string
          id?: string
          renter_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          renter_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_audit_payments: {
        Row: {
          amount: number | null
          business_name: string | null
          created_at: string | null
          due_date: string | null
          owner_email: string | null
          paid_date: string | null
          payment_id: string | null
          payment_notes: string | null
          payment_source: string | null
          payment_status: string | null
          payment_type: string | null
          renter_email: string | null
          renter_id: string | null
          renter_name: string | null
          renter_phone: string | null
          renter_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_renters: {
        Row: {
          address: string | null
          archived_at: string | null
          balance: number | null
          billable_until: string | null
          business_name: string | null
          created_at: string | null
          days_late: number | null
          deposit_amount: number | null
          has_payment_method: boolean | null
          install_fee: number | null
          install_notes: string | null
          language: string | null
          lease_start_date: string | null
          min_term_end_date: string | null
          monthly_rate: number | null
          next_due_date: string | null
          notes: string | null
          owner_email: string | null
          paid_through_date: string | null
          rent_collected: number | null
          renter_email: string | null
          renter_id: string | null
          renter_name: string | null
          renter_phone: string | null
          renter_status: string | null
          secondary_contact: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_audit_timeline_events: {
        Row: {
          business_name: string | null
          created_at: string | null
          description: string | null
          event_at: string | null
          event_type: string | null
          owner_email: string | null
          renter_email: string | null
          renter_id: string | null
          renter_name: string | null
          renter_phone: string | null
          renter_status: string | null
          timeline_event_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      v_machines_with_owner: {
        Row: {
          assigned_renter_id: string | null
          business_name: string | null
          condition: string | null
          cost_basis: number | null
          created_at: string | null
          id: string | null
          model: string | null
          notes: string | null
          owner_email: string | null
          prong: string | null
          serial: string | null
          sourced_from: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_audit_renters"
            referencedColumns: ["renter_id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_for_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machines_assigned_renter_id_fkey"
            columns: ["assigned_renter_id"]
            isOneToOne: false
            referencedRelation: "v_renters_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      v_renters_for_admin: {
        Row: {
          address: string | null
          archived_at: string | null
          balance: number | null
          billable_until: string | null
          created_at: string | null
          days_late: number | null
          deposit_amount: number | null
          deposit_collected: boolean | null
          dryer_outlet: string | null
          email: string | null
          has_payment_method: boolean | null
          id: string | null
          install_fee: number | null
          install_fee_collected: boolean | null
          install_notes: string | null
          language: string | null
          late_fee: number | null
          laundrylord_email: string | null
          lease_start_date: string | null
          min_term_end_date: string | null
          monthly_rate: number | null
          name: string | null
          next_due_date: string | null
          notes: string | null
          paid_through_date: string | null
          phone: string | null
          rent_collected: number | null
          secondary_contact: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          balance?: number | null
          billable_until?: string | null
          created_at?: string | null
          days_late?: number | null
          deposit_amount?: number | null
          deposit_collected?: boolean | null
          dryer_outlet?: string | null
          email?: string | null
          has_payment_method?: boolean | null
          id?: string | null
          install_fee?: number | null
          install_fee_collected?: boolean | null
          install_notes?: string | null
          language?: string | null
          late_fee?: number | null
          laundrylord_email?: string | null
          lease_start_date?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number | null
          name?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number | null
          secondary_contact?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          balance?: number | null
          billable_until?: string | null
          created_at?: string | null
          days_late?: number | null
          deposit_amount?: number | null
          deposit_collected?: boolean | null
          dryer_outlet?: string | null
          email?: string | null
          has_payment_method?: boolean | null
          id?: string | null
          install_fee?: number | null
          install_fee_collected?: boolean | null
          install_notes?: string | null
          language?: string | null
          late_fee?: number | null
          laundrylord_email?: string | null
          lease_start_date?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number | null
          name?: string | null
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number | null
          secondary_contact?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_renters_with_owner: {
        Row: {
          address: string | null
          archived_at: string | null
          balance: number | null
          billable_until: string | null
          business_name: string | null
          created_at: string | null
          days_late: number | null
          deposit_amount: number | null
          deposit_collected: boolean | null
          dryer_outlet: string | null
          email: string | null
          has_payment_method: boolean | null
          id: string | null
          install_fee: number | null
          install_fee_collected: boolean | null
          install_notes: string | null
          language: string | null
          late_fee: number | null
          laundrylord_email: string | null
          lease_start_date: string | null
          min_term_end_date: string | null
          monthly_rate: number | null
          name: string | null
          next_due_date: string | null
          notes: string | null
          owner_email: string | null
          paid_through_date: string | null
          phone: string | null
          rent_collected: number | null
          secondary_contact: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_renter_balance_adjustment: {
        Args: { p_amount: number; p_description: string; p_renter_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_manual_payment: {
        Args: {
          p_amount: number
          p_paid_date: string
          p_payment_notes?: string
          p_payment_source?: string
          p_renter_id: string
          p_type: string
        }
        Returns: Json
      }
      remove_renter_balance_adjustment: {
        Args: { p_adjustment_id: string; p_renter_id: string }
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
