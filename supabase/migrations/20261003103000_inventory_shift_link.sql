alter table public.inventory_audits
  add column if not exists cash_session_id uuid null references public.cash_sessions(id) on delete set null;

create index if not exists inventory_audits_cash_session_idx
  on public.inventory_audits(cash_session_id);

create or replace function public.start_inventory_audit(
  p_store_id uuid,
  p_operator_token text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_tenant uuid;
  v_operator uuid;
  v_id uuid;
  v_cash_session uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;

  select tenant_id into v_tenant
  from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;

  v_operator:=private.require_operator_session(p_store_id,p_operator_token);
  if not private.operator_can(v_operator,'inventory.adjust') then raise exception 'operator cannot inventory'; end if;
  if not private.has_feature(v_tenant,'inventory.adjust','USE') then raise exception 'account cannot inventory'; end if;

  if exists(select 1 from public.inventory_audits where store_id=p_store_id and status='EM_ANDAMENTO') then
    raise exception 'an inventory audit is already open';
  end if;

  select id into v_cash_session
  from public.cash_sessions
  where tenant_id=v_tenant and store_id=p_store_id and operator_ref=v_operator and status='ABERTO'
  order by opened_at desc limit 1;

  if v_cash_session is null then raise exception 'open cash session required for inventory'; end if;

  insert into public.inventory_audits(tenant_id,store_id,operator_ref,cash_session_id,notes)
  values(v_tenant,p_store_id,v_operator,v_cash_session,nullif(trim(coalesce(p_notes,'')),''))
  returning id into v_id;

  return v_id;
end $$;
