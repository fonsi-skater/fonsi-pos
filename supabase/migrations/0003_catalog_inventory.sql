-- Phase 3: Catalog + Inventory
-- See docs/ARCHITECTURE.md §4 for the ERD this implements.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  parent_id uuid references categories (id) on delete set null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  supplier_id uuid, -- FK added after suppliers table exists (0004)
  name text not null,
  sku text not null,
  barcode text,
  description text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null check (selling_price >= 0),
  tax_rate numeric(5,4) not null default 0 check (tax_rate between 0 and 1),
  discount numeric(5,4) not null default 0 check (discount between 0 and 1),
  min_stock_level integer not null default 0 check (min_stock_level >= 0),
  image_url text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, sku)
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null, -- e.g. "Small", "Red / Large"
  sku text,
  barcode text,
  price_adjustment numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Current stock on hand per branch (one row per product/variant/branch).
-- This is a derived/materialized snapshot — inventory_movements is the
-- source of truth ledger; this table is what the UI reads for speed.
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  product_variant_id uuid references product_variants (id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id, product_variant_id)
);

create type inventory_movement_type as enum (
  'purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return'
);

-- Append-only ledger. Never update stock quantities directly — always
-- insert a movement and let a trigger (or service-layer transaction)
-- adjust `inventory.quantity` accordingly. See spec §8.
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  branch_id uuid not null references branches (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  product_variant_id uuid references product_variants (id) on delete cascade,
  movement_type inventory_movement_type not null,
  quantity_change integer not null, -- positive = stock in, negative = stock out
  reference_type text, -- e.g. 'sale', 'purchase', 'manual_adjustment'
  reference_id uuid,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_business on categories (business_id);
create index if not exists idx_products_business on products (business_id);
create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_barcode on products (barcode);
create index if not exists idx_product_variants_product on product_variants (product_id);
create index if not exists idx_inventory_branch_product on inventory (branch_id, product_id);
create index if not exists idx_inventory_movements_product on inventory_movements (product_id, created_at desc);
create index if not exists idx_inventory_movements_business on inventory_movements (business_id, created_at desc);

create trigger categories_set_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();
create trigger product_variants_set_updated_at before update on product_variants
  for each row execute function set_updated_at();

-- Keep `inventory.quantity` in sync with the movement ledger automatically,
-- so no application code path can update stock without leaving a trail.
create or replace function apply_inventory_movement()
returns trigger as $$
begin
  insert into inventory (business_id, branch_id, product_id, product_variant_id, quantity)
  values (new.business_id, new.branch_id, new.product_id, new.product_variant_id, new.quantity_change)
  on conflict (branch_id, product_id, product_variant_id)
  do update set
    quantity = inventory.quantity + excluded.quantity,
    updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger inventory_movements_apply
  after insert on inventory_movements
  for each row execute function apply_inventory_movement();

alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table inventory enable row level security;
alter table inventory_movements enable row level security;

create policy "members view categories" on categories for select
  using (is_business_member(business_id));
create policy "managers write categories" on categories for insert
  with check (can_manage_business(business_id));
create policy "managers update categories" on categories for update
  using (can_manage_business(business_id));
create policy "owners delete categories" on categories for delete
  using (is_business_owner(business_id));

create policy "members view products" on products for select
  using (is_business_member(business_id));
create policy "managers write products" on products for insert
  with check (can_manage_business(business_id));
create policy "managers update products" on products for update
  using (can_manage_business(business_id));
create policy "owners delete products" on products for delete
  using (is_business_owner(business_id));

create policy "members view variants" on product_variants for select
  using (is_business_member((select business_id from products p where p.id = product_id)));
create policy "managers manage variants" on product_variants for all
  using (can_manage_business((select business_id from products p where p.id = product_id)));

create policy "members view inventory" on inventory for select
  using (is_business_member(business_id));
create policy "managers manage inventory rows" on inventory for all
  using (can_manage_business(business_id));

create policy "members view inventory movements" on inventory_movements for select
  using (is_business_member(business_id));
create policy "staff record inventory movements" on inventory_movements for insert
  with check (is_business_member(business_id));
