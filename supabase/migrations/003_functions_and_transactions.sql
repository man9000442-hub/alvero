-- ALVERO E-Commerce Platform
-- Migration 003: Atomic PostgreSQL RPCs & Business Logic

-- ==========================================
-- 1. NORMALIZE EGYPTIAN PHONE
-- ==========================================
create or replace function public.normalize_egypt_phone(raw_phone text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  cleaned := regexp_replace(coalesce(raw_phone, ''), '[^0-9]', '', 'g');
  if cleaned like '0020%' then
    cleaned := substr(cleaned, 5);
  elsif cleaned like '20%' and length(cleaned) = 12 then
    cleaned := substr(cleaned, 3);
  end if;
  if length(cleaned) = 10 and cleaned like '1%' then
    cleaned := '0' || cleaned;
  end if;
  return cleaned;
end;
$$;

-- ==========================================
-- 2. ATOMIC COD ORDER CREATION (RACE-CONDITION SAFE)
-- ==========================================
-- p_items jsonb array: [{"variant_id": "uuid", "quantity": 2}, ...]
create or replace function public.create_cod_order(
  p_idempotency_key text,
  p_customer_name text,
  p_customer_phone text,
  p_secondary_phone text,
  p_customer_email text,
  p_governorate_id uuid,
  p_delivery_area_id uuid,
  p_city text,
  p_district text,
  p_full_address text,
  p_building_number text,
  p_apartment_number text,
  p_floor text,
  p_delivery_notes text,
  p_discount_code text,
  p_locale text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_order record;
  v_norm_phone text;
  v_norm_secondary text;
  v_store_status text;
  v_maintenance boolean;
  v_gov record;
  v_area record;
  v_global_shipping record;
  v_item jsonb;
  v_variant record;
  v_product record;
  v_unit_price numeric(10,2);
  v_original_price numeric(10,2);
  v_line_total numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_eligible_subtotal numeric(10,2) := 0;
  v_discount record;
  v_discount_id uuid := null;
  v_discount_code text := null;
  v_discount_amount numeric(10,2) := 0;
  v_customer_usage_count integer := 0;
  v_shipping_fee numeric(10,2) := 0;
  v_free_threshold numeric(10,2);
  v_total_amount numeric(10,2) := 0;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_tracking_token text;
  v_seq bigint;
  v_prepared_items jsonb := '[]'::jsonb;
  v_qty integer;
  v_variant_id uuid;
begin
  -- 1. Idempotency check
  if coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select id, order_number, tracking_token, total_amount, subtotal, discount_amount, shipping_fee, status
  into v_existing_order
  from public.orders
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'tracking_token', v_existing_order.tracking_token,
      'subtotal', v_existing_order.subtotal,
      'discount_amount', v_existing_order.discount_amount,
      'shipping_fee', v_existing_order.shipping_fee,
      'total_amount', v_existing_order.total_amount,
      'status', v_existing_order.status,
      'idempotent_replay', true
    );
  end if;

  -- 2. Store availability check
  select store_status, maintenance_mode into v_store_status, v_maintenance
  from public.website_settings where id = 1;

  if v_maintenance or v_store_status <> 'OPEN' then
    raise exception 'STORE_CLOSED';
  end if;

  -- 3. Validate Egyptian phone
  v_norm_phone := public.normalize_egypt_phone(p_customer_phone);
  if v_norm_phone !~ '^01[0125][0-9]{8}$' then
    raise exception 'INVALID_EGYPTIAN_PHONE';
  end if;

  if coalesce(trim(p_secondary_phone), '') <> '' then
    v_norm_secondary := public.normalize_egypt_phone(p_secondary_phone);
    if v_norm_secondary !~ '^01[0125][0-9]{8}$' then
      raise exception 'INVALID_SECONDARY_PHONE';
    end if;
  else
    v_norm_secondary := null;
  end if;

  -- 4. Validate items array
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY';
  end if;

  -- 5. Validate shipping location
  select * into v_gov
  from public.governorates
  where id = p_governorate_id and is_active = true;

  if not found then
    raise exception 'INVALID_GOVERNORATE';
  end if;

  if p_delivery_area_id is not null then
    select * into v_area
    from public.delivery_areas
    where id = p_delivery_area_id and governorate_id = p_governorate_id and is_active = true;
    if not found then
      raise exception 'INVALID_DELIVERY_AREA';
    end if;
  end if;

  select * into v_global_shipping from public.shipping_rules where id = 1;

  -- 6. Lock variants in deterministic order to avoid deadlocks and verify stock + recalculate prices
  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by (value->>'variant_id') asc
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 or v_qty > 50 then
      raise exception 'INVALID_ITEM_QUANTITY';
    end if;

    select pv.* into v_variant
    from public.product_variants pv
    where pv.id = v_variant_id
    for update;

    if not found then
      raise exception 'VARIANT_NOT_FOUND';
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_variant.product_id
      and p.status = 'ACTIVE'
      and p.deleted_at is null;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    if not v_variant.is_available or v_variant.stock_quantity < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%', v_variant.sku;
    end if;

    v_original_price := coalesce(v_variant.price_override, v_product.regular_price);
    if v_variant.price_override is not null then
      v_unit_price := v_variant.price_override;
    elsif v_product.sale_price is not null and v_product.sale_price < v_product.regular_price then
      v_unit_price := v_product.sale_price;
    else
      v_unit_price := v_product.regular_price;
    end if;

    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    v_prepared_items := v_prepared_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'category_id', v_product.category_id,
      'variant_id', v_variant.id,
      'product_name_en', v_product.name_en,
      'product_name_ar', v_product.name_ar,
      'product_slug', v_product.slug,
      'sku', v_variant.sku,
      'size', v_variant.size,
      'color_name_en', v_variant.color_name_en,
      'color_name_ar', v_variant.color_name_ar,
      'color_hex', v_variant.color_hex,
      'image_url', v_product.main_image_url,
      'unit_price', v_unit_price,
      'original_unit_price', v_original_price,
      'quantity', v_qty,
      'line_total', v_line_total,
      'prev_stock', v_variant.stock_quantity
    ));
  end loop;

  -- 7. Evaluate discount (coupon code first, else best active automatic promotion)
  if coalesce(trim(p_discount_code), '') <> '' then
    select * into v_discount
    from public.discounts
    where upper(code) = upper(trim(p_discount_code))
      and is_active = true
    for update;

    if not found then
      raise exception 'INVALID_DISCOUNT_CODE';
    end if;

    if v_discount.starts_at is not null and v_discount.starts_at > now() then
      raise exception 'DISCOUNT_NOT_STARTED';
    end if;
    if v_discount.expires_at is not null and v_discount.expires_at <= now() then
      raise exception 'DISCOUNT_EXPIRED';
    end if;
    if v_discount.usage_limit is not null and v_discount.usage_count >= v_discount.usage_limit then
      raise exception 'DISCOUNT_USAGE_LIMIT_REACHED';
    end if;
    if v_discount.per_customer_limit is not null then
      select count(*) into v_customer_usage_count
      from public.discount_usages
      where discount_id = v_discount.id and customer_phone = v_norm_phone;
      if v_customer_usage_count >= v_discount.per_customer_limit then
        raise exception 'DISCOUNT_CUSTOMER_LIMIT_REACHED';
      end if;
    end if;
    if v_subtotal < v_discount.min_order_amount then
      raise exception 'DISCOUNT_MIN_ORDER_NOT_MET';
    end if;
  else
    select d.* into v_discount
    from public.discounts d
    where d.is_automatic = true
      and d.is_active = true
      and (d.starts_at is null or d.starts_at <= now())
      and (d.expires_at is null or d.expires_at > now())
      and (d.usage_limit is null or d.usage_count < d.usage_limit)
      and v_subtotal >= d.min_order_amount
    order by d.discount_value desc
    limit 1
    for update;
  end if;

  if v_discount.id is not null then
    -- Compute eligible subtotal according to scope
    if v_discount.scope = 'STORE_WIDE' then
      v_eligible_subtotal := v_subtotal;
    elsif v_discount.scope = 'PRODUCTS' then
      select coalesce(sum((elem->>'line_total')::numeric), 0)
      into v_eligible_subtotal
      from jsonb_array_elements(v_prepared_items) elem
      where exists (
        select 1 from public.discount_products dp
        where dp.discount_id = v_discount.id
          and dp.product_id = (elem->>'product_id')::uuid
      );
    elsif v_discount.scope = 'CATEGORIES' then
      select coalesce(sum((elem->>'line_total')::numeric), 0)
      into v_eligible_subtotal
      from jsonb_array_elements(v_prepared_items) elem
      where (elem->>'category_id') is not null
        and exists (
          select 1 from public.discount_categories dc
          where dc.discount_id = v_discount.id
            and dc.category_id = (elem->>'category_id')::uuid
        );
    end if;

    if v_eligible_subtotal > 0 then
      if v_discount.discount_type = 'PERCENTAGE' then
        v_discount_amount := round(v_eligible_subtotal * (v_discount.discount_value / 100.0), 2);
      else
        v_discount_amount := least(v_eligible_subtotal, v_discount.discount_value);
      end if;

      if v_discount.max_discount_amount is not null then
        v_discount_amount := least(v_discount_amount, v_discount.max_discount_amount);
      end if;

      v_discount_amount := least(v_discount_amount, v_subtotal);
      if v_discount_amount > 0 then
        v_discount_id := v_discount.id;
        v_discount_code := v_discount.code;
      end if;
    elsif coalesce(trim(p_discount_code), '') <> '' then
      raise exception 'DISCOUNT_NOT_APPLICABLE_TO_ITEMS';
    end if;
  end if;

  -- 8. Calculate shipping fee
  v_shipping_fee := coalesce(v_area.shipping_fee_override, v_gov.shipping_fee, v_global_shipping.default_shipping_fee, 70);
  if v_global_shipping.is_free_shipping_enabled then
    v_free_threshold := coalesce(v_gov.free_shipping_threshold, v_global_shipping.free_shipping_threshold);
    if v_free_threshold is not null and (v_subtotal - v_discount_amount) >= v_free_threshold then
      v_shipping_fee := 0;
    end if;
  end if;

  v_total_amount := greatest(0, round((v_subtotal - v_discount_amount) + v_shipping_fee, 2));

  -- 9. Upsert customer by normalized phone
  insert into public.customers (
    full_name, phone, secondary_phone, email,
    default_governorate_id, default_city, default_district, default_address,
    total_orders
  ) values (
    trim(p_customer_name), v_norm_phone, v_norm_secondary, nullif(trim(coalesce(p_customer_email, '')), ''),
    p_governorate_id, trim(p_city), trim(p_district), trim(p_full_address),
    1
  )
  on conflict (phone) do update set
    full_name = excluded.full_name,
    secondary_phone = coalesce(excluded.secondary_phone, public.customers.secondary_phone),
    email = coalesce(excluded.email, public.customers.email),
    default_governorate_id = excluded.default_governorate_id,
    default_city = excluded.default_city,
    default_district = excluded.default_district,
    default_address = excluded.default_address,
    total_orders = public.customers.total_orders + 1
  returning id into v_customer_id;

  -- 10. Generate unique order number
  v_seq := nextval('public.order_number_seq');
  v_order_number := 'ALV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');
  v_tracking_token := encode(gen_random_bytes(16), 'hex');

  -- 11. Insert order
  insert into public.orders (
    order_number, tracking_token, idempotency_key, customer_id,
    customer_name, customer_phone, secondary_phone, customer_email,
    governorate_id, governorate_name_en, governorate_name_ar,
    delivery_area_id, city, district, full_address,
    building_number, apartment_number, floor, delivery_notes,
    payment_method, currency, subtotal, discount_id, discount_code,
    discount_amount, shipping_fee, total_amount, status, stock_deducted, locale
  ) values (
    v_order_number, v_tracking_token, p_idempotency_key, v_customer_id,
    trim(p_customer_name), v_norm_phone, v_norm_secondary, nullif(trim(coalesce(p_customer_email, '')), ''),
    v_gov.id, v_gov.name_en, v_gov.name_ar,
    p_delivery_area_id, trim(p_city), trim(p_district), trim(p_full_address),
    trim(p_building_number), nullif(trim(coalesce(p_apartment_number, '')), ''),
    nullif(trim(coalesce(p_floor, '')), ''), nullif(trim(coalesce(p_delivery_notes, '')), ''),
    'COD', 'EGP', v_subtotal, v_discount_id, v_discount_code,
    v_discount_amount, v_shipping_fee, v_total_amount, 'NEW', true,
    case when p_locale = 'ar' then 'ar' else 'en' end
  )
  returning id into v_order_id;

  -- 12. Insert order items, deduct variant stock, record inventory movements & product sales count
  for v_item in select value from jsonb_array_elements(v_prepared_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_variant_id := (v_item->>'variant_id')::uuid;

    insert into public.order_items (
      order_id, product_id, variant_id,
      product_name_en, product_name_ar, product_slug, sku,
      size, color_name_en, color_name_ar, color_hex, image_url,
      unit_price, original_unit_price, quantity, line_total
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_variant_id,
      v_item->>'product_name_en',
      v_item->>'product_name_ar',
      v_item->>'product_slug',
      v_item->>'sku',
      v_item->>'size',
      v_item->>'color_name_en',
      v_item->>'color_name_ar',
      v_item->>'color_hex',
      v_item->>'image_url',
      (v_item->>'unit_price')::numeric,
      (v_item->>'original_unit_price')::numeric,
      v_qty,
      (v_item->>'line_total')::numeric
    );

    update public.product_variants
    set stock_quantity = stock_quantity - v_qty
    where id = v_variant_id;

    update public.products
    set sales_count = sales_count + v_qty,
        popularity_score = popularity_score + v_qty
    where id = (v_item->>'product_id')::uuid;

    insert into public.inventory_movements (
      product_id, variant_id, sku, movement_type,
      quantity_delta, previous_quantity, new_quantity, reason, order_id
    ) values (
      (v_item->>'product_id')::uuid,
      v_variant_id,
      v_item->>'sku',
      'ORDER_DEDUCTION',
      -v_qty,
      (v_item->>'prev_stock')::integer,
      (v_item->>'prev_stock')::integer - v_qty,
      'Order ' || v_order_number || ' created',
      v_order_id
    );
  end loop;

  -- 13. Record discount usage
  if v_discount_id is not null then
    update public.discounts
    set usage_count = usage_count + 1
    where id = v_discount_id;

    insert into public.discount_usages (discount_id, order_id, customer_phone, discount_amount)
    values (v_discount_id, v_order_id, v_norm_phone, v_discount_amount);
  end if;

  -- 14. Initial status history
  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order_id, null, 'NEW', 'Cash on Delivery order placed');

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', v_tracking_token,
    'subtotal', v_subtotal,
    'discount_amount', v_discount_amount,
    'shipping_fee', v_shipping_fee,
    'total_amount', v_total_amount,
    'status', 'NEW',
    'idempotent_replay', false
  );
