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
      brand_themes: {
        Row: {
          background_color: string
          body_font: string
          brand_name: string
          button_style: Json
          created_at: string
          footer_style: Json
          heading_font: string
          id: string
          name: string
          primary_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_color?: string
          body_font?: string
          brand_name?: string
          button_style?: Json
          created_at?: string
          footer_style?: Json
          heading_font?: string
          id?: string
          name: string
          primary_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background_color?: string
          body_font?: string
          brand_name?: string
          button_style?: Json
          created_at?: string
          footer_style?: Json
          heading_font?: string
          id?: string
          name?: string
          primary_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_steps: {
        Row: {
          ab_test_enabled: boolean | null
          body_a: string | null
          body_b: string | null
          campaign_id: string
          created_at: string
          delay_days: number
          delay_unit: string
          delay_value: number
          id: string
          step_number: number
          subject_a: string | null
          subject_b: string | null
          template_id: string | null
          winning_variant: string | null
        }
        Insert: {
          ab_test_enabled?: boolean | null
          body_a?: string | null
          body_b?: string | null
          campaign_id: string
          created_at?: string
          delay_days?: number
          delay_unit?: string
          delay_value?: number
          id?: string
          step_number: number
          subject_a?: string | null
          subject_b?: string | null
          template_id?: string | null
          winning_variant?: string | null
        }
        Update: {
          ab_test_enabled?: boolean | null
          body_a?: string | null
          body_b?: string | null
          campaign_id?: string
          created_at?: string
          delay_days?: number
          delay_unit?: string
          delay_value?: number
          id?: string
          step_number?: number
          subject_a?: string | null
          subject_b?: string | null
          template_id?: string | null
          winning_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          daily_limit: number
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_folder_members: {
        Row: {
          contact_id: string
          created_at: string
          folder_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          folder_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          folder_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_folder_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_folder_members_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "contact_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          bounce_reason: string | null
          campaign_id: string | null
          company_name: string | null
          created_at: string
          date_added: string
          email: string
          id: string
          lead_score: number
          name: string
          reply_date: string | null
          source: string | null
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bounce_reason?: string | null
          campaign_id?: string | null
          company_name?: string | null
          created_at?: string
          date_added?: string
          email: string
          id?: string
          lead_score?: number
          name: string
          reply_date?: string | null
          source?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bounce_reason?: string | null
          campaign_id?: string | null
          company_name?: string | null
          created_at?: string
          date_added?: string
          email?: string
          id?: string
          lead_score?: number
          name?: string
          reply_date?: string | null
          source?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          email_queue_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email_queue_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          email_queue_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_email_queue_id_fkey"
            columns: ["email_queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          campaign_id: string
          click_count: number
          contact_id: string
          created_at: string
          error_message: string | null
          id: string
          open_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          step_number: number
          user_id: string
          variant: string | null
        }
        Insert: {
          campaign_id: string
          click_count?: number
          contact_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          open_count?: number
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step_number?: number
          user_id: string
          variant?: string | null
        }
        Update: {
          campaign_id?: string
          click_count?: number
          contact_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          open_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_number?: number
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks: Json | null
          body: string
          created_at: string
          design_config: Json | null
          html_body: string | null
          id: string
          name: string
          subject: string
          template_format: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks?: Json | null
          body: string
          created_at?: string
          design_config?: Json | null
          html_body?: string | null
          id?: string
          name: string
          subject: string
          template_format?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks?: Json | null
          body?: string
          created_at?: string
          design_config?: Json | null
          html_body?: string | null
          id?: string
          name?: string
          subject?: string
          template_format?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_sheet_settings: {
        Row: {
          created_at: string
          id: string
          last_synced_at: string | null
          service_account_json: string | null
          sheet_id: string | null
          sheet_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          service_account_json?: string | null
          sheet_id?: string | null
          sheet_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_synced_at?: string | null
          service_account_json?: string | null
          sheet_id?: string | null
          sheet_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sending_limits: {
        Row: {
          created_at: string
          id: string
          last_reset_date: string
          max_per_day: number
          sent_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reset_date?: string
          max_per_day?: number
          sent_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reset_date?: string
          max_per_day?: number
          sent_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string | null
          from_name: string | null
          host: string
          id: string
          password: string
          port: number
          updated_at: string
          use_ssl: boolean
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          use_ssl?: boolean
          user_id: string
          username?: string
        }
        Update: {
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          use_ssl?: boolean
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      template_sections: {
        Row: {
          blocks: Json
          category: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks?: Json
          category?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks?: Json
          category?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          status_code: number | null
          success: boolean | null
          webhook_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recalculate_lead_score: {
        Args: { p_contact_id: string }
        Returns: undefined
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
