
drop policy if exists customers_all on public.customers;
create policy customers_select on public.customers for select to authenticated
using(private.has_tenant_access(tenant_id));
create policy customers_insert on public.customers for insert to authenticated
with check(private.has_store_access(store_id));
create policy customers_update on public.customers for update to authenticated
using(private.has_tenant_access(tenant_id))
with check(private.has_tenant_access(tenant_id));

revoke insert on public.customers from authenticated;
grant insert (
  tenant_id,store_id,name,cpf,phone,whatsapp,email,address,notes,credit_limit,status,updated_at
) on public.customers to authenticated;
