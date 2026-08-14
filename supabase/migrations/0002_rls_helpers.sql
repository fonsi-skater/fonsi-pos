-- Phase 3: RLS helper functions
-- Centralizing membership/role checks here keeps every table's policies
-- short and consistent, and means a future policy bug gets fixed in one
-- place instead of N places.

create or replace function is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from business_members m
    where m.business_id = target_business_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function has_business_role(target_business_id uuid, roles app_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from business_members m
    where m.business_id = target_business_id
      and m.user_id = auth.uid()
      and m.role = any(roles)
      and m.is_active
  );
$$;

-- Convenience wrapper: owner + manager, the two roles allowed to manage
-- most operational data (products, inventory, employees, etc.)
create or replace function can_manage_business(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_business_role(target_business_id, array['business_owner','manager']::app_role[]);
$$;

create or replace function is_business_owner(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_business_role(target_business_id, array['business_owner']::app_role[]);
$$;
