import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
}

export interface ReceiptData {
  saleNumber: string;
  receiptNumber: string;
  createdAt: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  businessName: string;
  currency: string;
  branchName: string;
  branchAddress: string | null;
  branchPhone: string | null;
  customerName: string | null;
  items: ReceiptItem[];
}

type AnyClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

/**
 * Assembles everything a receipt needs to render, scoped to businessId
 * either way — a saleId alone is never enough to read someone else's
 * sale. Deliberately does NOT rely on embedded relation selects
 * (`sale_items(*, products(name))`) — the hand-maintained Database type
 * doesn't declare every FK, and that class of embed previously produced
 * a real tsc error elsewhere in this codebase (see the atomic-checkout
 * commit). Separate queries + an in-memory join are slightly more code,
 * but don't depend on getting that type declaration exactly right.
 */
async function loadReceiptData(saleId: string, businessId: string, client: AnyClient): Promise<ReceiptData | null> {
  const { data: sale, error: saleError } = await client
    .from("sales")
    .select("id, business_id, branch_id, customer_id, sale_number, subtotal, discount_amount, tax_amount, total_amount, created_at")
    .eq("id", saleId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (saleError || !sale) return null;

  const [{ data: business }, { data: branch }, { data: receipt }, { data: payment }, { data: saleItems }] = await Promise.all([
    client.from("businesses").select("name, currency").eq("id", businessId).maybeSingle(),
    client.from("branches").select("name, address, phone").eq("id", sale.branch_id).maybeSingle(),
    client.from("receipts").select("receipt_number").eq("sale_id", saleId).maybeSingle(),
    client.from("payments").select("method, status").eq("sale_id", saleId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("sale_items").select("product_id, quantity, unit_price, discount_amount, tax_amount, subtotal").eq("sale_id", saleId),
  ]);

  if (!business || !branch || !receipt || !payment || !saleItems) return null;

  const productIds = saleItems.map((item) => item.product_id);
  const { data: products } = await client.from("products").select("id, name, sku").in("id", productIds);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  let customerName: string | null = null;
  if (sale.customer_id) {
    const { data: customer } = await client.from("customers").select("name").eq("id", sale.customer_id).maybeSingle();
    customerName = customer?.name ?? null;
  }

  return {
    saleNumber: sale.sale_number,
    receiptNumber: receipt.receipt_number,
    createdAt: sale.created_at,
    subtotal: sale.subtotal,
    discountAmount: sale.discount_amount,
    taxAmount: sale.tax_amount,
    totalAmount: sale.total_amount,
    paymentMethod: payment.method,
    paymentStatus: payment.status,
    businessName: business.name,
    currency: business.currency,
    branchName: branch.name,
    branchAddress: branch.address,
    branchPhone: branch.phone,
    customerName,
    items: saleItems.map((item) => ({
      productName: productById.get(item.product_id)?.name ?? "Unknown item",
      sku: productById.get(item.product_id)?.sku ?? "",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discountAmount: item.discount_amount,
      taxAmount: item.tax_amount,
      subtotal: item.subtotal,
    })),
  };
}

/** For authenticated dashboard requests — RLS-scoped client. */
export async function getReceiptData(saleId: string, businessId: string): Promise<ReceiptData | null> {
  const supabase = await createClient();
  return loadReceiptData(saleId, businessId, supabase);
}

/** For embed-token-authorized requests (src/app/embed/pos) — no session to satisfy RLS. */
export async function getReceiptDataForEmbed(saleId: string, businessId: string): Promise<ReceiptData | null> {
  const admin = createAdminClient();
  return loadReceiptData(saleId, businessId, admin);
}
