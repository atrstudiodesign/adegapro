
-- P0: never expose PIN hashes or allow direct manipulation of server-maintained credit fields.
revoke select on public.operators from authenticated;
grant select (id,tenant_id,store_id,name,role,active,last_authenticated_at,created_by,created_at,updated_at)
on public.operators to authenticated;

revoke update on public.customers from authenticated;
grant update (name,cpf,phone,whatsapp,email,address,notes,credit_limit,status,updated_at)
on public.customers to authenticated;

-- Sensitive customer balances are server-maintained only.
revoke update (credit_balance,total_purchases,last_purchase_at,loyalty_points,tenant_id,store_id)
on public.customers from authenticated;

-- Tenant/store identity on core records cannot be reassigned by normal clients.
revoke update (tenant_id) on public.products from authenticated;
revoke update (tenant_id) on public.categories from authenticated;
revoke update (tenant_id) on public.suppliers from authenticated;
revoke update (tenant_id,store_id) on public.stock_balances from authenticated;
