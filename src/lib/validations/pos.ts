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
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
