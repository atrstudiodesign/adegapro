
create table if not exists public.operator_feature_access (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(operator_id,feature_key)
);

alter table public.operator_feature_access enable row level security;
create index if not exists idx_operator_feature_operator on public.operator_feature_access(operator_id);
create index if not exists idx_operator_feature_tenant on public.operator_feature_access(tenant_id);
create index if not exists idx_operator_feature_store on public.operator_feature_access(store_id);

drop policy if exists operator_feature_select on public.operator_feature_access;
create policy operator_feature_select on public.operator_feature_access for select to authenticated
using(private.has_store_access(store_id));
revoke insert,update,delete on public.operator_feature_access from authenticated;

create or replace function private.operator_can(p_operator_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  with op as (
    select * from public.operators where id=p_operator_id and active=true
  ),
  explicit as (
    select enabled from public.operator_feature_access
    where operator_id=p_operator_id and feature_key=p_permission
  )
  select exists(
    select 1 from op
    where
      case
        when exists(select 1 from explicit) then coalesce((select enabled from explicit limit 1),false)
        when role='ADMINISTRADOR' then true
        when role='GERENTE' then p_permission in (
          'sales.create','sales.discount','sales.cancel',
          'cash.open','cash.close','cash.movement','cash.operate',
          'inventory.adjust','products.edit','finance.view','reports.view'
        )
        when role='CAIXA' then p_permission in ('sales.create','cash.movement','cash.operate')
        when role='ESTOQUISTA' then p_permission in ('inventory.adjust','products.edit')
        when role='FINANCEIRO' then p_permission in ('finance.view','reports.view')
        else false
      end
  );
$$;

create or replace function public.set_operator_feature(
  p_operator_id uuid,
  p_feature_key text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare v_op public.operators%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_op from public.operators where id=p_operator_id;
  if not found then raise exception 'operator not found'; end if;
  if not private.can_manage_users(v_op.tenant_id) then raise exception 'permission denied'; end if;
  if p_feature_key not in (
    'sales.create','sales.discount','sales.cancel',
    'cash.open','cash.close','cash.movement','cash.operate',
    'inventory.adjust','products.edit','finance.view','reports.view'
  ) then raise exception 'invalid feature key'; end if;

  insert into public.operator_feature_access(tenant_id,store_id,operator_id,feature_key,enabled,updated_at)
  values(v_op.tenant_id,v_op.store_id,v_op.id,p_feature_key,p_enabled,now())
  on conflict(operator_id,feature_key) do update set enabled=excluded.enabled,updated_at=now();

  insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,metadata)
  values(v_op.tenant_id,v_op.store_id,auth.uid(),'OPERATOR_PERMISSION_CHANGED','operator',v_op.id::text,
    jsonb_build_object('feature_key',p_feature_key,'enabled',p_enabled));
end $$;

revoke all on function public.set_operator_feature(uuid,text,boolean) from public,anon;
grant execute on function public.set_operator_feature(uuid,text,boolean) to authenticated;
