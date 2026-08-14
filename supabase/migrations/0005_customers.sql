-- Phase 3: Customers

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  outstanding_credit numeric(12,2) not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_purchase_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create type customer_transaction_type as enum ('sale', 'payment', 'credit_adjustment');

create table if not exists customer_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  sale_id uuid, -- FK added after sales table exists (0006)
  type customer_transaction_type not null,
  amount numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_business on customers (business_id);
create index if not exists idx_customers_phone on customers (phone);
create index if not exists idx_customer_transactions_customer on customer_transactions (customer_id, created_at desc);

create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();

alter table customers enable row level security;
alter table customer_transactions enable row level security;

create policy "members view customers" on customers for select
  using (is_business_member(business_id));
create policy "staff manage customers" on customers for all
  using (is_business_member(business_id));

create policy "members view customer transactions" on customer_transactions for select
  using (is_business_member((select business_id from customers c where c.id = customer_id)));
create policy "staff record customer transactions" on customer_transactions for insert
  with check (is_business_member((select business_id from customers c where c.id = customer_id)));
