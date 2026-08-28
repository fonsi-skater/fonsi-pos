-- Phase 6: Embed tokens for the iframe-safe POS (src/app/embed/pos/page.tsx)
--
-- The embed surface has no logged-in dashboard session, so it can't use
-- cookie-based auth (and third-party-iframe cookie handling is unreliable
-- across browsers anyway). Instead it's a capability token, the same
-- pattern as an API key: a long random secret is shown to the business
-- owner/manager exactly once at creation time, and only its SHA-256 hash
-- is ever persisted. Presenting the raw token is what authorizes requests
-- to that one branch's POS — see src/lib/embed/token.ts and
-- src/server/services/embed-auth.ts.
create table if not exists embed_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  token_hash text not null unique,
  label text,
  is_active boolean not null default true,
  -- Sales rung up through this embed link are attributed to whoever
  -- minted it (there's no cashier login in the embed flow, and
  -- sales.cashier_id is not-null — see checkoutSale's embedToken branch).
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_embed_tokens_business on embed_tokens (business_id);
create index if not exists idx_embed_tokens_branch on embed_tokens (branch_id);

alter table embed_tokens enable row level security;

-- Members can see their business's embed tokens (label, branch, last
-- used) to manage them — never the raw secret, which isn't stored.
create policy "embed_tokens_select_members" on embed_tokens
  for select using (is_business_member(business_id));

-- Only owners/managers can mint or revoke embed links.
create policy "embed_tokens_insert_managers" on embed_tokens
  for insert with check (can_manage_business(business_id));

create policy "embed_tokens_update_managers" on embed_tokens
  for update using (can_manage_business(business_id));

create policy "embed_tokens_delete_managers" on embed_tokens
  for delete using (can_manage_business(business_id));

-- No RLS policy grants access by token_hash lookup on purpose: the embed
-- page itself has no authenticated user (that's the whole problem this
-- table solves), so verifying a presented token happens server-side via
-- src/lib/supabase/admin.ts, the same allow-listed pre-auth pattern used
-- for M-Pesa callback verification (see admin.ts's doc comment).
