"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { checkoutSale } from "@/server/actions/pos";

export function CheckoutButton({ branchId, embedToken }: { branchId: string; embedToken?: string }) {
  const items = useCartStore((s) => s.items);
  const customerId = useCartStore((s) => s.customerId);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const getEstimatedTotal = useCartStore((s) => s.getEstimatedTotal);
  const clear = useCartStore((s) => s.clear);
  const [isPending, startTransition] = useTransition();
  const [lastSale, setLastSale] = useState<{ saleNumber: string; total: number } | null>(null);

  const total = getEstimatedTotal();
  const disabled = items.length === 0 || isPending;

  function handleCheckout() {
    startTransition(async () => {
      const result = await checkoutSale({
        branchId,
        customerId,
        paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          productVariantId: i.productVariantId,
          quantity: i.quantity,
        })),
        manualDiscount: 0,
        embedToken,
      });

      if (result.success) {
        toast.success(result.message ?? "Sale completed.");
        setLastSale({ saleNumber: result.saleNumber!, total: result.total! });
        clear();
      } else {
        toast.error(result.message ?? "Checkout failed. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {lastSale && (
        <p className="text-success text-center text-xs">
          Last sale {lastSale.saleNumber} — {formatCurrency(lastSale.total)}
        </p>
      )}
      <div className="relative">
        {items.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-70 blur-xl"
            style={{ background: "var(--pos-glow-violet)" }}
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={disabled}
          className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold shadow-lg transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {isPending ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
          <span className="font-display">
            {isPending ? "Processing..." : `Charge ${formatCurrency(total)}`}
          </span>
        </button>
      </div>
    </div>
  );
}
