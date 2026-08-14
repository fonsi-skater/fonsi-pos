-- Phase 3: Operations — Expenses, Employees, Notifications, Audit Logs,
-- Subscriptions, Plugins

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid references branches (id) on delete set null,
  category_id uuid references expense_categories (id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  expense_date date not null default current_date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Employee HR-ish detail on top of business_members' role/branch assignment.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  branch_id uuid references branches (id) on delete set null,
  employee_number text,
  position text,
  hire_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info', -- info | warning | success | error
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses (id) on delete cascade,
  user_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  plan text not null default 'trial',
  status text not null default 'trialing', -- trialing | active | past_due | canceled
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plugin_installations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  plugin_name text not null,
  version text not null default '1.0.0',
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, plugin_name)
);

create index if not exists idx_expenses_business on expenses (business_id, expense_date desc);
create index if not exists idx_employees_business on employees (business_id);
create index if not exists idx_employees_user on employees (user_id);
create index if not exists idx_notifications_user on notifications (user_id, created_at desc);
create index if not exists idx_audit_logs_business on audit_logs (business_id, created_at desc);
create index if not exists idx_audit_logs_entity on audit_logs (entity, entity_id);
create index if not exists idx_subscriptions_business on subscriptions (business_id);
create index if not exists idx_plugin_installations_business on plugin_installations (business_id);

create trigger expenses_set_updated_at before update on expenses
  for each row execute function set_updated_at();
create trigger employees_set_updated_at before update on employees
  for each row execute function set_updated_at();
create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();
create trigger plugin_installations_set_updated_at before update on plugin_installations
  for each row execute function set_updated_at();

alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table employees enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;
alter table subscriptions enable row level security;
alter table plugin_installations enable row level security;

create policy "members view expense categories" on expense_categories for select
  using (is_business_member(business_id));
create policy "managers manage expense categories" on expense_categories for all
  using (can_manage_business(business_id));

-- Sensitive financial data — only owner/manager may view or record
-- (spec §4: cashiers must NOT view sensitive financial reports).
create policy "managers view expenses" on expenses for select
  using (can_manage_business(business_id));
create policy "managers manage expenses" on expenses for all
  using (can_manage_business(business_id));

create policy "members view employees in their business" on employees for select
  using (is_business_member(business_id));
create policy "owners manage employees" on employees for all
  using (is_business_owner(business_id) or can_manage_business(business_id));

create policy "users view their own notifications" on notifications for select
  using (user_id = auth.uid());
create policy "users update their own notifications" on notifications for update
  using (user_id = auth.uid());
create policy "system creates notifications" on notifications for insert
  with check (is_business_member(business_id));

-- Audit logs: append-only, visible only to owners/managers of the business,
-- or platform-wide to super admins via the service-role client.
create policy "managers view audit logs" on audit_logs for select
  using (business_id is not null and can_manage_business(business_id));
create policy "members create audit log entries" on audit_logs for insert
  with check (business_id is null or is_business_member(business_id));

create policy "owners view subscription" on subscriptions for select
  using (is_business_owner(business_id));

create policy "owners view plugin installations" on plugin_installations for select
  using (is_business_member(business_id));
create policy "owners manage plugin installations" on plugin_installations for all
  using (is_business_owner(business_id));
