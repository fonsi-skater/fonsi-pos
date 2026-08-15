"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { stockAdjustmentSchema, stockTransferSchema } from "@/lib/validations/inventory";
import { requirePermission } from "@/server/services/authorize";
import { PERMISSIONS } from "@/lib/permissions";

export interface InventoryActionState {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function adjustStock(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const session = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

  const parsed = stockAdjustmentSchema.safeParse({
    productId: formData.get("productId"),
    branchId: formData.get("branchId"),
    direction: formData.get("direction"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { productId, branchId, direction, quantity, reason } = parsed.data;
  const signedQuantity = direction === "increase" ? quantity : -quantity;

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    business_id: session.businessId!,
    branch_id: branchId,
    product_id: productId,
    movement_type: "adjustment",
    quantity_change: signedQuantity,
    reference_type: "manual_adjustment",
    notes: reason,
    created_by: session.userId,
  });

  if (error) {
    console.error("[adjust_stock]", error);
    return { success: false, message: "Could not record the stock adjustment." };
  }

  revalidatePath("/inventory");
  return { success: true, message: "Stock adjustment recorded." };
}

export async function transferStock(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  const session = await requirePermission(PERMISSIONS.MANAGE_INVENTORY);

  const parsed = stockTransferSchema.safeParse({
    productId: formData.get("productId"),
    fromBranchId: formData.get("fromBranchId"),
    toBranchId: formData.get("toBranchId"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes") || null,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { productId, fromBranchId, toBranchId, quantity, notes } = parsed.data;
  const supabase = await createClient();

  // A transfer is two linked movements: stock out of the source branch,
  // stock into the destination — both recorded, never a single silent
  // reassignment. If either insert fails we report a partial-failure
  // message rather than claiming full success.
  const transferId = crypto.randomUUID();

  const { error: outError } = await supabase.from("inventory_movements").insert({
    business_id: session.businessId!,
    branch_id: fromBranchId,
    product_id: productId,
    movement_type: "transfer_out",
    quantity_change: -quantity,
    reference_type: "stock_transfer",
    reference_id: transferId,
    notes,
    created_by: session.userId,
  });

  if (outError) {
    console.error("[transfer_stock_out]", outError);
    return { success: false, message: "Could not record the transfer." };
  }

  const { error: inError } = await supabase.from("inventory_movements").insert({
    business_id: session.businessId!,
    branch_id: toBranchId,
    product_id: productId,
    movement_type: "transfer_in",
    quantity_change: quantity,
    reference_type: "stock_transfer",
    reference_id: transferId,
    notes,
    created_by: session.userId,
  });

  if (inError) {
    console.error("[transfer_stock_in]", inError);
    return {
      success: false,
      message:
        "Stock was removed from the source branch, but the transfer to the destination failed. Please check Inventory History and correct it manually.",
    };
  }

  revalidatePath("/inventory");
  return { success: true, message: "Stock transferred." };
}
