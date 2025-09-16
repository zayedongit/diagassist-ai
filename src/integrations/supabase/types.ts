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
      consultations: {
        Row: {
          analysis_id: string | null
          consultation_type: string | null
          created_at: string | null
          diagnosis: string | null
          doctor_id: string | null
          doctor_notes: string | null
          ended_at: string | null
          id: string
          patient_id: string | null
          prescription_requested: boolean | null
          prescription_requested_at: string | null
          room_url: string | null
          scheduled_at: string | null
          selected_doctor_id: string | null
          started_at: string | null
          status: string | null
          symptoms: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_id?: string | null
          consultation_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          ended_at?: string | null
          id?: string
          patient_id?: string | null
          prescription_requested?: boolean | null
          prescription_requested_at?: string | null
          room_url?: string | null
          scheduled_at?: string | null
          selected_doctor_id?: string | null
          started_at?: string | null
          status?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_id?: string | null
          consultation_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          ended_at?: string | null
          id?: string
          patient_id?: string | null
          prescription_requested?: boolean | null
          prescription_requested_at?: string | null
          room_url?: string | null
          scheduled_at?: string | null
          selected_doctor_id?: string | null
          started_at?: string | null
          status?: string | null
          symptoms?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "pdf_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_selected_doctor_id_fkey"
            columns: ["selected_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_contact_access_log: {
        Row: {
          access_reason: string | null
          accessed_at: string | null
          accessed_by: string | null
          consultation_id: string | null
          doctor_id: string | null
          id: string
        }
        Insert: {
          access_reason?: string | null
          accessed_at?: string | null
          accessed_by?: string | null
          consultation_id?: string | null
          doctor_id?: string | null
          id?: string
        }
        Update: {
          access_reason?: string | null
          accessed_at?: string | null
          accessed_by?: string | null
          consultation_id?: string | null
          doctor_id?: string | null
          id?: string
        }
        Relationships: []
      }
      doctor_prescription_notifications: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          doctor_id: string | null
          id: string
          patient_id: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_prescription_notifications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          availability: Json | null
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          license_number: string | null
          name: string
          phone_number: string | null
          profile_id: string | null
          profile_image_url: string | null
          specialization: string
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name: string
          phone_number?: string | null
          profile_id?: string | null
          profile_image_url?: string | null
          specialization: string
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          name?: string
          phone_number?: string | null
          profile_id?: string | null
          profile_image_url?: string | null
          specialization?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors_directory: {
        Row: {
          availability: Json | null
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          name: string | null
          profile_image_url: string | null
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          experience_years?: number | null
          id: string
          is_active?: boolean | null
          name?: string | null
          profile_image_url?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          profile_image_url?: string | null
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      google_drive_processed_files: {
        Row: {
          analysis_id: string | null
          created_at: string
          destination_file_id: string | null
          drive_file_id: string
          error_message: string | null
          filename: string
          id: string
          processed_at: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          destination_file_id?: string | null
          drive_file_id: string
          error_message?: string | null
          filename: string
          id?: string
          processed_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          destination_file_id?: string | null
          drive_file_id?: string
          error_message?: string | null
          filename?: string
          id?: string
          processed_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_rate_limits: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier: string
          identifier_type: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      pdf_analyses: {
        Row: {
          created_at: string
          error_message: string | null
          filename: string
          id: string
          pdf_path: string | null
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          pdf_path?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          pdf_path?: string | null
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          additional_instructions: string | null
          consultation_id: string | null
          created_at: string | null
          doctor_id: string | null
          id: string
          medications: Json | null
          patient_id: string | null
          pdf_url: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          additional_instructions?: string | null
          consultation_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          medications?: Json | null
          patient_id?: string | null
          pdf_url?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_instructions?: string | null
          consultation_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          medications?: Json | null
          patient_id?: string | null
          pdf_url?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          license_number: string | null
          phone_number: string | null
          phone_verified: boolean | null
          specialization: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string
          verified_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type: string
          verified_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          license_number?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      sms_notifications_log: {
        Row: {
          created_at: string | null
          id: string
          message_content: string
          message_type: string
          metadata: Json | null
          phone_number: string
          sent_at: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_content: string
          message_type: string
          metadata?: Json | null
          phone_number: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_content?: string
          message_type?: string
          metadata?: Json | null
          phone_number?: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: []
      }
      sms_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message_sid: string | null
          phone_number: string
          used_at: string | null
          verification_code: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          message_sid?: string | null
          phone_number: string
          used_at?: string | null
          verification_code: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message_sid?: string | null
          phone_number?: string
          used_at?: string | null
          verification_code?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_auth_users: {
        Args: { user_ids: string[] }
        Returns: {
          error_message: string
          success: boolean
          user_id: string
        }[]
      }
      create_missing_profile: {
        Args: { _phone_number: string; _user_id: string; _user_type?: string }
        Returns: string
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      get_doctor_contact_for_consultation: {
        Args: { doctor_id_param: string }
        Returns: {
          doctor_name: string
          email: string
          license_number: string
          phone_number: string
        }[]
      }
      has_active_consultation_with_doctor: {
        Args: { doctor_id_param: string; patient_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "doctor" | "patient"
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
      user_role: ["admin", "doctor", "patient"],
    },
  },
} as const
