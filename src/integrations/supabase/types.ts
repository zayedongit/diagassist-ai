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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      demo_links: {
        Row: {
          active: boolean
          client_name: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          feature_tier: string
          id: string
          last_used_at: string | null
          max_reports: number
          notes: string | null
          payment_enabled: boolean | null
          reports_used: number
          token: string
        }
        Insert: {
          active?: boolean
          client_name: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_tier: string
          id?: string
          last_used_at?: string | null
          max_reports?: number
          notes?: string | null
          payment_enabled?: boolean | null
          reports_used?: number
          token: string
        }
        Update: {
          active?: boolean
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature_tier?: string
          id?: string
          last_used_at?: string | null
          max_reports?: number
          notes?: string | null
          payment_enabled?: boolean | null
          reports_used?: number
          token?: string
        }
        Relationships: []
      }
      lab_configurations: {
        Row: {
          active: boolean | null
          allowed_domains: string[] | null
          api_key: string
          created_at: string | null
          created_by: string | null
          feature_tier: string
          id: string
          lab_name: string
          payment_enabled: boolean | null
          rate_limit_per_minute: number | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          active?: boolean | null
          allowed_domains?: string[] | null
          api_key: string
          created_at?: string | null
          created_by?: string | null
          feature_tier: string
          id?: string
          lab_name: string
          payment_enabled?: boolean | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          active?: boolean | null
          allowed_domains?: string[] | null
          api_key?: string
          created_at?: string | null
          created_by?: string | null
          feature_tier?: string
          id?: string
          lab_name?: string
          payment_enabled?: boolean | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          basic_tier_price_inr: number
          id: string
          payment_required: boolean
          premium_tier_price_inr: number
          razorpay_enabled: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          basic_tier_price_inr?: number
          id?: string
          payment_required?: boolean
          premium_tier_price_inr?: number
          razorpay_enabled?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          basic_tier_price_inr?: number
          id?: string
          payment_required?: boolean
          premium_tier_price_inr?: number
          razorpay_enabled?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_inr: number
          created_at: string | null
          currency: string
          demo_link_id: string | null
          error_code: string | null
          error_description: string | null
          feature_tier: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          pdf_analysis_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_inr: number
          created_at?: string | null
          currency?: string
          demo_link_id?: string | null
          error_code?: string | null
          error_description?: string | null
          feature_tier: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_analysis_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount_inr?: number
          created_at?: string | null
          currency?: string
          demo_link_id?: string | null
          error_code?: string | null
          error_description?: string | null
          feature_tier?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          pdf_analysis_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_demo_link_id_fkey"
            columns: ["demo_link_id"]
            isOneToOne: false
            referencedRelation: "demo_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_pdf_analysis_id_fkey"
            columns: ["pdf_analysis_id"]
            isOneToOne: false
            referencedRelation: "pdf_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_analyses: {
        Row: {
          created_at: string | null
          demo_link_id: string | null
          demo_session_id: string | null
          error_message: string | null
          feature_tier: string | null
          filename: string | null
          id: string
          lab_config_id: string | null
          payment_transaction_id: string | null
          payment_verified: boolean | null
          pdf_path: string | null
          result: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          demo_link_id?: string | null
          demo_session_id?: string | null
          error_message?: string | null
          feature_tier?: string | null
          filename?: string | null
          id: string
          lab_config_id?: string | null
          payment_transaction_id?: string | null
          payment_verified?: boolean | null
          pdf_path?: string | null
          result?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          demo_link_id?: string | null
          demo_session_id?: string | null
          error_message?: string | null
          feature_tier?: string | null
          filename?: string | null
          id?: string
          lab_config_id?: string | null
          payment_transaction_id?: string | null
          payment_verified?: boolean | null
          pdf_path?: string | null
          result?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_analyses_demo_link_id_fkey"
            columns: ["demo_link_id"]
            isOneToOne: false
            referencedRelation: "demo_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_analyses_lab_config_id_fkey"
            columns: ["lab_config_id"]
            isOneToOne: false
            referencedRelation: "lab_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_analyses_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          last_name: string | null
          phone_number: string
          phone_verified: boolean | null
          updated_at: string | null
          user_id: string
          user_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          phone_number: string
          phone_verified?: boolean | null
          updated_at?: string | null
          user_id: string
          user_type?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          phone_number?: string
          phone_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      sms_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          message_sid: string | null
          phone_number: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          message_sid?: string | null
          phone_number: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          message_sid?: string | null
          phone_number?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
