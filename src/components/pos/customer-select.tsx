"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCartStore } from "@/stores/cart-store";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export function CustomerSelect({ customers }: { customers: Customer[] }) {
  const customerId = useCartStore((s) => s.customerId);
  const setCustomer = useCartStore((s) => s.setCustomer);

  return (
    <Select
      value={customerId ?? "none"}
      onValueChange={(v) => setCustomer(v === "none" ? null : v)}
    >
      <SelectTrigger className="pos-glass w-full rounded-full border-none">
        <SelectValue placeholder="Walk-in customer" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Walk-in customer</SelectItem>
        {customers.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}{c.phone ? ` — ${c.phone}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
