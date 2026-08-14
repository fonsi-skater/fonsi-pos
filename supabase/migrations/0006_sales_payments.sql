-- Phase 3: Sales, Payments, Receipts
-- The transactional core. See docs/ARCHITECTURE.md §7 (payment architecture)
-- and spec §10/§11: totals are ALWAYS computed and trusted server-side —
-- these tables are what the server writes after its own calculation, never
-- a direct pass-through of client-submitted totals.

create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(12,4) not null check (value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists taxes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  rate numeric(5,4) not null check (rate between 0 and 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create type sale_status as enum ('completed', 'refunded', 'partial_refund', 'voided');
create type payment_method as enum ('cash', 'mpesa', 'card', 'bank', 'credit', 'other');
create type payment_status as enum ('pending', 'success', 'failed', 'reversed');

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  cashier_id uuid not null references auth.users (id),
  sale_number text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status sale_status not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, sale_number)
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid not null references products (id),
  product_variant_id uuid references product_variants (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);

alter table customer_transactions
  add constraint customer_transactions_sale_fk
  foreign key (sale_id) references sales (id) on delete set null;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  method payment_method not null,
  amount numeric(12,2) not null check (amount >= 0),
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- Idempotency + provider reconciliation ledger — see PaymentProvider in
-- src/lib/payments/types.ts. `idempotency_key` is unique so a retried
-- webhook or client retry can never double-record a payment.
create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  provider_reference text,
  idempotency_key text not null unique,
  status payment_status not null default 'pending',
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  refunded_by uuid not null references auth.users (id),
  amount numeric(12,2) not null check (amount > 0),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  receipt_number text not null unique,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_business on sales (business_id, created_at desc);
create index if not exists idx_sales_branch on sales (branch_id, created_at desc);
create index if not exists idx_sales_customer on sales (customer_id);
create index if not exists idx_sales_cashier on sales (cashier_id);
create index if not exists idx_sale_items_sale on sale_items (sale_id);
create index if not exists idx_sale_items_product on sale_items (product_id);
create index if not exists idx_payments_sale on payments (sale_id);
create index if not exists idx_payment_transactions_payment on payment_transactions (payment_id);
create index if not exists idx_refunds_sale on refunds (sale_id);

create trigger sales_set_updated_at before update on sales
  for each row execute function set_updated_at();

alter table discounts enable row level security;
alter table taxes enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table payment_transactions enable row level security;
alter table refunds enable row level security;
alter table receipts enable row level security;

create policy "members view discounts" on discounts for select
  using (is_business_member(business_id));
create policy "managers manage discounts" on discounts for all
  using (can_manage_business(business_id));

create policy "members view taxes" on taxes for select
  using (is_business_member(business_id));
create policy "managers manage taxes" on taxes for all
  using (can_manage_business(business_id));

create policy "members view sales" on sales for select
  using (is_business_member(business_id));
create policy "cashiers create sales" on sales for insert
  with check (is_business_member(business_id));
-- Deleting sales is never allowed (spec §6: never destroy accounting
-- history) — no delete policy is defined, so it's denied by default.
create policy "owners void or adjust sales" on sales for update
  using (is_business_owner(business_id));

create policy "members view sale items" on sale_items for select
  using (is_business_member((select business_id from sales s where s.id = sale_id)));
create policy "cashiers create sale items" on sale_items for insert
  with check (is_business_member((select business_id from sales s where s.id = sale_id)));

create policy "members view payments" on payments for select
  using (is_business_member((select business_id from sales s where s.id = sale_id)));
create policy "cashiers record payments" on payments for insert
  with check (is_business_member((select business_id from sales s where s.id = sale_id)));

-- payment_transactions is written primarily by server-side webhook
-- handlers using the service-role client (bypasses RLS by design — see
-- src/lib/supabase/admin.ts) since Daraja callbacks aren't an
-- authenticated app user. Members may still read their own business's rows.
create policy "members view payment transactions" on payment_transactions for select
  using (
    is_business_member((
      select s.business_id from payments p
      join sales s on s.id = p.sale_id
      where p.id = payment_id
    ))
  );

create policy "members view refunds" on refunds for select
  using (is_business_member((select business_id from sales s where s.id = sale_id)));
create policy "managers issue refunds" on refunds for insert
  with check (can_manage_business((select business_id from sales s where s.id = sale_id)));

create policy "members view receipts" on receipts for select
  using (is_business_member((select business_id from sales s where s.id = sale_id)));
create policy "cashiers create receipts" on receipts for insert
  with check (is_business_member((select business_id from sales s where s.id = sale_id)));
