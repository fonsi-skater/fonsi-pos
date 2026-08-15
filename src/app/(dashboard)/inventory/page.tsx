import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import {
  listInventoryForBranch,
  listBranches,
  getLowStock,
  getOutOfStock,
  getStockValuation,
} from "@/server/repositories/inventory";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { BranchSelector } from "@/components/inventory/branch-selector";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");

  const branches = await listBranches(session.businessId);
  const params = await searchParams;
  const activeBranchId = params.branch ?? session.branchId ?? branches[0]?.id;

  if (!activeBranchId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Add a branch first to start tracking stock.</p>
      </div>
    );
  }

  const rows = await listInventoryForBranch(session.businessId, activeBranchId);
  const lowStock = getLowStock(rows);
  const outOfStock = getOutOfStock(rows);
  const valuation = getStockValuation(rows);

  const canManage = hasPermission(session.role, PERMISSIONS.MANAGE_INVENTORY);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm">Stock levels for the selected branch.</p>
        </div>
        <BranchSelector branches={branches} currentBranchId={activeBranchId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Stock value at cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(valuation)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Low stock items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-warning text-2xl font-semibold">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Out of stock items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-2xl font-semibold">{outOfStock.length}</p>
          </CardContent>
        </Card>
      </div>

      <InventoryTable rows={rows} branchId={activeBranchId} branches={branches} canManage={canManage} />
    </div>
  );
}
