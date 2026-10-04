
-- Corrige comparação tautológica nas policies de acesso a lojas.
drop policy if exists usa_insert_manage on public.user_store_access;
create policy usa_insert_manage
on public.user_store_access
for insert
to authenticated
with check (
  private.can_manage_users(tenant_id)
  and exists (
    select 1
    from public.stores s
    where s.id = user_store_access.store_id
      and s.tenant_id = user_store_access.tenant_id
  )
);

drop policy if exists usa_update_manage on public.user_store_access;
create policy usa_update_manage
on public.user_store_access
for update
to authenticated
using (private.can_manage_users(tenant_id))
with check (
  private.can_manage_users(tenant_id)
  and exists (
    select 1
    from public.stores s
    where s.id = user_store_access.store_id
      and s.tenant_id = user_store_access.tenant_id
  )
);

-- Evita que policies ALL tornem o controle finance.view irrelevante no SELECT.
drop policy if exists ap_all on public.accounts_payable;
create policy ap_insert on public.accounts_payable for insert to authenticated
with check (private.has_store_access(store_id));
create policy ap_update on public.accounts_payable for update to authenticated
using (private.has_store_access(store_id))
with check (private.has_store_access(store_id));
create policy ap_delete on public.accounts_payable for delete to authenticated
using (private.has_store_access(store_id));

drop policy if exists ar_all on public.accounts_receivable;
create policy ar_insert on public.accounts_receivable for insert to authenticated
with check (private.has_store_access(store_id));
create policy ar_update on public.accounts_receivable for update to authenticated
using (private.has_store_access(store_id))
with check (private.has_store_access(store_id));
create policy ar_delete on public.accounts_receivable for delete to authenticated
using (private.has_store_access(store_id));
