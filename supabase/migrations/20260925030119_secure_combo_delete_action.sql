
create or replace function public.delete_combo(p_combo_id uuid, p_store_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public','private','auth'
as $$
declare
  v_tenant uuid;
  v_product uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_store_id is null or not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;

  select tenant_id into v_tenant
  from public.stores
  where id=p_store_id and active=true;

  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'products.edit','MANAGE')
     and not private.has_feature(v_tenant,'products.edit','USE')
  then raise exception 'products edit permission denied'; end if;

  select product_id into v_product
  from public.combos
  where id=p_combo_id and tenant_id=v_tenant
  for update;

  if v_product is null then raise exception 'combo not found'; end if;

  delete from public.combos
  where id=p_combo_id and tenant_id=v_tenant;

  update public.products
  set status='INACTIVE', updated_at=now()
  where id=v_product and tenant_id=v_tenant;
end;
$$;

revoke all on function public.delete_combo(uuid,uuid) from public;
grant execute on function public.delete_combo(uuid,uuid) to authenticated;
