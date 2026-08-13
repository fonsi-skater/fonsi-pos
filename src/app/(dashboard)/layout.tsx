import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// TODO (Phase 2): replace with the real session role from Supabase Auth
// (see src/types SessionContext) instead of a hardcoded placeholder.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const role = "business_owner" as const;

  return (
    <div className="flex h-screen">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
