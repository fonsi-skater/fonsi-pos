"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";
import { requirePermission } from "@/server/services/authorize";
import { PERMISSIONS } from "@/lib/permissions";

export interface ProductActionState {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || null,
    categoryId: formData.get("categoryId") || null,
    description: formData.get("description") || null,
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    taxRate: formData.get("taxRate") || 0,
    discount: formData.get("discount") || 0,
    minStockLevel: formData.get("minStockLevel") || 0,
    supplierId: formData.get("supplierId") || null,
    imageUrl: formData.get("imageUrl") || null,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    openingStock: formData.get("openingStock") || 0,
    branchId: formData.get("branchId") || null,
  });
}

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = parseProductForm(formData);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { openingStock, branchId, ...productFields } = parsed.data;
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      business_id: session.businessId!,
      category_id: productFields.categoryId ?? null,
      supplier_id: productFields.supplierId ?? null,
      name: productFields.name,
      sku: productFields.sku,
      barcode: productFields.barcode ?? null,
      description: productFields.description ?? null,
      cost_price: productFields.costPrice,
      selling_price: productFields.sellingPrice,
      tax_rate: productFields.taxRate,
      discount: productFields.discount,
      min_stock_level: productFields.minStockLevel,
      image_url: productFields.imageUrl ?? null,
      is_active: productFields.isActive,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !product) {
    if (error?.code === "23505") {
      return { success: false, message: "A product with that SKU already exists." };
    }
    console.error("[create_product]", error);
    return { success: false, message: "Could not create the product. Please try again." };
  }

  // Record opening stock as an inventory movement, not a raw stock write.
  const targetBranch = branchId ?? session.branchId;
  if (openingStock > 0 && targetBranch) {
    const { error: movementError } = await supabase.from("inventory_movements").insert({
      business_id: session.businessId!,
      branch_id: targetBranch,
      product_id: product.id,
      movement_type: "adjustment",
      quantity_change: openingStock,
      reference_type: "opening_stock",
      notes: "Opening stock at product creation",
      created_by: session.userId,
    });
    if (movementError) {
      console.error("[create_product_opening_stock]", movementError);
      // Product exists but stock wasn't recorded — surface this rather
      // than silently reporting full success.
      revalidatePath("/products");
      return {
        success: true,
        message: "Product created, but opening stock could not be recorded. Adjust it from Inventory.",
      };
    }
  }

  revalidatePath("/products");
  return { success: true, message: "Product created." };
}

export async function updateProduct(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const parsed = parseProductForm(formData);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { ...productFields } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      category_id: productFields.categoryId ?? null,
      supplier_id: productFields.supplierId ?? null,
      name: productFields.name,
      sku: productFields.sku,
      barcode: productFields.barcode ?? null,
      description: productFields.description ?? null,
      cost_price: productFields.costPrice,
      selling_price: productFields.sellingPrice,
      tax_rate: productFields.taxRate,
      discount: productFields.discount,
      min_stock_level: productFields.minStockLevel,
      image_url: productFields.imageUrl ?? null,
      is_active: productFields.isActive,
      updated_by: session.userId,
    })
    .eq("id", productId)
    .eq("business_id", session.businessId!); // defense in depth alongside RLS

  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "A product with that SKU already exists." };
    }
    console.error("[update_product]", error);
    return { success: false, message: "Could not update the product. Please try again." };
  }

  revalidatePath("/products");
  return { success: true, message: "Product updated." };
}

/**
 * Soft delete only (spec §6: never destroy financial/record-of-truth
 * history). Cashiers cannot call this — enforced both here and by RLS.
 */
export async function deleteProduct(productId: string) {
  const session = await requirePermission(PERMISSIONS.DELETE_PRODUCTS);
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false, updated_by: session.userId })
    .eq("id", productId)
    .eq("business_id", session.businessId!);

  if (error) {
    console.error("[delete_product]", error);
    throw new Error("Could not delete the product.");
  }

  revalidatePath("/products");
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  const session = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_by: session.userId })
    .eq("id", productId)
    .eq("business_id", session.businessId!);

  if (error) {
    console.error("[toggle_product_active]", error);
    throw new Error("Could not update the product status.");
  }

  revalidatePath("/products");
}
