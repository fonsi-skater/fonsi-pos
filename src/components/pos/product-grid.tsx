"use client";

import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { PosProduct } from "@/server/repositories/pos";

export function ProductGrid({ products }: { products: PosProduct[] }) {
  const addItem = useCartStore((s) => s.addItem);

  if (products.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        No products found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => {
        const outOfStock = p.quantity <= 0;
        return (
          <button
            key={p.id}
            type="button"
            disabled={outOfStock}
            onClick={() =>
              addItem({
                productId: p.id,
                productVariantId: null,
                name: p.name,
                sku: p.sku,
                imageUrl: p.image_url,
                unitPrice: p.selling_price,
                discountRate: p.discount,
                taxRate: p.tax_rate,
                availableStock: p.quantity,
              })
            }
            className="pos-glass flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition-transform active:scale-[0.97] disabled:opacity-40"
          >
            <div className="bg-muted flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase storage domain is env-specific
                <img src={p.image_url} alt="" className="size-full object-cover" />
              ) : (
                <Package className="text-muted-foreground size-8" />
              )}
            </div>
            <div className="w-full">
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-display text-sm font-semibold">{formatCurrency(p.selling_price)}</span>
                <span className={outOfStock ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                  {outOfStock ? "Out of stock" : `${p.quantity} left`}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
