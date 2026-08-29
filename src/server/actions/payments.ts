"use server";

import { getSessionContext } from "@/server/services/session";
import { resolveEmbedToken } from "@/server/services/embed-auth";
import { getSalePaymentStatus, getSalePaymentStatusForEmbed } from "@/server/repositories/payments";

export interface PaymentStatusResult {
  status: "pending" | "success" | "failed" | "unknown";
}

/**
 * Polled by CheckoutButton after an M-Pesa STK push, so the cashier sees
 * the actual outcome (customer entered PIN vs cancelled vs timed out)
 * instead of a permanent "waiting" message. Scoped to the caller's own
 * business either way — a saleId alone is never enough to read status.
 */
export async function getPaymentStatus(saleId: string, embedToken?: string | null): Promise<PaymentStatusResult> {
  if (embedToken) {
    const auth = await resolveEmbedToken(embedToken);
    if (!auth) return { status: "unknown" };
    const result = await getSalePaymentStatusForEmbed(saleId, auth.businessId);
    return { status: result?.paymentStatus ?? "unknown" };
  }

  const session = await getSessionContext();
  if (!session?.businessId) return { status: "unknown" };

  const result = await getSalePaymentStatus(saleId, session.businessId);
  return { status: result?.paymentStatus ?? "unknown" };
}
