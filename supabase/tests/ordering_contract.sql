begin;

select plan(18);

select has_function(
  'public',
  'create_order',
  array['jsonb', 'uuid'],
  'create_order(jsonb, uuid) exists'
);

insert into public.products (
  id,
  name,
  slug,
  description,
  category,
  ingredients,
  price_cents,
  active,
  available,
  sort_order
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Salada contrato',
    'salada-contrato',
    'Produto ativo usado pelo contrato do RPC.',
    'salad',
    array['alface', 'tomate'],
    2500,
    true,
    true,
    1
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Salada inativa contrato',
    'salada-inativa-contrato',
    'Este produto nunca pode aparecer para o público.',
    'salad',
    array['alface'],
    100,
    false,
    true,
    2
  );

insert into public.combos (
  id,
  name,
  slug,
  description,
  minimum_delivery_count,
  discount_type,
  discount_value,
  active,
  sort_order
)
values (
  '20000000-0000-4000-8000-000000000001',
  'Combo contrato',
  'combo-contrato',
  'Exige duas datas distintas.',
  2,
  'percentage',
  10,
  true,
  1
);

insert into public.combo_products (combo_id, product_id)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.delivery_days (
  id,
  delivery_date,
  enabled,
  capacity,
  reserved_quantity,
  delivery_window_start,
  delivery_window_end,
  fee_override_cents,
  cutoff_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    (date_trunc('week',now() at time zone 'America/Sao_Paulo') + interval '7 days')::date,
    true,
    10,
    0,
    '11:00',
    '14:00',
    600,
    now() + interval '12 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    (date_trunc('week',now() at time zone 'America/Sao_Paulo') + interval '8 days')::date,
    false,
    10,
    0,
    '11:00',
    '14:00',
    600,
    now() + interval '36 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    (date_trunc('week',now() at time zone 'America/Sao_Paulo') + interval '9 days')::date,
    true,
    1,
    1,
    '11:00',
    '14:00',
    600,
    now() + interval '60 hours'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    (date_trunc('week',now() at time zone 'America/Sao_Paulo') + interval '10 days')::date,
    true,
    10,
    0,
    '11:00',
    '14:00',
    600,
    now() + interval '84 hours'
  );

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'customer-contract@youfit.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'admin-contract@youfit.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

update public.profiles
set role = 'admin'
where id = '40000000-0000-4000-8000-000000000002';

set local role anon;

select is(
  (
    select count(*)
    from public.products
    where id in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  ),
  1::bigint,
  'anonymous reads expose only active catalog rows'
);

select throws_like(
  $$select count(*) from public.orders$$,
  '%permission denied%',
  'anonymous users cannot read orders'
);

select lives_ok(
  $call$
    select public.create_order(
      $json$
      {
        "customer":{"name":"Cliente Contrato","phone":"(11) 99999-0001"},
        "address":{"street":"Rua Verde","number":"10","neighborhood":"Centro"},
        "deliveries":[{
          "delivery_day_id":"30000000-0000-4000-8000-000000000001",
          "items":[{
            "product_id":"10000000-0000-4000-8000-000000000001",
            "quantity":1,
            "unit_price_cents":1
          }]
        }]
      }
      $json$::jsonb,
      '50000000-0000-4000-8000-000000000001'
    )
  $call$,
  'a valid anonymous order is accepted'
);

reset role;

select is(
  (
    select total_cents
    from public.orders
    where idempotency_key = '50000000-0000-4000-8000-000000000001'
  ),
  3100,
  'database price wins over a forged client price'
);

set local role anon;

select throws_like(
  $call$
    select public.create_order(
      '{"customer":{"name":"Cliente Contrato","phone":"11999990002"},"address":{"street":"Rua Verde","number":"11","neighborhood":"Centro"},"deliveries":[{"delivery_day_id":"30000000-0000-4000-8000-000000000002","items":[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]}]}'::jsonb,
      '50000000-0000-4000-8000-000000000002'
    )
  $call$,
  '%delivery day is unavailable%',
  'disabled delivery day is rejected'
);

select throws_like(
  $call$
    select public.create_order(
      '{"customer":{"name":"Cliente Contrato","phone":"11999990003"},"address":{"street":"Rua Verde","number":"12","neighborhood":"Centro"},"deliveries":[{"delivery_day_id":"30000000-0000-4000-8000-000000000003","items":[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]}]}'::jsonb,
      '50000000-0000-4000-8000-000000000003'
    )
  $call$,
  '%delivery day is full%',
  'full delivery day is rejected'
);

select lives_ok(
  $call$
    select public.create_order(
      '{"customer":{"name":"Outro nome ignorado","phone":"11900000000"},"address":{"street":"Outra rua","number":"999","neighborhood":"Outro"},"deliveries":[{"delivery_day_id":"30000000-0000-4000-8000-000000000004","items":[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":10}]}]}'::jsonb,
      '50000000-0000-4000-8000-000000000001'
    )
  $call$,
  'idempotency key returns the original order'
);

reset role;

select is(
  (
    select count(*)
    from public.orders
    where idempotency_key = '50000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotency creates exactly one order'
);

select is(
  (
    select reserved_quantity
    from public.delivery_days
    where id = '30000000-0000-4000-8000-000000000001'
  ),
  1,
  'idempotent retries reserve capacity once'
);

set local role anon;

select throws_like(
  $call$
    select public.create_order(
      '{"customer":{"name":"Cliente Combo","phone":"11999990004"},"address":{"street":"Rua Verde","number":"13","neighborhood":"Centro"},"deliveries":[{"delivery_day_id":"30000000-0000-4000-8000-000000000004","items":[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1,"combo_id":"20000000-0000-4000-8000-000000000001"}]}]}'::jsonb,
      '50000000-0000-4000-8000-000000000004'
    )
  $call$,
  '%combo minimum delivery count is not met%',
  'combo minimum delivery count is enforced'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.products set name = 'Ataque' where id = '10000000-0000-4000-8000-000000000001'$$,
  'a non-admin update is filtered by RLS'
);

reset role;

select is(
  (
    select name
    from public.products
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'Salada contrato',
  'non-admin cannot mutate catalog'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.products set name = 'Salada contrato admin' where id = '10000000-0000-4000-8000-000000000001'$$,
  'an admin profile can update catalog data'
);

reset role;

select is(
  (
    select name
    from public.products
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'Salada contrato admin',
  'admin catalog update is persisted'
);

select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'create_order'
      and grantee = 'PUBLIC'
  ),
  0::bigint,
  'PUBLIC cannot execute create_order through a default grant'
);

select is(
  (
    select count(*)
    from information_schema.routine_privileges
    where routine_schema = 'private'
      and routine_name = 'is_admin'
      and grantee in ('PUBLIC', 'anon')
  ),
  0::bigint,
  'admin helper has no public or anonymous execution grant'
);

select is(
  (
    select count(*)
    from public.order_deliveries
    where order_id = (
      select id
      from public.orders
      where idempotency_key = '50000000-0000-4000-8000-000000000001'
    )
  ),
  1::bigint,
  'order creation writes its delivery atomically'
);

select * from finish();
rollback;
