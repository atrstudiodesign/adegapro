
create or replace function private.has_feature(
  target_tenant uuid,
  target_feature text,
  required_level text default 'USE'
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    private.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.tenant_id = target_tenant
        and p.active = true
        and (
          p.role in ('ADMINISTRADOR','SUPER_ADMIN')
          or p.permissions ? '*'
          or p.permissions ? target_feature
          or exists (
            select 1
            from public.user_feature_access ufa
            where ufa.user_id = auth.uid()
              and ufa.tenant_id = target_tenant
              and ufa.feature_key = target_feature
              and ufa.enabled = true
              and (
                required_level = 'VIEW'
                or ufa.access_level = 'MANAGE'
                or (required_level = 'USE' and ufa.access_level in ('USE','MANAGE'))
              )
          )
        )
    );
$$;
revoke all on function private.has_feature(uuid,text,text) from public, anon;
grant execute on function private.has_feature(uuid,text,text) to authenticated;

create or replace function public.finalize_sale(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
  v_store uuid := (p_payload->>'store_id')::uuid;
  v_session_id uuid := nullif(p_payload->>'cash_session_id','')::uuid;
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
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if v_store is null or not private.has_store_access(v_store) then raise exception 'forbidden'; end if;
  if v_idempotency is null or length(v_idempotency) < 8 then raise exception 'idempotency key required'; end if;

  select tenant_id,allow_sell_without_stock,max_discount_percent
    into v_tenant,v_allow_negative,v_max_discount
  from public.stores where id=v_store and active=true;

  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'sales.create','USE') then raise exception 'sales permission denied'; end if;

  select id into v_sale from public.sales where tenant_id=v_tenant and idempotency_key=v_idempotency;
  if v_sale is not null then return v_sale; end if;

  if v_session_id is not null and not exists(
    select 1 from public.cash_sessions
    where id=v_session_id and store_id=v_store and tenant_id=v_tenant and status='ABERTO'
  ) then raise exception 'cash session is not open'; end if;

  if jsonb_array_length(coalesce(p_payload->'items','[]'::jsonb)) = 0 then raise exception 'sale has no items'; end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product
    from public.products
    where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant and status='ACTIVE';

    if not found then raise exception 'product not found'; end if;
    if v_product.is_combo then raise exception 'combo sale requires configured component model'; end if;

    v_qty := coalesce((v_item->>'quantity')::numeric,0);
    v_line_discount := greatest(0,coalesce((v_item->>'discount')::numeric,0));
    if v_qty <= 0 then raise exception 'invalid quantity'; end if;

    insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
    values(v_tenant,v_store,v_product.id,0)
    on conflict (store_id,product_id) do nothing;

    select * into v_balance
    from public.stock_balances
    where store_id=v_store and product_id=v_product.id
    for update;

    if not v_allow_negative and v_balance.quantity < v_qty then
      raise exception 'insufficient stock for %', v_product.name;
    end if;

    v_line_subtotal := (v_product.sale_price * v_qty) - v_line_discount;
    if v_line_subtotal < 0 then raise exception 'invalid discount'; end if;
    v_subtotal := v_subtotal + (v_product.sale_price * v_qty);
    v_discount := v_discount + v_line_discount;
  end loop;

  if v_subtotal > 0
     and (v_discount / v_subtotal * 100) > v_max_discount
     and not private.has_feature(v_tenant,'sales.discount','MANAGE')
  then
    raise exception 'discount exceeds configured limit';
  end if;

  v_total := round(v_subtotal - v_discount + v_surcharge,2);
  if v_total < 0 then raise exception 'invalid sale total'; end if;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'::jsonb))
  loop
    v_method := v_payment->>'method';
    v_amount := coalesce((v_payment->>'amount')::numeric,0);
    v_change := greatest(0,coalesce((v_payment->>'change_amount')::numeric,0));
    if v_method not in ('DINHEIRO','PIX','DEBITO','CREDITO','VOUCHER','FIADO') then raise exception 'invalid payment method'; end if;
    if v_amount <= 0 or v_change > v_amount then raise exception 'invalid payment amount'; end if;

    v_paid_net := v_paid_net + v_amount - v_change;
    if v_method='DINHEIRO' then v_cash_net := v_cash_net + v_amount - v_change;
    elsif v_method='PIX' then v_pix := v_pix + v_amount;
    elsif v_method='DEBITO' then v_debit := v_debit + v_amount;
    elsif v_method='CREDITO' then v_credit := v_credit + v_amount;
    elsif v_method='VOUCHER' then v_voucher := v_voucher + v_amount;
    elsif v_method='FIADO' then v_fiado := v_fiado + v_amount;
    end if;
  end loop;

  if abs(v_paid_net - v_total) > 0.01 then raise exception 'payment total differs from sale total'; end if;

  if v_fiado > 0 then
    if v_customer is null then raise exception 'customer required for credit sale'; end if;
    perform 1 from public.customers where id=v_customer and tenant_id=v_tenant for update;
    if not found then raise exception 'customer not found'; end if;
    if exists(
      select 1 from public.customers
      where id=v_customer
        and (status <> 'LIBERADO' or credit_balance + v_fiado > credit_limit)
    ) then raise exception 'customer credit unavailable'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_store::text));
  select coalesce(max(sale_number),0)+1 into v_sale_number
  from public.sales where store_id=v_store;

  insert into public.sales(
    tenant_id,store_id,cash_session_id,sale_number,cashier_id,customer_id,
    subtotal,discount,surcharge,total,status,idempotency_key
  ) values(
    v_tenant,v_store,v_session_id,v_sale_number,v_user,v_customer,
    v_subtotal,v_discount,v_surcharge,v_total,'PAGA',v_idempotency
  ) returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant;
    v_qty := (v_item->>'quantity')::numeric;
    v_line_discount := greatest(0,coalesce((v_item->>'discount')::numeric,0));
    v_line_subtotal := (v_product.sale_price * v_qty) - v_line_discount;

    select * into v_balance
    from public.stock_balances
    where store_id=v_store and product_id=v_product.id
    for update;

    insert into public.sale_items(
      sale_id,tenant_id,product_id,product_name,barcode,unit_price,cost_price,quantity,discount,subtotal,is_combo
    ) values(
      v_sale,v_tenant,v_product.id,v_product.name,v_product.barcode,v_product.sale_price,
      v_product.cost_price,v_qty,v_line_discount,v_line_subtotal,false
    );

    update public.stock_balances
    set quantity=quantity-v_qty,updated_at=now()
    where store_id=v_store and product_id=v_product.id;

    insert into public.stock_movements(
      tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,
      reason,document_ref,created_by
    ) values(
      v_tenant,v_store,v_product.id,'VENDA',v_qty,v_balance.quantity,v_balance.quantity-v_qty,
      'Venda PDV','SALE:'||v_sale::text,v_user
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payload->'payments')
  loop
    v_method := v_payment->>'method';
    v_amount := (v_payment->>'amount')::numeric;
    v_change := greatest(0,coalesce((v_payment->>'change_amount')::numeric,0));
    insert into public.sale_payments(
      sale_id,tenant_id,method,amount,change_amount,provider,authorization_code,nsu,status
    ) values(
      v_sale,v_tenant,v_method,v_amount,v_change,
      coalesce(nullif(v_payment->>'provider',''),'MANUAL'),
      nullif(v_payment->>'authorization_code',''),
      nullif(v_payment->>'nsu',''),
      'CONFIRMADO'
    );
  end loop;

  if v_session_id is not null then
    update public.cash_sessions
    set total_sales=total_sales+v_total,
        total_cash_sales=total_cash_sales+v_cash_net,
        total_pix_sales=total_pix_sales+v_pix,
        total_card_debit_sales=total_card_debit_sales+v_debit,
        total_card_credit_sales=total_card_credit_sales+v_credit,
        total_voucher_sales=total_voucher_sales+v_voucher,
        total_other_sales=total_other_sales+v_fiado,
        expected_cash=expected_cash+v_cash_net
    where id=v_session_id;
  end if;

  insert into public.financial_transactions(
    tenant_id,store_id,transaction_type,category,amount,description,source,reference_id,created_by
  ) values(v_tenant,v_store,'RECEITA','Vendas',v_total,'Venda PDV','VENDA',v_sale,v_user);

  if v_customer is not null then
    update public.customers
    set total_purchases=total_purchases+v_total,
        credit_balance=credit_balance+v_fiado,
        last_purchase_at=now(),
        updated_at=now()
    where id=v_customer and tenant_id=v_tenant;
  end if;

  return v_sale;
