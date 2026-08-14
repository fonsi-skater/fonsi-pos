-- Phase 3: Suppliers + Purchases

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  outstanding_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table products
  add constraint products_supplier_fk
  foreign key (supplier_id) references suppliers (id) on delete set null;

create type purchase_status as enum ('draft', 'ordered', 'received', 'cancelled');

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  supplier_id uuid references suppliers (id) on delete set null,
  purchase_number text not null,
  status purchase_status not null default 'draft',
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, purchase_number)
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases (id) on delete cascade,
  product_id uuid not null references products (id),
  product_variant_id uuid references product_variants (id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  subtotal numeric(12,2) generated always as (quantity * unit_cost) stored
);

create index if not exists idx_suppliers_business on suppliers (business_id);
create index if not exists idx_purchases_business on purchases (business_id, created_at desc);
create index if not exists idx_purchases_supplier on purchases (supplier_id);
create index if not exists idx_purchase_items_purchase on purchase_items (purchase_id);

create trigger suppliers_set_updated_at before update on suppliers
  for each row execute function set_updated_at();
create trigger purchases_set_updated_at before update on purchases
  for each row execute function set_updated_at();

alter table suppliers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;

create policy "members view suppliers" on suppliers for select
  using (is_business_member(business_id));
create policy "managers manage suppliers" on suppliers for all
  using (can_manage_business(business_id));

create policy "members view purchases" on purchases for select
  using (is_business_member(business_id));
create policy "managers manage purchases" on purchases for all
  using (can_manage_business(business_id));

create policy "members view purchase items" on purchase_items for select
  using (is_business_member((select business_id from purchases p where p.id = purchase_id)));
create policy "managers manage purchase items" on purchase_items for all
  using (can_manage_business((select business_id from purchases p where p.id = purchase_id)));
