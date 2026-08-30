import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";

/**
 * This whole route group is platform-operator-only (business list across
 * every tenant, platform-wide analytics, subscription/billing data) —
 * strictly more sensitive than anything under (dashboard), which is
 * scoped to one business. It had no auth check at all until this fix:
 * middleware.ts's protected-route list never included these paths, and
 * this layout didn't check anything either, so they were reachable by
 * anyone, logged in or not. See the middleware.ts fix in the same
 * change for why relying on a hand-maintained allowlist there was the
 * root cause — this layout-level check is the authoritative one either
 * way, matching how (dashboard)/layout.tsx guards its own routes.
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Fonsi POS — Platform Admin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
