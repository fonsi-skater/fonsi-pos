import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentResult } from "@/lib/payments/types";

/**
 * Looks up the payment_transactions row for a given Daraja
 * CheckoutRequestID. Uses the admin client deliberately: Daraja's webhook
 * has no session to check RLS against — see admin.ts's doc comment,
 * which names M-Pesa callback handling as an intended use of this client.
 */
export async function findPaymentTransactionByProviderReference(providerReference: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_transactions")
    .select("id, payment_id, status")
    .eq("provider_reference", providerReference)
    .maybeSingle();

  if (error) {
    console.error("[find_payment_transaction]", error);
    return null;
  }
  return data;
}

/**
 * Records Daraja's final result for a transaction (webhook or a manual
 * verify() reconciliation) and keeps the parent `payments` row's status
 * in sync — the only place a payment is ever marked success/failed after
 * checkout, per spec §12 ("never trust the client").
 */
export async function recordPaymentResult(params: {
  paymentTransactionId: string;
  paymentId: string;
  status: PaymentResult["status"];
  rawResponse: unknown;
}) {
  const admin = createAdminClient();

  const { error: txError } = await admin
    .from("payment_transactions")
    .update({ status: params.status, raw_response: params.rawResponse as never })
    .eq("id", params.paymentTransactionId);

  if (txError) console.error("[record_payment_result_tx]", txError);

  const { error: paymentError } = await admin
    .from("payments")
    .update({ status: params.status })
    .eq("id", params.paymentId);

  if (paymentError) console.error("[record_payment_result_payment]", paymentError);
}

export interface SalePaymentStatus {
  saleId: string;
  businessId: string;
  paymentStatus: "pending" | "success" | "failed";
  paymentMethod: string;
}

async function loadSalePaymentStatus(
  saleId: string,
  businessId: string,
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
): Promise<SalePaymentStatus | null> {
  const { data: sale, error: saleError } = await client
    .from("sales")
    .select("id, business_id")
    .eq("id", saleId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (saleError || !sale) return null;

  const { data: payment, error: paymentError } = await client
    .from("payments")
    .select("method, status")
    .eq("sale_id", saleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError || !payment) return null;

  return {
    saleId: sale.id,
    businessId: sale.business_id,
    paymentStatus: payment.status as SalePaymentStatus["paymentStatus"],
    paymentMethod: payment.method,
  };
}

/**
 * Reads a sale's current payment status for the POS UI to poll after an
 * M-Pesa STK push, scoped to the caller's own business via the normal
 * RLS-checked client (never trust a saleId alone as authorization).
 */
export async function getSalePaymentStatus(saleId: string, businessId: string): Promise<SalePaymentStatus | null> {
  const supabase = await createClient();
  return loadSalePaymentStatus(saleId, businessId, supabase);
}

/**
 * Same as getSalePaymentStatus, but for embed-token-authorized polling
 * (src/app/embed/pos) where there's no cookie session to satisfy RLS.
 * The admin client bypasses RLS entirely, so the businessId scope check
 * inside loadSalePaymentStatus IS the authorization — never call this
 * without a businessId resolved from a verified embed token.
 */
export async function getSalePaymentStatusForEmbed(saleId: string, businessId: string): Promise<SalePaymentStatus | null> {
  const admin = createAdminClient();
  return loadSalePaymentStatus(saleId, businessId, admin);
}
