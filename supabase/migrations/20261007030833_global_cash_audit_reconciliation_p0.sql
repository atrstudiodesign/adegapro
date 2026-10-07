-- Global P0: separate sales reconciliation from physical cash audit.
CREATE OR REPLACE FUNCTION public.audit_cash_session_secure(p_store_id uuid, p_operator_token text, p_cash_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; sales_total numeric; receipts_total numeric; recon_diff numeric; itemless int; payless int; negstock int; external_access int; pending_hr int; issues jsonb:='[]'; warnings jsonb:='[]'; result jsonb; st text;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id and store_id=p_store_id;
 if s.id is null then raise exception 'Turno não encontrado'; end if;
 select coalesce(sum(total),0) into sales_total from public.sales where cash_session_id=s.id and status='PAGA';

 if s.closing_report_at is not null then
   receipts_total:=round(coalesce(s.closing_report_pix,0)+coalesce(s.closing_report_debit,0)+coalesce(s.closing_report_credit,0)+coalesce(s.closing_report_cash,0),2);
   recon_diff:=round(receipts_total-sales_total,2); payless:=0;
   if abs(recon_diff)>.01 then issues:=issues||jsonb_build_array(jsonb_build_object('code','CLOSING_RECONCILIATION_MISMATCH','message','Recebimentos do fechamento diferem das vendas','sales',sales_total,'receipts',receipts_total,'difference',recon_diff)); end if;
 else
   select coalesce(sum(sp.amount-sp.change_amount),0) into receipts_total from public.sale_payments sp join public.sales x on x.id=sp.sale_id where x.cash_session_id=s.id and x.status='PAGA' and sp.status='CONFIRMADO';
   select count(*) into payless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_payments p where p.sale_id=x.id and p.status='CONFIRMADO');
   recon_diff:=round(receipts_total-sales_total,2);
 end if;

 select count(*) into itemless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_items i where i.sale_id=x.id);
 select count(*) into negstock from public.stock_balances b where b.store_id=s.store_id and b.quantity<0;
 select count(*) into external_access from public.hr_shift_attendance a where a.store_id=s.store_id and a.operator_id=s.operator_ref and a.event_at between s.opened_at and coalesce(s.closed_at,now()) and a.access_origin='EXTERNO' and a.record_status='ATIVO';
 select count(*) into pending_hr from public.hr_cash_withdrawals h where h.cash_session_id=s.id and h.status='PENDENTE';
 if itemless>0 then issues:=issues||jsonb_build_array(jsonb_build_object('code','PAID_SALE_WITHOUT_ITEMS','message','Venda paga sem itens','count',itemless)); end if;
 if s.closing_report_at is null and payless>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','PAID_SALE_WITHOUT_PAYMENT','message','Venda paga sem pagamento individual confirmado','count',payless)); end if;
 if s.status='FECHADO' and abs(coalesce(s.cash_difference,0))>.01 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','PHYSICAL_CASH_DIFFERENCE','message','Contagem física difere do caixa esperado','amount',s.cash_difference)); end if;
 if negstock>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','NEGATIVE_STOCK','message','Há estoque negativo na loja','count',negstock)); end if;
 if external_access>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','EXTERNAL_ACCESS_DURING_SHIFT','message','Acessos externos registrados durante o turno','count',external_access)); end if;
 if pending_hr>0 then warnings:=warnings||jsonb_build_array(jsonb_build_object('code','PENDING_HR_WITHDRAWAL','message','Retiradas deste turno pendentes no RH','count',pending_hr)); end if;
 st:=case when jsonb_array_length(issues)>0 then 'INCONSISTENCIA' when jsonb_array_length(warnings)>0 then 'ATENCAO' else 'OK' end;
 result:=jsonb_build_object('status',st,'session_id',s.id,'session_status',s.status,'sales_total',sales_total,'receipts_total',receipts_total,'reconciliation_difference',recon_diff,'expected_physical_cash',s.expected_cash,'counted_cash',s.counted_cash,'physical_cash_difference',coalesce(s.cash_difference,0),'issues',issues,'warnings',warnings,'audited_at',now());
 insert into public.shift_admin_audits(tenant_id,store_id,cash_session_id,audited_by,status,issues_count,warnings_count,result) values(s.tenant_id,s.store_id,s.id,op,st,jsonb_array_length(issues),jsonb_array_length(warnings),result);
 return result;
end $function$
;