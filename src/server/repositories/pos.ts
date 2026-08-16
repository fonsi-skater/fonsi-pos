import { createClient } from "@/lib/supabase/server";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image_url: string | null;
  selling_price: number;
  tax_rate: number;
  discount: number;
  quantity: number;
}

interface PosProductRow {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image_url: string | null;
  selling_price: number;
  tax_rate: number;
  discount: number;
  inventory: { quantity: number; branch_id: string } | { quantity: number; branch_id: string }[] | null;
}

/**
 * Products for the POS grid: active only, capped to a page so the screen
 * stays fast (spec §27), with current stock for the active branch resolved
 * inline so the cashier can see availability at a glance.
 */
export async function searchPosProducts(businessId: string, branchId: string, search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, name, sku, barcode, image_url, selling_price, tax_rate, discount, inventory!left(quantity, branch_id)")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name")
    .limit(60);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[search_pos_products]", error);
    return [] as PosProduct[];
  }

  const rows = (data ?? []) as unknown as PosProductRow[];
  return rows.map((p) => {
    const inventoryRows = Array.isArray(p.inventory) ? p.inventory : p.inventory ? [p.inventory] : [];
    const branchRow = inventoryRows.find((i) => i.branch_id === branchId);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      image_url: p.image_url,
      selling_price: p.selling_price,
      tax_rate: p.tax_rate,
      discount: p.discount,
      quantity: branchRow?.quantity ?? 0,
    } satisfies PosProduct;
  });
}

export async function findPosProductByBarcode(businessId: string, branchId: string, barcode: string) {
  const products = await searchPosProducts(businessId, branchId, barcode);
  return products.find((p) => p.barcode === barcode) ?? null;
}

export async function listPosCustomers(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("name")
    .limit(200);

  if (error) {
    console.error("[list_pos_customers]", error);
    return [];
  }

  return data ?? [];
}
