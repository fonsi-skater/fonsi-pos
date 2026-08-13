import { z } from "zod";

/**
 * Product validation schema. This is the single source of truth for
 * product shape validation — used by both the client form (React Hook
 * Form + zodResolver) and the server (API routes / Server Actions) so
 * validation never lives in only one place.
 */
export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  sku: z.string().trim().min(1, "SKU is required").max(64),
  barcode: z.string().trim().max(64).optional().nullable(),
  categoryId: z.string().uuid("Select a category").optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  costPrice: z.coerce.number().nonnegative("Cost price cannot be negative"),
  sellingPrice: z.coerce.number().positive("Selling price must be greater than 0"),
  taxRate: z.coerce.number().min(0).max(1).default(0),
  discount: z.coerce.number().min(0).max(1).default(0),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  minStockLevel: z.coerce.number().int().nonnegative().default(0),
  supplierId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
