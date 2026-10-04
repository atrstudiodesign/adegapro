
create or replace function private.operator_can(p_operator_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.operators o
    where o.id=p_operator_id and o.active=true
      and (
        o.role='ADMINISTRADOR'
        or (o.role='GERENTE' and p_permission in ('sales.create','sales.discount','sales.cancel','cash.open','cash.close','cash.movement','cash.operate','inventory.adjust'))
        or (o.role='CAIXA' and p_permission in ('sales.create','cash.movement','cash.operate'))
        or (o.role='ESTOQUISTA' and p_permission in ('inventory.adjust'))
      )
  );
$$;
revoke all on function private.operator_can(uuid,text) from public, anon;
grant execute on function private.operator_can(uuid,text) to authenticated;

-- Inject operator permission checks into secure cash functions.
create or replace function public.open_cash_session_secure(
  p_store_id uuid,
  p_cash_register_id uuid,
  p_operator_token text,
  p_initial_balance numeric
)
returns uuid
language plpgsql security definer
set search_path=public,private,auth
as $$
declare v_tenant uuid; v_session uuid; v_operator uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;
  if coalesce(p_initial_balance,0)<0 then raise exception 'invalid initial balance'; end if;
  v_operator:=private.require_operator_session(p_store_id,p_operator_token);
  if not private.operator_can(v_operator,'cash.open') then raise exception 'operator cannot open cash'; end if;
  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'cash.open','USE') then raise exception 'account cannot open cash'; end if;
  perform 1 from public.cash_registers where id=p_cash_register_id and store_id=p_store_id and active for update;
  if not found then raise exception 'cash register not found'; end if;
  if exists(select 1 from public.cash_sessions where cash_register_id=p_cash_register_id and status='ABERTO') then raise exception 'cash register already open'; end if;
  insert into public.cash_sessions(tenant_id,store_id,cash_register_id,operator_id,operator_ref,initial_balance,expected_cash,status)
  values(v_tenant,p_store_id,p_cash_register_id,auth.uid(),v_operator,p_initial_balance,p_initial_balance,'ABERTO')
  returning id into v_session;
  update public.cash_registers set status='ABERTO' where id=p_cash_register_id;
  return v_session;
end $$;

create or replace function public.register_cash_movement_secure(
  p_cash_session_id uuid,p_operator_token text,p_movement_type text,p_amount numeric,p_reason text
)
returns uuid
language plpgsql security definer
set search_path=public,private,auth
as $$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
  if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
  if not private.operator_can(v_operator,'cash.movement') then raise exception 'operator cannot move cash'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.movement','USE') then raise exception 'account cannot move cash'; end if;
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
end $$;

create or replace function public.close_cash_session_secure(
  p_cash_session_id uuid,p_operator_token text,p_counted_cash numeric,p_notes text default null
)
returns jsonb
language plpgsql security definer
set search_path=public,private,auth
as $$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_expected numeric; v_difference numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
  if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
  if not private.operator_can(v_operator,'cash.close') then raise exception 'operator cannot close cash'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;
  if coalesce(p_counted_cash,0)<0 then raise exception 'invalid counted cash'; end if;
  v_expected:=round(v_session.initial_balance+v_session.total_cash_sales-v_session.total_withdrawals+v_session.total_supplies,2);
  v_difference:=round(p_counted_cash-v_expected,2);
  update public.cash_sessions set expected_cash=v_expected,counted_cash=p_counted_cash,cash_difference=v_difference,
    closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=p_cash_session_id;
  update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
  return jsonb_build_object('session_id',p_cash_session_id,'expected_cash',v_expected,'counted_cash',p_counted_cash,'difference',v_difference);
end $$;

-- Sale RPC already validates account; add operator role validation with a wrapper helper in-place.
-- Recreate only by adding a guard using the existing function source is avoided; instead enforce via trigger guard is not possible.
-- Add an operator session authorization function used by client before sale and finalize_sale receives session token already.
create or replace function public.authorize_operator_action(p_store_id uuid,p_token text,p_permission text)
returns boolean
language plpgsql security definer
set search_path=public,private,auth
as $$
declare v_operator uuid;
begin
  v_operator:=private.require_operator_session(p_store_id,p_token);
  return private.operator_can(v_operator,p_permission);
end $$;
revoke all on function public.authorize_operator_action(uuid,text,text) from public,anon;
grant execute on function public.authorize_operator_action(uuid,text,text) to authenticated;
