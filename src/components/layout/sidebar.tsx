"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { DASHBOARD_NAV } from "@/config/navigation";
import { hasPermission } from "@/lib/permissions";
import type { AppRole } from "@/types";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/actions/auth";

export function Sidebar({ role, email }: { role: AppRole | null; email?: string }) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-6">
        <span className="text-lg font-semibold tracking-tight">Fonsi POS</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {DASHBOARD_NAV.filter(
          (item) => !item.requiredPermission || hasPermission(role, item.requiredPermission)
        ).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-sidebar-border space-y-2 border-t p-3">
        {email && (
          <p className="text-sidebar-foreground/60 truncate px-3 text-xs">{email}</p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
