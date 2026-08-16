"use client";

import { Minus, Plus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore, type CartItem } from "@/stores/cart-store";

export function CartLineItem({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const lineDiscount = item.unitPrice * item.quantity * item.discountRate;
  const lineSubtotal = item.unitPrice * item.quantity - lineDiscount;
  const lineTotal = lineSubtotal + lineSubtotal * item.taxRate;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-muted-foreground text-xs">{formatCurrency(item.unitPrice)} each</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => updateQuantity(item.productId, item.productVariantId, item.quantity - 1)}
          className="bg-secondary hover:bg-accent flex size-7 items-center justify-center rounded-full"
          aria-label={`Decrease ${item.name} quantity`}
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
        <button
          type="button"
          onClick={() => updateQuantity(item.productId, item.productVariantId, item.quantity + 1)}
          disabled={item.quantity >= item.availableStock}
          className="bg-secondary hover:bg-accent flex size-7 items-center justify-center rounded-full disabled:opacity-30"
          aria-label={`Increase ${item.name} quantity`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <span className="font-display w-20 text-right text-sm font-semibold">{formatCurrency(lineTotal)}</span>
      <button
        type="button"
        onClick={() => removeItem(item.productId, item.productVariantId)}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${item.name}`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
