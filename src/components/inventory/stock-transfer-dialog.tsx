"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2 } from "lucide-react";
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
import { transferStock, type InventoryActionState } from "@/server/actions/inventory";

interface Branch {
  id: string;
  name: string;
}

export function StockTransferDialog({
  productId,
  productName,
  currentBranchId,
  branches,
}: {
  productId: string;
  productName: string;
  currentBranchId: string;
  branches: Branch[];
}) {
  const [open, setOpen] = useState(false);
  const [toBranchId, setToBranchId] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<InventoryActionState["fieldErrors"]>();
  const [isPending, startTransition] = useTransition();

  const otherBranches = branches.filter((b) => b.id !== currentBranchId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await transferStock({ success: false }, formData);
      if (result.success) {
        toast.success(result.message ?? "Transfer recorded.");
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
        <Button variant="ghost" size="icon" aria-label={`Transfer stock for ${productName}`} disabled={otherBranches.length === 0}>
          <ArrowLeftRight className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer stock — {productName}</DialogTitle>
          <DialogDescription>Moves stock from this branch to another branch.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="fromBranchId" value={currentBranchId} />
          <input type="hidden" name="toBranchId" value={toBranchId} />

          <div className="space-y-2">
            <Label>Destination branch</Label>
            <Select value={toBranchId} onValueChange={setToBranchId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {otherBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors?.toBranchId && (
              <p className="text-destructive text-sm">{fieldErrors.toBranchId[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} required />
            {fieldErrors?.quantity && (
              <p className="text-destructive text-sm">{fieldErrors.quantity[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="e.g. Restocking low branch ahead of weekend" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!toBranchId || isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
