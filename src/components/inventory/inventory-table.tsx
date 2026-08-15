import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { StockAdjustmentDialog } from "@/components/inventory/stock-adjustment-dialog";
import { StockTransferDialog } from "@/components/inventory/stock-transfer-dialog";
import { MovementHistoryDialog } from "@/components/inventory/movement-history-dialog";
import type { InventoryRow } from "@/server/repositories/inventory";

interface Branch {
  id: string;
  name: string;
}

function stockStatus(row: InventoryRow): { label: string; variant: "destructive" | "warning" | "success" } {
  if (row.quantity <= 0) return { label: "Out of stock", variant: "destructive" };
  if (row.quantity <= row.min_stock_level) return { label: "Low stock", variant: "warning" };
  return { label: "In stock", variant: "success" };
}

export function InventoryTable({
  rows,
  branchId,
  branches,
  canManage,
}: {
  rows: InventoryRow[];
  branchId: string;
  branches: Branch[];
  canManage: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border py-12 text-center text-sm">
        No products in this branch yet. Add products first, then manage their stock here.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>On hand</TableHead>
            <TableHead>Min level</TableHead>
            <TableHead>Value at cost</TableHead>
            <TableHead>Status</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const status = stockStatus(row);
            return (
              <TableRow key={row.product_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{row.product_name}</p>
                    <p className="text-muted-foreground text-xs">{row.sku}</p>
                  </div>
                </TableCell>
                <TableCell>{row.category_name ?? "—"}</TableCell>
                <TableCell className="font-medium">{row.quantity}</TableCell>
                <TableCell className="text-muted-foreground">{row.min_stock_level}</TableCell>
                <TableCell>{formatCurrency(row.quantity * row.cost_price)}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <StockAdjustmentDialog
                        productId={row.product_id}
                        productName={row.product_name}
                        branchId={branchId}
                      />
                      <StockTransferDialog
                        productId={row.product_id}
                        productName={row.product_name}
                        currentBranchId={branchId}
                        branches={branches}
                      />
                      <MovementHistoryDialog productId={row.product_id} productName={row.product_name} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
