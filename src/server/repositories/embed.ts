import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EmbedTokenSummary {
  id: string;
  branchId: string;
  branchName: string;
  label: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface EmbedTokenListRow {
  id: string;
  branch_id: string;
  label: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  branches: { name: string } | { name: string }[] | null;
}

/** Lists a business's embed tokens for the settings UI. Never returns the raw secret or its hash. */
export async function listEmbedTokens(businessId: string): Promise<EmbedTokenSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("embed_tokens")
    .select("id, branch_id, label, is_active, last_used_at, created_at, branches(name)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[list_embed_tokens]", error);
    return [];
  }

  return ((data ?? []) as unknown as EmbedTokenListRow[]).map((row) => {
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    return {
      id: row.id,
      branchId: row.branch_id,
      branchName: branch?.name ?? "Unknown branch",
      label: row.label,
      isActive: row.is_active,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
    };
  });
}

/** Inserts a new embed token row (only the hash — the raw value is never persisted). */
export async function insertEmbedToken(params: {
  businessId: string;
  branchId: string;
  tokenHash: string;
  label: string | null;
  createdBy: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("embed_tokens").insert({
    business_id: params.businessId,
    branch_id: params.branchId,
    token_hash: params.tokenHash,
    label: params.label,
    created_by: params.createdBy,
  });

  if (error) {
    console.error("[insert_embed_token]", error);
    throw new Error("Could not create the embed link. Please try again.");
  }
}

/** Deactivates an embed token (RLS scopes this to the caller's own business, owner/manager only). */
export async function revokeEmbedToken(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("embed_tokens").update({ is_active: false }).eq("id", id);

  if (error) {
    console.error("[revoke_embed_token]", error);
    throw new Error("Could not revoke that embed link. Please try again.");
  }
}

export interface EmbedTokenAuth {
  businessId: string;
  branchId: string;
  cashierId: string;
}

/**
 * Resolves a presented raw token's hash to its business/branch scope.
 * Uses the admin client deliberately: the embed page has no authenticated
 * session to check RLS against, so this is the pre-auth verification step
 * itself (same category as M-Pesa callback verification in admin.ts).
 * Returns null for anything not active, so a revoked/typo'd token fails
 * closed with no distinction visible to the caller.
 */
export async function findActiveEmbedTokenByHash(tokenHash: string): Promise<EmbedTokenAuth | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("embed_tokens")
    .select("business_id, branch_id, created_by, is_active")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data || !data.created_by) {
    return null;
  }

  return { businessId: data.business_id, branchId: data.branch_id, cashierId: data.created_by };
}

/** Best-effort last-used timestamp update — never blocks or fails the embed request. */
export async function touchEmbedTokenUsage(tokenHash: string) {
  try {
    const admin = createAdminClient();
    await admin.from("embed_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", tokenHash);
  } catch (err) {
    console.error("[touch_embed_token_usage]", err);
  }
}
