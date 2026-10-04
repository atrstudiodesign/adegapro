create or replace function public.audit_cash_session_secure(p_store_id uuid,p_operator_token text,p_cash_session_id uuid)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.cash_sessions%rowtype; op uuid; sales_total numeric; pay_total numeric; itemless int; payless int; negstock int; external_access int; pending_hr int; issues jsonb:='[]'; warnings jsonb:='[]'; result jsonb; st text;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id and store_id=p_store_id;
 if s.id is null then raise exception 'Turno não encontrado'; end if;
 select coalesce(sum(total),0) into sales_total from public.sales where cash_session_id=s.id and status='PAGA';
 select coalesce(sum(sp.amount-sp.change_amount),0) into pay_total from public.sale_payments sp join public.sales x on x.id=sp.sale_id where x.cash_session_id=s.id and x.status='PAGA' and sp.status='CONFIRMADO';
 select count(*) into itemless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_items i where i.sale_id=x.id);
 select count(*) into payless from public.sales x where x.cash_session_id=s.id and x.status='PAGA' and not exists(select 1 from public.sale_payments p where p.sale_id=x.id and p.status='CONFIRMADO');
 select count(*) into negstock from public.stock_balances b where b.store_id=s.store_id and b.quantity<0;
 select count(*) into external_access from public.hr_shift_attendance a where a.store_id=s.store_id and a.operator_id=s.operator_ref and a.event_at between s.opened_at and coalesce(s.closed_at,now()) and a.access_origin='EXTERNO' and a.record_status='ATIVO';
 select count(*) into pending_hr from public.hr_cash_withdrawals h where h.cash_session_id=s.id and h.status='PENDENTE';
 if abs(sales_total-pay_total)>.01 then issues:=issues||jsonb_build_array(jsonb_build_object('code','SALES_PAYMENTS_MISMATCH','message','Total de vendas difere dos pagamentos','sales',sales_total,'payments',pay_total)); end if;
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
end $$;
revoke execute on function public.audit_cash_session_secure(uuid,text,uuid) from public,anon;
grant execute on function public.audit_cash_session_secure(uuid,text,uuid) to authenticated;