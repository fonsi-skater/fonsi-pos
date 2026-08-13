import type { PaymentProvider, PaymentRequest, PaymentResult } from "../types";
import { generateReference } from "@/lib/utils";

/**
 * Safaricom Daraja (M-Pesa) provider.
 *
 * ⚠️ Scaffold only — full implementation lands in Phase 7 per the roadmap.
 * Wired up now so the PaymentService factory and POS UI can be built
 * against a stable interface.
 *
 * Flow (see docs/ARCHITECTURE.md §Payment Architecture):
 *   1. initiate() calls Daraja's STK Push endpoint -> status "pending"
 *   2. Daraja calls our /api/payments/mpesa/callback webhook
 *   3. The callback handler verifies + persists the result (never the client)
 *   4. verify() can be used to poll/reconcile pending transactions
 *
 * Credentials (MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY,
 * MPESA_SHORTCODE) live in environment variables only — never in code.
 */
export class MpesaProvider implements PaymentProvider {
  readonly method = "mpesa" as const;

  async initiate(_request: PaymentRequest): Promise<PaymentResult> {
    const idempotencyKey = generateReference("MPESA");

    // TODO (Phase 7): call Daraja OAuth -> STK Push with _request.customerPhone
    // and _request.amount, persist a `payment_transactions` row with status
    // "pending" keyed by idempotencyKey before returning.
    return {
      success: false,
      status: "pending",
      providerReference: null,
      idempotencyKey,
      message: "M-Pesa integration not yet implemented (Phase 7).",
    };
  }

  async verify(providerReference: string): Promise<PaymentResult> {
    // TODO (Phase 7): query Daraja transaction status API, or read the
    // persisted callback result from `payment_transactions`.
    return {
      success: false,
      status: "pending",
      providerReference,
      idempotencyKey: providerReference,
      message: "M-Pesa verification not yet implemented (Phase 7).",
    };
  }
}
