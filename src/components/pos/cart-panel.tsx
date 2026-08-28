"use client";

import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { CartLineItem } from "@/components/pos/cart-line-item";
import { CustomerSelect } from "@/components/pos/customer-select";
import { PaymentMethodSelector } from "@/components/pos/payment-method-selector";
import { CheckoutButton } from "@/components/pos/checkout-button";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export function CartPanel({
  branchId,
  customers,
  embedToken,
}: {
  branchId: string;
  customers: Customer[];
  embedToken?: string;
}) {
  const items = useCartStore((s) => s.items);
  const getEstimatedTotal = useCartStore((s) => s.getEstimatedTotal);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity * (1 - i.discountRate), 0);
  const tax = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity * (1 - i.discountRate) * i.taxRate,
    0
  );
  const total = getEstimatedTotal();

  return (
    <div className="pos-glass flex h-full flex-col rounded-2xl p-4">
      <CustomerSelect customers={customers} />

      <div className="mt-3 flex-1 divide-y divide-white/10 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 py-12">
            <ShoppingCart className="size-8" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <CartLineItem key={`${item.productId}:${item.productVariantId ?? "base"}`} item={item} />
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-white/10 pt-3 text-sm">
          <div className="text-muted-foreground flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="text-muted-foreground flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="font-display mt-1 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        <PaymentMethodSelector />
        <CheckoutButton branchId={branchId} embedToken={embedToken} />
      </div>
    </div>
  );
}
