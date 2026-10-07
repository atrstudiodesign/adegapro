create or replace function public.save_cash_closing_report_secure(p_cash_session_id uuid, p_operator_token text, p_pix numeric, p_debit numeric, p_credit numeric, p_cash numeric)
returns jsonb language plpgsql security definer set search_path to 'public','private','auth'
as $function$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; expected_cash_sales numeric; balance numeric; total_launches numeric; cash_variance numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id for update;
 if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if;
 op:=private.require_operator_session(s.store_id,p_operator_token);
 if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if;
 if least(coalesce(p_pix,-1),coalesce(p_debit,-1),coalesce(p_credit,-1),coalesce(p_cash,-1))<0 then raise exception 'invalid reconciliation amount'; end if;
 select coalesce(sum(ft.amount),0) into exp from public.financial_transactions ft where ft.tenant_id=s.tenant_id and ft.store_id=s.store_id and ft.transaction_type='DESPESA' and ft.reference_id=p_cash_session_id and upper(coalesce(ft.source,'')) in ('CAIXA','CASH_SESSION','PDV');
 expected_cash_sales:=round(coalesce(s.total_sales,0)-p_pix-p_debit-p_credit-exp,2);
 cash_variance:=round(p_cash-expected_cash_sales,2);
 balance:=round(expected_cash_sales-coalesce(s.total_withdrawals,0),2);
 total_launches:=round(p_pix+p_debit+p_credit+exp+coalesce(s.total_withdrawals,0),2);
 update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),total_expenses=round(exp,2),closing_report_at=now(),closing_report_by=op,expected_cash=balance,cash_difference=cash_variance where id=p_cash_session_id;
 return jsonb_build_object('sales',s.total_sales,'pix',p_pix,'debit',p_debit,'credit',p_credit,'cash_reported',p_cash,'cash_expected_from_sales',expected_cash_sales,'cash_report_variance',cash_variance,'expenses',exp,'sangria',s.total_withdrawals,'total_launches',total_launches,'balance',balance);
end $function$;
