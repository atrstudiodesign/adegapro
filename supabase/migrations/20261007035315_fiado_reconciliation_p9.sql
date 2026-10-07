alter table public.cash_sessions add column if not exists closing_report_fiado numeric not null default 0 check(closing_report_fiado>=0);

CREATE OR REPLACE FUNCTION private.cash_session_fiado_total(p_session_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select round(coalesce(sum(sp.amount-coalesce(sp.change_amount,0)),0),2) from public.sale_payments sp join public.sales s on s.id=sp.sale_id where s.cash_session_id=p_session_id and s.status='PAGA' and sp.status='CONFIRMADO' and upper(sp.method)='FIADO' $function$
;
revoke all on function private.cash_session_fiado_total(uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION private.detect_cash_session_anomalies()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare v_sales numeric; v_settled numeric; v_recon numeric; begin if new.status<>'FECHADO' or (old.status='FECHADO' and new.status='FECHADO') then return new; end if; select coalesce(sum(total),0) into v_sales from public.sales where cash_session_id=new.id and tenant_id=new.tenant_id and store_id=new.store_id and status='PAGA'; v_settled:=round(coalesce(new.closing_report_pix,0)+coalesce(new.closing_report_debit,0)+coalesce(new.closing_report_credit,0)+coalesce(new.closing_report_cash,0)+coalesce(new.closing_report_fiado,0),2); v_recon:=round(v_settled-v_sales,2); if abs(v_recon)>.01 then insert into public.cash_integrity_alerts(tenant_id,store_id,cash_session_id,severity,code,message,details) values(new.tenant_id,new.store_id,new.id,'CRITICO','CLOSING_RECONCILIATION_MISMATCH','Fechamento concluído com liquidação diferente das vendas',jsonb_build_object('sales',v_sales,'settled',v_settled,'fiado',new.closing_report_fiado,'difference',v_recon)) on conflict(cash_session_id,code) do update set severity=excluded.severity,message=excluded.message,details=excluded.details,detected_at=now(),resolved_at=null,resolution_notes=null; end if; if abs(coalesce(new.cash_difference,0))>.01 then insert into public.cash_integrity_alerts(tenant_id,store_id,cash_session_id,severity,code,message,details) values(new.tenant_id,new.store_id,new.id,'ATENCAO','PHYSICAL_CASH_DIFFERENCE','Fechamento com diferença na contagem física',jsonb_build_object('expected_physical_cash',new.expected_cash,'counted_cash',new.counted_cash,'difference',new.cash_difference)) on conflict(cash_session_id,code) do update set severity=excluded.severity,message=excluded.message,details=excluded.details,detected_at=now(),resolved_at=null,resolution_notes=null; end if; return new; end $function$
;
revoke all on function private.detect_cash_session_anomalies() from public,anon,authenticated;

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
   receipts_total:=round(coalesce(s.closing_report_pix,0)+coalesce(s.closing_report_debit,0)+coalesce(s.closing_report_credit,0)+coalesce(s.closing_report_cash,0)+coalesce(s.closing_report_fiado,0),2);
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

CREATE OR REPLACE FUNCTION public.close_cash_session_secure(p_cash_session_id uuid, p_operator_token text, p_counted_cash numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; expected numeric; counted numeric; diff numeric; nm text; immediate numeric; fiado numeric; settled numeric;
begin if auth.uid() is null then raise exception 'authentication required'; end if; select * into s from public.cash_sessions where id=p_cash_session_id for update; if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if; if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if; op:=private.require_operator_session(s.store_id,p_operator_token); if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if; if not private.operator_can(op,'cash.close') or not private.has_feature(s.tenant_id,'cash.close','USE') then raise exception 'operator cannot close cash'; end if; if s.closing_report_at is null then raise exception 'closing reconciliation required'; end if;
immediate:=round(coalesce(s.closing_report_pix,0)+coalesce(s.closing_report_debit,0)+coalesce(s.closing_report_credit,0)+coalesce(s.closing_report_cash,0),2); fiado:=private.cash_session_fiado_total(s.id); settled:=round(immediate+fiado,2); if abs(settled-round(coalesce(s.total_sales,0),2))>.01 then raise exception 'closing reconciliation is no longer valid'; end if; counted:=p_counted_cash; if counted is null or counted<0 then raise exception 'invalid counted cash'; end if; expected:=round(coalesce(s.initial_balance,0)+coalesce(s.closing_report_cash,0)+coalesce(s.total_supplies,0)-coalesce(s.total_withdrawals,0)-coalesce(s.total_expenses,0),2); diff:=round(counted-expected,2);
update public.cash_sessions set closing_report_fiado=fiado,expected_cash=expected,counted_cash=counted,cash_difference=diff,closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=s.id; update public.cash_registers set status='FECHADO' where id=s.cash_register_id; select name into nm from public.operators where id=op; insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,event_at,notes,access_origin) values(s.tenant_id,s.store_id,op,coalesce(nm,'Operador'),'SAIDA_TURNO',now(),coalesce(nullif(trim(coalesce(p_notes,'')),''),'Saída automática vinculada ao turno de caixa '||s.id::text),'NA_LOJA');
return jsonb_build_object('session_id',s.id,'immediate_receipts',immediate,'fiado_receivable',fiado,'reconciliation_difference',round(settled-coalesce(s.total_sales,0),2),'expected_physical_cash',expected,'counted_cash',counted,'physical_cash_difference',diff); end $function$
;

CREATE OR REPLACE FUNCTION public.save_cash_closing_report_secure(p_cash_session_id uuid, p_operator_token text, p_pix numeric, p_debit numeric, p_credit numeric, p_cash numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; immediate numeric; fiado numeric; settled numeric; recon_diff numeric; expected_physical numeric;
begin if auth.uid() is null then raise exception 'authentication required'; end if; select * into s from public.cash_sessions where id=p_cash_session_id for update; if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if; if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if; op:=private.require_operator_session(s.store_id,p_operator_token); if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if; if least(coalesce(p_pix,-1),coalesce(p_debit,-1),coalesce(p_credit,-1),coalesce(p_cash,-1))<0 then raise exception 'invalid reconciliation amount'; end if;
select coalesce(sum(ft.amount),0) into exp from public.financial_transactions ft where ft.tenant_id=s.tenant_id and ft.store_id=s.store_id and ft.transaction_type='DESPESA' and ft.reference_id=p_cash_session_id and upper(coalesce(ft.source,'')) in ('CAIXA','CASH_SESSION','PDV');
immediate:=round(p_pix+p_debit+p_credit+p_cash,2); fiado:=private.cash_session_fiado_total(p_cash_session_id); settled:=round(immediate+fiado,2); recon_diff:=round(settled-coalesce(s.total_sales,0),2); if abs(recon_diff)>.01 then raise exception 'Fechamento não conciliado: vendas %, recebimentos imediatos %, fiado %, diferença %',round(coalesce(s.total_sales,0),2),immediate,fiado,recon_diff; end if; expected_physical:=round(coalesce(s.initial_balance,0)+p_cash+coalesce(s.total_supplies,0)-coalesce(s.total_withdrawals,0)-exp,2);
update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),closing_report_fiado=fiado,total_expenses=round(exp,2),closing_report_at=now(),closing_report_by=op,expected_cash=expected_physical,cash_difference=null where id=p_cash_session_id;
return jsonb_build_object('sales',round(coalesce(s.total_sales,0),2),'immediate_receipts',immediate,'fiado_receivable',fiado,'settled_total',settled,'reconciliation_difference',recon_diff,'expected_physical_cash',expected_physical); end $function$
;
