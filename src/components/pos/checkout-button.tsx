"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Receipt, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { checkoutSale } from "@/server/actions/pos";
import { getPaymentStatus } from "@/server/actions/payments";

const MPESA_POLL_INTERVAL_MS = 3000;
const MPESA_POLL_MAX_ATTEMPTS = 20; // ~60s — STK prompts typically resolve well within this

export function CheckoutButton({ branchId, embedToken }: { branchId: string; embedToken?: string }) {
  const items = useCartStore((s) => s.items);
  const customerId = useCartStore((s) => s.customerId);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const getEstimatedTotal = useCartStore((s) => s.getEstimatedTotal);
  const clear = useCartStore((s) => s.clear);
  const [isPending, startTransition] = useTransition();
  const [isAwaitingMpesa, setIsAwaitingMpesa] = useState(false);
  const [lastSale, setLastSale] = useState<{ saleId: string; saleNumber: string; total: number } | null>(null);

  const total = getEstimatedTotal();
  const disabled = items.length === 0 || isPending || isAwaitingMpesa;

  async function pollMpesaStatus(saleId: string, toastId: string | number) {
    for (let attempt = 0; attempt < MPESA_POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, MPESA_POLL_INTERVAL_MS));
      const { status } = await getPaymentStatus(saleId, embedToken);

      if (status === "success") {
        toast.success("M-Pesa payment confirmed.", { id: toastId });
        setIsAwaitingMpesa(false);
        return;
      }
      if (status === "failed") {
        toast.error("M-Pesa payment failed or was cancelled by the customer.", { id: toastId });
        setIsAwaitingMpesa(false);
        return;
      }
      // "pending" or "unknown" — keep polling.
    }

    toast.message("Still waiting on M-Pesa — check the Sales page shortly for the final result.", {
      id: toastId,
    });
    setIsAwaitingMpesa(false);
  }

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
        setLastSale({ saleId: result.saleId!, saleNumber: result.saleNumber!, total: result.total! });
        clear();

        if (paymentMethod === "mpesa" && result.paymentStatus === "pending") {
          setIsAwaitingMpesa(true);
          const toastId = toast.loading(result.message ?? "Waiting for the customer to enter their M-Pesa PIN...");
          void pollMpesaStatus(result.saleId!, toastId);
        } else {
          toast.success(result.message ?? "Sale completed.");
        }
      } else {
        toast.error(result.message ?? "Checkout failed. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {lastSale && (
        <div className="flex items-center justify-center gap-2 text-center text-xs">
          <span className="text-success">
            Last sale {lastSale.saleNumber} — {formatCurrency(lastSale.total)}
          </span>
          <a
            href={`/api/receipts/${lastSale.saleId}${embedToken ? `?token=${embedToken}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 underline underline-offset-2"
          >
            <Receipt className="size-3" />
            Receipt
          </a>
        </div>
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
          {isPending || isAwaitingMpesa ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
          <span className="font-display">
            {isAwaitingMpesa ? "Awaiting M-Pesa..." : isPending ? "Processing..." : `Charge ${formatCurrency(total)}`}
          </span>
        </button>
      </div>
    </div>
  );
}
