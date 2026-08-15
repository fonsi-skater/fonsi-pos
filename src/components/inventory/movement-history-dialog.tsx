"use client";

import { useState } from "react";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

interface Movement {
  id: string;
  movement_type: string;
  quantity_change: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  branches: { name: string } | { name: string }[] | null;
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Purchase",
  sale: "Sale",
  adjustment: "Adjustment",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  return: "Return",
};

export function MovementHistoryDialog({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [movements, setMovements] = useState<Movement[] | null>(null);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && movements === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/inventory/movements?productId=${productId}`);
        const json = await res.json();
        setMovements(json.data ?? []);
      } catch {
        setMovements([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Stock history for ${productName}`}>
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock history — {productName}</DialogTitle>
          <DialogDescription>Most recent movements first.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : !movements || movements.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">No stock movements recorded yet.</p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {movements.map((m) => {
              const branchName = Array.isArray(m.branches) ? m.branches[0]?.name : m.branches?.name;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}</Badge>
                      {branchName && <span className="text-muted-foreground text-xs">{branchName}</span>}
                    </div>
                    {m.notes && <p className="text-muted-foreground mt-1 text-xs">{m.notes}</p>}
                    <p className="text-muted-foreground text-xs">{formatDate(m.created_at, true)}</p>
                  </div>
                  <span className={m.quantity_change >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                    {m.quantity_change >= 0 ? "+" : ""}{m.quantity_change}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
