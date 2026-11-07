create or replace function private.build_order_receipt(target_order_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'order_id', public.orders.id,
    'order_number', public.orders.order_number,
    'status', public.orders.status,
    'subtotal_cents', public.orders.subtotal_cents,
    'discount_cents', public.orders.discount_cents,
    'delivery_fee_cents', public.orders.delivery_fee_cents,
    'total_cents', public.orders.total_cents,
    'payment_summary', public.orders.payment_summary_snapshot,
    'created_at', public.orders.created_at,
    'customer', pg_catalog.jsonb_build_object('name',public.orders.customer_name,'phone',public.orders.customer_phone),
    'address', pg_catalog.jsonb_build_object('street',public.orders.address_street,'number',public.orders.address_number,'neighborhood',public.orders.address_neighborhood,'complement',public.orders.address_complement,'reference',public.orders.address_reference),
    'customer_notes', public.orders.customer_notes,
    'deliveries', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'delivery_date', public.order_deliveries.delivery_date,
            'fee_cents', public.order_deliveries.fee_cents,
            'status', public.order_deliveries.status,
            'items', coalesce(
              (
                select pg_catalog.jsonb_agg(
                  pg_catalog.jsonb_build_object(
                    'product_name', public.order_items.product_name,
                    'unit_price_cents', public.order_items.unit_price_cents,
                    'quantity', public.order_items.quantity,
                    'line_total_cents', public.order_items.line_total_cents,
                    'combo_name', public.order_items.combo_name,
                    'notes', public.order_items.customer_notes
                  )
                  order by public.order_items.created_at, public.order_items.id
                )
                from public.order_items
                where public.order_items.order_delivery_id = public.order_deliveries.id
              ),
              '[]'::jsonb
            )
          )
          order by public.order_deliveries.delivery_date
        )
        from public.order_deliveries
        where public.order_deliveries.order_id = public.orders.id
      ),
      '[]'::jsonb
    )
  )
  from public.orders
  where public.orders.id = target_order_id;
$$;

revoke all on function private.build_order_receipt(uuid) from public, anon, authenticated;

