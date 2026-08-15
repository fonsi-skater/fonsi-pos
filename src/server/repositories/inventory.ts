import { createClient } from "@/lib/supabase/server";

export interface InventoryRow {
  product_id: string;
  product_name: string;
  sku: string;
  image_url: string | null;
  category_name: string | null;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  quantity: number;
}

interface ProductWithInventoryRow {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  categories: { name: string } | { name: string }[] | null;
  inventory: { quantity: number; branch_id: string } | { quantity: number; branch_id: string }[] | null;
}

/**
 * Current stock per product for a given branch, joined with product info.
 * This reads from `inventory` (the fast, derived snapshot table) — never
 * from `inventory_movements` directly, since summing the whole ledger on
 * every page load doesn't scale. See supabase/migrations/0003 for how the
 * snapshot stays in sync via trigger.
 */
export async function listInventoryForBranch(businessId: string, branchId: string) {
  const supabase = await createClient();

  // Products first (so items with zero recorded movements still show,
  // with quantity defaulting to 0), left-joined against their inventory row.
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, sku, image_url, cost_price, selling_price, min_stock_level, categories(name), inventory!left(quantity, branch_id)"
    )
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[list_inventory_for_branch]", error);
    return [] as InventoryRow[];
  }

  const rows = (data ?? []) as unknown as ProductWithInventoryRow[];

  return rows.map((p) => {
    const inventoryRows = Array.isArray(p.inventory) ? p.inventory : p.inventory ? [p.inventory] : [];
    const branchRow = inventoryRows.find((i) => i.branch_id === branchId);
    const categoryName = Array.isArray(p.categories) ? p.categories[0]?.name ?? null : p.categories?.name ?? null;

    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      image_url: p.image_url,
      category_name: categoryName,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      min_stock_level: p.min_stock_level,
      quantity: branchRow?.quantity ?? 0,
    } satisfies InventoryRow;
  });
}

export function getLowStock(rows: InventoryRow[]) {
  return rows.filter((r) => r.quantity <= r.min_stock_level);
}

export function getOutOfStock(rows: InventoryRow[]) {
  return rows.filter((r) => r.quantity <= 0);
}

/** Total stock valuation at cost price, for the branch's current on-hand inventory. */
export function getStockValuation(rows: InventoryRow[]) {
  return rows.reduce((sum, r) => sum + r.quantity * r.cost_price, 0);
}

/** Movement ledger for a single product, most recent first — the audit trail behind the current quantity. */
export async function listMovementsForProduct(businessId: string, productId: string, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, quantity_change, reference_type, notes, created_at, branch_id, branches(name)")
    .eq("business_id", businessId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[list_movements_for_product]", error);
    return [];
  }

  return data ?? [];
}

export async function listBranches(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[list_branches]", error);
    return [];
  }

  return data ?? [];
}
