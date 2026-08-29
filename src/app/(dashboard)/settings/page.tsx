import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/services/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { listBranches } from "@/server/repositories/inventory";
import { listEmbedTokens } from "@/server/repositories/embed";
import { EmbedPosManager } from "@/components/settings/embed-pos-manager";

export default async function SettingsPage() {
  const session = await getSessionContext();
  if (!session || !session.businessId) redirect("/login");

  const canManageSettings = hasPermission(session.role, PERMISSIONS.MANAGE_SETTINGS);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight font-display">Settings</h1>
        <p className="text-muted-foreground">
          This module is scaffolded and ready for implementation in its dedicated phase.
        </p>
      </div>

      {canManageSettings && (
        <section className="space-y-2">
          <div>
            <h2 className="text-lg font-medium">Embed POS</h2>
            <p className="text-muted-foreground text-sm">
              Generate a link to embed a branch&apos;s checkout screen in an{" "}
              <code className="bg-muted rounded px-1 py-0.5">&lt;iframe&gt;</code> on your own
              website. No dashboard login required — the link itself authorizes it, so only share
              it somewhere you control.
            </p>
          </div>
          <EmbedPosManagerSection businessId={session.businessId} />
        </section>
      )}
    </div>
  );
}

async function EmbedPosManagerSection({ businessId }: { businessId: string }) {
  const [branches, tokens] = await Promise.all([listBranches(businessId), listEmbedTokens(businessId)]);
  return <EmbedPosManager branches={branches} initialTokens={tokens} />;
}
