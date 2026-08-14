import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Uses the public anon key only — RLS policies enforce tenant isolation.
 * NEVER import the service role key here.
 *
 * NOTE: not yet typed against the generated Database schema — that lands
 * in Phase 3 once real migrations exist. Run
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * then re-add `<Database>` here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
