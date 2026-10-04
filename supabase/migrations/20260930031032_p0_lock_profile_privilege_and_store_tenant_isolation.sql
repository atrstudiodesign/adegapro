
-- P0.1: fonte única de super-admin
create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path='public','auth'
as $$
  select coalesce(
    exists(
      select 1
      from public.platform_admins pa
      where pa.user_id=auth.uid()
        and pa.active=true
    ),
    false
  );
$$;

-- P0.2: usuário autenticado não pode editar campos de autorização do próprio profile
revoke update on public.profiles from anon, authenticated;
grant update(full_name,phone) on public.profiles to authenticated;

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

-- P0.3: coerência tenant <-> store na tabela raiz de acesso
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
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.user_store_access'::regclass
      and conname='user_store_access_tenant_store_fk'
  ) then
    alter table public.user_store_access
      add constraint user_store_access_tenant_store_fk
      foreign key(tenant_id,store_id)
      references public.stores(tenant_id,id)
      on update restrict on delete cascade;
  end if;
end $$;

drop policy if exists "usa_insert_manage" on public.user_store_access;
create policy "usa_insert_manage"
on public.user_store_access
for insert
to authenticated
with check (
  private.can_manage_users(tenant_id)
  and exists(
    select 1 from public.stores s
    where s.id=store_id and s.tenant_id=tenant_id
  )
);

drop policy if exists "usa_update_manage" on public.user_store_access;
create policy "usa_update_manage"
on public.user_store_access
for update
to authenticated
using (private.can_manage_users(tenant_id))
with check (
  private.can_manage_users(tenant_id)
  and exists(
    select 1 from public.stores s
    where s.id=store_id and s.tenant_id=tenant_id
  )
);
