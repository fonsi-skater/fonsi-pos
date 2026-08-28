import "server-only";
import { randomBytes, createHash } from "crypto";

/**
 * Embed POS capability tokens (see supabase/migrations/0009_embed_tokens.sql).
 *
 * The raw token is a 256-bit random value, shown to the user once. Only
 * `hashEmbedToken(raw)` is ever written to the database, so a leaked
 * database export doesn't leak usable embed links (same threat model as
 * hashed API keys / password hashes, minus the need for a slow KDF since
 * this is already high-entropy random data, not a user-chosen secret).
 */

const TOKEN_PREFIX = "fpos_embed_";

/** Generate a new raw embed token. Only returned to the caller once. */
export function generateEmbedToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/** Deterministic SHA-256 hash of a raw token, for storage/lookup. */
export function hashEmbedToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Cheap shape check before touching the database. */
export function looksLikeEmbedToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX) && value.length > TOKEN_PREFIX.length + 20;
}
