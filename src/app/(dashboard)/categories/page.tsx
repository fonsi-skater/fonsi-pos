import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import { listCategories } from "@/server/repositories/products";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { CategoryManager } from "@/components/products/category-manager";

export default async function CategoriesPage() {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");

  const categories = await listCategories(session.businessId);
  const canManage = hasPermission(session.role, PERMISSIONS.MANAGE_PRODUCTS);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm">Organize your product catalog.</p>
      </div>
      <CategoryManager categories={categories} canManage={canManage} />
    </div>
  );
}
