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
          created_at: string
          id: string
          model: string
          notes: string | null
          prong: string | null
          serial: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_renter_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          model: string
          notes?: string | null
          prong?: string | null
          serial: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_renter_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          model?: string
          notes?: string | null
          prong?: string | null
          serial?: string
          status?: string
          type?: string
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
        ]
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string
          description: string
          id: string
          issue_category: string
          machine_id: string
          renter_id: string | null
          reported_date: string
          resolution_notes: string | null
          resolved_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          issue_category: string
          machine_id: string
          renter_id?: string | null
          reported_date?: string
          resolution_notes?: string | null
          resolved_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          issue_category?: string
          machine_id?: string
          renter_id?: string | null
          reported_date?: string
          resolution_notes?: string | null
          resolved_date?: string | null
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
            foreignKeyName: "maintenance_logs_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "renters"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_settings: {
        Row: {
          created_at: string
          default_deposit: number
          default_install_fee: number
          default_monthly_rate: number
          id: string
          late_fee_after_days: number
          late_fee_amount: number
          reminder_days_before: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_deposit?: number
          default_install_fee?: number
          default_monthly_rate?: number
          id?: string
          late_fee_after_days?: number
          late_fee_amount?: number
          reminder_days_before?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_deposit?: number
          default_install_fee?: number
          default_monthly_rate?: number
          id?: string
          late_fee_after_days?: number
          late_fee_amount?: number
          reminder_days_before?: number
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
        ]
      }
      renters: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          days_late: number
          deposit_amount: number
          deposit_collected: boolean
          email: string | null
          has_payment_method: boolean
          id: string
          install_fee: number
          install_fee_collected: boolean
          late_fee: number
          lease_start_date: string | null
          machine_id: string | null
          min_term_end_date: string | null
          monthly_rate: number
          name: string
          next_due_date: string | null
          notes: string | null
          paid_through_date: string | null
          phone: string | null
          rent_collected: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          days_late?: number
          deposit_amount?: number
          deposit_collected?: boolean
          email?: string | null
          has_payment_method?: boolean
          id?: string
          install_fee?: number
          install_fee_collected?: boolean
          late_fee?: number
          lease_start_date?: string | null
          machine_id?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number
          name: string
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          days_late?: number
          deposit_amount?: number
          deposit_collected?: boolean
          email?: string | null
          has_payment_method?: boolean
          id?: string
          install_fee?: number
          install_fee_collected?: boolean
          late_fee?: number
          lease_start_date?: string | null
          machine_id?: string | null
          min_term_end_date?: string | null
          monthly_rate?: number
          name?: string
          next_due_date?: string | null
          notes?: string | null
          paid_through_date?: string | null
          phone?: string | null
          rent_collected?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_renters_machine"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
