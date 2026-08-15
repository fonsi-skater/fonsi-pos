import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import { listProducts, listCategories } from "@/server/repositories/products";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ProductTable } from "@/components/products/product-table";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductSearch } from "@/components/products/product-search";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");

  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const [{ products, total, pageSize }, categories] = await Promise.all([
    listProducts({
      businessId: session.businessId,
      search: params.q,
      categoryId: params.category,
      page,
    }),
    listCategories(session.businessId),
  ]);

  const canManage = hasPermission(session.role, PERMISSIONS.MANAGE_PRODUCTS);
  const canDelete = hasPermission(session.role, PERMISSIONS.DELETE_PRODUCTS);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm">{total} product{total === 1 ? "" : "s"} in your catalog</p>
        </div>
        {canManage && <ProductFormDialog businessId={session.businessId} categories={categories} />}
      </div>

      <ProductSearch />

      <ProductTable
        products={products}
        categories={categories}
        businessId={session.businessId}
        canManage={canManage}
        canDelete={canDelete}
      />

      {totalPages > 1 && (
        <p className="text-muted-foreground text-center text-sm">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
