import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

export interface ProductListParams {
  businessId: string;
  search?: string;
  categoryId?: string;
  page?: number;
}

/**
 * Paginated, searchable product list. Deliberately server-side and capped
 * at PAGE_SIZE — spec §27: "Never load thousands of products into the
 * browser unnecessarily."
 */
export async function listProducts({ businessId, search, categoryId, page = 1 }: ProductListParams) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select("*, categories(name)", { count: "exact" })
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[list_products]", error);
    return { products: [], total: 0, pageSize: PAGE_SIZE };
  }

  return { products: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE };
}

export async function listCategories(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[list_categories]", error);
    return [];
  }

  return data ?? [];
}

/** Look up a single product by barcode within the business — used by the POS scanner (Phase 6). */
export async function findProductByBarcode(businessId: string, barcode: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .eq("barcode", barcode)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[find_product_by_barcode]", error);
    return null;
  }

  return data;
}
