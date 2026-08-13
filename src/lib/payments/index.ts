import type { PaymentMethod } from "@/types";
import type { PaymentProvider } from "./types";
import { CashProvider } from "./providers/cash";
import { MpesaProvider } from "./providers/mpesa";

/**
 * Central payment dispatcher (per spec §11: PaymentService -> providers).
 * Add new methods by implementing PaymentProvider and registering it here —
 * nowhere else in the app should branch on payment method directly.
 */
const providers: Partial<Record<PaymentMethod, PaymentProvider>> = {
  cash: new CashProvider(),
  mpesa: new MpesaProvider(),
  // card, bank, credit providers register here as they're implemented.
};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const provider = providers[method];
  if (!provider) {
    throw new Error(`No payment provider registered for method: ${method}`);
  }
  return provider;
}
