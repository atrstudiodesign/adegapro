
create or replace function public.open_cash_session_secure(
  p_store_id uuid,
  p_cash_register_id uuid,
  p_operator_token text,
  p_initial_balance numeric
)
returns uuid
language plpgsql
security definer
set search_path to 'public','private','auth'
as $function$
declare
  v_tenant uuid;
  v_session uuid;
  v_operator uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;
  if coalesce(p_initial_balance,0)<0 then raise exception 'invalid initial balance'; end if;

  v_operator:=private.require_operator_session(p_store_id,p_operator_token);
  if not private.operator_can(v_operator,'cash.open') then raise exception 'operator cannot open cash'; end if;

  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'cash.open','USE') then raise exception 'account cannot open cash'; end if;

  perform 1 from public.cash_registers
  where id=p_cash_register_id and store_id=p_store_id and active
  for update;
  if not found then raise exception 'cash register not found'; end if;

  if exists(
    select 1 from public.cash_sessions
    where cash_register_id=p_cash_register_id and status='ABERTO'
  ) then
    raise exception 'cash register already open';
  end if;

  insert into public.cash_sessions(
    tenant_id,store_id,cash_register_id,operator_id,operator_ref,
    initial_balance,expected_cash,status
  )
  values(
    v_tenant,p_store_id,p_cash_register_id,auth.uid(),v_operator,
    p_initial_balance,p_initial_balance,'ABERTO'
  )
  returning id into v_session;

  update public.cash_registers set status='ABERTO' where id=p_cash_register_id;

  select name into v_name from public.operators where id=v_operator;

  insert into public.hr_shift_attendance(
    tenant_id,store_id,operator_id,operator_name,event_type,event_at,notes,access_origin
  )
  values(
    v_tenant,p_store_id,v_operator,coalesce(v_name,'Operador'),
    'ENTRADA_PIN',now(),
    'Entrada automática vinculada ao turno de caixa '||v_session::text,
    'NA_LOJA'
  );

  return v_session;
end
$function$;

create or replace function public.close_cash_session_secure(
  p_cash_session_id uuid,
  p_operator_token text,
  p_counted_cash numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth'
as $function$
declare
  v_session public.cash_sessions%rowtype;
  v_operator uuid;
  v_expected numeric;
  v_counted numeric;
  v_difference numeric;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_session
  from public.cash_sessions
  where id=p_cash_session_id
  for update;

  if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;

  v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
  if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
  if not private.operator_can(v_operator,'cash.close') then raise exception 'operator cannot close cash'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;

  if v_session.closing_report_at is not null then
    v_counted:=coalesce(v_session.closing_report_cash,p_counted_cash);
    v_expected:=round(
      coalesce(v_session.total_sales,0)
      -coalesce(v_session.closing_report_pix,0)
      -coalesce(v_session.closing_report_debit,0)
      -coalesce(v_session.closing_report_credit,0)
      -coalesce(v_session.total_expenses,0)
      -coalesce(v_session.total_withdrawals,0),2
    );
  else
    v_counted:=p_counted_cash;
    v_expected:=round(
      coalesce(v_session.initial_balance,0)
      +coalesce(v_session.total_cash_sales,0)
      +coalesce(v_session.total_supplies,0)
      -coalesce(v_session.total_withdrawals,0)
      -coalesce(v_session.total_expenses,0),2
    );
  end if;

  if v_counted is null or v_counted<0 then raise exception 'invalid counted cash'; end if;
  v_difference:=round(v_counted-v_expected,2);

  update public.cash_sessions
  set expected_cash=v_expected,
      counted_cash=v_counted,
      cash_difference=v_difference,
      closure_notes=nullif(trim(coalesce(p_notes,'')),''),
      status='FECHADO',
      closed_at=now()
  where id=p_cash_session_id;

  update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;

  select name into v_name from public.operators where id=v_operator;

  insert into public.hr_shift_attendance(
    tenant_id,store_id,operator_id,operator_name,event_type,event_at,notes,access_origin
  )
  values(
    v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),
    'SAIDA_TURNO',now(),
    coalesce(nullif(trim(coalesce(p_notes,'')),''),'Saída automática vinculada ao turno de caixa '||p_cash_session_id::text),
    'NA_LOJA'
  );

  return jsonb_build_object(
    'session_id',p_cash_session_id,
    'reconciliation_formula',
      case when v_session.closing_report_at is not null
        then 'VENDAS-PIX-DEBITO-CREDITO-DESPESAS-SANGRIA'
        else 'SALDO_INICIAL+VENDAS_DINHEIRO+SUPRIMENTOS-SANGRIAS-DESPESAS'
      end,
    'expected_cash',v_expected,
    'counted_cash',v_counted,
    'difference',v_difference
  );
end
$function$;

revoke execute on function public.open_cash_session_secure(uuid,uuid,text,numeric) from public,anon;
grant execute on function public.open_cash_session_secure(uuid,uuid,text,numeric) to authenticated;
revoke execute on function public.close_cash_session_secure(uuid,text,numeric,text) from public,anon;
grant execute on function public.close_cash_session_secure(uuid,text,numeric,text) to authenticated;