end;
$$;

-- ==========================================
-- 3. ATOMIC ORDER STATUS TRANSITION & STOCK RESTORATION
-- ==========================================
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_note text default '',
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_variant record;
  v_should_restore boolean := false;
  v_should_deduct boolean := false;
  v_actor record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = p_new_status then
    return jsonb_build_object('id', v_order.id, 'status', v_order.status, 'changed', false);
  end if;

  -- Determine stock action using stock_deducted guard to prevent duplicate deductions/restorations
  if p_new_status in ('CANCELLED', 'RETURNED') and v_order.stock_deducted = true then
    v_should_restore := true;
  elsif p_new_status not in ('CANCELLED', 'RETURNED') and v_order.stock_deducted = false then
    v_should_deduct := true;
  end if;

  if v_should_restore then
    for v_item in select * from public.order_items where order_id = p_order_id and variant_id is not null loop
      select * into v_variant from public.product_variants where id = v_item.variant_id for update;
      if found then
        update public.product_variants
        set stock_quantity = stock_quantity + v_item.quantity
        where id = v_variant.id;

        insert into public.inventory_movements (
          product_id, variant_id, sku, movement_type,
          quantity_delta, previous_quantity, new_quantity, reason, order_id, created_by
        ) values (
          v_item.product_id, v_variant.id, v_item.sku,
          case when p_new_status = 'RETURNED' then 'RETURN'::inventory_movement_type else 'ORDER_RESTORATION'::inventory_movement_type end,
          v_item.quantity, v_variant.stock_quantity, v_variant.stock_quantity + v_item.quantity,
          'Order ' || v_order.order_number || ' moved to ' || p_new_status::text,
          p_order_id, p_actor_id
        );
      end if;
    end loop;

    update public.orders set stock_deducted = false where id = p_order_id;
  elsif v_should_deduct then
    for v_item in select * from public.order_items where order_id = p_order_id and variant_id is not null loop
      select * into v_variant from public.product_variants where id = v_item.variant_id for update;
      if found then
        if v_variant.stock_quantity < v_item.quantity then
          raise exception 'INSUFFICIENT_STOCK_TO_REACTIVATE:%', v_item.sku;
        end if;
        update public.product_variants
        set stock_quantity = stock_quantity - v_item.quantity
        where id = v_variant.id;

        insert into public.inventory_movements (
          product_id, variant_id, sku, movement_type,
          quantity_delta, previous_quantity, new_quantity, reason, order_id, created_by
        ) values (
          v_item.product_id, v_variant.id, v_item.sku, 'ORDER_DEDUCTION',
          -v_item.quantity, v_variant.stock_quantity, v_variant.stock_quantity - v_item.quantity,
          'Order ' || v_order.order_number || ' reactivated to ' || p_new_status::text,
          p_order_id, p_actor_id
        );
      end if;
    end loop;

    update public.orders set stock_deducted = true where id = p_order_id;
  end if;

  -- Update customer aggregates cleanly
  if v_order.customer_id is not null then
    if p_new_status = 'DELIVERED' and v_order.status <> 'DELIVERED' then
      update public.customers
      set delivered_orders = delivered_orders + 1,
          total_delivered_spent = total_delivered_spent + v_order.total_amount
      where id = v_order.customer_id;
    elsif v_order.status = 'DELIVERED' and p_new_status <> 'DELIVERED' then
      update public.customers
      set delivered_orders = greatest(0, delivered_orders - 1),
          total_delivered_spent = greatest(0, total_delivered_spent - v_order.total_amount)
      where id = v_order.customer_id;
    end if;

    if p_new_status = 'CANCELLED' and v_order.status <> 'CANCELLED' then
      update public.customers
      set cancelled_orders = cancelled_orders + 1
      where id = v_order.customer_id;
    elsif v_order.status = 'CANCELLED' and p_new_status <> 'CANCELLED' then
      update public.customers
      set cancelled_orders = greatest(0, cancelled_orders - 1)
      where id = v_order.customer_id;
    end if;
  end if;

  -- Update order status and timestamps
  update public.orders
  set status = p_new_status,
      confirmed_at = case when p_new_status = 'CONFIRMED' and confirmed_at is null then now() else confirmed_at end,
      shipped_at = case when p_new_status = 'SHIPPED' and shipped_at is null then now() else shipped_at end,
      delivered_at = case when p_new_status = 'DELIVERED' and delivered_at is null then now() else delivered_at end,
      cancelled_at = case when p_new_status = 'CANCELLED' and cancelled_at is null then now() else cancelled_at end
  where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_order.status, p_new_status, coalesce(p_note, ''), p_actor_id);

  if p_actor_id is not null then
    select email, role::text as role into v_actor from public.profiles where id = p_actor_id;
    insert into public.audit_logs (actor_id, actor_email, actor_role, action, entity_type, entity_id, metadata)
    values (
      p_actor_id, v_actor.email, v_actor.role,
      'ORDER_STATUS_CHANGED', 'order', p_order_id::text,
      jsonb_build_object('order_number', v_order.order_number, 'from', v_order.status, 'to', p_new_status, 'note', coalesce(p_note, ''))
    );
  end if;

  return jsonb_build_object('id', v_order.id, 'from', v_order.status, 'to', p_new_status, 'changed', true);
