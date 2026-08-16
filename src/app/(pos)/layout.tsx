import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

/**
 * The POS route group is deliberately separate from (dashboard) — no
 * sidebar, no topbar, no admin chrome. It's a full-screen, fast, touch-
 * first surface (see docs/DESIGN.md), the opposite job of the back-office
 * dashboard. Auth + permission checks still apply, just without the shell.
 */
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");
  if (!hasPermission(session.role, PERMISSIONS.PROCESS_SALES)) redirect("/dashboard");

  return <div className="pos-theme pos-glow-bg min-h-screen">{children}</div>;
}
