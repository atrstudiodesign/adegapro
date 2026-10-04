
create table if not exists public.operator_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.operator_sessions enable row level security;
revoke all on public.operator_sessions from anon, authenticated;
create index if not exists idx_operator_sessions_lookup
  on public.operator_sessions(auth_user_id,store_id,expires_at desc)
  where revoked_at is null;

create or replace function private.require_operator_session(
  p_store_id uuid,
  p_token text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, extensions
as $$
declare
  v_operator uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_token is null or length(p_token) < 32 then raise exception 'operator session required'; end if;

  select os.operator_id into v_operator
  from public.operator_sessions os
  join public.operators o on o.id=os.operator_id and o.active=true
  where os.auth_user_id=auth.uid()
    and os.store_id=p_store_id
    and os.token_hash=encode(digest(p_token,'sha256'),'hex')
    and os.revoked_at is null
    and os.expires_at>now()
  limit 1;

  if v_operator is null then raise exception 'operator session invalid or expired'; end if;
  return v_operator;
end
$$;
revoke all on function private.require_operator_session(uuid,text) from public, anon;
grant execute on function private.require_operator_session(uuid,text) to authenticated;

create or replace function public.verify_operator_pin(
  p_store_id uuid,
  p_operator_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_op public.operators%rowtype;
  v_ok boolean := false;
  v_lock timestamptz;
  v_token text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;

  select * into v_op
  from public.operators
  where id=p_operator_id and store_id=p_store_id and active=true
  for update;

  if not found then return jsonb_build_object('ok',false,'code','INVALID_CREDENTIALS'); end if;

  if v_op.locked_until is not null and v_op.locked_until>now() then
    return jsonb_build_object(
      'ok',false,'code','LOCKED',
      'retry_after_seconds',greatest(1,ceil(extract(epoch from (v_op.locked_until-now())))::int)
    );
  end if;

  v_ok := v_op.pin_hash=crypt(coalesce(p_pin,''),v_op.pin_hash);

  if not v_ok then
    if v_op.failed_attempts+1>=5 then
      v_lock:=now()+interval '15 minutes';
      update public.operators set failed_attempts=0,locked_until=v_lock,updated_at=now() where id=v_op.id;
      return jsonb_build_object('ok',false,'code','LOCKED','retry_after_seconds',900);
    else
      update public.operators set failed_attempts=failed_attempts+1,updated_at=now() where id=v_op.id;
      return jsonb_build_object('ok',false,'code','INVALID_CREDENTIALS');
    end if;
  end if;

  update public.operators
  set failed_attempts=0,locked_until=null,last_authenticated_at=now(),updated_at=now()
  where id=v_op.id;

  update public.operator_sessions
  set revoked_at=now()
  where auth_user_id=auth.uid() and store_id=p_store_id and operator_id=v_op.id and revoked_at is null;

  v_token:=encode(gen_random_bytes(32),'hex');
  insert into public.operator_sessions(tenant_id,store_id,operator_id,auth_user_id,token_hash,expires_at)
  values(v_op.tenant_id,v_op.store_id,v_op.id,auth.uid(),encode(digest(v_token,'sha256'),'hex'),now()+interval '12 hours');

  insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,metadata)
  values(v_op.tenant_id,v_op.store_id,auth.uid(),'OPERATOR_PIN_VERIFIED','operator',v_op.id::text,
    jsonb_build_object('operator_name',v_op.name,'role',v_op.role));

  return jsonb_build_object(
    'ok',true,
    'operator_session_token',v_token,
    'expires_in_seconds',43200,
    'operator',jsonb_build_object('id',v_op.id,'name',v_op.name,'role',v_op.role,'store_id',v_op.store_id,'tenant_id',v_op.tenant_id)
  );
end
$$;

create or replace function public.revoke_operator_session(p_token text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then return; end if;
  update public.operator_sessions
  set revoked_at=now()
  where auth_user_id=auth.uid()
    and token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and revoked_at is null;
end
$$;
revoke all on function public.revoke_operator_session(text) from public, anon;
grant execute on function public.revoke_operator_session(text) to authenticated;

create or replace function public.open_cash_session_secure(
  p_store_id uuid,
  p_cash_register_id uuid,
  p_operator_token text,
  p_initial_balance numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_tenant uuid;
  v_session uuid;
  v_operator uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;
  if coalesce(p_initial_balance,0)<0 then raise exception 'invalid initial balance'; end if;
  v_operator:=private.require_operator_session(p_store_id,p_operator_token);

  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'cash.open','USE') then raise exception 'cash open permission denied'; end if;

  perform 1 from public.cash_registers where id=p_cash_register_id and store_id=p_store_id and active for update;
  if not found then raise exception 'cash register not found'; end if;
  if exists(select 1 from public.cash_sessions where cash_register_id=p_cash_register_id and status='ABERTO') then
    raise exception 'cash register already open';
  end if;

  insert into public.cash_sessions(
    tenant_id,store_id,cash_register_id,operator_id,operator_ref,initial_balance,expected_cash,status
  ) values(v_tenant,p_store_id,p_cash_register_id,auth.uid(),v_operator,p_initial_balance,p_initial_balance,'ABERTO')
  returning id into v_session;

  update public.cash_registers set status='ABERTO' where id=p_cash_register_id;
  return v_session;
end
$$;
revoke all on function public.open_cash_session_secure(uuid,uuid,text,numeric) from public, anon;
grant execute on function public.open_cash_session_secure(uuid,uuid,text,numeric) to authenticated;

create or replace function public.register_cash_movement_secure(
  p_cash_session_id uuid,
  p_operator_token text,
  p_movement_type text,
  p_amount numeric,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_operator uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
  if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.movement','USE') then raise exception 'cash movement permission denied'; end if;
  if p_movement_type not in ('SANGRIA','SUPRIMENTO') then raise exception 'invalid movement type'; end if;
  if coalesce(p_amount,0)<=0 then raise exception 'invalid amount'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason required'; end if;

  insert into public.cash_movements(tenant_id,store_id,cash_session_id,movement_type,amount,reason,created_by,operator_ref)
  values(v_session.tenant_id,v_session.store_id,p_cash_session_id,p_movement_type,p_amount,trim(p_reason),auth.uid(),v_operator)
  returning id into v_id;

  if p_movement_type='SANGRIA' then
    update public.cash_sessions set total_withdrawals=total_withdrawals+p_amount,expected_cash=expected_cash-p_amount where id=p_cash_session_id;
  else
    update public.cash_sessions set total_supplies=total_supplies+p_amount,expected_cash=expected_cash+p_amount where id=p_cash_session_id;
  end if;
  return v_id;
end
$$;
revoke all on function public.register_cash_movement_secure(uuid,text,text,numeric,text) from public, anon;
grant execute on function public.register_cash_movement_secure(uuid,text,text,numeric,text) to authenticated;

create or replace function public.close_cash_session_secure(
  p_cash_session_id uuid,
  p_operator_token text,
  p_counted_cash numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_operator uuid;
  v_expected numeric;
  v_difference numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
  if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'cash close permission denied'; end if;
  if coalesce(p_counted_cash,0)<0 then raise exception 'invalid counted cash'; end if;

  v_expected:=round(v_session.initial_balance+v_session.total_cash_sales-v_session.total_withdrawals+v_session.total_supplies,2);
  v_difference:=round(p_counted_cash-v_expected,2);

  update public.cash_sessions
  set expected_cash=v_expected,counted_cash=p_counted_cash,cash_difference=v_difference,
      closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now()
  where id=p_cash_session_id;
  update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;

  return jsonb_build_object('session_id',p_cash_session_id,'expected_cash',v_expected,'counted_cash',p_counted_cash,'difference',v_difference);
end
$$;
revoke all on function public.close_cash_session_secure(uuid,text,numeric,text) from public, anon;
grant execute on function public.close_cash_session_secure(uuid,text,numeric,text) to authenticated;

-- Legacy transactional RPCs are no longer directly callable by application roles.
revoke execute on function public.open_cash_session(uuid,uuid,uuid,numeric) from authenticated;
revoke execute on function public.register_cash_movement(uuid,text,numeric,text) from authenticated;
revoke execute on function public.close_cash_session(uuid,numeric,text) from authenticated;

-- Direct writes to transactional tables are blocked; reads remain tenant/store-scoped.
drop policy if exists sales_all on public.sales;
create policy sales_select on public.sales for select to authenticated using (private.has_store_access(store_id));

drop policy if exists sale_items_all on public.sale_items;
create policy sale_items_select on public.sale_items for select to authenticated using (private.has_tenant_access(tenant_id));

drop policy if exists sale_payments_all on public.sale_payments;
create policy sale_payments_select on public.sale_payments for select to authenticated using (private.has_tenant_access(tenant_id));

drop policy if exists cash_sessions_all on public.cash_sessions;
create policy cash_sessions_select on public.cash_sessions for select to authenticated using (private.has_store_access(store_id));

drop policy if exists cash_movements_all on public.cash_movements;
create policy cash_movements_select on public.cash_movements for select to authenticated using (private.has_store_access(store_id));

drop policy if exists stock_movements_all on public.stock_movements;
create policy stock_movements_select on public.stock_movements for select to authenticated using (private.has_store_access(store_id));

drop policy if exists financial_all on public.financial_transactions;
create policy financial_select on public.financial_transactions for select to authenticated
using (private.has_store_access(store_id) and private.has_feature(tenant_id,'finance.view','VIEW'));
