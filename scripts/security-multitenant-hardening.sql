-- ADEGA PRO — Hardening multi-tenant P0/P1/P2
-- Aplicado em produção em 2026-09-30.
-- Objetivo: impedir escalada de privilégio e combinações tenant/store inválidas.

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path='public','auth'
as $$
  select coalesce(
    exists(
      select 1 from public.platform_admins pa
      where pa.user_id=auth.uid() and pa.active=true
    ),
    false
  );
$$;

revoke update on public.profiles from anon, authenticated;
grant update(full_name,phone) on public.profiles to authenticated;

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.stores'::regclass
      and conname='stores_tenant_id_id_key'
  ) then
    alter table public.stores
      add constraint stores_tenant_id_id_key unique(tenant_id,id);
  end if;
end $$;

do $$
declare r record; cname text;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema='public' and column_name in ('tenant_id','store_id')
    group by table_name
    having count(distinct column_name)=2
  loop
    cname := r.table_name || '_tenant_store_fk';
    if not exists (
      select 1 from pg_constraint pc
      join pg_class c on c.oid=pc.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname=r.table_name
        and pc.conname=cname
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key(tenant_id,store_id) references public.stores(tenant_id,id) on update restrict on delete restrict not valid',
        r.table_name,cname
      );
      execute format('alter table public.%I validate constraint %I',r.table_name,cname);
    end if;
  end loop;
end $$;

drop policy if exists "usa_insert_manage" on public.user_store_access;
create policy "usa_insert_manage"
on public.user_store_access for insert to authenticated
with check (
  private.can_manage_users(tenant_id)
  and exists(select 1 from public.stores s where s.id=store_id and s.tenant_id=tenant_id)
);

drop policy if exists "usa_update_manage" on public.user_store_access;
create policy "usa_update_manage"
on public.user_store_access for update to authenticated
using (private.can_manage_users(tenant_id))
with check (
  private.can_manage_users(tenant_id)
  and exists(select 1 from public.stores s where s.id=store_id and s.tenant_id=tenant_id)
);

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef=true
  loop
    execute format('revoke execute on function %s from public, anon',r.sig);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public'
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated',r.tablename);
    execute format('revoke insert, update, delete on table public.%I from anon',r.tablename);
  end loop;
end $$;

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
on public.tenant_feature_access for select to authenticated
using (
  private.has_tenant_access(tenant_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
);

drop policy if exists "tenant backup imports read" on public.tenant_backup_imports;
drop policy if exists "tenant_backup_imports_admin_read" on public.tenant_backup_imports;
create policy "tenant_backup_imports_admin_read"
on public.tenant_backup_imports for select to authenticated
using (
  private.has_tenant_access(tenant_id)
  and private.has_feature(tenant_id,'settings.edit','MANAGE')
);

-- As funções export_my_tenant_backup, import_my_tenant_backup e
-- create_store_for_my_tenant também foram endurecidas em produção
-- para exigir private.has_feature(...,'settings.edit','MANAGE').
