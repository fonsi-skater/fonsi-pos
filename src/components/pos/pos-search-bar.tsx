"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BarcodeScannerDialog } from "@/components/products/barcode-scanner-dialog";
import { useCartStore } from "@/stores/cart-store";
import type { PosProduct } from "@/server/repositories/pos";

export function PosSearchBar({
  allProducts,
  onFilteredChange,
}: {
  allProducts: PosProduct[];
  onFilteredChange: (filtered: PosProduct[]) => void;
}) {
  const [query, setQuery] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  function handleQueryChange(value: string) {
    setQuery(value);
    const q = value.trim().toLowerCase();
    if (!q) {
      onFilteredChange(allProducts);
      return;
    }
    onFilteredChange(
      allProducts.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode === value.trim()
      )
    );
  }

  function handleScan(barcode: string) {
    const product = allProducts.find((p) => p.barcode === barcode);
    if (product && product.quantity > 0) {
      addItem({
        productId: product.id,
        productVariantId: null,
        name: product.name,
        sku: product.sku,
        imageUrl: product.image_url,
        unitPrice: product.selling_price,
        discountRate: product.discount,
        taxRate: product.tax_rate,
        availableStock: product.quantity,
      });
      setQuery("");
      onFilteredChange(allProducts);
    } else {
      handleQueryChange(barcode);
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search products or scan a barcode..."
          className="pos-glass h-11 rounded-full border-none pl-10"
        />
      </div>
      <BarcodeScannerDialog onScan={handleScan} />
    </div>
  );
}
