import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import { searchPosProducts, listPosCustomers } from "@/server/repositories/pos";
import { listBranches } from "@/server/repositories/inventory";
import { PosScreen } from "@/components/pos/pos-screen";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");

  const branches = await listBranches(session.businessId);
  const params = await searchParams;
  const branchId = params.branch ?? session.branchId ?? branches[0]?.id;

  if (!branchId) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">
          No branch is set up yet. Add a branch from the dashboard before opening the POS.
        </p>
      </div>
    );
  }

  const branch = branches.find((b) => b.id === branchId);

  const [products, customers] = await Promise.all([
    searchPosProducts(session.businessId, branchId),
    listPosCustomers(session.businessId),
  ]);

  return (
    <PosScreen
      initialProducts={products}
      customers={customers}
      branchId={branchId}
      branchName={branch?.name ?? "Branch"}
    />
  );
}
