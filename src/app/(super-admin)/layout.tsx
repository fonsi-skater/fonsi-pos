// TODO (Phase 2+): guard this entire route group so only users with the
// super_admin role can reach it (see src/lib/permissions).
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Fonsi POS — Platform Admin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
