import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  productVariantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
});

export const checkoutSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  paymentMethod: z.enum(["cash", "mpesa", "card", "bank", "credit", "other"]),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
  /** A manual discount applied at checkout, gated server-side by APPROVE_DISCOUNTS. */
  manualDiscount: z.coerce.number().min(0).default(0),
  /** Required when paymentMethod is "mpesa" — the phone to STK-push. */
  customerPhone: z.string().trim().max(20).optional().nullable(),
  /**
   * Present only for checkouts from the embeddable POS (no dashboard
   * session — see src/app/embed/pos/page.tsx). When set, the server
   * resolves business/branch/cashier from the token itself and ignores
   * `branchId` above rather than trusting it from an unauthenticated
   * request.
   */
  embedToken: z.string().optional().nullable(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
