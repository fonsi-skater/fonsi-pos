"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/product";
import { requirePermission } from "@/server/services/authorize";
import { PERMISSIONS } from "@/lib/permissions";

export interface CategoryActionState {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const session = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    parentId: formData.get("parentId") || null,
    isActive: true,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    business_id: session.businessId!,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    parent_id: parsed.data.parentId ?? null,
    created_by: session.userId,
  });

  if (error) {
    console.error("[create_category]", error);
    return { success: false, message: "Could not create the category." };
  }

  revalidatePath("/categories");
  revalidatePath("/products");
  return { success: true, message: "Category created." };
}

export async function deleteCategory(categoryId: string) {
  const session = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", categoryId)
    .eq("business_id", session.businessId!);

  if (error) {
    console.error("[delete_category]", error);
    throw new Error("Could not delete the category.");
  }

  revalidatePath("/categories");
  revalidatePath("/products");
}
