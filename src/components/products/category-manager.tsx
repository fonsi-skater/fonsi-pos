"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCategory, deleteCategory, type CategoryActionState } from "@/server/actions/categories";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

const initialState: CategoryActionState = { success: false };

export function CategoryManager({ categories, canManage }: { categories: Category[]; canManage: boolean }) {
  const [state, formAction] = useActionState(createCategory, initialState);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state.success) toast.success(state.message ?? "Category created.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      try {
        await deleteCategory(id);
        toast.success("Category deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete category.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
              <DialogDescription>Categories help organize products in the POS and reports.</DialogDescription>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Beverages" required />
                {state.fieldErrors?.name && (
                  <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {categories.length === 0 ? (
        <div className="text-muted-foreground rounded-md border py-12 text-center text-sm">
          No categories yet.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => handleDelete(c.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="text-destructive size-4" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
