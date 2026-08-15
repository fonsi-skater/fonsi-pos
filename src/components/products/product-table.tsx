"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { DeleteProductButton } from "@/components/products/delete-product-button";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  categories: { name: string } | null;
};

interface Category {
  id: string;
  name: string;
}

export function ProductTable({
  products,
  categories,
  businessId,
  canManage,
  canDelete,
}: {
  products: ProductRow[];
  categories: Category[];
  businessId: string;
  canManage: boolean;
  canDelete: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Product <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-xs">{row.original.sku}</p>
          </div>
        ),
      },
      {
        accessorKey: "categories.name",
        header: "Category",
        cell: ({ row }) => row.original.categories?.name ?? "—",
      },
      {
        accessorKey: "selling_price",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Price <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.selling_price),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "secondary"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canManage && (
              <ProductFormDialog
                businessId={businessId}
                categories={categories}
                product={{
                  id: row.original.id,
                  name: row.original.name,
                  sku: row.original.sku,
                  barcode: row.original.barcode,
                  categoryId: row.original.category_id,
                  description: row.original.description,
                  costPrice: row.original.cost_price,
                  sellingPrice: row.original.selling_price,
                  taxRate: row.original.tax_rate,
                  discount: row.original.discount,
                  minStockLevel: row.original.min_stock_level,
                  supplierId: row.original.supplier_id,
                  imageUrl: row.original.image_url,
                  isActive: row.original.is_active,
                  openingStock: 0,
                  branchId: null,
                }}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`Edit ${row.original.name}`}>
                    <Pencil className="size-4" />
                  </Button>
                }
              />
            )}
            {canDelete && (
              <DeleteProductButton productId={row.original.id} productName={row.original.name} />
            )}
          </div>
        ),
      },
    ],
    [businessId, categories, canManage, canDelete]
  );

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border py-12 text-center text-sm">
        No products yet. Add your first product to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
