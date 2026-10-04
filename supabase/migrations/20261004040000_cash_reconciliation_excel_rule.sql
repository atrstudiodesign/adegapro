-- Regra oficial de conciliação do Adega Pro
-- Vendas - PIX - Débito - Crédito - Despesas - Sangria = diferença
alter table public.cash_sessions add column if not exists total_expenses numeric not null default 0;

create or replace function public.close_cash_session_secure(p_cash_session_id uuid,p_operator_token text,p_counted_cash numeric,p_notes text default null)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_difference numeric; v_name text;
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
 v_difference:=round(coalesce(v_session.total_sales,0)-coalesce(v_session.total_pix_sales,0)-coalesce(v_session.total_card_debit_sales,0)-coalesce(v_session.total_card_credit_sales,0)-coalesce(v_session.total_expenses,0)-coalesce(v_session.total_withdrawals,0),2);
 update public.cash_sessions set
   expected_cash=round(coalesce(total_sales,0)-coalesce(total_pix_sales,0)-coalesce(total_card_debit_sales,0)-coalesce(total_card_credit_sales,0)-coalesce(total_expenses,0),2),
   counted_cash=p_counted_cash,cash_difference=v_difference,
   closure_notes=nullif(trim(coalesce(p_notes,'')),''),
   status='FECHADO',closed_at=now()
 where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
 select name into v_name from public.operators where id=v_operator;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes)
 values(v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),'SAIDA_TURNO',nullif(trim(coalesce(p_notes,'Fechamento de caixa/turno')),''));
 return jsonb_build_object('session_id',p_cash_session_id,'reconciliation_formula','VENDAS-PIX-DEBITO-CREDITO-DESPESAS-SANGRIA','expected_cash',round(coalesce(v_session.total_sales,0)-coalesce(v_session.total_pix_sales,0)-coalesce(v_session.total_card_debit_sales,0)-coalesce(v_session.total_card_credit_sales,0)-coalesce(v_session.total_expenses,0),2),'counted_cash',p_counted_cash,'difference',v_difference);
end $$;

revoke execute on function public.close_cash_session_secure(uuid,text,numeric,text) from public,anon;
grant execute on function public.close_cash_session_secure(uuid,text,numeric,text) to authenticated;
