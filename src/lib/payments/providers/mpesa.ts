import type { PaymentProvider, PaymentRequest, PaymentResult } from "../types";
import { generateReference } from "@/lib/utils";
import { normalizeKenyanPhone, stkPush, stkPushQuery } from "../mpesa/client";

/**
 * Safaricom Daraja (M-Pesa) provider.
 *
 * Flow (see docs/ARCHITECTURE.md §Payment Architecture):
 *   1. initiate() calls Daraja's STK Push endpoint -> status "pending"
 *   2. Daraja calls our /api/payments/mpesa/callback webhook
 *   3. The callback handler verifies + persists the result (never the client)
 *   4. verify() polls Daraja directly, used to reconcile a payment whose
 *      callback never arrived (network blip, Daraja outage, etc.)
 *
 * Credentials (MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY,
 * MPESA_SHORTCODE, MPESA_CALLBACK_URL) live in environment variables only
 * — never in code, never sent to the client.
 */
export class MpesaProvider implements PaymentProvider {
  readonly method = "mpesa" as const;

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    const idempotencyKey = generateReference("MPESA");

    if (!request.customerPhone) {
      return {
        success: false,
        status: "failed",
        providerReference: null,
        idempotencyKey,
        message: "A phone number is required for M-Pesa payments.",
      };
    }

    const phone = normalizeKenyanPhone(request.customerPhone);
    if (!phone) {
      return {
        success: false,
        status: "failed",
        providerReference: null,
        idempotencyKey,
        message: "That doesn't look like a valid Safaricom number.",
      };
    }

    if (request.amount < 1) {
      return {
        success: false,
        status: "failed",
        providerReference: null,
        idempotencyKey,
        message: "M-Pesa requires an amount of at least KES 1.",
      };
    }

    try {
      const response = await stkPush({
        phone,
        amount: request.amount,
        accountReference: request.metadata?.saleNumber as string | undefined ?? request.saleId.slice(0, 12),
        transactionDesc: "Fonsi POS sale",
      });

      if (response.ResponseCode !== "0") {
        return {
          success: false,
          status: "failed",
          providerReference: null,
          idempotencyKey,
          message: response.ResponseDescription || "M-Pesa declined the request.",
          raw: response,
        };
      }

      // The customer now has an STK prompt on their phone. Daraja's
      // CheckoutRequestID is the key we'll look the transaction up by
      // when its callback (or a later verify() poll) reports the result
      // — see src/app/api/payments/mpesa/callback/route.ts.
      return {
        success: true,
        status: "pending",
        providerReference: response.CheckoutRequestID,
        idempotencyKey,
        message: response.CustomerMessage || "Enter your M-Pesa PIN on your phone to complete payment.",
        raw: response,
      };
    } catch (err) {
      console.error("[mpesa_initiate]", err);
      return {
        success: false,
        status: "failed",
        providerReference: null,
        idempotencyKey,
        message: "Could not start the M-Pesa prompt. Please try again.",
      };
    }
  }

  async verify(providerReference: string): Promise<PaymentResult> {
    try {
      const response = await stkPushQuery(providerReference);
      const status = mapResultCodeToStatus(response.ResultCode);

      return {
        success: status === "success",
        status,
        providerReference,
        idempotencyKey: response.MerchantRequestID,
        message: response.ResultDesc,
        raw: response,
      };
    } catch (err) {
      console.error("[mpesa_verify]", err);
      // Daraja returns an error (rather than a result code) while a
      // transaction is still awaiting the customer's PIN entry — that's
      // not a failure, just "not resolved yet".
      return {
        success: false,
        status: "pending",
        providerReference,
        idempotencyKey: providerReference,
        message: "Still waiting for the customer to complete the M-Pesa prompt.",
      };
    }
  }
}

/**
 * Daraja result codes (subset relevant to STK Push): 0 = success,
 * 1032 = cancelled by user, 1037 = timeout (no PIN entered), 1 = general
 * "insufficient funds"/failure. Anything not explicitly success is
 * treated as failed once Daraja has actually returned a result — the
 * "still pending" case is a thrown error, handled in verify() above.
 */
function mapResultCodeToStatus(resultCode: string): PaymentResult["status"] {
  return resultCode === "0" ? "success" : "failed";
}