create or replace function public.create_order(payload jsonb, idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_idempotency_key alias for $2;
  customer jsonb;
  address jsonb;
  deliveries jsonb;
  delivery_json jsonb;
  item_json jsonb;
  v_customer_name text;
  v_customer_phone_digits text;
  v_customer_phone text;
  v_address_street text;
  v_address_number text;
  v_address_neighborhood text;
  v_address_complement text;
  v_address_reference text;
  v_customer_notes text;
  selected_day_ids uuid[] := '{}'::uuid[];
  selected_combo_ids uuid[] := '{}'::uuid[];
  v_delivery_day_id uuid;
  v_product_id uuid;
  v_combo_id uuid;
  item_quantity integer;
  item_notes text;
  item_combo_name text;
  locked_day_count integer := 0;
  total_item_quantity integer := 0;
  recent_order_count integer;
  subtotal integer := 0;
  discount integer := 0;
  delivery_fee integer := 0;
  combo_date_count integer;
  combo_subtotal integer;
  v_order_id uuid;
  v_order_delivery_id uuid;
  v_order_number text;
  summary_lines text;
  payment_summary text;
  settings public.business_settings%rowtype;
  existing_order public.orders%rowtype;
  delivery_day public.delivery_days%rowtype;
  product public.products%rowtype;
  combo public.combos%rowtype;
  combo_eligibility record;
begin
  if request_idempotency_key is null then
    raise exception 'idempotency key is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(request_idempotency_key::text, 0)
  );

  select public.orders.*
  into existing_order
  from public.orders
  where public.orders.idempotency_key = request_idempotency_key;

  if found then
    return private.build_order_receipt(existing_order.id);
  end if;

  if payload is null or pg_catalog.jsonb_typeof(payload) <> 'object' then
    raise exception 'invalid order payload';
  end if;

  customer := payload -> 'customer';
  address := payload -> 'address';
  deliveries := payload -> 'deliveries';

  if pg_catalog.jsonb_typeof(customer) <> 'object'
    or pg_catalog.jsonb_typeof(address) <> 'object'
    or pg_catalog.jsonb_typeof(deliveries) <> 'array'
  then
    raise exception 'invalid order payload';
  end if;

  if pg_catalog.jsonb_array_length(deliveries) not between 1 and 7 then
    raise exception 'order must include between one and seven deliveries';
  end if;

  v_customer_name := pg_catalog.btrim(coalesce(customer ->> 'name', ''));
  v_customer_phone_digits := pg_catalog.regexp_replace(
    coalesce(customer ->> 'phone', ''),
    '[^0-9]',
    '',
    'g'
  );

  if pg_catalog.char_length(v_customer_name) not between 2 and 120 then
    raise exception 'customer name is invalid';
  end if;

  if pg_catalog.char_length(v_customer_phone_digits) in (10, 11) then
    v_customer_phone_digits := '55' || v_customer_phone_digits;
  elsif not (
    v_customer_phone_digits like '55%'
    and pg_catalog.char_length(v_customer_phone_digits) in (12, 13)
  ) then
    raise exception 'customer phone is invalid';
  end if;
  v_customer_phone := '+' || v_customer_phone_digits;

  v_address_street := pg_catalog.btrim(coalesce(address ->> 'street', ''));
  v_address_number := pg_catalog.btrim(coalesce(address ->> 'number', ''));
  v_address_neighborhood := pg_catalog.btrim(coalesce(address ->> 'neighborhood', ''));
  v_address_complement := pg_catalog.btrim(coalesce(address ->> 'complement', ''));
  v_address_reference := pg_catalog.btrim(coalesce(address ->> 'reference', ''));
  v_customer_notes := pg_catalog.btrim(coalesce(payload ->> 'notes', ''));

  if pg_catalog.char_length(v_address_street) not between 2 and 160
    or pg_catalog.char_length(v_address_number) not between 1 and 30
    or pg_catalog.char_length(v_address_neighborhood) not between 2 and 100
    or pg_catalog.char_length(v_address_complement) > 120
    or pg_catalog.char_length(v_address_reference) > 200
    or pg_catalog.char_length(v_customer_notes) > 1000
  then
    raise exception 'delivery address is invalid';
  end if;

  select public.business_settings.*
  into settings
  from public.business_settings
  where public.business_settings.id = 1;

  if not found then
    raise exception 'business settings are unavailable';
  end if;

  select pg_catalog.count(*)
  into recent_order_count
  from public.orders
  where public.orders.customer_phone = v_customer_phone
    and public.orders.created_at > pg_catalog.now() - interval '15 minutes';

  if recent_order_count >= 5 then
    raise exception 'too many recent orders for this phone';
  end if;

  for delivery_json in
    select value
    from pg_catalog.jsonb_array_elements(deliveries)
  loop
    if pg_catalog.jsonb_typeof(delivery_json) <> 'object'
      or coalesce(delivery_json ->> 'delivery_day_id', '')
        !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then
      raise exception 'delivery day is invalid';
    end if;

    v_delivery_day_id := (delivery_json ->> 'delivery_day_id')::uuid;
    if v_delivery_day_id = any(selected_day_ids) then
      raise exception 'delivery day is duplicated';
    end if;
    selected_day_ids := pg_catalog.array_append(selected_day_ids, v_delivery_day_id);

    if pg_catalog.jsonb_typeof(delivery_json -> 'items') <> 'array'
      or pg_catalog.jsonb_array_length(delivery_json -> 'items') not between 1 and 20
    then
      raise exception 'each delivery must include between one and twenty items';
    end if;

    for item_json in
      select value
      from pg_catalog.jsonb_array_elements(delivery_json -> 'items')
    loop
      if pg_catalog.jsonb_typeof(item_json) <> 'object'
        or coalesce(item_json ->> 'product_id', '')
          !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        or coalesce(item_json ->> 'quantity', '') !~ '^[0-9]+$'
      then
        raise exception 'order item is invalid';
      end if;

      v_product_id := (item_json ->> 'product_id')::uuid;
      item_quantity := (item_json ->> 'quantity')::integer;
      item_notes := pg_catalog.btrim(coalesce(item_json ->> 'notes', ''));

      if item_quantity not between 1 and 20
        or pg_catalog.char_length(item_notes) > 500
      then
        raise exception 'order item is invalid';
      end if;

      total_item_quantity := total_item_quantity + item_quantity;
      if total_item_quantity > 100 then
        raise exception 'order item quantity limit exceeded';
      end if;

      select public.products.*
      into product
      from public.products
      where public.products.id = v_product_id
        and public.products.active
        and public.products.available;

      if not found then
        raise exception 'product is unavailable';
      end if;

      subtotal := subtotal + (product.price_cents * item_quantity);

      if item_json ? 'combo_id' and item_json ->> 'combo_id' is not null then
        if (item_json ->> 'combo_id')
          !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        then
          raise exception 'combo is invalid';
        end if;

        v_combo_id := (item_json ->> 'combo_id')::uuid;
        select
          public.combos.*,
          public.combo_products.minimum_quantity,
          public.combo_products.maximum_quantity
        into combo_eligibility
        from public.combos
        join public.combo_products
          on public.combo_products.combo_id = public.combos.id
        where public.combos.id = v_combo_id
          and public.combo_products.product_id = v_product_id
          and public.combos.active;

        if not found
          or item_quantity < combo_eligibility.minimum_quantity
          or (
            combo_eligibility.maximum_quantity is not null
            and item_quantity > combo_eligibility.maximum_quantity
          )
        then
          raise exception 'product is not eligible for combo';
        end if;

        if not v_combo_id = any(selected_combo_ids) then
          selected_combo_ids := pg_catalog.array_append(selected_combo_ids, v_combo_id);
        end if;
      end if;
    end loop;
  end loop;

  for delivery_day in
    select public.delivery_days.*
    from public.delivery_days
    where public.delivery_days.id = any(selected_day_ids)
    order by public.delivery_days.id
    for update
  loop
    locked_day_count := locked_day_count + 1;

    if not delivery_day.enabled
      or delivery_day.delivery_date < (pg_catalog.date_trunc('week',pg_catalog.now() at time zone 'America/Sao_Paulo') + interval '7 days')::date
      or delivery_day.delivery_date >= (pg_catalog.date_trunc('week',pg_catalog.now() at time zone 'America/Sao_Paulo') + interval '14 days')::date
      or coalesce(delivery_day.cutoff_at, ((delivery_day.delivery_date + delivery_day.delivery_window_start) at time zone 'America/Sao_Paulo') - pg_catalog.make_interval(hours => settings.default_cutoff_hours)) <= pg_catalog.now()
    then
      raise exception 'delivery day is unavailable';
    end if;

    if delivery_day.reserved_quantity >= delivery_day.capacity then
      raise exception 'delivery day is full';
    end if;

    delivery_fee := delivery_fee + coalesce(
      delivery_day.fee_override_cents,
      settings.default_delivery_fee_cents
    );
  end loop;

  if locked_day_count <> pg_catalog.cardinality(selected_day_ids) then
    raise exception 'delivery day is unavailable';
  end if;

  foreach v_combo_id in array selected_combo_ids
  loop
    select public.combos.*
    into combo
    from public.combos
    where public.combos.id = v_combo_id
      and public.combos.active;

    if not found then
      raise exception 'combo is unavailable';
    end if;

    select
      pg_catalog.count(distinct (delivery_entry ->> 'delivery_day_id')),
      coalesce(
        pg_catalog.sum(public.products.price_cents * (item_entry ->> 'quantity')::integer),
        0
      )
    into combo_date_count, combo_subtotal
    from pg_catalog.jsonb_array_elements(deliveries) as delivery_entries(delivery_entry)
    cross join lateral pg_catalog.jsonb_array_elements(delivery_entry -> 'items') as item_entries(item_entry)
    join public.products
      on public.products.id = (item_entry ->> 'product_id')::uuid
    where item_entry ->> 'combo_id' = v_combo_id::text;

    if combo_date_count < combo.minimum_delivery_count then
      raise exception 'combo minimum delivery count is not met';
    end if;

    if combo.discount_type = 'percentage' then
      discount := discount + pg_catalog.floor(
        combo_subtotal::numeric * combo.discount_value::numeric / 100
      )::integer;
    else
      discount := discount + least(combo_subtotal, combo.discount_value);
    end if;
  end loop;

  if discount > subtotal then
    raise exception 'calculated discount is invalid';
  end if;

  insert into public.orders (
    idempotency_key,
    customer_name,
    customer_phone,
    address_street,
    address_number,
    address_neighborhood,
    address_complement,
    address_reference,
    customer_notes,
    status,
    subtotal_cents,
    discount_cents,
    delivery_fee_cents,
    total_cents,
    payment_summary_snapshot
  )
  values (
    request_idempotency_key,
    v_customer_name,
    v_customer_phone,
    v_address_street,
    v_address_number,
    v_address_neighborhood,
    v_address_complement,
    v_address_reference,
    v_customer_notes,
    'awaiting_pix',
    subtotal,
    discount,
    delivery_fee,
    subtotal - discount + delivery_fee,
    ''
  )
  returning public.orders.id, public.orders.order_number
  into v_order_id, v_order_number;

  for delivery_json in
    select value
    from pg_catalog.jsonb_array_elements(deliveries)
  loop
    v_delivery_day_id := (delivery_json ->> 'delivery_day_id')::uuid;

    select public.delivery_days.*
    into delivery_day
    from public.delivery_days
    where public.delivery_days.id = v_delivery_day_id;

    insert into public.order_deliveries (
      order_id,
      delivery_day_id,
      delivery_date,
      fee_cents
    )
    values (
      v_order_id,
      delivery_day.id,
      delivery_day.delivery_date,
      coalesce(delivery_day.fee_override_cents, settings.default_delivery_fee_cents)
    )
    returning public.order_deliveries.id into v_order_delivery_id;

    for item_json in
      select value
      from pg_catalog.jsonb_array_elements(delivery_json -> 'items')
    loop
      v_product_id := (item_json ->> 'product_id')::uuid;
      item_quantity := (item_json ->> 'quantity')::integer;
      item_notes := pg_catalog.btrim(coalesce(item_json ->> 'notes', ''));

      select public.products.*
      into product
      from public.products
      where public.products.id = v_product_id;

      v_combo_id := null;
      item_combo_name := null;
      if item_json ? 'combo_id' and item_json ->> 'combo_id' is not null then
        v_combo_id := (item_json ->> 'combo_id')::uuid;
        select public.combos.*
        into combo
        from public.combos
        where public.combos.id = v_combo_id;
        item_combo_name := combo.name;
      end if;

      insert into public.order_items (
        order_delivery_id,
        product_id,
        product_name,
        unit_price_cents,
        quantity,
        line_total_cents,
        combo_id,
        combo_name,
        customer_notes
      )
      values (
        v_order_delivery_id,
        product.id,
        product.name,
        product.price_cents,
        item_quantity,
        product.price_cents * item_quantity,
        v_combo_id,
        item_combo_name,
        item_notes
      );
    end loop;
  end loop;

  update public.delivery_days
  set reserved_quantity = public.delivery_days.reserved_quantity + 1
  where public.delivery_days.id = any(selected_day_ids);

  select pg_catalog.string_agg(
    pg_catalog.format(
      '%s - %sx %s%s',
      pg_catalog.to_char(public.order_deliveries.delivery_date, 'DD/MM/YYYY'),
      public.order_items.quantity,
      public.order_items.product_name,
      case
        when public.order_items.combo_name is null then ''
        else ' (' || public.order_items.combo_name || ')'
      end
    ),
    pg_catalog.chr(10)
    order by public.order_deliveries.delivery_date, public.order_items.created_at
  )
  into summary_lines
  from public.order_deliveries
  join public.order_items
    on public.order_items.order_delivery_id = public.order_deliveries.id
  where public.order_deliveries.order_id = v_order_id;

  payment_summary := pg_catalog.format(
    'Pedido %s - %s (%s)%sEndereço: %s, %s - %s%sEntregas:%s%s%sSubtotal: R$ %s,%s%sDesconto: R$ %s,%s%sEntrega: R$ %s,%s%sTotal: R$ %s,%s%sPix (%s): %s%sFavorecido: %s%s%s',
    v_order_number,
    v_customer_name,
    v_customer_phone,
    pg_catalog.chr(10),
    v_address_street,
    v_address_number,
    v_address_neighborhood,
    pg_catalog.chr(10),
    pg_catalog.chr(10),
    coalesce(summary_lines, ''),
    pg_catalog.chr(10),
    subtotal / 100,
    pg_catalog.lpad((subtotal % 100)::text, 2, '0'),
    pg_catalog.chr(10),
    discount / 100,
    pg_catalog.lpad((discount % 100)::text, 2, '0'),
    pg_catalog.chr(10),
    delivery_fee / 100,
    pg_catalog.lpad((delivery_fee % 100)::text, 2, '0'),
    pg_catalog.chr(10),
    (subtotal - discount + delivery_fee) / 100,
    pg_catalog.lpad(((subtotal - discount + delivery_fee) % 100)::text, 2, '0'),
    pg_catalog.chr(10),
    settings.pix_key_type,
    settings.pix_key,
    pg_catalog.chr(10),
    settings.pix_recipient,
    pg_catalog.chr(10),
    settings.payment_instructions
  );

  update public.orders
  set payment_summary_snapshot = payment_summary
    || case when v_address_complement <> '' then pg_catalog.chr(10) || 'Complemento: ' || v_address_complement else '' end
    || case when v_address_reference <> '' then pg_catalog.chr(10) || 'Referência: ' || v_address_reference else '' end
    || case when v_customer_notes <> '' then pg_catalog.chr(10) || 'Observações: ' || v_customer_notes else '' end
  where public.orders.id = v_order_id;

  return private.build_order_receipt(v_order_id);
end;
$$;

revoke all on function public.create_order(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, uuid) to anon, authenticated;
