
create or replace function private.can_manage_users(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.tenant_id = target_tenant
        and p.active
        and p.role in ('ADMINISTRADOR')
    )
$$;

revoke all on function private.can_manage_users(uuid) from public;
grant execute on function private.can_manage_users(uuid) to authenticated;

drop policy if exists usa_manage on public.user_store_access;
create policy usa_manage
on public.user_store_access
for all
to authenticated
using (private.can_manage_users(tenant_id))
with check (private.can_manage_users(tenant_id));

drop policy if exists ufa_manage on public.user_feature_access;
create policy ufa_manage
on public.user_feature_access
for all
to authenticated
using (private.can_manage_users(tenant_id))
with check (private.can_manage_users(tenant_id));

create or replace function public.bootstrap_adega(store_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_store uuid;
  v_name text;
  v_trade text;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  if exists(select 1 from public.profiles where user_id = v_user and tenant_id is not null) then
    raise exception 'user already linked to a tenant';
  end if;

  v_name := nullif(trim(store_data->>'legal_name'), '');
  v_trade := nullif(trim(store_data->>'trade_name'), '');

  if v_name is null or v_trade is null then
    raise exception 'legal_name and trade_name are required';
  end if;

  insert into public.tenants(legal_name, trade_name, cnpj, plan)
  values(v_name, v_trade, nullif(store_data->>'cnpj',''), 'PRO')
  returning id into v_tenant;

  insert into public.stores(
    tenant_id, legal_name, trade_name, cnpj, state_registration,
    phone, whatsapp, email, address, city, state, zip_code,
    instagram, opening_hours, receipt_footer
  )
  values(
    v_tenant, v_name, v_trade, nullif(store_data->>'cnpj',''),
    nullif(store_data->>'state_registration',''),
    nullif(store_data->>'phone',''),
    nullif(store_data->>'whatsapp',''),
    nullif(store_data->>'email',''),
    nullif(store_data->>'address',''),
    nullif(store_data->>'city',''),
    nullif(store_data->>'state',''),
    nullif(store_data->>'zip_code',''),
    nullif(store_data->>'instagram',''),
    nullif(store_data->>'opening_hours',''),
    'Obrigado pela preferência!'
  )
  returning id into v_store;

  insert into public.profiles(user_id, tenant_id, full_name, role, active, permissions)
  values(
    v_user,
    v_tenant,
    coalesce(nullif(auth.jwt()->>'email',''), v_trade),
    'ADMINISTRADOR',
    true,
    '["*"]'::jsonb
  )
  on conflict (user_id) do update
    set tenant_id = excluded.tenant_id,
        full_name = excluded.full_name,
        role = excluded.role,
        active = true,
        permissions = excluded.permissions,
        updated_at = now();

  insert into public.user_store_access(user_id, tenant_id, store_id, active)
  values(v_user, v_tenant, v_store, true);

  insert into public.cash_registers(tenant_id, store_id, name, number)
  values(v_tenant, v_store, 'Caixa principal', 'Caixa 01');

  return jsonb_build_object('tenant_id', v_tenant, 'store_id', v_store);
end
$$;

revoke all on function public.bootstrap_adega(jsonb) from public, anon;
grant execute on function public.bootstrap_adega(jsonb) to authenticated;
