create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema private revoke execute on functions from anon, authenticated;

create type public.profile_role as enum ('customer', 'admin');
create type public.product_category as enum ('salad', 'protein', 'extra', 'dressing');
create type public.discount_type as enum ('percentage', 'fixed');
create type public.order_status as enum (
  'awaiting_pix',
  'paid',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled'
);
create type public.delivery_status as enum (
  'scheduled',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create sequence public.order_number_seq start with 1 increment by 1 no cycle;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.profile_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  category public.product_category not null,
  ingredients text[] not null default '{}',
  price_cents integer not null check (price_cents >= 0),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  active boolean not null default true,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  minimum_delivery_count smallint not null check (minimum_delivery_count between 2 and 7),
  discount_type public.discount_type not null,
  discount_value integer not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combos_discount_value_check check (
    (discount_type = 'percentage' and discount_value between 1 and 100)
    or (discount_type = 'fixed' and discount_value >= 0)
  )
);

create table public.combo_products (
  combo_id uuid not null references public.combos (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  minimum_quantity smallint not null default 1 check (minimum_quantity > 0),
  maximum_quantity smallint check (maximum_quantity is null or maximum_quantity >= minimum_quantity),
  created_at timestamptz not null default now(),
  primary key (combo_id, product_id)
);

create table public.delivery_days (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null unique,
  enabled boolean not null default false,
  capacity integer not null check (capacity > 0),
  reserved_quantity integer not null default 0,
  delivery_window_start time not null,
  delivery_window_end time not null,
  fee_override_cents integer check (fee_override_cents is null or fee_override_cents >= 0),
  cutoff_at timestamptz,
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_days_reserved_capacity_check check (
    reserved_quantity >= 0 and reserved_quantity <= capacity
  ),
  constraint delivery_days_window_check check (
    delivery_window_end > delivery_window_start
  )
);

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null check (char_length(business_name) between 2 and 120),
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+[1-9][0-9]{9,14}$'),
  pix_key text not null check (char_length(pix_key) between 3 and 180),
  pix_key_type text not null check (pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random')),
  pix_recipient text not null check (char_length(pix_recipient) between 2 and 120),
  default_delivery_fee_cents integer not null default 0 check (default_delivery_fee_cents >= 0),
  default_cutoff_hours smallint not null default 24 check (default_cutoff_hours between 1 and 168),
  delivery_notice text not null default '' check (char_length(delivery_notice) <= 500),
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default (
    'YF-' || pg_catalog.lpad(pg_catalog.nextval('public.order_number_seq')::text, 6, '0')
  ),
  idempotency_key uuid not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^\+[1-9][0-9]{9,14}$'),
  address_street text not null check (char_length(address_street) between 2 and 160),
  address_number text not null check (char_length(address_number) between 1 and 30),
  address_neighborhood text not null check (char_length(address_neighborhood) between 2 and 100),
  address_complement text not null default '' check (char_length(address_complement) <= 120),
  address_reference text not null default '' check (char_length(address_reference) <= 200),
  customer_notes text not null default '' check (char_length(customer_notes) <= 1000),
  admin_notes text not null default '' check (char_length(admin_notes) <= 2000),
  status public.order_status not null default 'awaiting_pix',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_summary_snapshot text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_check check (
    discount_cents <= subtotal_cents
    and total_cents = subtotal_cents - discount_cents + delivery_fee_cents
  )
);

create table public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  delivery_day_id uuid not null references public.delivery_days (id) on delete restrict,
  delivery_date date not null,
  status public.delivery_status not null default 'scheduled',
  fee_cents integer not null check (fee_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, delivery_day_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_delivery_id uuid not null references public.order_deliveries (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (char_length(product_name) between 2 and 120),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity smallint not null check (quantity between 1 and 20),
  line_total_cents integer not null check (line_total_cents >= 0),
  combo_id uuid references public.combos (id) on delete set null,
  combo_name text check (combo_name is null or char_length(combo_name) between 2 and 120),
  customer_notes text not null default '' check (char_length(customer_notes) <= 500),
  created_at timestamptz not null default now(),
  constraint order_items_line_total_check check (
    line_total_cents = unit_price_cents * quantity
  )
);

create index products_storefront_idx
  on public.products (category, sort_order, name)
  where active and available;
create index combos_storefront_idx
  on public.combos (sort_order, name)
  where active;
create index combo_products_product_idx on public.combo_products (product_id);
create index delivery_days_storefront_idx
  on public.delivery_days (delivery_date)
  where enabled;
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_phone_created_idx on public.orders (customer_phone, created_at desc);
create index order_deliveries_date_idx on public.order_deliveries (delivery_date, status);
create index order_deliveries_order_idx on public.order_deliveries (order_id);
create index order_items_delivery_idx on public.order_items (order_delivery_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_combo_idx on public.order_items (combo_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.profile_role
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();
create trigger combos_set_updated_at
  before update on public.combos
  for each row execute function private.set_updated_at();
create trigger delivery_days_set_updated_at
  before update on public.delivery_days
  for each row execute function private.set_updated_at();
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function private.set_updated_at();
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();
create trigger order_deliveries_set_updated_at
  before update on public.order_deliveries
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.combos enable row level security;
alter table public.combo_products enable row level security;
alter table public.delivery_days enable row level security;
alter table public.orders enable row level security;
alter table public.order_deliveries enable row level security;
alter table public.order_items enable row level security;
alter table public.business_settings enable row level security;

create policy profiles_admin_select
on public.profiles for select to authenticated
using ((select private.is_admin()));

create policy products_anon_select
on public.products for select to anon
using (active and available);
create policy products_authenticated_select
on public.products for select to authenticated
using ((active and available) or (select private.is_admin()));
create policy products_admin_insert
on public.products for insert to authenticated
with check ((select private.is_admin()));
create policy products_admin_update
on public.products for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy products_admin_delete
on public.products for delete to authenticated
using ((select private.is_admin()));

create policy combos_anon_select
on public.combos for select to anon
using (active);
create policy combos_authenticated_select
on public.combos for select to authenticated
using (active or (select private.is_admin()));
create policy combos_admin_insert
on public.combos for insert to authenticated
with check ((select private.is_admin()));
create policy combos_admin_update
on public.combos for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy combos_admin_delete
on public.combos for delete to authenticated
using ((select private.is_admin()));

create policy combo_products_anon_select
on public.combo_products for select to anon
using (
  exists (
    select 1 from public.combos
    where public.combos.id = combo_id and public.combos.active
  )
  and exists (
    select 1 from public.products
    where public.products.id = product_id
      and public.products.active
      and public.products.available
  )
);
create policy combo_products_authenticated_select
on public.combo_products for select to authenticated
using (
  (select private.is_admin())
  or (
    exists (
      select 1 from public.combos
      where public.combos.id = combo_id and public.combos.active
    )
    and exists (
      select 1 from public.products
      where public.products.id = product_id
        and public.products.active
        and public.products.available
    )
  )
);
create policy combo_products_admin_insert
on public.combo_products for insert to authenticated
with check ((select private.is_admin()));
create policy combo_products_admin_update
on public.combo_products for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy combo_products_admin_delete
on public.combo_products for delete to authenticated
using ((select private.is_admin()));

create policy delivery_days_anon_select
on public.delivery_days for select to anon
using (
  enabled
  and delivery_date > current_date
  and reserved_quantity < capacity
  and (cutoff_at is null or cutoff_at > now())
);
create policy delivery_days_authenticated_select
on public.delivery_days for select to authenticated
using (
  (select private.is_admin())
  or (
    enabled
    and delivery_date > current_date
    and reserved_quantity < capacity
    and (cutoff_at is null or cutoff_at > now())
  )
);
create policy delivery_days_admin_insert
on public.delivery_days for insert to authenticated
with check ((select private.is_admin()));
create policy delivery_days_admin_update
on public.delivery_days for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy delivery_days_admin_delete
on public.delivery_days for delete to authenticated
using ((select private.is_admin()));

create policy orders_admin_select
on public.orders for select to authenticated
using ((select private.is_admin()));
create policy orders_admin_update
on public.orders for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy order_deliveries_admin_select
on public.order_deliveries for select to authenticated
using ((select private.is_admin()));
create policy order_deliveries_admin_update
on public.order_deliveries for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy order_items_admin_select
on public.order_items for select to authenticated
using ((select private.is_admin()));

create policy business_settings_anon_select
on public.business_settings for select to anon
using (true);
create policy business_settings_authenticated_select
on public.business_settings for select to authenticated
using (true);
create policy business_settings_admin_insert
on public.business_settings for insert to authenticated
with check ((select private.is_admin()));
create policy business_settings_admin_update
on public.business_settings for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.combos from anon, authenticated;
revoke all on table public.combo_products from anon, authenticated;
revoke all on table public.delivery_days from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_deliveries from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.business_settings from anon, authenticated;

grant select on table public.products to anon;
grant select on table public.combos to anon;
grant select on table public.combo_products to anon;
grant select on table public.delivery_days to anon;
grant select on table public.business_settings to anon;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.combos to authenticated;
grant select, insert, update, delete on table public.combo_products to authenticated;
grant select, insert, update, delete on table public.delivery_days to authenticated;
grant select, update on table public.orders to authenticated;
grant select, update on table public.order_deliveries to authenticated;
grant select on table public.order_items to authenticated;
grant select, insert, update on table public.business_settings to authenticated;

create view public.storefront_products with (security_invoker = true) as
select
  id,
  name,
  slug,
  description,
  category,
  ingredients,
  price_cents,
  image_path,
  sort_order
from public.products
where active and available;

create view public.storefront_combos with (security_invoker = true) as
select
  public.combos.id,
  public.combos.name,
  public.combos.slug,
  public.combos.description,
  public.combos.minimum_delivery_count,
  public.combos.discount_type,
  public.combos.discount_value,
  public.combos.sort_order,
  coalesce(
    array_agg(public.combo_products.product_id order by public.combo_products.product_id)
      filter (where public.combo_products.product_id is not null),
    '{}'::uuid[]
  ) as eligible_product_ids
from public.combos
left join public.combo_products
  on public.combo_products.combo_id = public.combos.id
where public.combos.active
group by public.combos.id;

create view public.storefront_delivery_days with (security_invoker = true) as
select
  id,
  delivery_date,
  delivery_window_start,
  delivery_window_end,
  capacity - reserved_quantity as remaining_capacity,
  fee_override_cents,
  cutoff_at
from public.delivery_days
where enabled
  and delivery_date > current_date
  and reserved_quantity < capacity
  and (cutoff_at is null or cutoff_at > now());

create view public.storefront_business_settings with (security_invoker = true) as
select
  business_name,
  whatsapp_phone,
  pix_key,
  pix_key_type,
  pix_recipient,
  default_delivery_fee_cents,
  default_cutoff_hours,
  delivery_notice,
  payment_instructions
from public.business_settings
where id = 1;

revoke all on table public.storefront_products from public, anon, authenticated;
revoke all on table public.storefront_combos from public, anon, authenticated;
revoke all on table public.storefront_delivery_days from public, anon, authenticated;
revoke all on table public.storefront_business_settings from public, anon, authenticated;

grant select on public.storefront_products to anon, authenticated;
grant select on public.storefront_combos to anon, authenticated;
grant select on public.storefront_delivery_days to anon, authenticated;
grant select on public.storefront_business_settings to anon, authenticated;
