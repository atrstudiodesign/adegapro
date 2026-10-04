-- Fechamento conciliado: relatório real + despesas automáticas.
alter table public.cash_sessions
 add column if not exists closing_report_pix numeric,
 add column if not exists closing_report_debit numeric,
 add column if not exists closing_report_credit numeric,
 add column if not exists closing_report_cash numeric,
 add column if not exists closing_report_at timestamptz,
 add column if not exists closing_report_by uuid;

create or replace function public.save_cash_closing_report_secure(p_cash_session_id uuid,p_operator_token text,p_pix numeric,p_debit numeric,p_credit numeric,p_cash numeric)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; bal numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id for update;
 if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if;
 op:=private.require_operator_session(s.store_id,p_operator_token);
 if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if;
 if least(coalesce(p_pix,-1),coalesce(p_debit,-1),coalesce(p_credit,-1),coalesce(p_cash,-1))<0 then raise exception 'invalid reconciliation amount'; end if;
 select coalesce(sum(amount),0) into exp from public.financial_transactions where tenant_id=s.tenant_id and store_id=s.store_id and transaction_type='DESPESA' and created_at>=s.opened_at and created_at<=now();
 bal:=round(coalesce(s.total_sales,0)-p_pix-p_debit-p_credit-exp-coalesce(s.total_withdrawals,0),2);
 update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),total_expenses=round(exp,2),closing_report_at=now(),closing_report_by=op,expected_cash=round(coalesce(total_sales,0)-p_pix-p_debit-p_credit-exp,2),cash_difference=bal where id=p_cash_session_id;
 return jsonb_build_object('sales',s.total_sales,'pix',p_pix,'debit',p_debit,'credit',p_credit,'cash_reported',p_cash,'expenses',exp,'sangria',s.total_withdrawals,'balance',bal,'pdv_pix',s.total_pix_sales,'pdv_debit',s.total_card_debit_sales,'pdv_credit',s.total_card_credit_sales,'pdv_cash',s.total_cash_sales);
end $$;
revoke execute on function public.save_cash_closing_report_secure(uuid,text,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.save_cash_closing_report_secure(uuid,text,numeric,numeric,numeric,numeric) to authenticated;
