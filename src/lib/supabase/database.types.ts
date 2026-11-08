export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["profile_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          active: boolean;
          available: boolean;
          category: Database["public"]["Enums"]["product_category"];
          created_at: string;
          description: string;
          id: string;
          image_path: string | null;
          ingredients: string[];
          name: string;
          price_cents: number;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          available?: boolean;
          category: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description?: string;
          id?: string;
          image_path?: string | null;
          ingredients?: string[];
          name: string;
          price_cents: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          available?: boolean;
          category?: Database["public"]["Enums"]["product_category"];
          created_at?: string;
          description?: string;
          id?: string;
          image_path?: string | null;
          ingredients?: string[];
          name?: string;
          price_cents?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      combos: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          id: string;
          minimum_delivery_count: number;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          id?: string;
          minimum_delivery_count: number;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number;
          id?: string;
          minimum_delivery_count?: number;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      combo_products: {
        Row: {
          combo_id: string;
          created_at: string;
          maximum_quantity: number | null;
          minimum_quantity: number;
          product_id: string;
        };
        Insert: {
          combo_id: string;
          created_at?: string;
          maximum_quantity?: number | null;
          minimum_quantity?: number;
          product_id: string;
        };
        Update: {
          combo_id?: string;
          created_at?: string;
          maximum_quantity?: number | null;
          minimum_quantity?: number;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combo_products_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_products_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_days: {
        Row: {
          admin_note: string;
          capacity: number;
          created_at: string;
          cutoff_at: string | null;
          delivery_date: string;
          delivery_window_end: string;
          delivery_window_start: string;
          enabled: boolean;
          fee_override_cents: number | null;
          id: string;
          reserved_quantity: number;
          updated_at: string;
        };
        Insert: {
          admin_note?: string;
          capacity: number;
          created_at?: string;
          cutoff_at?: string | null;
          delivery_date: string;
          delivery_window_end: string;
          delivery_window_start: string;
          enabled?: boolean;
          fee_override_cents?: number | null;
          id?: string;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Update: {
          admin_note?: string;
          capacity?: number;
          created_at?: string;
          cutoff_at?: string | null;
          delivery_date?: string;
          delivery_window_end?: string;
          delivery_window_start?: string;
          enabled?: boolean;
          fee_override_cents?: number | null;
          id?: string;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          address_complement: string;
          address_neighborhood: string;
          address_number: string;
          address_reference: string;
          address_street: string;
          admin_notes: string;
          created_at: string;
          customer_name: string;
          customer_notes: string;
          customer_phone: string;
          delivery_fee_cents: number;
          discount_cents: number;
          id: string;
          idempotency_key: string;
          order_number: string;
          paid_at: string | null;
          payment_summary_snapshot: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
        };
        Insert: {
          address_complement?: string;
          address_neighborhood: string;
          address_number: string;
          address_reference?: string;
          address_street: string;
          admin_notes?: string;
          created_at?: string;
          customer_name: string;
          customer_notes?: string;
          customer_phone: string;
          delivery_fee_cents?: number;
          discount_cents?: number;
          id?: string;
          idempotency_key: string;
          order_number?: string;
          paid_at?: string | null;
          payment_summary_snapshot: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents: number;
          updated_at?: string;
        };
        Update: {
          address_complement?: string;
          address_neighborhood?: string;
          address_number?: string;
          address_reference?: string;
          address_street?: string;
          admin_notes?: string;
          created_at?: string;
          customer_name?: string;
          customer_notes?: string;
          customer_phone?: string;
          delivery_fee_cents?: number;
          discount_cents?: number;
          id?: string;
          idempotency_key?: string;
          order_number?: string;
          paid_at?: string | null;
          payment_summary_snapshot?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_deliveries: {
        Row: {
          created_at: string;
          delivery_date: string;
          delivery_day_id: string;
          fee_cents: number;
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["delivery_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          delivery_date: string;
          delivery_day_id: string;
          fee_cents: number;
          id?: string;
          order_id: string;
          status?: Database["public"]["Enums"]["delivery_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          delivery_date?: string;
          delivery_day_id?: string;
          fee_cents?: number;
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["delivery_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_deliveries_delivery_day_id_fkey";
            columns: ["delivery_day_id"];
            isOneToOne: false;
            referencedRelation: "delivery_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          combo_id: string | null;
          combo_name: string | null;
          created_at: string;
          customer_notes: string;
          id: string;
          line_total_cents: number;
          order_delivery_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          combo_id?: string | null;
          combo_name?: string | null;
          created_at?: string;
          customer_notes?: string;
          id?: string;
          line_total_cents: number;
          order_delivery_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: {
          combo_id?: string | null;
          combo_name?: string | null;
          created_at?: string;
          customer_notes?: string;
          id?: string;
          line_total_cents?: number;
          order_delivery_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_delivery_id_fkey";
            columns: ["order_delivery_id"];
            isOneToOne: false;
            referencedRelation: "order_deliveries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      business_settings: {
        Row: {
          business_name: string;
          created_at: string;
          default_cutoff_hours: number;
          default_delivery_fee_cents: number;
          delivery_notice: string;
          id: number;
          payment_instructions: string;
          pix_key: string;
          pix_key_type: string;
          pix_recipient: string;
          updated_at: string;
          whatsapp_phone: string;
        };
        Insert: {
          business_name: string;
          created_at?: string;
          default_cutoff_hours?: number;
          default_delivery_fee_cents?: number;
          delivery_notice?: string;
          id?: number;
          payment_instructions?: string;
          pix_key: string;
          pix_key_type: string;
          pix_recipient: string;
          updated_at?: string;
          whatsapp_phone: string;
        };
        Update: {
          business_name?: string;
          created_at?: string;
          default_cutoff_hours?: number;
          default_delivery_fee_cents?: number;
          delivery_notice?: string;
          id?: number;
          payment_instructions?: string;
          pix_key?: string;
          pix_key_type?: string;
          pix_recipient?: string;
          updated_at?: string;
          whatsapp_phone?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      storefront_products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null;
          description: string | null;
          id: string | null;
          image_path: string | null;
          ingredients: string[] | null;
          name: string | null;
          price_cents: number | null;
          slug: string | null;
          sort_order: number | null;
        };
        Relationships: [];
      };
      storefront_combos: {
        Row: {
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"] | null;
          discount_value: number | null;
          eligible_product_ids: string[] | null;
          id: string | null;
          minimum_delivery_count: number | null;
          name: string | null;
          slug: string | null;
          sort_order: number | null;
        };
        Relationships: [];
      };
      storefront_delivery_days: {
        Row: {
          cutoff_at: string | null;
          delivery_date: string | null;
          delivery_window_end: string | null;
          delivery_window_start: string | null;
          fee_override_cents: number | null;
          id: string | null;
          remaining_capacity: number | null;
        };
        Relationships: [];
      };
      storefront_business_settings: {
        Row: {
          business_name: string | null;
          default_cutoff_hours: number | null;
          default_delivery_fee_cents: number | null;
          delivery_notice: string | null;
          payment_instructions: string | null;
          pix_key: string | null;
          pix_key_type: string | null;
          pix_recipient: string | null;
          whatsapp_phone: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_save_combo: {
        Args: {
          combo_data: Json;
          product_ids: string[];
        };
        Returns: undefined;
      };
      admin_set_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["order_status"];
          target_order_id: string;
        };
        Returns: undefined;
      };
      create_order: {
        Args: {
          idempotency_key: string;
          payload: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      delivery_status:
        | "scheduled"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled";
      discount_type: "percentage" | "fixed";
      order_status:
        | "awaiting_pix"
        | "paid"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled";
      product_category: "salad" | "protein" | "extra" | "dressing" | "drink";
      profile_role: "customer" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
