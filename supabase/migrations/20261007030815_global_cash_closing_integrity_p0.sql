-- Global P0: future closings only. No historical data updates.
CREATE OR REPLACE FUNCTION public.close_cash_session_secure(p_cash_session_id uuid, p_operator_token text, p_counted_cash numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_expected numeric; v_counted numeric; v_difference numeric; v_name text; v_receipts numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
 if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
 v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
 if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
 if not private.operator_can(v_operator,'cash.close') then raise exception 'operator cannot close cash'; end if;
 if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;
 if v_session.closing_report_at is null then raise exception 'closing reconciliation required'; end if;
 v_receipts:=round(coalesce(v_session.closing_report_pix,0)+coalesce(v_session.closing_report_debit,0)+coalesce(v_session.closing_report_credit,0)+coalesce(v_session.closing_report_cash,0),2);
 if abs(v_receipts-round(coalesce(v_session.total_sales,0),2))>.01 then raise exception 'closing reconciliation is no longer valid'; end if;
 v_counted:=p_counted_cash; if v_counted is null or v_counted<0 then raise exception 'invalid counted cash'; end if;
 v_expected:=round(coalesce(v_session.initial_balance,0)+coalesce(v_session.closing_report_cash,0)+coalesce(v_session.total_supplies,0)-coalesce(v_session.total_withdrawals,0)-coalesce(v_session.total_expenses,0),2);
 v_difference:=round(v_counted-v_expected,2);
 update public.cash_sessions set expected_cash=v_expected,counted_cash=v_counted,cash_difference=v_difference,closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
 select name into v_name from public.operators where id=v_operator;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,event_at,notes,access_origin)
 values(v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),'SAIDA_TURNO',now(),coalesce(nullif(trim(coalesce(p_notes,'')),''),'Saída automática vinculada ao turno de caixa '||p_cash_session_id::text),'NA_LOJA');
 return jsonb_build_object('session_id',p_cash_session_id,'reconciliation_difference',round(v_receipts-coalesce(v_session.total_sales,0),2),'expected_physical_cash',v_expected,'counted_cash',v_counted,'physical_cash_difference',v_difference);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_cash_closing_report_secure(p_cash_session_id uuid, p_operator_token text, p_pix numeric, p_debit numeric, p_credit numeric, p_cash numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; receipts numeric; recon_diff numeric; expected_physical numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id for update;
 if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if;
 op:=private.require_operator_session(s.store_id,p_operator_token);
 if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if;
 if least(coalesce(p_pix,-1),coalesce(p_debit,-1),coalesce(p_credit,-1),coalesce(p_cash,-1))<0 then raise exception 'invalid reconciliation amount'; end if;
 select coalesce(sum(ft.amount),0) into exp from public.financial_transactions ft
 where ft.tenant_id=s.tenant_id and ft.store_id=s.store_id and ft.transaction_type='DESPESA'
 and ft.reference_id=p_cash_session_id and upper(coalesce(ft.source,'')) in ('CAIXA','CASH_SESSION','PDV');
 receipts:=round(p_pix+p_debit+p_credit+p_cash,2); recon_diff:=round(receipts-coalesce(s.total_sales,0),2);
 if abs(recon_diff)>.01 then raise exception 'Fechamento não conciliado: vendas %, recebimentos %, diferença %',round(coalesce(s.total_sales,0),2),receipts,recon_diff; end if;
 expected_physical:=round(coalesce(s.initial_balance,0)+p_cash+coalesce(s.total_supplies,0)-coalesce(s.total_withdrawals,0)-exp,2);
 update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),total_expenses=round(exp,2),closing_report_at=now(),closing_report_by=op,expected_cash=expected_physical,cash_difference=null where id=p_cash_session_id;
 return jsonb_build_object('sales',round(coalesce(s.total_sales,0),2),'receipts',receipts,'reconciliation_difference',recon_diff,'pix',p_pix,'debit',p_debit,'credit',p_credit,'cash_reported',p_cash,'expenses',exp,'supplies',coalesce(s.total_supplies,0),'withdrawals',coalesce(s.total_withdrawals,0),'expected_physical_cash',expected_physical);
end $function$
;