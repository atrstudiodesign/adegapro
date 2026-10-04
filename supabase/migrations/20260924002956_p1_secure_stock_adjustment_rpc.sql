
create or replace function public.set_stock_balance(
  p_store_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_reason text default 'Ajuste manual'
)
returns numeric
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_tenant uuid;
  v_previous numeric := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_quantity < 0 then raise exception 'stock quantity cannot be negative'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;

  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'inventory.adjust','USE')
     and not private.has_feature(v_tenant,'products.edit','USE')
  then raise exception 'inventory permission denied'; end if;

  if not exists(select 1 from public.products where id=p_product_id and tenant_id=v_tenant) then
    raise exception 'product not found';
  end if;

  insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
  values(v_tenant,p_store_id,p_product_id,0)
  on conflict (store_id,product_id) do nothing;

  select quantity into v_previous
  from public.stock_balances
  where store_id=p_store_id and product_id=p_product_id
  for update;

  update public.stock_balances
  set quantity=p_quantity,updated_at=now()
  where store_id=p_store_id and product_id=p_product_id;

  if v_previous is distinct from p_quantity then
    insert into public.stock_movements(
      tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,created_by
    ) values(
      v_tenant,p_store_id,p_product_id,'AJUSTE',abs(p_quantity-v_previous),v_previous,p_quantity,
      nullif(trim(coalesce(p_reason,'')),''),auth.uid()
    );
  end if;

  return p_quantity;
end
$$;

revoke all on function public.set_stock_balance(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.set_stock_balance(uuid,uuid,numeric,text) to authenticated;
