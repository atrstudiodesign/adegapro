create or replace function public.cancel_sale_secure(p_sale_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.sales%rowtype; i record; p record; oldq numeric; method text;
begin
 select * into s from public.sales where id=p_sale_id for update;
 if s.id is null then raise exception 'Venda não encontrada'; end if;
 if not private.has_store_access(s.store_id) or not private.has_feature(s.tenant_id,'sales','MANAGE') then raise exception 'Acesso negado'; end if;
 if s.status='CANCELADA' then return jsonb_build_object('status','CANCELADA','id',s.id); end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'Informe o motivo do cancelamento'; end if;
 for i in select * from public.sale_items where sale_id=s.id loop
   if i.product_id is not null then
     select quantity into oldq from public.stock_balances where store_id=s.store_id and product_id=i.product_id for update;
     oldq:=coalesce(oldq,0);
     insert into public.stock_balances(tenant_id,store_id,product_id,quantity) values(s.tenant_id,s.store_id,i.product_id,i.quantity)
       on conflict(store_id,product_id) do update set quantity=public.stock_balances.quantity+excluded.quantity,updated_at=now();
     insert into public.stock_movements(tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_by)
       values(s.tenant_id,s.store_id,i.product_id,'ENTRADA',i.quantity,oldq,oldq+i.quantity,'Estorno de venda cancelada','#'||s.sale_number,auth.uid());
   end if;
 end loop;
 update public.sales set status='CANCELADA',cancel_reason=trim(p_reason),cancelled_at=now(),cancelled_by=auth.uid() where id=s.id;
 delete from public.financial_transactions where reference_id=s.id and source='VENDA';
 if s.cash_session_id is not null then
   update public.cash_sessions set total_sales=greatest(0,total_sales-s.total) where id=s.cash_session_id;
   for p in select method,amount from public.payments where sale_id=s.id loop
     method:=upper(p.method);
     update public.cash_sessions set
       total_cash_sales=case when method='DINHEIRO' then greatest(0,total_cash_sales-p.amount) else total_cash_sales end,
       total_pix_sales=case when method='PIX' then greatest(0,total_pix_sales-p.amount) else total_pix_sales end,
       total_card_debit_sales=case when method='DEBITO' then greatest(0,total_card_debit_sales-p.amount) else total_card_debit_sales end,
       total_card_credit_sales=case when method='CREDITO' then greatest(0,total_card_credit_sales-p.amount) else total_card_credit_sales end,
       total_voucher_sales=case when method='VOUCHER' then greatest(0,total_voucher_sales-p.amount) else total_voucher_sales end
       where id=s.cash_session_id;
   end loop;
 end if;
 return jsonb_build_object('status','CANCELADA','id',s.id);
end $$;
revoke all on function public.cancel_sale_secure(uuid,text) from public,anon;
grant execute on function public.cancel_sale_secure(uuid,text) to authenticated;

create or replace function public.update_sale_discount_secure(p_sale_id uuid,p_discount numeric)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare s public.sales%rowtype; newtotal numeric; delta numeric;
begin
 select * into s from public.sales where id=p_sale_id for update;
 if s.id is null then raise exception 'Venda não encontrada'; end if;
 if not private.has_store_access(s.store_id) or not private.has_feature(s.tenant_id,'sales','MANAGE') then raise exception 'Acesso negado'; end if;
 if s.status<>'PAGA' then raise exception 'Somente venda paga pode ser alterada'; end if;
 if p_discount<0 or p_discount>s.subtotal then raise exception 'Desconto inválido'; end if;
 newtotal:=s.subtotal-p_discount+s.surcharge; delta:=newtotal-s.total;
 update public.sales set discount=p_discount,total=newtotal where id=s.id;
 update public.financial_transactions set amount=newtotal,description='Venda # '||s.sale_number where reference_id=s.id and source='VENDA';
 return jsonb_build_object('id',s.id,'total',newtotal,'delta',delta);
end $$;
revoke all on function public.update_sale_discount_secure(uuid,numeric) from public,anon;
grant execute on function public.update_sale_discount_secure(uuid,numeric) to authenticated;