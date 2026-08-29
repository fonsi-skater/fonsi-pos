import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AppRole } from "@/types";

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  business_owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
};

export function Topbar({ role }: { role: AppRole | null }) {
  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-4 border-b px-4">
      <div className="relative max-w-sm flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input placeholder="Search..." className="pl-8" />
      </div>
      {role && (
        <span className="bg-secondary text-secondary-foreground ml-auto rounded-full px-3 py-1 text-xs font-medium">
          {ROLE_LABELS[role]}
        </span>
      )}
    </header>
  );
}
