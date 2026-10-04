
create table if not exists public.integration_webhook_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null,
  webhook_url text not null,
  event_types jsonb not null default '[]'::jsonb,
  auth_mode text not null default 'NONE' check (auth_mode in ('NONE','HMAC','BEARER','BASIC')),
  secret_ref text,
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_test_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, provider)
);

alter table public.integration_webhook_configs enable row level security;

drop policy if exists webhook_configs_read on public.integration_webhook_configs;
create policy webhook_configs_read
on public.integration_webhook_configs
for select to authenticated
using (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'settings.edit','USE')
);

drop policy if exists webhook_configs_manage on public.integration_webhook_configs;
create policy webhook_configs_manage
on public.integration_webhook_configs
for all to authenticated
using (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
)
with check (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
);

create index if not exists idx_webhook_configs_store
  on public.integration_webhook_configs(store_id, enabled);

create or replace function public.save_integration_webhook_config(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_store uuid := (p_payload->>'store_id')::uuid;
  v_tenant uuid;
  v_provider text := upper(trim(coalesce(p_payload->>'provider','')));
  v_url text := trim(coalesce(p_payload->>'webhook_url',''));
  v_auth text := upper(trim(coalesce(p_payload->>'auth_mode','NONE')));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if v_store is null or not private.has_store_access(v_store) then raise exception 'forbidden'; end if;
  select tenant_id into v_tenant from public.stores where id=v_store and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'settings.edit','MANAGE') then raise exception 'settings permission denied'; end if;
  if v_provider='' then raise exception 'provider required'; end if;
  if v_url !~* '^https://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=%-]+$' then
    raise exception 'webhook must use https';
  end if;
  if v_auth not in ('NONE','HMAC','BEARER','BASIC') then raise exception 'invalid auth mode'; end if;

  insert into public.integration_webhook_configs(
    tenant_id,store_id,provider,webhook_url,event_types,auth_mode,secret_ref,enabled,updated_at
  ) values(
    v_tenant,v_store,v_provider,v_url,coalesce(p_payload->'event_types','[]'::jsonb),
    v_auth,nullif(trim(p_payload->>'secret_ref'),''),coalesce((p_payload->>'enabled')::boolean,false),now()
  )
  on conflict(store_id,provider) do update set
    webhook_url=excluded.webhook_url,
    event_types=excluded.event_types,
    auth_mode=excluded.auth_mode,
    secret_ref=excluded.secret_ref,
    enabled=excluded.enabled,
    updated_at=now()
  returning id into v_id;

  return v_id;
end
$$;

revoke all on function public.save_integration_webhook_config(jsonb) from public, anon;
grant execute on function public.save_integration_webhook_config(jsonb) to authenticated;
