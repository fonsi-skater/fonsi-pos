"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { BarcodeScannerDialog } from "@/components/products/barcode-scanner-dialog";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { useProductImageUpload } from "@/hooks/use-product-image-upload";
import { createProduct, updateProduct, type ProductActionState } from "@/server/actions/products";

interface Category {
  id: string;
  name: string;
}

interface ProductFormDialogProps {
  businessId: string;
  categories: Category[];
  /** Pass an existing product to edit; omit to create a new one. */
  product?: ProductInput & { id: string };
  trigger?: React.ReactNode;
}

const emptyDefaults: ProductInput = {
  name: "",
  sku: "",
  barcode: null,
  categoryId: null,
  description: null,
  costPrice: 0,
  sellingPrice: 0,
  taxRate: 0,
  discount: 0,
  minStockLevel: 0,
  supplierId: null,
  imageUrl: null,
  isActive: true,
  openingStock: 0,
  branchId: null,
};

const initialActionState: ProductActionState = { success: false };

export function ProductFormDialog({ businessId, categories, product, trigger }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(product);

  const boundAction = isEditing
    ? updateProduct.bind(null, product!.id)
    : createProduct;
  const [state, formAction] = useActionState(boundAction, initialActionState);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? emptyDefaults,
  });

  const { upload, isUploading } = useProductImageUpload({ businessId });
  const imageUrl = watch("imageUrl");
  const barcode = watch("barcode");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      reset(emptyDefaults);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, reset]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) setValue("imageUrl", url);
  }

  function onSubmit(data: z.input<typeof productSchema>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      formData.set(key, String(value));
    });
    startTransition(() => formAction(formData));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Add product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this product's details." : "Add a new product to your catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase storage domain is env-specific, not known at build time
                <img src={imageUrl} alt="" width={80} height={80} className="size-full object-cover" />
              ) : (
                <ImagePlus className="text-muted-foreground size-6" />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="image" className="sr-only">Product image</Label>
              <Input id="image" type="file" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
              <p className="text-muted-foreground text-xs">JPG or PNG, up to 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" {...register("name")} placeholder="Maize Flour 2kg" />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="FOOD-001" />
              {errors.sku && <p className="text-destructive text-sm">{errors.sku.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input id="barcode" {...register("barcode")} placeholder="Scan or type" />
                <BarcodeScannerDialog onScan={(code) => setValue("barcode", code)} />
              </div>
              {barcode && <p className="text-muted-foreground text-xs">Current: {barcode}</p>}
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                defaultValue={product?.categoryId ?? undefined}
                onValueChange={(v) => setValue("categoryId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost price (KES)</Label>
              <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} />
              {errors.costPrice && <p className="text-destructive text-sm">{errors.costPrice.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price (KES)</Label>
              <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} />
              {errors.sellingPrice && <p className="text-destructive text-sm">{errors.sellingPrice.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax rate (0–1)</Label>
              <Input id="taxRate" type="number" step="0.01" min={0} max={1} {...register("taxRate")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Minimum stock level</Label>
              <Input id="minStockLevel" type="number" {...register("minStockLevel")} />
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="openingStock">Opening stock</Label>
                <Input id="openingStock" type="number" {...register("openingStock")} />
              </div>
            )}

            <div className="col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-muted-foreground text-xs">Inactive products are hidden from the POS.</p>
              </div>
              <Switch
                id="isActive"
                defaultChecked={product?.isActive ?? true}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
