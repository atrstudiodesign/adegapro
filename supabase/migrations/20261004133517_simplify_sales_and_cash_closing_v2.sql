CREATE OR REPLACE FUNCTION public.close_cash_session_secure(p_cash_session_id uuid, p_operator_token text, p_counted_cash numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; dif numeric; nm text;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id for update;
 if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if;
 op:=private.require_operator_session(s.store_id,p_operator_token);
 if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if;
 if not private.operator_can(op,'cash.close') then raise exception 'operator cannot close cash'; end if;
 if not private.has_feature(s.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;
 if s.closing_report_at is null then raise exception 'Informe o relatório de PIX, débito, crédito e dinheiro antes de fechar o caixa'; end if;
 select coalesce(sum(amount),0) into exp from public.financial_transactions
 where tenant_id=s.tenant_id and store_id=s.store_id and transaction_type='DESPESA'
   and created_at>=s.opened_at and created_at<=now();
 dif:=round(coalesce(s.total_sales,0)-(coalesce(s.closing_report_pix,0)+coalesce(s.closing_report_debit,0)+coalesce(s.closing_report_credit,0)+exp+coalesce(s.total_withdrawals,0)),2);
 update public.cash_sessions set total_expenses=round(exp,2),
 expected_cash=dif,
 counted_cash=0,cash_difference=dif,
 closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now()
 where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=s.cash_register_id;
 select name into nm from public.operators where id=op;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes)
 values(s.tenant_id,s.store_id,op,coalesce(nm,'Operador'),'SAIDA_TURNO',nullif(trim(coalesce(p_notes,'Fechamento de caixa/turno')),''));
 return jsonb_build_object('session_id',p_cash_session_id,'sales',s.total_sales,'pix',s.closing_report_pix,'debit',s.closing_report_debit,'credit',s.closing_report_credit,'cash_reported',s.closing_report_cash,'expenses',exp,'sangria',s.total_withdrawals,'difference',dif);
end $function$
;

CREATE OR REPLACE FUNCTION public.finalize_sale(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare
  v_user uuid := auth.uid();
  v_store uuid := (p_payload->>'store_id')::uuid;
  v_session_id uuid := nullif(p_payload->>'cash_session_id','')::uuid;
  v_operator uuid;
  v_customer uuid := nullif(p_payload->>'customer_id','')::uuid;
  v_tenant uuid;
  v_sale uuid;
  v_item jsonb;
  v_payment jsonb;
  v_product public.products%rowtype;
  v_balance public.stock_balances%rowtype;
  v_qty numeric;
  v_line_discount numeric;
  v_line_subtotal numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_surcharge numeric := greatest(0,coalesce((p_payload->>'surcharge')::numeric,0));
  v_total numeric := 0;
  v_paid_net numeric := 0;
  v_cash_net numeric := 0;
  v_pix numeric := 0;
  v_debit numeric := 0;
  v_credit numeric := 0;
  v_voucher numeric := 0;
  v_fiado numeric := 0;
  v_method text;
  v_amount numeric;
  v_change numeric;
  v_allow_negative boolean := false;
  v_max_discount numeric := 0;
  v_idempotency text := nullif(p_payload->>'idempotency_key','');
  v_sale_number bigint;
  v_combo uuid;
  v_comp record;
  v_required jsonb := '{}'::jsonb;
  v_req record;
  v_current_required numeric;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if v_store is null or not private.has_store_access(v_store) then raise exception 'forbidden'; end if;
  if v_idempotency is null or length(v_idempotency)<8 then raise exception 'idempotency key required'; end if;

  select tenant_id,allow_sell_without_stock,max_discount_percent into v_tenant,v_allow_negative,v_max_discount
  from public.stores where id=v_store and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'sales.create','USE') then raise exception 'sales permission denied'; end if;

  v_operator:=private.require_operator_session(v_store,p_payload->>'operator_session_token');

  select id into v_sale from public.sales
  where tenant_id=v_tenant and store_id=v_store and idempotency_key=v_idempotency;
  if v_sale is not null then return v_sale; end if;

  if v_session_id is not null and not exists(
    select 1 from public.cash_sessions
    where id=v_session_id and store_id=v_store and tenant_id=v_tenant
      and status='ABERTO' and operator_ref=v_operator
  ) then raise exception 'cash session is not open for operator'; end if;

  if jsonb_array_length(coalesce(p_payload->'items','[]'::jsonb))=0 then raise exception 'sale has no items'; end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from public.products
    where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant and status='ACTIVE';
    if not found then raise exception 'product not found'; end if;
    v_qty:=coalesce((v_item->>'quantity')::numeric,0);
    v_line_discount:=greatest(0,coalesce((v_item->>'discount')::numeric,0));
    if v_qty<=0 then raise exception 'invalid quantity'; end if;

    if v_product.is_combo then
      select id into v_combo from public.combos
      where product_id=v_product.id and tenant_id=v_tenant and active=true
        and (valid_until is null or valid_until >= now());
      if v_combo is null then raise exception 'combo not configured or expired'; end if;
      for v_comp in
        select ci.product_id, ci.quantity
        from public.combo_items ci
        join public.products cp on cp.id=ci.product_id and cp.tenant_id=v_tenant
        where ci.combo_id=v_combo
      loop
        v_current_required := coalesce((v_required->>v_comp.product_id::text)::numeric,0);
        v_required := jsonb_set(v_required,array[v_comp.product_id::text],
          to_jsonb(v_current_required + (v_comp.quantity * v_qty)),true);
      end loop;
    else
      v_current_required := coalesce((v_required->>v_product.id::text)::numeric,0);
      v_required := jsonb_set(v_required,array[v_product.id::text],to_jsonb(v_current_required+v_qty),true);
    end if;

    v_line_subtotal:=(v_product.sale_price*v_qty)-v_line_discount;
    if v_line_subtotal<0 then raise exception 'invalid discount'; end if;
    v_subtotal:=v_subtotal+(v_product.sale_price*v_qty);
    v_discount:=v_discount+v_line_discount;
  end loop;

  for v_req in select key::uuid product_id,value::numeric quantity from jsonb_each_text(v_required) order by key
  loop
    insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
    values(v_tenant,v_store,v_req.product_id,0)
    on conflict(store_id,product_id) do nothing;

    select * into v_balance from public.stock_balances
    where tenant_id=v_tenant and store_id=v_store and product_id=v_req.product_id for update;
    if not found then raise exception 'stock balance not found for store'; end if;
    if not v_allow_negative and v_balance.quantity<v_req.quantity then
      raise exception 'insufficient stock for component %',v_req.product_id;
    end if;
  end loop;

  if v_subtotal>0 and (v_discount/v_subtotal*100)>v_max_discount
     and not private.has_feature(v_tenant,'sales.discount','MANAGE')
  then raise exception 'discount exceeds configured limit'; end if;

  v_total:=round(v_subtotal-v_discount+v_surcharge,2);
  if v_total<0 then raise exception 'invalid sale total'; end if;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'::jsonb))
  loop
    v_method:=v_payment->>'method'; v_amount:=coalesce((v_payment->>'amount')::numeric,0);
    v_change:=greatest(0,coalesce((v_payment->>'change_amount')::numeric,0));
    if v_method not in ('DINHEIRO','PIX','DEBITO','CREDITO','VOUCHER','FIADO') then raise exception 'invalid payment method'; end if;
    if v_amount<=0 or v_change>v_amount then raise exception 'invalid payment amount'; end if;
    v_paid_net:=v_paid_net+v_amount-v_change;
    if v_method='DINHEIRO' then v_cash_net:=v_cash_net+v_amount-v_change;
    elsif v_method='PIX' then v_pix:=v_pix+v_amount;
    elsif v_method='DEBITO' then v_debit:=v_debit+v_amount;
    elsif v_method='CREDITO' then v_credit:=v_credit+v_amount;
    elsif v_method='VOUCHER' then v_voucher:=v_voucher+v_amount;
    elsif v_method='FIADO' then v_fiado:=v_fiado+v_amount; end if;
  end loop;
  if jsonb_array_length(coalesce(p_payload->'payments','[]'::jsonb))>0 and abs(v_paid_net-v_total)>0.01 then raise exception 'payment total differs from sale total'; end if;

  if v_fiado>0 then
    if v_customer is null then raise exception 'customer required for credit sale'; end if;
    perform 1 from public.customers where id=v_customer and tenant_id=v_tenant for update;
    if not found then raise exception 'customer not found'; end if;
    if exists(select 1 from public.customers where id=v_customer and tenant_id=v_tenant
      and (status<>'LIBERADO' or credit_balance+v_fiado>credit_limit))
    then raise exception 'customer credit unavailable'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_store::text));
  select coalesce(max(sale_number),0)+1 into v_sale_number
  from public.sales where tenant_id=v_tenant and store_id=v_store;

  insert into public.sales(tenant_id,store_id,cash_session_id,sale_number,cashier_id,operator_ref,customer_id,
    subtotal,discount,surcharge,total,status,idempotency_key)
  values(v_tenant,v_store,v_session_id,v_sale_number,v_user,v_operator,v_customer,
    v_subtotal,v_discount,v_surcharge,v_total,'PAGA',v_idempotency)
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant;
    v_qty:=(v_item->>'quantity')::numeric;
    v_line_discount:=greatest(0,coalesce((v_item->>'discount')::numeric,0));
    v_line_subtotal:=(v_product.sale_price*v_qty)-v_line_discount;

    insert into public.sale_items(sale_id,tenant_id,product_id,product_name,barcode,unit_price,cost_price,quantity,discount,subtotal,is_combo)
    values(v_sale,v_tenant,v_product.id,v_product.name,v_product.barcode,v_product.sale_price,
      v_product.cost_price,v_qty,v_line_discount,v_line_subtotal,v_product.is_combo);

    if v_product.is_combo then
      select id into v_combo from public.combos where product_id=v_product.id and tenant_id=v_tenant and active=true;
      for v_comp in
        select ci.product_id,ci.quantity,p.name
        from public.combo_items ci join public.products p on p.id=ci.product_id and p.tenant_id=v_tenant
        where ci.combo_id=v_combo order by ci.product_id
      loop
        select * into v_balance from public.stock_balances
        where tenant_id=v_tenant and store_id=v_store and product_id=v_comp.product_id for update;
        update public.stock_balances set quantity=quantity-(v_comp.quantity*v_qty),updated_at=now()
        where tenant_id=v_tenant and store_id=v_store and product_id=v_comp.product_id;
        insert into public.stock_movements(tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_by)
        values(v_tenant,v_store,v_comp.product_id,'VENDA',v_comp.quantity*v_qty,
          v_balance.quantity,v_balance.quantity-(v_comp.quantity*v_qty),'Componente do combo: '||v_product.name,'SALE:'||v_sale::text,v_user);
      end loop;
    else
      select * into v_balance from public.stock_balances
      where tenant_id=v_tenant and store_id=v_store and product_id=v_product.id for update;
      update public.stock_balances set quantity=quantity-v_qty,updated_at=now()
      where tenant_id=v_tenant and store_id=v_store and product_id=v_product.id;
      insert into public.stock_movements(tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_by)
      values(v_tenant,v_store,v_product.id,'VENDA',v_qty,v_balance.quantity,v_balance.quantity-v_qty,'Venda PDV','SALE:'||v_sale::text,v_user);
    end if;
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payload->'payments')
  loop
    v_method:=v_payment->>'method'; v_amount:=(v_payment->>'amount')::numeric;
    v_change:=greatest(0,coalesce((v_payment->>'change_amount')::numeric,0));
    insert into public.sale_payments(sale_id,tenant_id,method,amount,change_amount,provider,authorization_code,nsu,status)
    values(v_sale,v_tenant,v_method,v_amount,v_change,coalesce(nullif(v_payment->>'provider',''),'MANUAL'),
      nullif(v_payment->>'authorization_code',''),nullif(v_payment->>'nsu',''),'CONFIRMADO');
  end loop;

  if v_session_id is not null then
    update public.cash_sessions set total_sales=total_sales+v_total,total_cash_sales=total_cash_sales+v_cash_net,
      total_pix_sales=total_pix_sales+v_pix,total_card_debit_sales=total_card_debit_sales+v_debit,
      total_card_credit_sales=total_card_credit_sales+v_credit,total_voucher_sales=total_voucher_sales+v_voucher,
      total_other_sales=total_other_sales+v_fiado,expected_cash=expected_cash+v_cash_net
    where id=v_session_id and tenant_id=v_tenant and store_id=v_store;
  end if;

  insert into public.financial_transactions(tenant_id,store_id,transaction_type,category,amount,description,source,reference_id,created_by)
  values(v_tenant,v_store,'RECEITA','Vendas',v_total,'Venda PDV','VENDA',v_sale,v_user);

  if v_customer is not null then
    update public.customers set total_purchases=total_purchases+v_total,credit_balance=credit_balance+v_fiado,
      last_purchase_at=now(),updated_at=now()
    where id=v_customer and tenant_id=v_tenant;
  end if;
  return v_sale;