end;
$$;

-- ==========================================
-- 4. ATOMIC MANUAL STOCK ADJUSTMENT
-- ==========================================
create or replace function public.adjust_variant_stock(
  p_variant_id uuid,
  p_new_quantity integer,
  p_movement_type inventory_movement_type,
  p_reason text,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant record;
  v_delta integer;
  v_actor record;
begin
  if p_new_quantity < 0 then
    raise exception 'STOCK_CANNOT_BE_NEGATIVE';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'ADJUSTMENT_REASON_REQUIRED';
  end if;

  select * into v_variant from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'VARIANT_NOT_FOUND';
  end if;

  v_delta := p_new_quantity - v_variant.stock_quantity;

  update public.product_variants
  set stock_quantity = p_new_quantity
  where id = p_variant_id;

  insert into public.inventory_movements (
    product_id, variant_id, sku, movement_type,
    quantity_delta, previous_quantity, new_quantity, reason, created_by
  ) values (
    v_variant.product_id, v_variant.id, v_variant.sku, p_movement_type,
    v_delta, v_variant.stock_quantity, p_new_quantity, trim(p_reason), p_actor_id
  );

  if p_actor_id is not null then
    select email, role::text as role into v_actor from public.profiles where id = p_actor_id;
    insert into public.audit_logs (actor_id, actor_email, actor_role, action, entity_type, entity_id, metadata)
    values (
      p_actor_id, v_actor.email, v_actor.role,
      'INVENTORY_ADJUSTED', 'product_variant', p_variant_id::text,
      jsonb_build_object('sku', v_variant.sku, 'previous', v_variant.stock_quantity, 'new', p_new_quantity, 'reason', trim(p_reason))
    );
  end if;

  return jsonb_build_object('variant_id', v_variant.id, 'previous_quantity', v_variant.stock_quantity, 'new_quantity', p_new_quantity);
end;
$$;

-- ==========================================
-- 5. SAFE PUBLIC ORDER TRACKING RPC
-- ==========================================
create or replace function public.track_customer_order(
  p_order_number text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm_phone text;
  v_order record;
  v_items jsonb;
  v_history jsonb;
begin
  v_norm_phone := public.normalize_egypt_phone(p_phone);
  if v_norm_phone = '' or coalesce(trim(p_order_number), '') = '' then
    return null;
  end if;

  select id, order_number, status, payment_method, currency,
         subtotal, discount_amount, shipping_fee, total_amount,
         governorate_name_en, governorate_name_ar, city, district,
         created_at, confirmed_at, shipped_at, delivered_at, cancelled_at
  into v_order
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
    and customer_phone = v_norm_phone
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name_en', product_name_en,
    'product_name_ar', product_name_ar,
    'sku', sku,
    'size', size,
    'color_name_en', color_name_en,
    'color_name_ar', color_name_ar,
    'image_url', image_url,
    'unit_price', unit_price,
    'quantity', quantity,
    'line_total', line_total
  )), '[]'::jsonb)
  into v_items
  from public.order_items
  where order_id = v_order.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'to_status', to_status,
    'created_at', created_at
  ) order by created_at asc), '[]'::jsonb)
  into v_history
  from public.order_status_history
  where order_id = v_order.id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_method', v_order.payment_method,
    'currency', v_order.currency,
    'subtotal', v_order.subtotal,
    'discount_amount', v_order.discount_amount,
    'shipping_fee', v_order.shipping_fee,
    'total_amount', v_order.total_amount,
    'governorate_name_en', v_order.governorate_name_en,
    'governorate_name_ar', v_order.governorate_name_ar,
    'city', v_order.city,
    'district', v_order.district,
    'created_at', v_order.created_at,
    'confirmed_at', v_order.confirmed_at,
    'shipped_at', v_order.shipped_at,
    'delivered_at', v_order.delivered_at,
    'cancelled_at', v_order.cancelled_at,
    'items', v_items,
    'history', v_history
  );
end;
$$;
