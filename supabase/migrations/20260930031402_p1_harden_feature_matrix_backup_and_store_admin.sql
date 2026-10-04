
-- Recria matriz de funcionalidades com isolamento correto
create table if not exists public.tenant_feature_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(tenant_id,feature_key)
);

alter table public.tenant_feature_access enable row level security;

drop policy if exists "tenant_feature_access_read" on public.tenant_feature_access;
create policy "tenant_feature_access_read"
on public.tenant_feature_access
for select to authenticated
using (
  private.has_tenant_access(tenant_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
);

create or replace function public.get_my_tenant_features()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private','auth'
as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then return '{}'::jsonb; end if;

  return coalesce((
    select jsonb_object_agg(feature_key,enabled)
    from public.tenant_feature_access
    where tenant_id=v_tenant
  ),'{}'::jsonb);
end $$;

create or replace function public.get_platform_tenant_features(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private','auth'
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_object_agg(feature_key,enabled)
    from public.tenant_feature_access
    where tenant_id=p_tenant_id
  ),'{}'::jsonb);
end $$;

create or replace function public.set_platform_tenant_feature(p_tenant_id uuid,p_feature_key text,p_enabled boolean)
returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_before jsonb; v_after jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if p_feature_key not in (
    'dashboard','minidash','pos','sales','cash','products','categories','combos','stock','inventory',
    'customers','suppliers','purchases','finance','employees','reports','audit','integrations',
    'store-profile','settings','support','legal'
  ) then raise exception 'invalid feature key'; end if;

  select to_jsonb(x) into v_before from public.tenant_feature_access x
  where tenant_id=p_tenant_id and feature_key=p_feature_key;

  insert into public.tenant_feature_access(tenant_id,feature_key,enabled,updated_by,updated_at)
  values(p_tenant_id,p_feature_key,p_enabled,auth.uid(),now())
  on conflict(tenant_id,feature_key) do update
  set enabled=excluded.enabled,updated_by=auth.uid(),updated_at=now();

  select to_jsonb(x) into v_after from public.tenant_feature_access x
  where tenant_id=p_tenant_id and feature_key=p_feature_key;

  perform private.platform_admin_log(
    p_tenant_id,'SET_TENANT_FEATURE','tenant_feature',p_feature_key,v_before,v_after,
    jsonb_build_object('enabled',p_enabled)
  );
end $$;

revoke all on function public.get_my_tenant_features() from public,anon;
grant execute on function public.get_my_tenant_features() to authenticated;
revoke all on function public.get_platform_tenant_features(uuid) from public,anon;
grant execute on function public.get_platform_tenant_features(uuid) to authenticated;
revoke all on function public.set_platform_tenant_feature(uuid,text,boolean) from public,anon;
grant execute on function public.set_platform_tenant_feature(uuid,text,boolean) to authenticated;

