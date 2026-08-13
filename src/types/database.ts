/**
 * Placeholder for Supabase's generated database types.
 *
 * Once the schema/migrations exist (Phase 3), regenerate this file with:
 *
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * Until then, this loose shape keeps the Supabase clients type-safe enough
 * to compile without blocking Phase 1/2 work.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, {
      Row: Record<string, unknown>;
      Insert: Record<string, unknown>;
      Update: Record<string, unknown>;
    }>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
