import { z } from "zod";

/**
 * A manual stock adjustment. `direction` determines the sign applied to
 * `quantity` before it's written as an inventory_movements row — the UI
 * never lets the user type a negative number directly, which keeps the
 * form intuitive ("add 5" / "remove 5") while the ledger still stores a
 * signed quantity_change.
 */
export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  direction: z.enum(["increase", "decrease"]),
  quantity: z.coerce.number().int().positive("Enter a quantity greater than 0"),
  reason: z.string().trim().min(1, "A reason is required for audit purposes").max(500),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const stockTransferSchema = z
  .object({
    productId: z.string().uuid(),
    fromBranchId: z.string().uuid(),
    toBranchId: z.string().uuid(),
    quantity: z.coerce.number().int().positive("Enter a quantity greater than 0"),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine((data) => data.fromBranchId !== data.toBranchId, {
    message: "Source and destination branches must be different",
    path: ["toBranchId"],
  });

export type StockTransferInput = z.infer<typeof stockTransferSchema>;
