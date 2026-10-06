create table if not exists public.integration_connections(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,store_id uuid not null references public.stores(id) on delete cascade,
 provider text not null check(provider in ('BLING','SHOPIFY','IFOOD','ASAAS','PAGBANK','MERCADO_PAGO','SMARTPOS_TEF','NFCE_FISCAL')),
 status text not null default 'NOT_CONFIGURED' check(status in ('NOT_CONFIGURED','AUTH_PENDING','TESTING','HOMOLOGATED','ACTIVE','ERROR','SUSPENDED')),
 external_account_ref text,secret_ref text,scopes jsonb not null default '[]'::jsonb,last_validation_at timestamptz,last_validation_status text,last_error text,enabled boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(store_id,provider),
 constraint integration_connections_tenant_store_fk foreign key(tenant_id,store_id) references public.stores(tenant_id,id) on update restrict on delete restrict);
alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from anon,authenticated; grant select on public.integration_connections to authenticated;
drop policy if exists integration_connections_read on public.integration_connections;
create policy integration_connections_read on public.integration_connections for select to authenticated using(private.has_store_access(store_id) and private.has_feature(tenant_id,'settings.edit','USE'));
create or replace function public.get_my_integration_connections() returns table(provider text,status text,external_account_ref text,scopes jsonb,last_validation_at timestamptz,last_validation_status text,last_error text,enabled boolean)
language plpgsql stable security definer set search_path='public','private','auth' as $$ declare v_store uuid;v_tenant uuid;begin if auth.uid() is null then raise exception 'authentication required';end if;
select usa.store_id,usa.tenant_id into v_store,v_tenant from public.user_store_access usa join public.stores s on s.id=usa.store_id and s.tenant_id=usa.tenant_id and s.active join public.tenants t on t.id=usa.tenant_id and t.active where usa.user_id=auth.uid() and usa.active order by usa.created_at limit 1;
if v_store is null then raise exception 'active store access not found';end if;
return query with catalog(provider) as(values('BLING'::text),('SHOPIFY'),('IFOOD'),('ASAAS'),('PAGBANK'),('MERCADO_PAGO'),('SMARTPOS_TEF'),('NFCE_FISCAL'))
select c.provider,coalesce(ic.status,'NOT_CONFIGURED'),ic.external_account_ref,coalesce(ic.scopes,'[]'::jsonb),ic.last_validation_at,ic.last_validation_status,ic.last_error,coalesce(ic.enabled,false) from catalog c left join public.integration_connections ic on ic.store_id=v_store and ic.tenant_id=v_tenant and ic.provider=c.provider order by c.provider;end $$;
revoke all on function public.get_my_integration_connections() from public,anon;grant execute on function public.get_my_integration_connections() to authenticated;
create or replace function public.save_my_integration_connection(p_store_id uuid,p_provider text,p_external_account_ref text default null,p_secret_ref text default null) returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_tenant uuid;v_provider text:=upper(trim(coalesce(p_provider,'')));v_id uuid;begin if auth.uid() is null then raise exception 'authentication required';end if;if not private.has_store_access(p_store_id) then raise exception 'forbidden';end if;
select s.tenant_id into v_tenant from public.stores s join public.tenants t on t.id=s.tenant_id and t.active where s.id=p_store_id and s.active;if v_tenant is null then raise exception 'active store not found';end if;
if not private.has_feature(v_tenant,'settings.edit','MANAGE') then raise exception 'settings permission denied';end if;if v_provider not in ('BLING','SHOPIFY','IFOOD','ASAAS','PAGBANK','MERCADO_PAGO','SMARTPOS_TEF','NFCE_FISCAL') then raise exception 'provider not allowed';end if;
insert into public.integration_connections(tenant_id,store_id,provider,status,external_account_ref,secret_ref,enabled,updated_at) values(v_tenant,p_store_id,v_provider,'AUTH_PENDING',nullif(trim(p_external_account_ref),''),nullif(trim(p_secret_ref),''),false,now())
on conflict(store_id,provider) do update set external_account_ref=excluded.external_account_ref,secret_ref=excluded.secret_ref,status='AUTH_PENDING',enabled=false,last_error=null,updated_at=now() returning id into v_id;return v_id;end $$;
revoke all on function public.save_my_integration_connection(uuid,text,text,text) from public,anon;grant execute on function public.save_my_integration_connection(uuid,text,text,text) to authenticated;
create index if not exists idx_integration_connections_tenant_store on public.integration_connections(tenant_id,store_id,status);