end
$$;

create or replace function public.open_cash_session(
  p_store_id uuid,
  p_cash_register_id uuid,
  p_operator_id uuid,
  p_initial_balance numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_tenant uuid;
  v_session uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;
  if coalesce(p_initial_balance,0) < 0 then raise exception 'invalid initial balance'; end if;

  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.has_feature(v_tenant,'cash.open','USE') then raise exception 'cash open permission denied'; end if;

  perform 1 from public.cash_registers where id=p_cash_register_id and store_id=p_store_id and active for update;
  if not found then raise exception 'cash register not found'; end if;
  if exists(select 1 from public.cash_sessions where cash_register_id=p_cash_register_id and status='ABERTO') then
    raise exception 'cash register already open';
  end if;
  if p_operator_id is not null and not exists(
    select 1 from public.operators where id=p_operator_id and store_id=p_store_id and active
  ) then raise exception 'operator not found'; end if;

  insert into public.cash_sessions(
    tenant_id,store_id,cash_register_id,operator_id,initial_balance,expected_cash,status
  ) values(v_tenant,p_store_id,p_cash_register_id,auth.uid(),p_initial_balance,p_initial_balance,'ABERTO')
  returning id into v_session;

  update public.cash_registers set status='ABERTO' where id=p_cash_register_id;
  return v_session;
end
$$;

create or replace function public.register_cash_movement(
  p_cash_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status <> 'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.movement','USE') then raise exception 'cash movement permission denied'; end if;
  if p_movement_type not in ('SANGRIA','SUPRIMENTO') then raise exception 'invalid movement type'; end if;
  if coalesce(p_amount,0) <= 0 then raise exception 'invalid amount'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'reason required'; end if;

  insert into public.cash_movements(
    tenant_id,store_id,cash_session_id,movement_type,amount,reason,created_by
  ) values(v_session.tenant_id,v_session.store_id,p_cash_session_id,p_movement_type,p_amount,trim(p_reason),auth.uid())
  returning id into v_id;

  if p_movement_type='SANGRIA' then
    update public.cash_sessions
      set total_withdrawals=total_withdrawals+p_amount,
          expected_cash=expected_cash-p_amount
    where id=p_cash_session_id;
  else
    update public.cash_sessions
      set total_supplies=total_supplies+p_amount,
          expected_cash=expected_cash+p_amount
    where id=p_cash_session_id;
  end if;

  return v_id;
end
$$;

create or replace function public.close_cash_session(
  p_cash_session_id uuid,
  p_counted_cash numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_expected numeric;
  v_difference numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status <> 'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'cash close permission denied'; end if;
  if coalesce(p_counted_cash,0) < 0 then raise exception 'invalid counted cash'; end if;

  v_expected := round(v_session.initial_balance + v_session.total_cash_sales - v_session.total_withdrawals + v_session.total_supplies,2);
  v_difference := round(p_counted_cash - v_expected,2);

  update public.cash_sessions
  set expected_cash=v_expected,
      counted_cash=p_counted_cash,
      cash_difference=v_difference,
      closure_notes=nullif(trim(coalesce(p_notes,'')),''),
      status='FECHADO',
      closed_at=now()
  where id=p_cash_session_id;

  update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;

  return jsonb_build_object(
    'session_id',p_cash_session_id,
    'expected_cash',v_expected,
    'counted_cash',p_counted_cash,
    'difference',v_difference
  );
end
$$;
