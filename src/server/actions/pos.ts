"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/pos";
import { requirePermission } from "@/server/services/authorize";
import { resolveEmbedToken } from "@/server/services/embed-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getPaymentProvider } from "@/lib/payments";
import { generateReference } from "@/lib/utils";
import type { SessionContext } from "@/types";

export interface CheckoutResult {
  success: boolean;
  message?: string;
  saleId?: string;
  saleNumber?: string;
  total?: number;
  paymentStatus?: "pending" | "success" | "failed";
}

/**
 * Completes a sale. This is the one place financial totals are computed —
 * the client cart is a UI convenience only; every price, tax rate, and
 * discount is re-read from the database by product ID inside the
 * `create_sale` Postgres function (supabase/migrations/0010_atomic_checkout.sql),
 * never trusted from the request (spec §10: "Never trust totals sent from
 * the frontend").
 *
 * ATOMICITY: the sale, its line items, the payment row, inventory
 * movements, customer stats, and the receipt row are all written inside
 * that single `create_sale` transaction — either the whole sale lands or
 * none of it does. Only the parts that inherently can't live inside a
 * database transaction happen out here in Node afterward: the M-Pesa STK
 * Push (an external HTTP call) and recording its result.
 *
 * SECURITY: `create_sale` is SECURITY DEFINER and bypasses RLS, so which
 * Supabase client calls it matters. Authenticated dashboard checkouts use
 * the normal RLS-bound client (Postgres still checks the caller actually
 * holds an `authenticated` session before allowing the call at all).
 * Embed checkouts have no Supabase auth session — the embed token
 * resolved above is the authorization instead — so they use the
 * service-role admin client, same as the M-Pesa callback and embed token
 * verification elsewhere in this codebase.
 */
export async function checkoutSale(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid checkout request." };
  }

  const { customerId, paymentMethod, items, customerPhone } = parsed.data;
  let branchId = parsed.data.branchId;
  let manualDiscount = parsed.data.manualDiscount;
  let session: SessionContext;
  let isEmbed = false;

  if (parsed.data.embedToken) {
    // Embed checkouts (src/app/embed/pos/page.tsx) have no dashboard
    // session — the token itself is the authorization, resolved to a
    // fixed business/branch. `branchId` from the request is ignored in
    // favor of the token's own scope: an unauthenticated embed request
    // never gets to pick which branch it sells against.
    const embedAuth = await resolveEmbedToken(parsed.data.embedToken);
    if (!embedAuth) {
      return { success: false, message: "This embed link is invalid or has been revoked." };
    }
    isEmbed = true;
    branchId = embedAuth.branchId;
    // No role above cashier exists in the embed flow, and discounts
    // require a real, session-checked APPROVE_DISCOUNTS grant — so
    // embed checkouts never carry one, regardless of what was requested.
    manualDiscount = 0;
    session = {
      userId: embedAuth.cashierId,
      email: "",
      businessId: embedAuth.businessId,
      branchId: embedAuth.branchId,
      role: "cashier",
    };
  } else {
    session = await requirePermission(PERMISSIONS.PROCESS_SALES);
    if (manualDiscount > 0 && !hasPermission(session.role, PERMISSIONS.APPROVE_DISCOUNTS)) {
      return { success: false, message: "You're not authorized to apply a discount." };
    }
  }

  const supabase = isEmbed ? createAdminClient() : await createClient();
  const saleNumber = generateReference("SALE");
  const receiptNumber = generateReference("RCPT");

  const { data: rows, error: rpcError } = await supabase.rpc("create_sale", {
    p_business_id: session.businessId!,
    p_branch_id: branchId,
    p_cashier_id: session.userId,
    p_customer_id: customerId ?? null,
    p_sale_number: saleNumber,
    p_receipt_number: receiptNumber,
    p_payment_method: paymentMethod,
    p_manual_discount: manualDiscount,
    p_items: items.map((item) => ({
      product_id: item.productId,
      product_variant_id: item.productVariantId ?? null,
      quantity: item.quantity,
    })),
  });

  if (rpcError || !rows || rows.length === 0) {
    console.error("[checkout_sale_rpc]", rpcError);
    // create_sale raises a plain-language message (e.g. "no longer
    // available") for the cases a cashier can actually act on; anything
    // else is a genuine server error, not shown verbatim to the client.
    const isKnownValidationError = rpcError?.code === "P0001";
    return {
      success: false,
      message: isKnownValidationError ? rpcError.message : "Something went wrong while processing the sale. Please try again.",
    };
  }

  const sale = rows[0];
  // create_sale only ever sets this to "pending" or "success" at
  // creation time ("failed"/"reversed" only happen later, via the
  // M-Pesa callback or a refund) — narrow the wider DB enum accordingly.
  let paymentStatus: CheckoutResult["paymentStatus"] = sale.payment_status as "pending" | "success";

  // M-Pesa's confirmation is inherently out-of-band (Daraja's webhook —
  // src/app/api/payments/mpesa/callback), and cash/card/etc. are recorded
  // as confirmed by create_sale already, so only M-Pesa needs a follow-up
  // external call here. This can't live inside the SQL transaction above
  // (Postgres can't make outbound HTTP requests), so a failure here — an
  // unreachable Daraja, a network blip — leaves an already-committed sale
  // with a "pending" payment rather than corrupting the sale itself.
  if (paymentMethod === "mpesa") {
    const provider = getPaymentProvider("mpesa");
    const result = await provider.initiate({
      saleId: sale.sale_id,
      businessId: session.businessId!,
      branchId,
      amount: sale.total_amount,
      currency: "KES",
      customerPhone: customerPhone ?? undefined,
      metadata: { saleNumber },
    });
    paymentStatus = result.status;

    const { error: txError } = await supabase.from("payment_transactions").insert({
      payment_id: sale.payment_id,
      provider_reference: result.providerReference,
      idempotency_key: result.idempotencyKey,
      status: result.status,
    });
    if (txError) console.error("[checkout_mpesa_transaction]", txError);

    if (result.status === "failed") {
      await supabase.from("payments").update({ status: "failed" }).eq("id", sale.payment_id);
    }
  } else {
    const provider = getPaymentProvider("cash"); // reuse for immediate-confirm semantics
    const result = await provider.initiate({
      saleId: sale.sale_id,
      businessId: session.businessId!,
      branchId,
      amount: sale.total_amount,
      currency: "KES",
    });
    const { error: txError } = await supabase.from("payment_transactions").insert({
      payment_id: sale.payment_id,
      provider_reference: result.providerReference,
      idempotency_key: result.idempotencyKey,
      status: "success",
    });
    if (txError) console.error("[checkout_cash_transaction]", txError);
  }

  revalidatePath("/inventory");
  revalidatePath("/sales");

  return {
    success: true,
    saleId: sale.sale_id,
    saleNumber: sale.sale_number,
    total: sale.total_amount,
    paymentStatus,
    message:
      paymentMethod === "mpesa" && paymentStatus === "pending"
        ? "Sale recorded. Waiting for M-Pesa confirmation."
        : "Sale completed.",
  };
}
