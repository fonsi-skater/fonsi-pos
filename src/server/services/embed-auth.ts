import "server-only";
import { hashEmbedToken, looksLikeEmbedToken } from "@/lib/embed/token";
import { findActiveEmbedTokenByHash, touchEmbedTokenUsage, type EmbedTokenAuth } from "@/server/repositories/embed";

/**
 * Verifies a raw embed token from `/embed/pos?token=...` (or a checkout
 * request originating from that page) and resolves it to the business +
 * branch it's scoped to. This is the ONLY authorization check on the
 * embed surface — there is no cookie session, so nothing else stands
 * between a request and the database except this function returning
 * non-null. Callers must treat a null return as "reject the request",
 * not "fall back to some other check."
 */
export async function resolveEmbedToken(rawToken: string | null | undefined): Promise<EmbedTokenAuth | null> {
  if (!rawToken || !looksLikeEmbedToken(rawToken)) return null;

  const tokenHash = hashEmbedToken(rawToken);
  const auth = await findActiveEmbedTokenByHash(tokenHash);
  if (!auth) return null;

  void touchEmbedTokenUsage(tokenHash);
  return auth;
}
