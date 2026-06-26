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
      condominiums: {
        Row: {
          amenities: string[]
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          region: string | null
          slug: string
          status: string
          units_count: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          amenities?: string[]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          region?: string | null
          slug: string
          status?: string
          units_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          amenities?: string[]
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          region?: string | null
          slug?: string
          status?: string
          units_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      content_generation_jobs: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          editorial_page_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          model: string
          prompt: string | null
          result: Json | null
          status: string
          topic: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          editorial_page_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          model: string
          prompt?: string | null
          result?: Json | null
          status?: string
          topic: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          editorial_page_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          model?: string
          prompt?: string | null
          result?: Json | null
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_editorial_page_id_fkey"
            columns: ["editorial_page_id"]
            isOneToOne: false
            referencedRelation: "editorial_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_pages: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          content_type: string
          created_at: string
          display_order: number
          excerpt: string | null
          featured_image: string | null
          focus_keyword: string | null
          gallery_images: string[]
          html_content: string
          id: string
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          related_condominium: string | null
          related_neighborhood: string | null
          schema_type: string
          secondary_keywords: string[]
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          content_type: string
          created_at?: string
          display_order?: number
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          gallery_images?: string[]
          html_content?: string
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          related_condominium?: string | null
          related_neighborhood?: string | null
          schema_type?: string
          secondary_keywords?: string[]
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          content_type?: string
          created_at?: string
          display_order?: number
          excerpt?: string | null
          featured_image?: string | null
          focus_keyword?: string | null
          gallery_images?: string[]
          html_content?: string
          id?: string
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          related_condominium?: string | null
          related_neighborhood?: string | null
          schema_type?: string
          secondary_keywords?: string[]
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_pages_related_condominium_fkey"
            columns: ["related_condominium"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          accepts_exchange: boolean | null
          area_built: number | null
          area_total: number | null
          area_useful: number | null
          audit_issues: Json | null
          audit_status: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          condo_fee: number | null
          condominium_id: string | null
          condominium_name: string | null
          created_at: string
          descricao_original: string | null
          descricao_seo: string | null
          description: string | null
          external_ref: string | null
          extracted_at: string | null
          furnished: boolean | null
          id: string
          images: Json
          internal_code: string | null
          iptu: number | null
          is_launch: boolean | null
          last_seen_at: string | null
          lavabos: number | null
          manual_overrides: Json | null
          neighborhood: string | null
          parking: number | null
          parking_covered: number | null
          parking_uncovered: number | null
          price_rent: number | null
          price_sale: number | null
          property_type: string | null
          purpose: string | null
          raw: Json | null
          region: string | null
          review_status: string | null
          seo_description: string | null
          seo_generated_at: string | null
          seo_title: string | null
          seo_used_ai: boolean | null
          slug: string
          source_url: string | null
          state: string | null
          status: string
          suites: number | null
          title: string
          updated_at: string
        }
        Insert: {
          accepts_exchange?: boolean | null
          area_built?: number | null
          area_total?: number | null
          area_useful?: number | null
          audit_issues?: Json | null
          audit_status?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          condo_fee?: number | null
          condominium_id?: string | null
          condominium_name?: string | null
          created_at?: string
          descricao_original?: string | null
          descricao_seo?: string | null
          description?: string | null
          external_ref?: string | null
          extracted_at?: string | null
          furnished?: boolean | null
          id?: string
          images?: Json
          internal_code?: string | null
          iptu?: number | null
          is_launch?: boolean | null
          last_seen_at?: string | null
          lavabos?: number | null
          manual_overrides?: Json | null
          neighborhood?: string | null
          parking?: number | null
          parking_covered?: number | null
          parking_uncovered?: number | null
          price_rent?: number | null
          price_sale?: number | null
          property_type?: string | null
          purpose?: string | null
          raw?: Json | null
          region?: string | null
          review_status?: string | null
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_title?: string | null
          seo_used_ai?: boolean | null
          slug: string
          source_url?: string | null
          state?: string | null
          status?: string
          suites?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          accepts_exchange?: boolean | null
          area_built?: number | null
          area_total?: number | null
          area_useful?: number | null
          audit_issues?: Json | null
          audit_status?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          condo_fee?: number | null
          condominium_id?: string | null
          condominium_name?: string | null
          created_at?: string
          descricao_original?: string | null
          descricao_seo?: string | null
          description?: string | null
          external_ref?: string | null
          extracted_at?: string | null
          furnished?: boolean | null
          id?: string
          images?: Json
          internal_code?: string | null
          iptu?: number | null
          is_launch?: boolean | null
          last_seen_at?: string | null
          lavabos?: number | null
          manual_overrides?: Json | null
          neighborhood?: string | null
          parking?: number | null
          parking_covered?: number | null
          parking_uncovered?: number | null
          price_rent?: number | null
          price_sale?: number | null
          property_type?: string | null
          purpose?: string | null
          raw?: Json | null
          region?: string | null
          review_status?: string | null
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_title?: string | null
          seo_used_ai?: boolean | null
          slug?: string
          source_url?: string | null
          state?: string | null
          status?: string
          suites?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          pages_crawled: number
          properties_upserted: number
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          pages_crawled?: number
          properties_upserted?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          pages_crawled?: number
          properties_upserted?: number
          started_at?: string
          status?: string
          triggered_by?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
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
      app_role: ["admin", "editor", "user"],
    },
  },
} as const
