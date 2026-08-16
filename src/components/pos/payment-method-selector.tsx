"use client";

import { Banknote, Smartphone, CreditCard, Landmark, HandCoins, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { PaymentMethod } from "@/types";

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "mpesa", label: "M-Pesa", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "credit", label: "Credit", icon: HandCoins },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export function PaymentMethodSelector() {
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);

  return (
    <div className="flex flex-wrap gap-2">
      {METHODS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPaymentMethod(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            paymentMethod === value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
