import { NextResponse } from "next/server";
import {
  findPaymentTransactionByProviderReference,
  recordPaymentResult,
} from "@/server/repositories/payments";

/**
 * Safaricom Daraja calls this after the customer responds to (or ignores)
 * an STK Push prompt — see MPESA_CALLBACK_URL and MpesaProvider.initiate()
 * in src/lib/payments/providers/mpesa.ts. This is the ONLY place an
 * M-Pesa payment is ever marked "success": the client polling
 * src/server/actions/payments.ts just reads whatever this route wrote.
 *
 * Daraja doesn't authenticate its callback requests (no shared secret,
 * no signature), and it will retry a callback it doesn't get a 200 for.
 * So this route always responds 200 with a Daraja-shaped ack, and rejects
 * anything it can't identify by the CheckoutRequestID alone — that ID is
 * long, Daraja-generated, and only ever handed to Daraja by our own
 * stkPush() call, so it functions as a de facto bearer token.
 */

interface DarajaCallbackItem {
  Name: string;
  Value?: string | number;
}

interface DarajaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: { Item: DarajaCallbackItem[] };
    };
  };
}

const ACK = { ResultCode: 0, ResultDesc: "Confirmation received successfully" };

export async function POST(request: Request) {
  let body: DarajaCallbackBody;

  try {
    body = await request.json();
  } catch {
    console.error("[mpesa_callback] unparseable body");
    return NextResponse.json(ACK);
  }

  const callback = body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) {
    console.error("[mpesa_callback] missing stkCallback/CheckoutRequestID", body);
    return NextResponse.json(ACK);
  }

  const transaction = await findPaymentTransactionByProviderReference(callback.CheckoutRequestID);
  if (!transaction) {
    // Nothing to reconcile against (unknown/replayed CheckoutRequestID).
    // Still ack — there's no useful retry outcome for Daraja to get here.
    console.error("[mpesa_callback] no matching payment_transactions row", callback.CheckoutRequestID);
    return NextResponse.json(ACK);
  }

  await recordPaymentResult({
    paymentTransactionId: transaction.id,
    paymentId: transaction.payment_id,
    status: callback.ResultCode === 0 ? "success" : "failed",
    rawResponse: body,
  });

  return NextResponse.json(ACK);
}