-- Backup só para administração do tenant
drop policy if exists "tenant backup imports read" on public.tenant_backup_imports;
create policy "tenant_backup_imports_admin_read"
on public.tenant_backup_imports
for select to authenticated
using (
  private.has_tenant_access(tenant_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
);

create or replace function public.export_my_tenant_backup()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private','auth'
as $$
declare v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','MANAGE') then raise exception 'permission denied'; end if;

  return jsonb_build_object(
    'format','ADEGA_PRO_BACKUP_JSON',
    'schema_version','1',
    'generated_at',now(),
    'tenant_id',v_tenant,
    'data',jsonb_build_object(
      'tenant',(select to_jsonb(t) from public.tenants t where t.id=v_tenant),
      'stores',coalesce((select jsonb_agg(to_jsonb(x)) from public.stores x where x.tenant_id=v_tenant),'[]'::jsonb),
      'categories',coalesce((select jsonb_agg(to_jsonb(x)) from public.categories x where x.tenant_id=v_tenant),'[]'::jsonb),
      'suppliers',coalesce((select jsonb_agg(to_jsonb(x)) from public.suppliers x where x.tenant_id=v_tenant),'[]'::jsonb),
      'products',coalesce((select jsonb_agg(to_jsonb(x)) from public.products x where x.tenant_id=v_tenant),'[]'::jsonb),
      'stock_balances',coalesce((select jsonb_agg(to_jsonb(x)) from public.stock_balances x where x.tenant_id=v_tenant),'[]'::jsonb),
      'stock_movements',coalesce((select jsonb_agg(to_jsonb(x)) from public.stock_movements x where x.tenant_id=v_tenant),'[]'::jsonb),
      'customers',coalesce((select jsonb_agg(to_jsonb(x)) from public.customers x where x.tenant_id=v_tenant),'[]'::jsonb),
      'sales',coalesce((select jsonb_agg(to_jsonb(x)) from public.sales x where x.tenant_id=v_tenant),'[]'::jsonb),
      'sale_items',coalesce((select jsonb_agg(to_jsonb(x)) from public.sale_items x where x.tenant_id=v_tenant),'[]'::jsonb),
      'sale_payments',coalesce((select jsonb_agg(to_jsonb(x)) from public.sale_payments x where x.tenant_id=v_tenant),'[]'::jsonb),
      'financial_transactions',coalesce((select jsonb_agg(to_jsonb(x)) from public.financial_transactions x where x.tenant_id=v_tenant),'[]'::jsonb),
      'cash_registers',coalesce((select jsonb_agg(to_jsonb(x)) from public.cash_registers x where x.tenant_id=v_tenant),'[]'::jsonb),
      'cash_sessions',coalesce((select jsonb_agg(to_jsonb(x)) from public.cash_sessions x where x.tenant_id=v_tenant),'[]'::jsonb),
      'cash_movements',coalesce((select jsonb_agg(to_jsonb(x)) from public.cash_movements x where x.tenant_id=v_tenant),'[]'::jsonb),
      'purchases',coalesce((select jsonb_agg(to_jsonb(x)) from public.purchases x where x.tenant_id=v_tenant),'[]'::jsonb),
      'purchase_items',coalesce((select jsonb_agg(to_jsonb(x)) from public.purchase_items x where x.tenant_id=v_tenant),'[]'::jsonb),
      'inventory_audits',coalesce((select jsonb_agg(to_jsonb(x)) from public.inventory_audits x where x.tenant_id=v_tenant),'[]'::jsonb),
      'accounts_receivable',coalesce((select jsonb_agg(to_jsonb(x)) from public.accounts_receivable x where x.tenant_id=v_tenant),'[]'::jsonb),
      'accounts_payable',coalesce((select jsonb_agg(to_jsonb(x)) from public.accounts_payable x where x.tenant_id=v_tenant),'[]'::jsonb),
      'combos',coalesce((select jsonb_agg(to_jsonb(x)) from public.combos x where x.tenant_id=v_tenant),'[]'::jsonb),
      'combo_items',coalesce((select jsonb_agg(to_jsonb(x)) from public.combo_items x where x.tenant_id=v_tenant),'[]'::jsonb),
      'operators',coalesce((select jsonb_agg(jsonb_build_object(
        'id',x.id,'tenant_id',x.tenant_id,'store_id',x.store_id,'name',x.name,'role',x.role,
        'active',x.active,'created_at',x.created_at,'updated_at',x.updated_at
      )) from public.operators x where x.tenant_id=v_tenant),'[]'::jsonb)
    )
  );
end $$;

create or replace function public.import_my_tenant_backup(p_file_name text,p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_tenant uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','MANAGE') then raise exception 'permission denied'; end if;
  if coalesce(p_payload->>'format','') <> 'ADEGA_PRO_BACKUP_JSON' then raise exception 'invalid backup format'; end if;
  if coalesce(p_payload->>'schema_version','') <> '1' then raise exception 'unsupported backup schema'; end if;
  if coalesce(p_payload->>'tenant_id','') <> v_tenant::text then raise exception 'backup belongs to another tenant'; end if;

  insert into public.tenant_backup_imports(tenant_id,file_name,payload,status,uploaded_by)
  values(v_tenant,coalesce(nullif(trim(p_file_name),''),'backup.json'),p_payload,'VALIDADO',auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_store_for_my_tenant(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_tenant uuid; v_store uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','MANAGE') then raise exception 'permission denied'; end if;

  insert into public.stores(
    tenant_id,legal_name,trade_name,cnpj,state_registration,phone,whatsapp,email,address,city,state,zip_code,
    instagram,opening_hours,thermal_width,receipt_footer,active
  ) values (
    v_tenant,
    coalesce(nullif(trim(p_payload->>'legal_name'),''),'Nova unidade'),
    coalesce(nullif(trim(p_payload->>'trade_name'),''),'Nova unidade'),
    nullif(trim(p_payload->>'cnpj'),''),nullif(trim(p_payload->>'state_registration'),''),
    nullif(trim(p_payload->>'phone'),''),nullif(trim(p_payload->>'whatsapp'),''),
    nullif(trim(p_payload->>'email'),''),nullif(trim(p_payload->>'address'),''),
    nullif(trim(p_payload->>'city'),''),nullif(trim(p_payload->>'state'),''),
    nullif(trim(p_payload->>'zip_code'),''),nullif(trim(p_payload->>'instagram'),''),
    nullif(trim(p_payload->>'opening_hours'),''),'80mm','Obrigado pela preferência!',true
  ) returning id into v_store;

  insert into public.user_store_access(user_id,tenant_id,store_id,active)
  values(auth.uid(),v_tenant,v_store,true)
  on conflict do nothing;

  return v_store;
end $$;

revoke execute on function public.export_my_tenant_backup() from public,anon;
grant execute on function public.export_my_tenant_backup() to authenticated;
revoke execute on function public.import_my_tenant_backup(text,jsonb) from public,anon;
grant execute on function public.import_my_tenant_backup(text,jsonb) to authenticated;
revoke execute on function public.create_store_for_my_tenant(jsonb) from public,anon;
grant execute on function public.create_store_for_my_tenant(jsonb) to authenticated;
