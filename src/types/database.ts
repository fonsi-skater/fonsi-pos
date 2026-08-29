/**
 * Hand-authored Supabase Database types matching the SQL migrations in
 * supabase/migrations/. This sandbox can't reach a live Supabase project,
 * so these were written to mirror the schema exactly rather than generated
 * by the CLI.
 *
 * Once you have a real project, regenerate the authoritative version with:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 * and diff against this file to catch any drift.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "super_admin" | "business_owner" | "manager" | "cashier";
export type InventoryMovementType =
  | "purchase" | "sale" | "adjustment" | "transfer_in" | "transfer_out" | "return";
export type PurchaseStatus = "draft" | "ordered" | "received" | "cancelled";
export type CustomerTransactionType = "sale" | "payment" | "credit_adjustment";
export type SaleStatus = "completed" | "refunded" | "partial_refund" | "voided";
export type PaymentMethodDb = "cash" | "mpesa" | "card" | "bank" | "credit" | "other";
export type PaymentStatusDb = "pending" | "success" | "failed" | "reversed";

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          currency: string;
          timezone: string;
          is_active: boolean;
          subscription_status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          currency?: string;
          timezone?: string;
          is_active?: boolean;
          subscription_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          currency?: string;
          timezone?: string;
          is_active?: boolean;
          subscription_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: AppRole;
          branch_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: AppRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: AppRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          parent_id: string | null;
          name: string;
          description: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          parent_id?: string | null;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          supplier_id: string | null;
          name: string;
          sku: string;
          barcode: string | null;
          description: string | null;
          cost_price: number;
          selling_price: number;
          tax_rate: number;
          discount: number;
          min_stock_level: number;
          image_url: string | null;
          is_active: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          supplier_id?: string | null;
          name: string;
          sku: string;
          barcode?: string | null;
          description?: string | null;
          cost_price?: number;
          selling_price: number;
          tax_rate?: number;
          discount?: number;
          min_stock_level?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          supplier_id?: string | null;
          name?: string;
          sku?: string;
          barcode?: string | null;
          description?: string | null;
          cost_price?: number;
          selling_price?: number;
          tax_rate?: number;
          discount?: number;
          min_stock_level?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          barcode: string | null;
          price_adjustment: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          price_adjustment?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          sku?: string | null;
          barcode?: string | null;
          price_adjustment?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          product_id: string;
          product_variant_id: string | null;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          product_id: string;
          product_variant_id?: string | null;
          quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          product_id?: string;
          product_variant_id?: string | null;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          product_id: string;
          product_variant_id: string | null;
          movement_type: InventoryMovementType;
          quantity_change: number;
          reference_type: string | null;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          product_id: string;
          product_variant_id?: string | null;
          movement_type: InventoryMovementType;
          quantity_change: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          product_id?: string;
          product_variant_id?: string | null;
          movement_type?: InventoryMovementType;
          quantity_change?: number;
          reference_type?: string | null;
          reference_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          outstanding_balance: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          outstanding_balance?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          outstanding_balance?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          supplier_id: string | null;
          purchase_number: string;
          status: PurchaseStatus;
          total_amount: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          supplier_id?: string | null;
          purchase_number: string;
          status?: PurchaseStatus;
          total_amount: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          supplier_id?: string | null;
          purchase_number?: string;
          status?: PurchaseStatus;
          total_amount?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: {
          id: string;
          purchase_id: string;
          product_id: string;
          product_variant_id: string | null;
          quantity: number;
          unit_cost: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          product_id: string;
          product_variant_id?: string | null;
          quantity?: number;
          unit_cost: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          purchase_id?: string;
          product_id?: string;
          product_variant_id?: string | null;
          quantity?: number;
          unit_cost?: number;
          subtotal?: number;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          outstanding_credit: number;
          total_spent: number;
          last_purchase_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          outstanding_credit?: number;
          total_spent?: number;
          last_purchase_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          outstanding_credit?: number;
          total_spent?: number;
          last_purchase_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      customer_transactions: {
        Row: {
          id: string;
          customer_id: string;
          sale_id: string | null;
          type: CustomerTransactionType;
          amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          sale_id?: string | null;
          type?: CustomerTransactionType;
          amount: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          sale_id?: string | null;
          type?: CustomerTransactionType;
          amount?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      discounts: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          type: 'percentage' | 'fixed';
          value: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          type?: 'percentage' | 'fixed';
          value: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          type?: 'percentage' | 'fixed';
          value?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      taxes: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          rate: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          rate: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          rate?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          customer_id: string | null;
          cashier_id: string;
          sale_number: string;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          status: SaleStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          customer_id?: string | null;
          cashier_id: string;
          sale_number: string;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          status?: SaleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          customer_id?: string | null;
          cashier_id?: string;
          sale_number?: string;
          subtotal?: number;
          discount_amount?: number;
          tax_amount?: number;
          total_amount?: number;
          status?: SaleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          product_variant_id: string | null;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          tax_amount: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          product_variant_id?: string | null;
          quantity?: number;
          unit_price: number;
          discount_amount: number;
          tax_amount: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          product_variant_id?: string | null;
          quantity?: number;
          unit_price?: number;
          discount_amount?: number;
          tax_amount?: number;
          subtotal?: number;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          sale_id: string;
          method: PaymentMethodDb;
          amount: number;
          status: PaymentStatusDb;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          method: PaymentMethodDb;
          amount: number;
          status?: PaymentStatusDb;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          method?: PaymentMethodDb;
          amount?: number;
          status?: PaymentStatusDb;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          payment_id: string;
          provider_reference: string | null;
          idempotency_key: string;
          status: PaymentStatusDb;
          raw_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          provider_reference?: string | null;
          idempotency_key: string;
          status?: PaymentStatusDb;
          raw_response?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          provider_reference?: string | null;
          idempotency_key?: string;
          status?: PaymentStatusDb;
          raw_response?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          sale_id: string;
          refunded_by: string;
          amount: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          refunded_by: string;
          amount: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          refunded_by?: string;
          amount?: number;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          sale_id: string;
          receipt_number: string;
          pdf_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          receipt_number: string;
          pdf_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          receipt_number?: string;
          pdf_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expense_categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string | null;
          category_id: string | null;
          amount: number;
          description: string | null;
          expense_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id?: string | null;
          category_id?: string | null;
          amount: number;
          description?: string | null;
          expense_date: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string | null;
          category_id?: string | null;
          amount?: number;
          description?: string | null;
          expense_date?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          branch_id: string | null;
          employee_number: string | null;
          position: string | null;
          hire_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          branch_id?: string | null;
          employee_number?: string | null;
          position?: string | null;
          hire_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          branch_id?: string | null;
          employee_number?: string | null;
          position?: string | null;
          hire_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string | null;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string | null;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id?: string | null;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan: string;
          status: string;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plan?: string;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plugin_installations: {
        Row: {
          id: string;
          business_id: string;
          plugin_name: string;
          version: string;
          is_enabled: boolean;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          plugin_name: string;
          version?: string;
          is_enabled?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          plugin_name?: string;
          version?: string;
          is_enabled?: boolean;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      embed_tokens: {
        Row: {
          id: string;
          business_id: string;
          branch_id: string;
          token_hash: string;
          label: string | null;
          is_active: boolean;
          created_by: string | null;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          branch_id: string;
          token_hash: string;
          label?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          branch_id?: string;
          token_hash?: string;
          label?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sale: {
        Args: {
          p_business_id: string;
          p_branch_id: string;
          p_cashier_id: string;
          p_customer_id: string | null;
          p_sale_number: string;
          p_receipt_number: string;
          p_payment_method: Database["public"]["Enums"]["payment_method"];
          p_manual_discount: number;
          p_items: {
            product_id: string;
            product_variant_id: string | null;
            quantity: number;
          }[];
        };
        Returns: {
          sale_id: string;
          sale_number: string;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total_amount: number;
          payment_id: string;
          payment_status: Database["public"]["Enums"]["payment_status"];
        }[];
      };
    };
    Enums: {
      app_role: AppRole;
      inventory_movement_type: InventoryMovementType;
      purchase_status: PurchaseStatus;
      customer_transaction_type: CustomerTransactionType;
      sale_status: SaleStatus;
      payment_method: PaymentMethodDb;
      payment_status: PaymentStatusDb;
    };
  };
}
