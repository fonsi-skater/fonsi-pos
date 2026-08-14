-- Phase 2: Auth foundation
-- Minimal schema needed for sign-up (business creation + membership/role).
-- Full product/inventory/sales schema arrives in the Phase 3 migration.

create extension if not exists "pgcrypto";

create type app_role as enum ('super_admin', 'business_owner', 'manager', 'cashier');

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  currency text not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  is_active boolean not null default true,
  subscription_status text not null default 'trialing',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role app_role not null,
  branch_id uuid references branches (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists idx_business_members_user on business_members (user_id);
create index if not exists idx_business_members_business on business_members (business_id);
create index if not exists idx_branches_business on branches (business_id);

-- updated_at trigger helper, reused by every future table
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

create trigger branches_set_updated_at
  before update on branches
  for each row execute function set_updated_at();

-- Row Level Security
alter table businesses enable row level security;
alter table branches enable row level security;
alter table business_members enable row level security;

-- A user can see a business only if they're an active member of it.
create policy "members can view their business"
  on businesses for select
  using (
    exists (
      select 1 from business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.is_active
    )
  );

-- Any authenticated user can create a business (sign-up flow); they become
-- its first member via the business_members insert in the same transaction.
create policy "authenticated users can create a business"
  on businesses for insert
  with check (auth.uid() is not null);

create policy "owners can update their business"
  on businesses for update
  using (
    exists (
      select 1 from business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.role = 'business_owner'
        and m.is_active
    )
  );

create policy "members can view their branches"
  on branches for select
  using (
    exists (
      select 1 from business_members m
      where m.business_id = branches.business_id
        and m.user_id = auth.uid()
        and m.is_active
    )
  );

create policy "owners and managers manage branches"
  on branches for all
  using (
    exists (
      select 1 from business_members m
      where m.business_id = branches.business_id
        and m.user_id = auth.uid()
        and m.role in ('business_owner', 'manager')
        and m.is_active
    )
  );

create policy "users can view their own memberships"
  on business_members for select
  using (user_id = auth.uid());

create policy "users can create their own first membership"
  on business_members for insert
  with check (user_id = auth.uid());

create policy "owners manage memberships in their business"
  on business_members for all
  using (
    exists (
      select 1 from business_members m
      where m.business_id = business_members.business_id
        and m.user_id = auth.uid()
        and m.role = 'business_owner'
        and m.is_active
    )
  );
