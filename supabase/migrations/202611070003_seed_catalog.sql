insert into public.business_settings (
  id,
  business_name,
  whatsapp_phone,
  pix_key,
  pix_key_type,
  pix_recipient,
  default_delivery_fee_cents,
  default_cutoff_hours,
  delivery_notice,
  payment_instructions
)
values (
  1,
  'YouFit',
  '+5500000000000',
  'CONFIGURE_SUA_CHAVE_PIX',
  'random',
  'YouFit',
  500,
  24,
  'Entregas em domicílio nos dias disponíveis da próxima semana.',
  'Envie o comprovante pelo WhatsApp. Antes de publicar, configure o Pix e o WhatsApp no admin.'
)
on conflict (id) do update
set
  business_name = excluded.business_name,
  whatsapp_phone = excluded.whatsapp_phone,
  pix_key = excluded.pix_key,
  pix_key_type = excluded.pix_key_type,
  pix_recipient = excluded.pix_recipient,
  default_delivery_fee_cents = excluded.default_delivery_fee_cents,
  default_cutoff_hours = excluded.default_cutoff_hours,
  delivery_notice = excluded.delivery_notice,
  payment_instructions = excluded.payment_instructions;

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
    '11111111-1111-4111-8111-111111111101',
    'Salada de Frango Grelhado',
    'salada-frango-grelhado',
    'Frango grelhado, alface, rúcula, tomate, cenoura e pepino.',
    'salad',
    array['frango grelhado', 'alface', 'rúcula', 'tomate', 'cenoura', 'pepino'],
    2490,
    true,
    true,
    10
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Salada de Ovo e Milho',
    'salada-ovo-milho',
    'Ovo cozido, milho, alface, tomate, cenoura e beterraba.',
    'salad',
    array['ovo', 'milho', 'alface', 'tomate', 'cenoura', 'beterraba'],
    2190,
    true,
    true,
    20
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Salada de Atum',
    'salada-atum',
    'Atum, alface, rúcula, tomate, pepino e milho.',
    'salad',
    array['atum', 'alface', 'rúcula', 'tomate', 'pepino', 'milho'],
    2590,
    true,
    true,
    30
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Salada Horta Vegetariana',
    'salada-horta-vegetariana',
    'Grão-de-bico, alface, rúcula, tomate, cenoura, pepino e beterraba.',
    'salad',
    array['grão-de-bico', 'alface', 'rúcula', 'tomate', 'cenoura', 'pepino', 'beterraba'],
    2090,
    true,
    true,
    40
  ),
  (
    '11111111-1111-4111-8111-111111111201',
    'Frango Grelhado Extra',
    'frango-grelhado-extra',
    'Porção extra de frango grelhado.',
    'protein',
    array['frango grelhado'],
    750,
    true,
    true,
    110
  ),
  (
    '11111111-1111-4111-8111-111111111202',
    'Atum Extra',
    'atum-extra',
    'Porção extra de atum.',
    'protein',
    array['atum'],
    850,
    true,
    true,
    120
  ),
  (
    '11111111-1111-4111-8111-111111111203',
    'Ovo Cozido',
    'ovo-cozido',
    'Uma unidade de ovo cozido.',
    'protein',
    array['ovo'],
    300,
    true,
    true,
    130
  ),
  (
    '11111111-1111-4111-8111-111111111204',
    'Grão-de-bico Extra',
    'grao-de-bico-extra',
    'Porção extra de grão-de-bico.',
    'protein',
    array['grão-de-bico'],
    450,
    true,
    true,
    140
  ),
  (
    '11111111-1111-4111-8111-111111111301',
    'Alface Extra',
    'alface-extra',
    'Porção extra de alface fresca.',
    'extra',
    array['alface'],
    250,
    true,
    true,
    210
  ),
  (
    '11111111-1111-4111-8111-111111111302',
    'Rúcula Extra',
    'rucula-extra',
    'Porção extra de rúcula fresca.',
    'extra',
    array['rúcula'],
    300,
    true,
    true,
    220
  ),
  (
    '11111111-1111-4111-8111-111111111303',
    'Tomate Extra',
    'tomate-extra',
    'Porção extra de tomate.',
    'extra',
    array['tomate'],
    300,
    true,
    true,
    230
  ),
  (
    '11111111-1111-4111-8111-111111111304',
    'Cenoura Extra',
    'cenoura-extra',
    'Porção extra de cenoura ralada.',
    'extra',
    array['cenoura'],
    250,
    true,
    true,
    240
  ),
  (
    '11111111-1111-4111-8111-111111111305',
    'Pepino Extra',
    'pepino-extra',
    'Porção extra de pepino.',
    'extra',
    array['pepino'],
    300,
    true,
    true,
    250
  ),
  (
    '11111111-1111-4111-8111-111111111306',
    'Beterraba Extra',
    'beterraba-extra',
    'Porção extra de beterraba.',
    'extra',
    array['beterraba'],
    300,
    true,
    true,
    260
  ),
  (
    '11111111-1111-4111-8111-111111111307',
    'Milho Extra',
    'milho-extra',
    'Porção extra de milho.',
    'extra',
    array['milho'],
    300,
    true,
    true,
    270
  ),
  (
    '11111111-1111-4111-8111-111111111401',
    'Molho de Iogurte e Ervas',
    'molho-iogurte-ervas',
    'Molho leve de iogurte com ervas.',
    'dressing',
    array['iogurte', 'ervas'],
    250,
    true,
    true,
    310
  ),
  (
    '11111111-1111-4111-8111-111111111402',
    'Molho Mostarda e Mel',
    'molho-mostarda-mel',
    'Molho agridoce de mostarda e mel.',
    'dressing',
    array['mostarda', 'mel'],
    250,
    true,
    true,
    320
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  category = excluded.category,
  ingredients = excluded.ingredients,
  price_cents = excluded.price_cents,
  active = excluded.active,
  available = excluded.available,
  sort_order = excluded.sort_order;

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
values
  (
    '22222222-2222-4222-8222-222222222103',
    'Combo 3 Dias',
    'combo-3-dias',
    'Escolha saladas para pelo menos três dias disponíveis e ganhe 8% de desconto.',
    3,
    'percentage',
    8,
    true,
    10
  ),
  (
    '22222222-2222-4222-8222-222222222105',
    'Combo 5 Dias',
    'combo-5-dias',
    'Escolha saladas para cinco dias disponíveis e ganhe 12% de desconto.',
    5,
    'percentage',
    12,
    true,
    20
  )
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  minimum_delivery_count = excluded.minimum_delivery_count,
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.combo_products (combo_id, product_id)
select combo_id, product_id
from (
  values
    ('22222222-2222-4222-8222-222222222103'::uuid, '11111111-1111-4111-8111-111111111101'::uuid),
    ('22222222-2222-4222-8222-222222222103'::uuid, '11111111-1111-4111-8111-111111111102'::uuid),
    ('22222222-2222-4222-8222-222222222103'::uuid, '11111111-1111-4111-8111-111111111103'::uuid),
    ('22222222-2222-4222-8222-222222222103'::uuid, '11111111-1111-4111-8111-111111111104'::uuid),
    ('22222222-2222-4222-8222-222222222105'::uuid, '11111111-1111-4111-8111-111111111101'::uuid),
    ('22222222-2222-4222-8222-222222222105'::uuid, '11111111-1111-4111-8111-111111111102'::uuid),
    ('22222222-2222-4222-8222-222222222105'::uuid, '11111111-1111-4111-8111-111111111103'::uuid),
    ('22222222-2222-4222-8222-222222222105'::uuid, '11111111-1111-4111-8111-111111111104'::uuid)
) as eligible(combo_id, product_id)
on conflict (combo_id, product_id) do nothing;

with next_week as (
  select (
    current_date + (8 - extract(isodow from current_date)::integer)
  )::date as monday
)
insert into public.delivery_days (
  id,
  delivery_date,
  enabled,
  capacity,
  reserved_quantity,
  delivery_window_start,
  delivery_window_end,
  fee_override_cents,
  cutoff_at,
  admin_note
)
select
  seeded.id,
  next_week.monday + seeded.day_offset,
  true,
  30,
  0,
  '11:00'::time,
  '14:00'::time,
  seeded.fee_cents,
  ((next_week.monday + seeded.day_offset - 1) + '18:00'::time) at time zone 'America/Sao_Paulo',
  'Exemplo inicial; ajuste ou feche este dia no calendário do admin.'
from next_week
cross join (
  values
    ('33333333-3333-4333-8333-333333333101'::uuid, 0, null::integer),
    ('33333333-3333-4333-8333-333333333102'::uuid, 1, null::integer),
    ('33333333-3333-4333-8333-333333333103'::uuid, 2, 500),
    ('33333333-3333-4333-8333-333333333104'::uuid, 3, null::integer),
    ('33333333-3333-4333-8333-333333333105'::uuid, 4, null::integer)
) as seeded(id, day_offset, fee_cents);
