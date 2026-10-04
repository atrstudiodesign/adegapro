-- Align the simplified PDV closing flow with the canonical reconciliation:
-- sales - PIX - debit - credit - expenses - withdrawals = cash balance.
-- Payment methods are declared at closing, not per sale.

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
 select coalesce(sum(amount),0) into exp from public.financial_transactions where tenant_id=s.tenant_id and store_id=s.store_id and transaction_type='DESPESA' and created_at>=s.opened_at and created_at<=now();
 expected_cash_sales:=round(coalesce(s.total_sales,0)-p_pix-p_debit-p_credit-exp,2);
 cash_variance:=round(p_cash-expected_cash_sales,2);
 balance:=round(expected_cash_sales-coalesce(s.total_withdrawals,0),2);
 total_launches:=round(p_pix+p_debit+p_credit+exp+coalesce(s.total_withdrawals,0),2);
 update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),total_expenses=round(exp,2),closing_report_at=now(),closing_report_by=op,expected_cash=balance,cash_difference=cash_variance where id=p_cash_session_id;
 return jsonb_build_object('sales',s.total_sales,'pix',p_pix,'debit',p_debit,'credit',p_credit,'cash_reported',p_cash,'cash_expected_from_sales',expected_cash_sales,'cash_report_variance',cash_variance,'expenses',exp,'sangria',s.total_withdrawals,'total_launches',total_launches,'balance',balance);
end $function$;

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
 if v_session.closing_report_at is not null then
   v_expected:=round(coalesce(v_session.total_sales,0)-coalesce(v_session.closing_report_pix,0)-coalesce(v_session.closing_report_debit,0)-coalesce(v_session.closing_report_credit,0)-coalesce(v_session.total_expenses,0)-coalesce(v_session.total_withdrawals,0),2);
 else
   v_expected:=round(coalesce(v_session.initial_balance,0)+coalesce(v_session.total_cash_sales,0)+coalesce(v_session.total_supplies,0)-coalesce(v_session.total_withdrawals,0)-coalesce(v_session.total_expenses,0),2);
 end if;
 v_difference:=round(p_counted_cash-v_expected,2);
 update public.cash_sessions set expected_cash=v_expected,counted_cash=p_counted_cash,cash_difference=v_difference,closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
 select name into v_name from public.operators where id=v_operator;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes) values(v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),'SAIDA_TURNO',nullif(trim(coalesce(p_notes,'Fechamento de caixa/turno')),''));
 return jsonb_build_object('session_id',p_cash_session_id,'reconciliation_formula',case when v_session.closing_report_at is not null then 'VENDAS-PIX-DEBITO-CREDITO-DESPESAS-SANGRIA' else 'SALDO_INICIAL+VENDAS_DINHEIRO+SUPRIMENTOS-SANGRIAS-DESPESAS' end,'expected_cash',v_expected,'counted_cash',p_counted_cash,'difference',v_difference);
end $function$;

create or replace function public.audit_cash_session_secure(p_store_id uuid, p_operator_token text, p_cash_session_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','private','auth'
as $function$
declare s public.cash_sessions%rowtype; op uuid; sales_total numeric; pay_total numeric; itemless int; payless int; negstock int; external_access int; pending_hr int; issues jsonb:='[]'; warnings jsonb:='[]'; result jsonb; st text;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id and store_id=p_store_id;
 if s.id is null then raise exception 'Turno não encontrado'; end if;
 select coalesce(sum(total),0) into sales_total from public.sales where cash_session_id=s.id and status='PAGA';
 if s.closing_report_at is not null then
   pay_total:=round(coalesce(s.closing_report_pix,0)+coalesce(s.closing_report_debit,0)+coalesce(s.closing_report_credit,0)+coalesce(s.closing_report_cash,0),2);
   payless:=0;
 else
   select coalesce(sum(sp.amount-sp.change_amount),0) into pay_total from public.sale_payments sp join public.sales x on x.id=sp.sale_id where x.cash_session_id=s.id and x.status='PAGA' and sp.status='CONFIRMADO';
   select count(*) into payless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_payments p where p.sale_id=x.id and p.status='CONFIRMADO');
 end if;
 select count(*) into itemless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_items i where i.sale_id=x.id);
 select count(*) into negstock from public.stock_balances b where b.store_id=s.store_id and b.quantity<0;
 select count(*) into external_access from public.hr_shift_attendance a where a.store_id=s.store_id and a.operator_id=s.operator_ref and a.event_at between s.opened_at and coalesce(s.closed_at,now()) and a.access_origin='EXTERNO' and a.record_status='ATIVO';
 select count(*) into pending_hr from public.hr_cash_withdrawals h where h.cash_session_id=s.id and h.status='PENDENTE';
 if s.closing_report_at is null and abs(sales_total-pay_total)>.01 then issues:=issues||jsonb_build_array(jsonb_build_object('code','SALES_PAYMENTS_MISMATCH','message','Total de vendas difere dos pagamentos','sales',sales_total,'payments',pay_total)); end if;
 if s.closing_report_at is not null and abs(coalesce(s.closing_report_cash,0)-(sales_total-coalesce(s.closing_report_pix,0)-coalesce(s.closing_report_debit,0)-coalesce(s.closing_report_credit,0)-coalesce(s.total_expenses,0)))>.01 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','CASH_REPORT_VARIANCE','message','Dinheiro informado difere do residual esperado das vendas')); end if;
 if itemless>0 then issues:=issues||jsonb_build_array(jsonb_build_object('code','PAID_SALE_WITHOUT_ITEMS','message','Venda paga sem itens','count',itemless)); end if;
 if payless>0 then issues:=issues||jsonb_build_array(jsonb_build_object('code','PAID_SALE_WITHOUT_PAYMENT','message','Venda paga sem pagamento confirmado','count',payless)); end if;
 if s.status='FECHADO' and abs(coalesce(s.cash_difference,0))>.01 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','CASH_DIFFERENCE','message','Fechamento com diferença de caixa','amount',s.cash_difference)); end if;
 if negstock>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','NEGATIVE_STOCK','message','Há estoque negativo na loja','count',negstock)); end if;
 if external_access>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','EXTERNAL_ACCESS_DURING_SHIFT','message','Acessos externos registrados durante o turno','count',external_access)); end if;
 if pending_hr>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','PENDING_HR_WITHDRAWAL','message','Retiradas deste turno pendentes no RH','count',pending_hr)); end if;
 st:=case when jsonb_array_length(issues)>0 then 'INCONSISTENCIA' when jsonb_array_length(warnings)>0 then 'ATENCAO' else 'OK' end;
 result:=jsonb_build_object('status',st,'session_id',s.id,'session_status',s.status,'sales_total',sales_total,'payments_total',pay_total,'cash_difference',coalesce(s.cash_difference,0),'issues',issues,'warnings',warnings,'audited_at',now());
 insert into public.shift_admin_audits(tenant_id,store_id,cash_session_id,audited_by,status,issues_count,warnings_count,result) values(s.tenant_id,s.store_id,s.id,op,st,jsonb_array_length(issues),jsonb_array_length(warnings),result);
 return result;
end $function$;