"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/services/authorize";
import { PERMISSIONS } from "@/lib/permissions";
import { createEmbedTokenSchema, type CreateEmbedTokenInput } from "@/lib/validations/embed";
import { generateEmbedToken, hashEmbedToken } from "@/lib/embed/token";
import { insertEmbedToken, revokeEmbedToken as revokeEmbedTokenRow } from "@/server/repositories/embed";
import { listBranches } from "@/server/repositories/inventory";

export interface CreateEmbedTokenResult {
  success: boolean;
  message?: string;
  /** The raw token + ready-to-use embed URL. Shown once — never re-derivable, since only the hash is stored. */
  rawToken?: string;
  embedUrl?: string;
}

/**
 * Mints a new embed POS link for one branch. Gated on MANAGE_SETTINGS
 * (owner-level, same bar as CONFIGURE_PAYMENTS) since a leaked embed
 * link lets anyone ring up sales against that branch's inventory.
 */
export async function createEmbedToken(input: CreateEmbedTokenInput): Promise<CreateEmbedTokenResult> {
  const session = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const parsed = createEmbedTokenSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  // Defense in depth: confirm the branch actually belongs to this
  // business before scoping a token to it (RLS would also catch this on
  // insert, but failing early gives a clearer error).
  const branches = await listBranches(session.businessId!);
  if (!branches.some((b) => b.id === parsed.data.branchId)) {
    return { success: false, message: "That branch wasn't found." };
  }

  const rawToken = generateEmbedToken();
  await insertEmbedToken({
    businessId: session.businessId!,
    branchId: parsed.data.branchId,
    tokenHash: hashEmbedToken(rawToken),
    label: parsed.data.label ?? null,
    createdBy: session.userId,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath("/settings");

  return {
    success: true,
    rawToken,
    embedUrl: `${appUrl}/embed/pos?token=${rawToken}`,
  };
}

export async function revokeEmbedToken(id: string): Promise<{ success: boolean; message?: string }> {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);

  try {
    await revokeEmbedTokenRow(id);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }

  revalidatePath("/settings");
  return { success: true };
}
