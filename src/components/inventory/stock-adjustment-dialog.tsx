"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustStock, type InventoryActionState } from "@/server/actions/inventory";

export function StockAdjustmentDialog({
  productId,
  productName,
  branchId,
}: {
  productId: string;
  productName: string;
  branchId: string;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [fieldErrors, setFieldErrors] = useState<InventoryActionState["fieldErrors"]>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await adjustStock({ success: false }, formData);
      if (result.success) {
        toast.success(result.message ?? "Stock updated.");
        setFieldErrors(undefined);
        setOpen(false);
      } else {
        setFieldErrors(result.fieldErrors);
        if (result.message) toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Adjust stock for ${productName}`}>
          <SlidersHorizontal className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
          <DialogDescription>
            Every adjustment is recorded with a reason for the audit trail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="direction" value={direction} />

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "increase" | "decrease")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase stock</SelectItem>
                <SelectItem value="decrease">Decrease stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} required />
            {fieldErrors?.quantity && (
              <p className="text-destructive text-sm">{fieldErrors.quantity[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" name="reason" placeholder="e.g. Damaged stock, stock count correction" required />
            {fieldErrors?.reason && (
              <p className="text-destructive text-sm">{fieldErrors.reason[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Record adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
