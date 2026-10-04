
alter table public.stores
  add column if not exists printer_model text not null default 'GENERICA_ESC_POS',
  add column if not exists printer_connection text not null default 'NAVEGADOR',
  add column if not exists auto_print_receipt boolean not null default false;

create table if not exists public.tenant_backup_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  file_name text not null,
  payload jsonb not null,
  status text not null default 'VALIDADO',
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint tenant_backup_imports_status_check check (status in ('VALIDADO','APLICADO','REJEITADO'))
);

alter table public.tenant_backup_imports enable row level security;

drop policy if exists "tenant backup imports read" on public.tenant_backup_imports;
create policy "tenant backup imports read"
on public.tenant_backup_imports
for select to authenticated
using (private.has_tenant_access(tenant_id));

create or replace function public.export_my_tenant_backup()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private','auth'
as $$
declare
  v_tenant uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;

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
end;
$$;

create or replace function public.import_my_tenant_backup(p_file_name text,p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_tenant uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','USE') then raise exception 'permission denied'; end if;
  if coalesce(p_payload->>'format','') <> 'ADEGA_PRO_BACKUP_JSON' then raise exception 'invalid backup format'; end if;
  if coalesce(p_payload->>'schema_version','') <> '1' then raise exception 'unsupported backup schema'; end if;
  if coalesce(p_payload->>'tenant_id','') <> v_tenant::text then raise exception 'backup belongs to another tenant'; end if;

  insert into public.tenant_backup_imports(tenant_id,file_name,payload,status,uploaded_by)
  values(v_tenant,coalesce(nullif(trim(p_file_name),''),'backup.json'),p_payload,'VALIDADO',auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.create_store_for_my_tenant(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_tenant uuid;
  v_store uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true limit 1;
  if v_tenant is null then raise exception 'tenant not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','USE') then raise exception 'permission denied'; end if;

  insert into public.stores(
    tenant_id,legal_name,trade_name,cnpj,state_registration,phone,whatsapp,email,address,city,state,zip_code,
    instagram,opening_hours,thermal_width,receipt_footer,active
  ) values (
    v_tenant,
    coalesce(nullif(trim(p_payload->>'legal_name'),''),'Nova unidade'),
    coalesce(nullif(trim(p_payload->>'trade_name'),''),'Nova unidade'),
    nullif(trim(p_payload->>'cnpj'),''),
    nullif(trim(p_payload->>'state_registration'),''),
    nullif(trim(p_payload->>'phone'),''),
    nullif(trim(p_payload->>'whatsapp'),''),
    nullif(trim(p_payload->>'email'),''),
    nullif(trim(p_payload->>'address'),''),
    nullif(trim(p_payload->>'city'),''),
    nullif(trim(p_payload->>'state'),''),
    nullif(trim(p_payload->>'zip_code'),''),
    nullif(trim(p_payload->>'instagram'),''),
    nullif(trim(p_payload->>'opening_hours'),''),
    '80mm','Obrigado pela preferência!',true
  ) returning id into v_store;

  insert into public.user_store_access(user_id,tenant_id,store_id,active)
  values(auth.uid(),v_tenant,v_store,true)
  on conflict do nothing;

  return v_store;
end;
$$;

revoke all on function public.export_my_tenant_backup() from public;
grant execute on function public.export_my_tenant_backup() to authenticated;
revoke all on function public.import_my_tenant_backup(text,jsonb) from public;
grant execute on function public.import_my_tenant_backup(text,jsonb) to authenticated;
revoke all on function public.create_store_for_my_tenant(jsonb) from public;
grant execute on function public.create_store_for_my_tenant(jsonb) to authenticated;
