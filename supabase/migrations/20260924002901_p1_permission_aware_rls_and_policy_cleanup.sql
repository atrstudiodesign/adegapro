
-- P1: permission-aware RLS for core production entities

drop policy if exists products_all on public.products;
create policy products_select on public.products for select to authenticated
using (private.has_tenant_access(tenant_id));
create policy products_insert on public.products for insert to authenticated
with check (private.has_feature(tenant_id,'products.create','USE'));
create policy products_update on public.products for update to authenticated
using (private.has_feature(tenant_id,'products.edit','USE'))
with check (private.has_feature(tenant_id,'products.edit','USE'));
create policy products_delete on public.products for delete to authenticated
using (private.has_feature(tenant_id,'products.delete','USE'));

drop policy if exists categories_all on public.categories;
create policy categories_select on public.categories for select to authenticated
using (private.has_tenant_access(tenant_id));
create policy categories_insert on public.categories for insert to authenticated
with check (private.has_feature(tenant_id,'products.create','USE'));
create policy categories_update on public.categories for update to authenticated
using (private.has_feature(tenant_id,'products.edit','USE'))
with check (private.has_feature(tenant_id,'products.edit','USE'));
create policy categories_delete on public.categories for delete to authenticated
using (private.has_feature(tenant_id,'products.delete','USE'));

drop policy if exists suppliers_all on public.suppliers;
create policy suppliers_select on public.suppliers for select to authenticated
using (private.has_tenant_access(tenant_id));
create policy suppliers_insert on public.suppliers for insert to authenticated
with check (private.has_feature(tenant_id,'products.create','USE'));
create policy suppliers_update on public.suppliers for update to authenticated
using (private.has_feature(tenant_id,'products.edit','USE'))
with check (private.has_feature(tenant_id,'products.edit','USE'));
create policy suppliers_delete on public.suppliers for delete to authenticated
using (private.has_feature(tenant_id,'products.delete','USE'));

drop policy if exists stock_balances_all on public.stock_balances;
create policy stock_balances_select on public.stock_balances for select to authenticated
using (private.has_store_access(store_id));
create policy stock_balances_insert on public.stock_balances for insert to authenticated
with check (private.has_feature(tenant_id,'inventory.adjust','USE'));
create policy stock_balances_update on public.stock_balances for update to authenticated
using (private.has_feature(tenant_id,'inventory.adjust','USE'))
with check (private.has_feature(tenant_id,'inventory.adjust','USE'));
create policy stock_balances_delete on public.stock_balances for delete to authenticated
using (private.has_feature(tenant_id,'inventory.adjust','MANAGE'));

drop policy if exists stores_all on public.stores;
create policy stores_select on public.stores for select to authenticated
using (private.has_store_access(id) or private.is_super_admin());
create policy stores_update on public.stores for update to authenticated
using (private.has_feature(tenant_id,'settings.edit','USE') or private.is_super_admin())
with check (private.has_feature(tenant_id,'settings.edit','USE') or private.is_super_admin());

drop policy if exists support_tickets_all on public.support_tickets;
create policy support_tickets_select on public.support_tickets for select to authenticated
using (private.has_tenant_access(tenant_id) or private.is_super_admin());
create policy support_tickets_insert on public.support_tickets for insert to authenticated
with check (private.has_tenant_access(tenant_id) and created_by = (select auth.uid()));
create policy support_tickets_update on public.support_tickets for update to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

-- Remove overlapping permissive SELECT policies while keeping management mutations
drop policy if exists commercial_licenses_manage on public.commercial_licenses;
drop policy if exists commercial_licenses_insert on public.commercial_licenses;
drop policy if exists commercial_licenses_update on public.commercial_licenses;
drop policy if exists commercial_licenses_delete on public.commercial_licenses;
create policy commercial_licenses_insert on public.commercial_licenses for insert to authenticated
with check (private.is_super_admin());
create policy commercial_licenses_update on public.commercial_licenses for update to authenticated
using (private.is_super_admin()) with check (private.is_super_admin());
create policy commercial_licenses_delete on public.commercial_licenses for delete to authenticated
using (private.is_super_admin());

drop policy if exists usa_manage on public.user_store_access;
drop policy if exists usa_insert_manage on public.user_store_access;
drop policy if exists usa_update_manage on public.user_store_access;
drop policy if exists usa_delete_manage on public.user_store_access;
create policy usa_insert_manage on public.user_store_access for insert to authenticated
with check (private.can_manage_users(tenant_id));
create policy usa_update_manage on public.user_store_access for update to authenticated
using (private.can_manage_users(tenant_id)) with check (private.can_manage_users(tenant_id));
create policy usa_delete_manage on public.user_store_access for delete to authenticated
using (private.can_manage_users(tenant_id));

drop policy if exists ufa_manage on public.user_feature_access;
drop policy if exists ufa_insert_manage on public.user_feature_access;
drop policy if exists ufa_update_manage on public.user_feature_access;
drop policy if exists ufa_delete_manage on public.user_feature_access;
create policy ufa_insert_manage on public.user_feature_access for insert to authenticated
with check (private.can_manage_users(tenant_id));
create policy ufa_update_manage on public.user_feature_access for update to authenticated
using (private.can_manage_users(tenant_id)) with check (private.can_manage_users(tenant_id));
create policy ufa_delete_manage on public.user_feature_access for delete to authenticated
using (private.can_manage_users(tenant_id));

-- Keep only one copy of known identical indexes
drop index if exists public.idx_operators_tenant_id;
drop index if exists public.idx_products_tenant_id;
drop index if exists public.idx_profiles_tenant_id;
drop index if exists public.idx_stores_tenant_id;
drop index if exists public.idx_user_store_access_user_id;
