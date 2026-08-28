"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
 * discount here is re-read from the database by product ID, never trusted
 * from the request (spec §10: "Never trust totals sent from the frontend").
 *
 * NOTE ON ATOMICITY: this does several sequential inserts (sale, sale_items,
 * payment, inventory_movements, customer stats). Supabase's JS client has
 * no multi-statement transaction primitive, so a failure partway through
 * can leave a partial sale. A production hardening pass should move this
 * into a single Postgres function (`create_sale(...)` via `.rpc()`) for
 * true atomicity — tracked as a known gap, not silently ignored.
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

  const supabase = await createClient();

  // 1. Re-read authoritative prices for every product in the cart.
  const productIds = items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, selling_price, tax_rate, discount, is_active")
    .eq("business_id", session.businessId!)
    .in("id", productIds)
    .is("deleted_at", null);

  if (productsError || !products || products.length !== new Set(productIds).size) {
    return { success: false, message: "One or more items in the cart are no longer available." };
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let taxAmount = 0;
  const saleItemRows = items.map((item) => {
    const product = productMap.get(item.productId)!;
    if (!product.is_active) {
      throw new Error(`Product ${item.productId} is inactive`);
    }
    const unitPrice = product.selling_price;
    const lineDiscount = unitPrice * item.quantity * product.discount;
    const lineSubtotal = unitPrice * item.quantity - lineDiscount;
    const lineTax = lineSubtotal * product.tax_rate;
    subtotal += lineSubtotal;
    taxAmount += lineTax;
    return {
      product_id: item.productId,
      product_variant_id: item.productVariantId ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      discount_amount: Number(lineDiscount.toFixed(2)),
      tax_amount: Number(lineTax.toFixed(2)),
      subtotal: Number((lineSubtotal + lineTax).toFixed(2)),
    };
  });

  const discountAmount = Math.min(manualDiscount, subtotal);
  const totalAmount = Number((subtotal - discountAmount + taxAmount).toFixed(2));

  // 2. Create the sale.
  const saleNumber = generateReference("SALE");
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      business_id: session.businessId!,
      branch_id: branchId,
      customer_id: customerId ?? null,
      cashier_id: session.userId,
      sale_number: saleNumber,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_amount: totalAmount,
      status: "completed",
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    console.error("[checkout_sale_insert]", saleError);
    return { success: false, message: "Something went wrong while processing the sale. Please try again." };
  }

  // 3. Sale line items.
  const { error: itemsError } = await supabase
    .from("sale_items")
    .insert(saleItemRows.map((row) => ({ ...row, sale_id: sale.id })));

  if (itemsError) {
    console.error("[checkout_sale_items]", itemsError);
    return {
      success: false,
      message: "The sale was started but items couldn't be recorded. Please check Sales and contact support.",
      saleId: sale.id,
    };
  }

  // 4. Payment. Only M-Pesa requires async/server-verified confirmation
  // (spec §12) — cash, card, bank, credit, and other are recorded as
  // confirmed by the cashier at the point of sale, matching how a small
  // business actually takes those payments today (a card terminal or
  // bank transfer confirmation happening alongside, not through this app).
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      sale_id: sale.id,
      method: paymentMethod,
      amount: totalAmount,
      status: paymentMethod === "mpesa" ? "pending" : "success",
    })
    .select("id")
    .single();

  let paymentStatus: CheckoutResult["paymentStatus"] = "success";

  if (paymentError || !payment) {
    console.error("[checkout_payment]", paymentError);
  } else if (paymentMethod === "mpesa") {
    const provider = getPaymentProvider("mpesa");
    const result = await provider.initiate({
      saleId: sale.id,
      businessId: session.businessId!,
      branchId,
      amount: totalAmount,
      currency: "KES",
      customerPhone: customerPhone ?? undefined,
    });
    paymentStatus = result.status;
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      provider_reference: result.providerReference,
      idempotency_key: result.idempotencyKey,
      status: result.status,
    });
  } else {
    const provider = getPaymentProvider("cash"); // reuse for immediate-confirm semantics
    const result = await provider.initiate({
      saleId: sale.id,
      businessId: session.businessId!,
      branchId,
      amount: totalAmount,
      currency: "KES",
    });
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      provider_reference: result.providerReference,
      idempotency_key: result.idempotencyKey,
      status: "success",
    });
  }

  // 5. Inventory movements — one per line, decrementing stock via the
  // trigger in supabase/migrations/0003 (never a raw stock write).
  const movementRows = items.map((item) => ({
    business_id: session.businessId!,
    branch_id: branchId,
    product_id: item.productId,
    product_variant_id: item.productVariantId ?? null,
    movement_type: "sale" as const,
    quantity_change: -item.quantity,
    reference_type: "sale",
    reference_id: sale.id,
    created_by: session.userId,
  }));

  const { error: movementError } = await supabase.from("inventory_movements").insert(movementRows);
  if (movementError) {
    console.error("[checkout_inventory_movements]", movementError);
  }

  // 6. Customer stats + a receipt row (PDF generation lands in Phase 8 —
  // this just reserves the receipt number now).
  if (customerId) {
    await supabase.from("customer_transactions").insert({
      customer_id: customerId,
      sale_id: sale.id,
      type: "sale",
      amount: totalAmount,
    });
    const { data: customer } = await supabase
      .from("customers")
      .select("total_spent")
      .eq("id", customerId)
      .single();
    await supabase
      .from("customers")
      .update({
        total_spent: (customer?.total_spent ?? 0) + totalAmount,
        last_purchase_at: new Date().toISOString(),
      })
      .eq("id", customerId);
  }

  await supabase.from("receipts").insert({
    sale_id: sale.id,
    receipt_number: generateReference("RCPT"),
  });

  revalidatePath("/inventory");
  revalidatePath("/sales");

  return {
    success: true,
    saleId: sale.id,
    saleNumber,
    total: totalAmount,
    paymentStatus,
    message:
      paymentMethod === "mpesa" && paymentStatus === "pending"
        ? "Sale recorded. Waiting for M-Pesa confirmation."
        : "Sale completed.",
  };
}
