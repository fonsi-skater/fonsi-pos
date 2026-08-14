import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin/service-role Supabase client.
 *
 * ⚠️ SECURITY: This client BYPASSES Row Level Security entirely.
 * - `import "server-only"` guarantees a build failure if any client
 *   component ever imports this file.
 * - Only use this for trusted server-side operations that must cross
 *   tenant boundaries by design, e.g.:
 *     - Super Admin platform-level queries
 *     - M-Pesa/Daraja callback handlers (verifying + writing payment status)
 *     - Scheduled/background jobs
 * - Every usage MUST perform its own authorization check before querying,
 *   since RLS is not protecting these calls.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