end
$function$
;

CREATE OR REPLACE FUNCTION public.save_cash_closing_report_secure(p_cash_session_id uuid, p_operator_token text, p_pix numeric, p_debit numeric, p_credit numeric, p_cash numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare s public.cash_sessions%rowtype; op uuid; exp numeric; bal numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into s from public.cash_sessions where id=p_cash_session_id for update;
 if not found or s.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(s.store_id) then raise exception 'forbidden'; end if;
 op:=private.require_operator_session(s.store_id,p_operator_token);
 if s.operator_ref is distinct from op then raise exception 'operator does not own cash session'; end if;
 if least(coalesce(p_pix,-1),coalesce(p_debit,-1),coalesce(p_credit,-1),coalesce(p_cash,-1))<0 then raise exception 'invalid reconciliation amount'; end if;
 select coalesce(sum(amount),0) into exp from public.financial_transactions
 where tenant_id=s.tenant_id and store_id=s.store_id and transaction_type='DESPESA'
   and created_at>=s.opened_at and created_at<=now();
 bal:=round(coalesce(s.total_sales,0)-(p_pix+p_debit+p_credit+exp+coalesce(s.total_withdrawals,0)),2);
 update public.cash_sessions set closing_report_pix=round(p_pix,2),closing_report_debit=round(p_debit,2),
 closing_report_credit=round(p_credit,2),closing_report_cash=round(p_cash,2),total_expenses=round(exp,2),
 closing_report_at=now(),closing_report_by=op,
 expected_cash=bal,cash_difference=bal
 where id=p_cash_session_id;
 return jsonb_build_object('sales',s.total_sales,'pix',p_pix,'debit',p_debit,'credit',p_credit,'cash_reported',p_cash,'expenses',exp,'sangria',s.total_withdrawals,'total_launches',round(p_pix+p_debit+p_credit+exp+coalesce(s.total_withdrawals,0),2),'balance',bal,
 'pdv_pix',s.total_pix_sales,'pdv_debit',s.total_card_debit_sales,'pdv_credit',s.total_card_credit_sales,'pdv_cash',s.total_cash_sales);
end $function$
;