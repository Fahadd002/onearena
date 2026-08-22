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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          reason: string | null
          starts_at: string | null
          turf_id: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason?: string | null
          starts_at?: string | null
          turf_id: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          reason?: string | null
          starts_at?: string | null
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_slots_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advance_amount: number
          advance_percentage: number
          booking_code: string
          booking_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          commission_amount: number
          commission_rate: number
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          ends_at: string
          id: string
          idempotency_key: string | null
          notes: string | null
          owner_amount: number
          owner_id: string
          paid_amount: number
          refund_amount: number
          remaining_amount: number
          reservation_expires_at: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          turf_id: string
          updated_at: string
        }
        Insert: {
          advance_amount?: number
          advance_percentage?: number
          booking_code?: string
          booking_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          ends_at: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          owner_amount?: number
          owner_id: string
          paid_amount?: number
          refund_amount?: number
          remaining_amount?: number
          reservation_expires_at?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          turf_id: string
          updated_at?: string
        }
        Update: {
          advance_amount?: number
          advance_percentage?: number
          booking_code?: string
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          ends_at?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          owner_amount?: number
          owner_id?: string
          paid_amount?: number
          refund_amount?: number
          remaining_amount?: number
          reservation_expires_at?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          turf_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          min_hours_before: number
          refund_percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          min_hours_before: number
          refund_percentage: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          min_hours_before?: number
          refund_percentage?: number
        }
        Relationships: []
      }
      facilities: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          turf_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          turf_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operating_hours: {
        Row: {
          closes_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string
          turf_id: string
        }
        Insert: {
          closes_at: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at: string
          turf_id: string
        }
        Update: {
          closes_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          city: string | null
          created_at: string
          id: string
          payout_account: string | null
          payout_method: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["account_status"]
          trade_license: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          city?: string | null
          created_at?: string
          id?: string
          payout_account?: string | null
          payout_method?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          trade_license?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          city?: string | null
          created_at?: string
          id?: string
          payout_account?: string | null
          payout_method?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          trade_license?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          customer_id: string
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          is_advance: boolean
          paid_at: string | null
          provider: string
          provider_session_id: string | null
          provider_transaction_id: string | null
          raw_payload: Json | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          customer_id: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          is_advance?: boolean
          paid_at?: string | null
          provider?: string
          provider_session_id?: string | null
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          customer_id?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          is_advance?: boolean
          paid_at?: string | null
          provider?: string
          provider_session_id?: string | null
          provider_transaction_id?: string | null
          raw_payload?: Json | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string
          days_of_week: number[]
          effective_from: string | null
          effective_to: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["pricing_rule_kind"]
          label: string | null
          price_per_hour: number
          priority: number
          starts_at: string | null
          turf_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          effective_from?: string | null
          effective_to?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["pricing_rule_kind"]
          label?: string | null
          price_per_hour: number
          priority?: number
          starts_at?: string | null
          turf_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          effective_from?: string | null
          effective_to?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["pricing_rule_kind"]
          label?: string | null
          price_per_hour?: number
          priority?: number
          starts_at?: string | null
          turf_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_published: boolean
          rating: number
          turf_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_published?: boolean
          rating: number
          turf_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_published?: boolean
          rating?: number
          turf_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      turf_facilities: {
        Row: {
          facility_id: string
          turf_id: string
        }
        Insert: {
          facility_id: string
          turf_id: string
        }
        Update: {
          facility_id?: string
          turf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turf_facilities_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turf_facilities_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      turf_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_cover: boolean
          sort_order: number
          storage_key: string | null
          turf_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_key?: string | null
          turf_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_key?: string | null
          turf_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "turf_images_turf_id_fkey"
            columns: ["turf_id"]
            isOneToOne: false
            referencedRelation: "turfs"
            referencedColumns: ["id"]
          },
        ]
      }
      turfs: {
        Row: {
          address: string
          advance_percentage: number | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          area: string | null
          base_price_per_hour: number
          capacity: number | null
          city: string
          closing_time: string
          commission_rate: number | null
          country: string
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          opening_time: string
          owner_id: string
          rating_average: number
          rejection_reason: string | null
          review_count: number
          rules: string | null
          slot_minutes: number
          slug: string
          sport: Database["public"]["Enums"]["sport_type"]
          status: Database["public"]["Enums"]["turf_status"]
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          address: string
          advance_percentage?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          area?: string | null
          base_price_per_hour: number
          capacity?: number | null
          city: string
          closing_time?: string
          commission_rate?: number | null
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          opening_time?: string
          owner_id: string
          rating_average?: number
          rejection_reason?: string | null
          review_count?: number
          rules?: string | null
          slot_minutes?: number
          slug: string
          sport?: Database["public"]["Enums"]["sport_type"]
          status?: Database["public"]["Enums"]["turf_status"]
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          advance_percentage?: number | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          area?: string | null
          base_price_per_hour?: number
          capacity?: number | null
          city?: string
          closing_time?: string
          commission_rate?: number | null
          country?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          opening_time?: string
          owner_id?: string
          rating_average?: number
          rejection_reason?: string | null
          review_count?: number
          rules?: string | null
          slot_minutes?: number
          slug?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          status?: Database["public"]["Enums"]["turf_status"]
          surface_type?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status: "active" | "suspended" | "pending"
      app_role: "customer" | "turf_owner" | "admin"
      approval_status: "pending" | "approved" | "rejected"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "expired"
        | "refunded"
        | "rejected"
      payment_status:
        | "initiated"
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
        | "partially_refunded"
      pricing_rule_kind:
        | "base"
        | "weekend"
        | "peak"
        | "off_peak"
        | "holiday"
        | "special"
      sport_type: "football" | "cricket" | "both"
      turf_status: "draft" | "active" | "inactive"
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
      account_status: ["active", "suspended", "pending"],
      app_role: ["customer", "turf_owner", "admin"],
      approval_status: ["pending", "approved", "rejected"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
        "expired",
        "refunded",
        "rejected",
      ],
      payment_status: [
        "initiated",
        "pending",
        "succeeded",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      pricing_rule_kind: [
        "base",
        "weekend",
        "peak",
        "off_peak",
        "holiday",
        "special",
      ],
      sport_type: ["football", "cricket", "both"],
      turf_status: ["draft", "active", "inactive"],
    },
  },
} as const
