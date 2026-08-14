import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getSessionContext } from "@/server/services/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();

  // src/proxy.ts already redirects unauthenticated users away from
  // /dashboard, but this is the authoritative server-side check.
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      <Sidebar role={session.role} email={session.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
