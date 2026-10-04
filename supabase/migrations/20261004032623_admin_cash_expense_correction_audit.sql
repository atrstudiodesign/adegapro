create table if not exists public.cash_session_admin_corrections (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 store_id uuid not null,
 cash_session_id uuid not null references public.cash_sessions(id),
 correction_type text not null check (correction_type in ('DESPESA')),
 old_amount numeric not null default 0,
 new_amount numeric not null check (new_amount >= 0),
 reason text not null,
 corrected_by uuid not null references public.operators(id),
 created_at timestamptz not null default now()
);
alter table public.cash_session_admin_corrections enable row level security;
revoke all on public.cash_session_admin_corrections from public, anon, authenticated;

create or replace function public.admin_correct_cash_expense(
 p_store_id uuid,p_operator_token text,p_session_id uuid,p_new_amount numeric,p_reason text
) returns jsonb
language plpgsql security definer set search_path='public','private','auth'
as $$
declare a record; s public.cash_sessions%rowtype; v_old numeric; v_delta numeric; v_tx uuid; v_balance numeric;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select * into a from private.assert_hr_operator(p_store_id,p_operator_token);
 if a.operator_id is null then raise exception 'admin or manager required'; end if;
 if p_new_amount < 0 then raise exception 'expense cannot be negative'; end if;
 if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'reason required'; end if;
 select * into s from public.cash_sessions where id=p_session_id and store_id=p_store_id for update;
 if not found then raise exception 'session not found'; end if;
 v_old:=coalesce(s.total_expenses,0); v_delta:=round(p_new_amount-v_old,2);
 if v_delta <> 0 then
   insert into public.financial_transactions(tenant_id,store_id,transaction_type,category,amount,description,source,reference_id,created_by)
   values(s.tenant_id,s.store_id,case when v_delta>0 then 'DESPESA' else 'RECEITA' end,'CORRECAO_CAIXA_ADMIN',abs(v_delta),
     'Correção administrativa de despesa do fechamento: '||trim(p_reason),'CASH_ADMIN_CORRECTION',s.id,auth.uid()) returning id into v_tx;
 end if;
 v_balance:=round(coalesce(s.total_sales,0)-coalesce(s.closing_report_pix,s.total_pix_sales,0)-coalesce(s.closing_report_debit,s.total_card_debit_sales,0)-coalesce(s.closing_report_credit,s.total_card_credit_sales,0)-p_new_amount-coalesce(s.total_withdrawals,0),2);
 update public.cash_sessions set total_expenses=p_new_amount, expected_cash=v_balance, cash_difference=case when counted_cash is null then v_balance else counted_cash-v_balance end,
   admin_amended_at=now(),admin_amended_by=a.operator_id,admin_amendment_reason=trim(p_reason)
 where id=s.id;
 insert into public.cash_session_admin_corrections(tenant_id,store_id,cash_session_id,correction_type,old_amount,new_amount,reason,corrected_by)
 values(s.tenant_id,s.store_id,s.id,'DESPESA',v_old,p_new_amount,trim(p_reason),a.operator_id);
 insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,old_data,new_data,metadata)
 values(s.tenant_id,s.store_id,auth.uid(),'ADMIN_CORRECT_CASH_EXPENSE','cash_sessions',s.id::text,
   jsonb_build_object('expense',v_old),jsonb_build_object('expense',p_new_amount,'balance',v_balance),
   jsonb_build_object('operator_id',a.operator_id,'reason',trim(p_reason),'financial_transaction_id',v_tx));
 return jsonb_build_object('session_id',s.id,'old_expense',v_old,'expense',p_new_amount,'delta',v_delta,'balance',v_balance);
end $$;
revoke all on function public.admin_correct_cash_expense(uuid,text,uuid,numeric,text) from public,anon;
grant execute on function public.admin_correct_cash_expense(uuid,text,uuid,numeric,text) to authenticated;