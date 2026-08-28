// The embeddable POS surface (see docs/ARCHITECTURE.md's folder structure
// and supabase/migrations/0009_embed_tokens.sql). Meant to be dropped
// into an <iframe src="https://your-app/embed/pos?token=..."> on a
// business's own site. No admin chrome, no dashboard session — a
// long-lived capability token (minted from Settings -> Embed POS) is the
// entire authorization boundary here, verified server-side on every
// request. See src/server/services/embed-auth.ts for what "verified"
// means and src/server/actions/pos.ts's embedToken branch for checkout.
import { resolveEmbedToken } from "@/server/services/embed-auth";
import { searchPosProducts, listPosCustomers } from "@/server/repositories/pos";
import { listBranches } from "@/server/repositories/inventory";
import { PosScreen } from "@/components/pos/pos-screen";

function EmbedError({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center p-6 text-center">
      <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
    </div>
  );
}

export default async function EmbedPosPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <EmbedError message="This embed link is missing its access token. Generate a new one from Settings -> Embed POS." />
    );
  }

  const auth = await resolveEmbedToken(token);
  if (!auth) {
    return (
      <EmbedError message="This embed link is invalid or has been revoked. Generate a new one from Settings -> Embed POS." />
    );
  }

  const branches = await listBranches(auth.businessId);
  const branch = branches.find((b) => b.id === auth.branchId);

  if (!branch) {
    return <EmbedError message="This embed link's branch is no longer active." />;
  }

  const [products, customers] = await Promise.all([
    searchPosProducts(auth.businessId, auth.branchId),
    listPosCustomers(auth.businessId),
  ]);

  return (
    <div className="pos-theme pos-glow-bg min-h-screen">
      <PosScreen
        initialProducts={products}
        customers={customers}
        branchId={auth.branchId}
        branchName={branch.name}
        embedToken={token}
      />
    </div>
  );
}
