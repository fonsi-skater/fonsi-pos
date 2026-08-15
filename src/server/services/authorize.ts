import { getSessionContext } from "@/server/services/session";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { SessionContext } from "@/types";

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Resolves the current session and asserts it has the given permission.
 * Every Server Action that mutates data should call this FIRST — the
 * permission matrix in src/lib/permissions is UX only; this is the real
 * gate (RLS is the gate underneath that, independent of this check).
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session || !session.businessId) {
    throw new AuthorizationError("You must be signed in to a business to do that.");
  }
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionContext> {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) {
    throw new AuthorizationError();
  }
  return session;
}
