
drop policy if exists auth_rate_limit_events_deny on public.auth_rate_limit_events;
create policy auth_rate_limit_events_deny on public.auth_rate_limit_events
for all to anon,authenticated using(false) with check(false);

drop policy if exists operator_sessions_deny on public.operator_sessions;
create policy operator_sessions_deny on public.operator_sessions
for all to anon,authenticated using(false) with check(false);

create index if not exists idx_operator_sessions_tenant on public.operator_sessions(tenant_id);
create index if not exists idx_operator_sessions_store on public.operator_sessions(store_id);
create index if not exists idx_operator_sessions_operator on public.operator_sessions(operator_id);
create index if not exists idx_inventory_audits_tenant on public.inventory_audits(tenant_id);
create index if not exists idx_inventory_audits_operator on public.inventory_audits(operator_ref);
create index if not exists idx_inventory_items_tenant on public.inventory_audit_items(tenant_id);
create index if not exists idx_inventory_items_product on public.inventory_audit_items(product_id);

revoke execute on function public.authorize_operator_action(uuid,text,text) from authenticated;
