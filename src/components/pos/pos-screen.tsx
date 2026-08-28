"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { PosSearchBar } from "@/components/pos/pos-search-bar";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { ConnectivityStatus } from "@/components/pos/connectivity-status";
import type { PosProduct } from "@/server/repositories/pos";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

export function PosScreen({
  initialProducts,
  customers,
  branchId,
  branchName,
  embedToken,
}: {
  initialProducts: PosProduct[];
  customers: Customer[];
  branchId: string;
  branchName: string;
  /**
   * Set only when rendered from /embed/pos. Hides the "Dashboard" link
   * (there's no admin session to return to on an embedded, iframed
   * surface) and gets forwarded down to checkout so the server can
   * resolve the sale against the embed token instead of a cookie session.
   */
  embedToken?: string;
}) {
  const [filtered, setFiltered] = useState(initialProducts);

  return (
    <div className="flex h-screen flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold">Fonsi POS</p>
          <p className="text-muted-foreground text-xs">{branchName}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectivityStatus />
          {!embedToken && (
            <Link
              href="/dashboard"
              className="pos-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              <LayoutDashboard className="size-3.5" />
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3 overflow-hidden">
          <PosSearchBar allProducts={initialProducts} onFilteredChange={setFiltered} />
          <div className="flex-1 overflow-y-auto">
            <ProductGrid products={filtered} />
          </div>
        </div>
        <div className="overflow-hidden">
          <CartPanel branchId={branchId} customers={customers} embedToken={embedToken} />
        </div>
      </div>
    </div>
  );
}
