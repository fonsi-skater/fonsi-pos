import type { PaymentMethod } from "@/types";

export interface PaymentRequest {
  saleId: string;
  businessId: string;
  branchId: string;
  amount: number;
  currency: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  status: "pending" | "success" | "failed";
  providerReference: string | null;
  /** Idempotency key so retries never double-charge or double-record. */
  idempotencyKey: string;
  message: string;
  raw?: unknown;
}

/**
 * Contract every payment provider must implement.
 * See src/lib/payments/providers/* for concrete implementations.
 *
 * Design rule (per spec §11/§12): the frontend NEVER decides a payment
 * succeeded. `initiate` may return `pending` (e.g. STK push sent), but only
 * a verified server-side callback/poll (see `verify`) may mark it `success`.
 */
export interface PaymentProvider {
  readonly method: PaymentMethod;
  initiate(request: PaymentRequest): Promise<PaymentResult>;
  verify(providerReference: string): Promise<PaymentResult>;
}
