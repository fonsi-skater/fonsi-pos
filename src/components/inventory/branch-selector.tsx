"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

export function BranchSelector({ branches, currentBranchId }: { branches: Branch[]; currentBranchId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  if (branches.length <= 1) return null;

  return (
    <Select value={currentBranchId} onValueChange={(v) => router.push(`${pathname}?branch=${v}`)}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
