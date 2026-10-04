create or replace function public.update_sale_discount_secure(p_sale_id uuid,p_discount numeric)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.sales%rowtype; newtotal numeric; delta numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.sales where id=p_sale_id for update;
 if s.id is null then raise exception 'Venda não encontrada'; end if;
 if not private.has_store_access(s.store_id) or not private.has_feature(s.tenant_id,'sales','MANAGE') then raise exception 'Acesso negado'; end if;
 if s.status<>'PAGA' then raise exception 'Somente venda paga pode ser alterada'; end if;
 if p_discount is null or p_discount<0 or p_discount>s.subtotal then raise exception 'Desconto inválido'; end if;
 newtotal:=round(s.subtotal-p_discount+s.surcharge,2); delta:=newtotal-s.total;
 update public.sales set discount=round(p_discount,2),total=newtotal where id=s.id and tenant_id=s.tenant_id and store_id=s.store_id;
 update public.financial_transactions set amount=newtotal,description='Venda # '||s.sale_number where reference_id=s.id and source='VENDA' and tenant_id=s.tenant_id and store_id=s.store_id;
 return jsonb_build_object('id',s.id,'total',newtotal,'delta',delta);
end $$;

create or replace function public.update_sale_payment_method_secure(p_sale_id uuid,p_method text)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.sales%rowtype; p record; old_method text; new_method text:=upper(trim(p_method)); net numeric; v_expected numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.sales where id=p_sale_id for update;
 if s.id is null then raise exception 'Venda não encontrada'; end if;
 if not private.has_store_access(s.store_id) or not private.has_feature(s.tenant_id,'sales','MANAGE') then raise exception 'Acesso negado'; end if;
 if s.status<>'PAGA' then raise exception 'Somente venda paga pode ter pagamento corrigido'; end if;
 if new_method not in ('DINHEIRO','PIX','DEBITO','CREDITO','VOUCHER','FIADO') then raise exception 'Forma de pagamento inválida'; end if;
 if (select count(*) from public.sale_payments where sale_id=s.id and tenant_id=s.tenant_id)<>1 then raise exception 'Venda com pagamento múltiplo requer ajuste detalhado'; end if;
 select * into p from public.sale_payments where sale_id=s.id and tenant_id=s.tenant_id for update;
 if p.id is null then raise exception 'Pagamento não encontrado'; end if;
 old_method:=upper(p.method); net:=round(p.amount-coalesce(p.change_amount,0),2);
 if old_method=new_method then return jsonb_build_object('id',s.id,'method',new_method); end if;
 if s.cash_session_id is not null then
   select round(initial_balance+total_cash_sales-total_withdrawals+total_supplies,2) into v_expected from public.cash_sessions where id=s.cash_session_id and tenant_id=s.tenant_id and store_id=s.store_id for update;
   if new_method<>'DINHEIRO' and old_method='DINHEIRO' and v_expected-net<0 then raise exception 'Correção recusada: remover este pagamento em dinheiro deixaria o caixa esperado negativo'; end if;
   update public.cash_sessions set
    total_cash_sales=case when old_method='DINHEIRO' then greatest(0,total_cash_sales-net) when new_method='DINHEIRO' then total_cash_sales+net else total_cash_sales end,
    total_pix_sales=case when old_method='PIX' then greatest(0,total_pix_sales-p.amount) when new_method='PIX' then total_pix_sales+p.amount else total_pix_sales end,
    total_card_debit_sales=case when old_method='DEBITO' then greatest(0,total_card_debit_sales-p.amount) when new_method='DEBITO' then total_card_debit_sales+p.amount else total_card_debit_sales end,
    total_card_credit_sales=case when old_method='CREDITO' then greatest(0,total_card_credit_sales-p.amount) when new_method='CREDITO' then total_card_credit_sales+p.amount else total_card_credit_sales end,
    total_voucher_sales=case when old_method='VOUCHER' then greatest(0,total_voucher_sales-p.amount) when new_method='VOUCHER' then total_voucher_sales+p.amount else total_voucher_sales end,
    total_other_sales=case when old_method='FIADO' then greatest(0,total_other_sales-p.amount) when new_method='FIADO' then total_other_sales+p.amount else total_other_sales end,
    expected_cash=round(initial_balance+(case when old_method='DINHEIRO' then greatest(0,total_cash_sales-net) when new_method='DINHEIRO' then total_cash_sales+net else total_cash_sales end)-total_withdrawals+total_supplies,2)
   where id=s.cash_session_id and tenant_id=s.tenant_id and store_id=s.store_id;
 end if;
 update public.sale_payments set method=new_method,provider='MANUAL' where id=p.id and tenant_id=s.tenant_id;
 return jsonb_build_object('id',s.id,'old_method',old_method,'method',new_method);
end $$;

revoke execute on function public.update_sale_discount_secure(uuid,numeric) from public,anon;
revoke execute on function public.update_sale_payment_method_secure(uuid,text) from public,anon;
revoke execute on function public.set_stock_balance(uuid,uuid,numeric,text) from public,anon;
grant execute on function public.update_sale_discount_secure(uuid,numeric) to authenticated;
grant execute on function public.update_sale_payment_method_secure(uuid,text) to authenticated;
grant execute on function public.set_stock_balance(uuid,uuid,numeric,text) to authenticated;