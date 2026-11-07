-- Owner-only operations stay atomic, including capacity release on cancellation.
create or replace function public.admin_set_order_status(target_order_id uuid, new_status public.order_status)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status public.order_status;
begin
  if not private.is_admin() then raise exception 'admin access required'; end if;
  select status into current_status from public.orders where id = target_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if current_status = new_status then return; end if;
  if current_status in ('cancelled','delivered') then raise exception 'finalized order cannot be changed'; end if;
  if new_status = 'cancelled' then
    perform id from public.delivery_days where id in (select delivery_day_id from public.order_deliveries where order_id = target_order_id) order by id for update;
    update public.delivery_days d set reserved_quantity = greatest(0, d.reserved_quantity - 1)
    where d.id in (select delivery_day_id from public.order_deliveries where order_id = target_order_id);
  end if;
  update public.orders set status = new_status, paid_at = case when new_status = 'paid' then coalesce(paid_at,now()) else paid_at end where id = target_order_id;
  update public.order_deliveries set status = case
    when new_status = 'cancelled' then 'cancelled'::public.delivery_status
    when new_status = 'preparing' then 'preparing'::public.delivery_status
    when new_status = 'out_for_delivery' then 'out_for_delivery'::public.delivery_status
    when new_status = 'delivered' then 'delivered'::public.delivery_status
    else 'scheduled'::public.delivery_status end where order_id = target_order_id;
end;
$$;
revoke all on function public.admin_set_order_status(uuid,public.order_status) from public,anon,authenticated;
grant execute on function public.admin_set_order_status(uuid,public.order_status) to authenticated;

create or replace function public.admin_save_combo(combo_data jsonb, product_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare combo_uuid uuid := (combo_data->>'id')::uuid;
begin
  if not private.is_admin() then raise exception 'admin access required'; end if;
  if coalesce(array_length(product_ids,1),0) = 0 then raise exception 'select at least one product'; end if;
  insert into public.combos(id,name,slug,description,minimum_delivery_count,discount_type,discount_value,active,sort_order)
  values(combo_uuid,combo_data->>'name',combo_data->>'slug',coalesce(combo_data->>'description',''),(combo_data->>'minimum_delivery_count')::smallint,(combo_data->>'discount_type')::public.discount_type,(combo_data->>'discount_value')::integer,coalesce((combo_data->>'active')::boolean,true),coalesce((combo_data->>'sort_order')::integer,0))
  on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,minimum_delivery_count=excluded.minimum_delivery_count,discount_type=excluded.discount_type,discount_value=excluded.discount_value,active=excluded.active,sort_order=excluded.sort_order;
  delete from public.combo_products where combo_id=combo_uuid;
  insert into public.combo_products(combo_id,product_id) select combo_uuid,unnest(product_ids);
end;
$$;
revoke all on function public.admin_save_combo(jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.admin_save_combo(jsonb,uuid[]) to authenticated;
