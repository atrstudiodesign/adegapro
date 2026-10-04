create or replace function public.close_cash_session_secure(p_cash_session_id uuid, p_operator_token text, p_counted_cash numeric, p_notes text default null)
returns jsonb language plpgsql security definer set search_path to 'public','private','auth'
as $function$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_expected numeric; v_difference numeric; v_name text;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
 if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
 v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
 if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
 if not private.operator_can(v_operator,'cash.close') then raise exception 'operator cannot close cash'; end if;
 if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;
 if p_counted_cash is null or p_counted_cash<0 then raise exception 'invalid counted cash'; end if;
 v_expected:=round(coalesce(v_session.initial_balance,0)+coalesce(v_session.total_cash_sales,0)+coalesce(v_session.total_supplies,0)-coalesce(v_session.total_withdrawals,0)-coalesce(v_session.total_expenses,0),2);
 v_difference:=round(p_counted_cash-v_expected,2);
 update public.cash_sessions set expected_cash=v_expected,counted_cash=p_counted_cash,cash_difference=v_difference,closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
 select name into v_name from public.operators where id=v_operator;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes) values(v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),'SAIDA_TURNO',nullif(trim(coalesce(p_notes,'Fechamento de caixa/turno')),''));
 return jsonb_build_object('session_id',p_cash_session_id,'reconciliation_formula','SALDO_INICIAL+VENDAS_DINHEIRO+SUPRIMENTOS-SANGRIAS-DESPESAS','expected_cash',v_expected,'counted_cash',p_counted_cash,'difference',v_difference);
end $function$;
