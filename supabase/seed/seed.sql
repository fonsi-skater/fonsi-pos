-- Fonsi POS — Development seed data
--
-- USAGE:
-- 1. Run all migrations first (0001–0007).
-- 2. Create three demo users via Supabase Auth (dashboard → Authentication →
--    Add user, or sign up through the app) with these exact emails:
--      owner@demo.fonsipos.com    (will become business_owner)
--      manager@demo.fonsipos.com  (will become manager)
--      cashier@demo.fonsipos.com  (will become cashier)
--    (Auth users can't be created from plain SQL in a portable way, since
--    password hashing goes through Supabase Auth's own service.)
-- 3. Run this file in the Supabase SQL Editor.
--
-- Safe to re-run: uses ON CONFLICT / IF NOT EXISTS throughout, and can be
-- reset by deleting the "Fonsi Demo Traders" business (cascades everywhere).

do $$
declare
  v_business_id uuid;
  v_branch_id uuid;
  v_owner_id uuid;
  v_manager_id uuid;
  v_cashier_id uuid;
  v_category_food uuid;
  v_category_drinks uuid;
  v_category_household uuid;
  v_supplier_id uuid;
begin
  select id into v_owner_id from auth.users where email = 'owner@demo.fonsipos.com';
  select id into v_manager_id from auth.users where email = 'manager@demo.fonsipos.com';
  select id into v_cashier_id from auth.users where email = 'cashier@demo.fonsipos.com';

  if v_owner_id is null then
    raise exception 'Create owner@demo.fonsipos.com in Supabase Auth first, then re-run this seed.';
  end if;

  -- Business + branch
  insert into businesses (name, slug, currency, timezone, created_by)
  values ('Fonsi Demo Traders', 'fonsi-demo-traders', 'KES', 'Africa/Nairobi', v_owner_id)
  on conflict (slug) do update set name = excluded.name
  returning id into v_business_id;

  insert into branches (business_id, name, address, phone)
  values (v_business_id, 'Nairobi CBD Branch', 'Moi Avenue, Nairobi', '+254700000000')
  returning id into v_branch_id;

  -- Memberships
  insert into business_members (business_id, user_id, role, branch_id)
  values (v_business_id, v_owner_id, 'business_owner', v_branch_id)
  on conflict (business_id, user_id) do nothing;

  if v_manager_id is not null then
    insert into business_members (business_id, user_id, role, branch_id)
    values (v_business_id, v_manager_id, 'manager', v_branch_id)
    on conflict (business_id, user_id) do nothing;
  end if;

  if v_cashier_id is not null then
    insert into business_members (business_id, user_id, role, branch_id)
    values (v_business_id, v_cashier_id, 'cashier', v_branch_id)
    on conflict (business_id, user_id) do nothing;
  end if;

  -- Categories
  insert into categories (business_id, name) values (v_business_id, 'Food') returning id into v_category_food;
  insert into categories (business_id, name) values (v_business_id, 'Drinks') returning id into v_category_drinks;
  insert into categories (business_id, name) values (v_business_id, 'Household') returning id into v_category_household;

  -- Supplier
  insert into suppliers (business_id, name, contact_person, phone, email)
  values (v_business_id, 'Nairobi Wholesale Ltd', 'James Mwangi', '+254711000000', 'sales@nairobiwholesale.co.ke')
  returning id into v_supplier_id;

  -- 20 demo products across the three categories
  insert into products (business_id, category_id, supplier_id, name, sku, barcode, cost_price, selling_price, tax_rate, min_stock_level, created_by)
  values
    (v_business_id, v_category_food, v_supplier_id, 'Maize Flour 2kg', 'FOOD-001', '6161000000011', 180, 220, 0.16, 10, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Rice 2kg', 'FOOD-002', '6161000000028', 250, 300, 0.16, 10, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Cooking Oil 1L', 'FOOD-003', '6161000000035', 280, 340, 0.16, 8, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Sugar 1kg', 'FOOD-004', '6161000000042', 130, 160, 0.16, 15, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Bread 400g', 'FOOD-005', '6161000000059', 55, 70, 0.0, 20, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Milk 500ml', 'FOOD-006', '6161000000066', 45, 60, 0.0, 25, v_owner_id),
    (v_business_id, v_category_food, v_supplier_id, 'Eggs (tray of 30)', 'FOOD-007', '6161000000073', 380, 450, 0.0, 6, v_owner_id),
    (v_business_id, v_category_drinks, v_supplier_id, 'Soda 500ml', 'DRK-001', '6161000000080', 45, 65, 0.16, 24, v_owner_id),
    (v_business_id, v_category_drinks, v_supplier_id, 'Bottled Water 1L', 'DRK-002', '6161000000097', 35, 50, 0.16, 30, v_owner_id),
    (v_business_id, v_category_drinks, v_supplier_id, 'Juice 1L', 'DRK-003', '6161000000103', 120, 160, 0.16, 12, v_owner_id),
    (v_business_id, v_category_drinks, v_supplier_id, 'Energy Drink 250ml', 'DRK-004', '6161000000110', 90, 130, 0.16, 12, v_owner_id),
    (v_business_id, v_category_drinks, v_supplier_id, 'Yoghurt Drink 500ml', 'DRK-005', '6161000000127', 75, 100, 0.16, 10, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Bar Soap 800g', 'HH-001', '6161000000134', 150, 190, 0.16, 15, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Washing Powder 1kg', 'HH-002', '6161000000141', 210, 260, 0.16, 10, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Toilet Paper (4 pack)', 'HH-003', '6161000000158', 160, 200, 0.16, 15, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Toothpaste 100ml', 'HH-004', '6161000000165', 90, 120, 0.16, 12, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Matches (box)', 'HH-005', '6161000000172', 5, 10, 0.16, 40, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Candles (pack of 4)', 'HH-006', '6161000000189', 60, 90, 0.16, 20, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Insecticide Spray', 'HH-007', '6161000000196', 220, 280, 0.16, 8, v_owner_id),
    (v_business_id, v_category_household, v_supplier_id, 'Dish Soap 500ml', 'HH-008', '6161000000202', 110, 150, 0.16, 12, v_owner_id)
  on conflict (business_id, sku) do nothing;

  -- Opening stock: record an inventory_movement per product so the ledger
  -- (not a raw UPDATE) is what establishes stock, per spec §8.
  insert into inventory_movements (business_id, branch_id, product_id, movement_type, quantity_change, reference_type, notes, created_by)
  select v_business_id, v_branch_id, p.id, 'adjustment', 50, 'opening_stock', 'Initial seed stock', v_owner_id
  from products p
  where p.business_id = v_business_id
    and not exists (
      select 1 from inventory_movements im
      where im.product_id = p.id and im.reference_type = 'opening_stock'
    );

  -- Demo customers
  insert into customers (business_id, name, phone, email, created_by)
  values
    (v_business_id, 'Grace Wanjiru', '+254722111111', 'grace.w@example.com', v_owner_id),
    (v_business_id, 'Peter Otieno', '+254733222222', 'peter.o@example.com', v_owner_id),
    (v_business_id, 'Walk-in Customer', null, null, v_owner_id)
  on conflict do nothing;

  -- Expense categories + a couple of sample expenses
  insert into expense_categories (business_id, name)
  values (v_business_id, 'Rent'), (v_business_id, 'Utilities'), (v_business_id, 'Transport')
  on conflict do nothing;

  insert into expenses (business_id, branch_id, category_id, amount, description, expense_date, created_by)
  select v_business_id, v_branch_id, ec.id, 45000, 'Monthly shop rent', current_date - interval '5 days', v_owner_id
  from expense_categories ec where ec.business_id = v_business_id and ec.name = 'Rent'
  limit 1;

  raise notice 'Seed complete for business_id: %', v_business_id;
end $$;
