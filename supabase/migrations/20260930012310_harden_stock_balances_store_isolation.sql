
drop policy if exists "stock_balances_insert" on public.stock_balances;
create policy "stock_balances_insert"
on public.stock_balances
for insert
to authenticated
with check (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'inventory.adjust','USE')
);

drop policy if exists "stock_balances_update" on public.stock_balances;
create policy "stock_balances_update"
on public.stock_balances
for update
to authenticated
using (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'inventory.adjust','USE')
)
with check (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'inventory.adjust','USE')
);

drop policy if exists "stock_balances_delete" on public.stock_balances;
create policy "stock_balances_delete"
on public.stock_balances
for delete
to authenticated
using (
  private.has_store_access(store_id)
  and private.has_feature(tenant_id,'inventory.adjust','MANAGE')
);
