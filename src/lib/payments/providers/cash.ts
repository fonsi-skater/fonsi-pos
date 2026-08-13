import type { PaymentProvider, PaymentRequest, PaymentResult } from "../types";
import { generateReference } from "@/lib/utils";

/**
 * Cash is always recorded server-side at checkout time — there's no
 * external gateway to confirm, so it resolves immediately.
 */
export class CashProvider implements PaymentProvider {
  readonly method = "cash" as const;

  async initiate(_request: PaymentRequest): Promise<PaymentResult> {
    const reference = generateReference("CASH");
    return {
      success: true,
      status: "success",
      providerReference: reference,
      idempotencyKey: reference,
      message: "Cash payment recorded",
    };
  }

  async verify(providerReference: string): Promise<PaymentResult> {
    // Cash has no external state to reconcile against.
    return {
      success: true,
      status: "success",
      providerReference,
      idempotencyKey: providerReference,
      message: "Cash payment recorded",
    };
  }
}
