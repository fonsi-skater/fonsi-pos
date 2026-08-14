import { createClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/types";

/**
 * Resolves "who is logged in, in which business/branch, with what role."
 * Call this from Server Components / Server Actions — never trust a role
 * passed from the client.
 *
 * Returns null if there's no authenticated user. If the user has multiple
 * business memberships (not yet supported in the UI), this picks the
 * first active one — revisit when multi-business-per-user ships.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, branch_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    businessId: membership?.business_id ?? null,
    branchId: membership?.branch_id ?? null,
    role: (membership?.role as SessionContext["role"]) ?? null,
  };
}
