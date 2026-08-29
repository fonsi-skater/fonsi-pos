-- Phase 6/7 hardening: atomic checkout.
--
-- checkoutSale (src/server/actions/pos.ts) used to do six sequential
-- Supabase inserts from Node — sale, sale_items, payment,
-- inventory_movements, customer stats, receipt. A failure partway
-- through (a dropped connection, a constraint violation on the fourth
-- insert) could leave a sale recorded with no inventory decrement, or
-- items missing from an otherwise-real sale. This function does the
-- same work as a single Postgres transaction: either the whole sale
-- lands, or none of it does.
--
-- It also re-reads and locks product prices (`for update`) inside that
-- same transaction, closing a race window the old Node code had: two
-- concurrent checkouts could each read a price, then both write, with
-- no protection against a price changing in between.
--
-- SECURITY DEFINER + explicit grants: this function bypasses RLS
-- entirely (it runs as its owner, not the caller), so authorization
-- must happen BEFORE it's ever called — checkoutSale resolves the
-- caller's business_id/branch_id/cashier_id from a verified session or
-- embed token (never from client-supplied fields) and passes those in.
-- EXECUTE is granted to `authenticated` and `service_role` only, never
-- `anon` — the anon key is public (shipped to every browser), so
-- granting it here would let anyone forge sales for any business by
-- calling this RPC directly against Supabase's REST API, bypassing the
-- app's authorization entirely. The embed checkout flow (no Supabase
-- auth session — see src/server/services/embed-auth.ts) calls this via
-- the service-role admin client instead of the anon-scoped one, for
-- exactly that reason.
create or replace function create_sale(
  p_business_id uuid,
  p_branch_id uuid,
  p_cashier_id uuid,
  p_customer_id uuid,
  p_sale_number text,
  p_receipt_number text,
  p_payment_method payment_method,
  p_manual_discount numeric,
  p_items jsonb -- [{ "product_id": uuid, "product_variant_id": uuid|null, "quantity": int }, ...]
)
returns table (
  sale_id uuid,
  sale_number text,
  subtotal numeric,
  discount_amount numeric,
  tax_amount numeric,
  total_amount numeric,
  payment_id uuid,
  payment_status payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_payment_id uuid;
  v_subtotal numeric := 0;
  v_tax_amount numeric := 0;
  v_discount_amount numeric;
  v_total_amount numeric;
  v_payment_status payment_status;
  v_enriched_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_product record;
  v_quantity int;
  v_line_discount numeric;
  v_line_subtotal numeric;
  v_line_tax numeric;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one item' using errcode = 'P0001';
  end if;

  -- Pass 1: validate + price every line, locking each product row so a
  -- concurrent checkout can't commit a price change underneath us.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::int;

    select id, selling_price, tax_rate, discount, is_active
      into v_product
      from products
      where id = (v_item->>'product_id')::uuid
        and business_id = p_business_id
        and deleted_at is null
      for update;

    if not found then
      raise exception 'One or more items in the cart are no longer available' using errcode = 'P0001';
    end if;

    if not v_product.is_active then
      raise exception 'One or more items in the cart are no longer available' using errcode = 'P0001';
    end if;

    v_line_discount := round(v_product.selling_price * v_quantity * v_product.discount, 2);
    v_line_subtotal := v_product.selling_price * v_quantity - v_line_discount;
    v_line_tax := round(v_line_subtotal * v_product.tax_rate, 2);

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax_amount := v_tax_amount + v_line_tax;

    v_enriched_items := v_enriched_items || jsonb_build_array(
      v_item || jsonb_build_object(
        'unit_price', v_product.selling_price,
        'discount_amount', v_line_discount,
        'tax_amount', v_line_tax,
        'subtotal', round(v_line_subtotal + v_line_tax, 2)
      )
    );
  end loop;

  v_discount_amount := least(p_manual_discount, v_subtotal);
  v_total_amount := round(v_subtotal - v_discount_amount + v_tax_amount, 2);
  v_payment_status := case when p_payment_method = 'mpesa' then 'pending' else 'success' end;

  insert into sales (
    business_id, branch_id, customer_id, cashier_id, sale_number,
    subtotal, discount_amount, tax_amount, total_amount, status
  )
  values (
    p_business_id, p_branch_id, p_customer_id, p_cashier_id, p_sale_number,
    round(v_subtotal, 2), round(v_discount_amount, 2), round(v_tax_amount, 2), v_total_amount, 'completed'
  )
  returning id into v_sale_id;

  insert into sale_items (sale_id, product_id, product_variant_id, quantity, unit_price, discount_amount, tax_amount, subtotal)
  select
    v_sale_id,
    (elem->>'product_id')::uuid,
    nullif(elem->>'product_variant_id', '')::uuid,
    (elem->>'quantity')::int,
    (elem->>'unit_price')::numeric,
    (elem->>'discount_amount')::numeric,
    (elem->>'tax_amount')::numeric,
    (elem->>'subtotal')::numeric
  from jsonb_array_elements(v_enriched_items) as elem;

  -- Inventory movements — the existing apply_inventory_movement()
  -- trigger (0003_catalog_inventory.sql) decrements stock as a side
  -- effect of this insert. If it raises, this whole function's effects
  -- (sale, sale_items, everything above) roll back with it — the exact
  -- "sale recorded but stock never moved" failure mode this migration
  -- exists to close.
  insert into inventory_movements (business_id, branch_id, product_id, product_variant_id, movement_type, quantity_change, reference_type, reference_id, created_by)
  select
    p_business_id,
    p_branch_id,
    (elem->>'product_id')::uuid,
    nullif(elem->>'product_variant_id', '')::uuid,
    'sale',
    -((elem->>'quantity')::int),
    'sale',
    v_sale_id,
    p_cashier_id
  from jsonb_array_elements(p_items) as elem;

  -- Payment row. M-Pesa's actual confirmation happens later, out of band
  -- (Daraja's callback webhook — see src/app/api/payments/mpesa/callback)
  -- since it depends on an external HTTP call this function can't make;
  -- everything else is recorded as confirmed at the point of sale.
  insert into payments (sale_id, method, amount, status)
  values (v_sale_id, p_payment_method, v_total_amount, v_payment_status)
  returning id into v_payment_id;

  if p_customer_id is not null then
    insert into customer_transactions (customer_id, sale_id, type, amount)
    values (p_customer_id, v_sale_id, 'sale', v_total_amount);

    update customers
      set total_spent = coalesce(total_spent, 0) + v_total_amount,
          last_purchase_at = now()
      where id = p_customer_id;
  end if;

  insert into receipts (sale_id, receipt_number)
  values (v_sale_id, p_receipt_number);

  return query select
    v_sale_id, p_sale_number, round(v_subtotal, 2), round(v_discount_amount, 2),
    round(v_tax_amount, 2), v_total_amount, v_payment_id, v_payment_status;
end;
$$;

revoke all on function create_sale(uuid, uuid, uuid, uuid, text, text, payment_method, numeric, jsonb) from public;
grant execute on function create_sale(uuid, uuid, uuid, uuid, text, text, payment_method, numeric, jsonb) to authenticated;
grant execute on function create_sale(uuid, uuid, uuid, uuid, text, text, payment_method, numeric, jsonb) to service_role;
