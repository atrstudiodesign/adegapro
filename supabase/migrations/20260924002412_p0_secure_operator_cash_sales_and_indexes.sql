
-- P0: secure operator PINs, transactional sales/cash, and DB performance hardening.

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  role text not null check (role in ('ADMINISTRADOR','GERENTE','CAIXA','ESTOQUISTA','FINANCEIRO')),
  active boolean not null default true,
  pin_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  last_authenticated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operators enable row level security;

drop policy if exists operators_select on public.operators;
create policy operators_select
on public.operators for select to authenticated
using (private.has_store_access(store_id));

revoke insert, update, delete on public.operators from authenticated;

create index if not exists idx_operators_store_active on public.operators(store_id, active);
create index if not exists idx_operators_tenant on public.operators(tenant_id);

create or replace function public.save_operator(
  p_operator_id uuid,
  p_store_id uuid,
  p_name text,
  p_role text,
  p_pin text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select tenant_id into v_tenant from public.stores where id = p_store_id;
  if v_tenant is null then raise exception 'store not found'; end if;
  if not private.can_manage_users(v_tenant) then raise exception 'forbidden'; end if;

  if length(trim(p_name)) < 2 then raise exception 'invalid operator name'; end if;
  if p_role not in ('ADMINISTRADOR','GERENTE','CAIXA','ESTOQUISTA','FINANCEIRO') then
    raise exception 'invalid operator role';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must have 4 to 8 digits';
  end if;

  if p_operator_id is null then
    insert into public.operators(tenant_id, store_id, name, role, active, pin_hash, created_by)
    values(v_tenant, p_store_id, trim(p_name), p_role, coalesce(p_active,true),
      crypt(p_pin, gen_salt('bf', 12)), v_user)
    returning id into v_id;
  else
    update public.operators
    set name = trim(p_name),
        role = p_role,
        active = coalesce(p_active,true),
        pin_hash = crypt(p_pin, gen_salt('bf', 12)),
        failed_attempts = 0,
        locked_until = null,
        updated_at = now()
    where id = p_operator_id
      and tenant_id = v_tenant
      and store_id = p_store_id
    returning id into v_id;
    if v_id is null then raise exception 'operator not found'; end if;
  end if;

  return v_id;
end
$$;

revoke all on function public.save_operator(uuid,uuid,text,text,text,boolean) from public, anon;
grant execute on function public.save_operator(uuid,uuid,text,text,text,boolean) to authenticated;

create or replace function public.verify_operator_pin(
  p_store_id uuid,
  p_operator_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, extensions
as $$
declare
  v_op public.operators%rowtype;
  v_ok boolean := false;
  v_lock timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'forbidden'; end if;

  select * into v_op
  from public.operators
  where id = p_operator_id and store_id = p_store_id and active = true
  for update;

  if not found then
    return jsonb_build_object('ok',false,'code','INVALID_CREDENTIALS');
  end if;

  if v_op.locked_until is not null and v_op.locked_until > now() then
    return jsonb_build_object(
      'ok',false,'code','LOCKED',
      'retry_after_seconds',greatest(1,ceil(extract(epoch from (v_op.locked_until-now())))::int)
    );
  end if;

  v_ok := v_op.pin_hash = crypt(coalesce(p_pin,''), v_op.pin_hash);

  if not v_ok then
    if v_op.failed_attempts + 1 >= 5 then
      v_lock := now() + interval '15 minutes';
      update public.operators
      set failed_attempts = 0, locked_until = v_lock, updated_at = now()
      where id = v_op.id;
      return jsonb_build_object('ok',false,'code','LOCKED','retry_after_seconds',900);
    else
      update public.operators
      set failed_attempts = failed_attempts + 1, updated_at = now()
      where id = v_op.id;
      return jsonb_build_object('ok',false,'code','INVALID_CREDENTIALS');
    end if;
  end if;

  update public.operators
  set failed_attempts = 0, locked_until = null, last_authenticated_at = now(), updated_at = now()
  where id = v_op.id;

  insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,metadata)
  values(v_op.tenant_id,v_op.store_id,auth.uid(),'OPERATOR_PIN_VERIFIED','operator',v_op.id::text,
    jsonb_build_object('operator_name',v_op.name,'role',v_op.role));

  return jsonb_build_object(
    'ok',true,
    'operator',jsonb_build_object('id',v_op.id,'name',v_op.name,'role',v_op.role,'store_id',v_op.store_id)
  );
end
$$;

revoke all on function public.verify_operator_pin(uuid,uuid,text) from public, anon;
grant execute on function public.verify_operator_pin(uuid,uuid,text) to authenticated;

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

  select tenant_id into v_tenant from public.stores where id=p_store_id;
  if not exists(select 1 from public.cash_registers where id=p_cash_register_id and store_id=p_store_id and active) then
    raise exception 'cash register not found';
  end if;
  if exists(select 1 from public.cash_sessions where cash_register_id=p_cash_register_id and status='ABERTO') then
    raise exception 'cash register already open';
  end if;
  if p_operator_id is not null and not exists(
    select 1 from public.operators where id=p_operator_id and store_id=p_store_id and active
  ) then raise exception 'operator not found'; end if;

  insert into public.cash_sessions(
    tenant_id,store_id,cash_register_id,initial_balance,expected_cash,status
  ) values(v_tenant,p_store_id,p_cash_register_id,p_initial_balance,p_initial_balance,'ABERTO')
  returning id into v_session;

  update public.cash_registers set status='ABERTO' where id=p_cash_register_id;
  return v_session;
end
$$;

revoke all on function public.open_cash_session(uuid,uuid,uuid,numeric) from public, anon;
grant execute on function public.open_cash_session(uuid,uuid,uuid,numeric) to authenticated;

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

revoke all on function public.register_cash_movement(uuid,text,numeric,text) from public, anon;
grant execute on function public.register_cash_movement(uuid,text,numeric,text) to authenticated;

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
  v_difference numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
  if not found or v_session.status <> 'ABERTO' then raise exception 'cash session is not open'; end if;
  if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
  if coalesce(p_counted_cash,0) < 0 then raise exception 'invalid counted cash'; end if;

  v_difference := p_counted_cash - v_session.expected_cash;

  update public.cash_sessions
  set counted_cash=p_counted_cash,
      cash_difference=v_difference,
      closure_notes=nullif(trim(coalesce(p_notes,'')),''),
      status='FECHADO',
      closed_at=now()
  where id=p_cash_session_id;

  update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;

  return jsonb_build_object(
    'session_id',p_cash_session_id,
    'expected_cash',v_session.expected_cash,
    'counted_cash',p_counted_cash,
    'difference',v_difference
  );
end
$$;

revoke all on function public.close_cash_session(uuid,numeric,text) from public, anon;
grant execute on function public.close_cash_session(uuid,numeric,text) to authenticated;

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
  v_total numeric := 0;
  v_paid numeric := 0;
  v_method text;
  v_amount numeric;
  v_allow_negative boolean := false;
  v_idempotency text := nullif(p_payload->>'idempotency_key','');
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if v_store is null or not private.has_store_access(v_store) then raise exception 'forbidden'; end if;
  if v_idempotency is null or length(v_idempotency) < 8 then raise exception 'idempotency key required'; end if;

  select tenant_id,allow_sell_without_stock into v_tenant,v_allow_negative
  from public.stores where id=v_store;

  select id into v_sale from public.sales where tenant_id=v_tenant and idempotency_key=v_idempotency;
  if v_sale is not null then return v_sale; end if;

  if v_session_id is not null and not exists(
    select 1 from public.cash_sessions where id=v_session_id and store_id=v_store and status='ABERTO'
  ) then raise exception 'cash session is not open'; end if;

  if jsonb_array_length(coalesce(p_payload->'items','[]'::jsonb)) = 0 then raise exception 'sale has no items'; end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product
    from public.products
    where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant and status='ACTIVE';

    if not found then raise exception 'product not found'; end if;
    v_qty := coalesce((v_item->>'quantity')::numeric,0);
    v_line_discount := greatest(0,coalesce((v_item->>'discount')::numeric,0));
    if v_qty <= 0 then raise exception 'invalid quantity'; end if;

    select * into v_balance
    from public.stock_balances
    where store_id=v_store and product_id=v_product.id
    for update;

    if not found then
      insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
      values(v_tenant,v_store,v_product.id,0)
      returning * into v_balance;
    end if;

    if not v_allow_negative and not v_product.is_combo and v_balance.quantity < v_qty then
      raise exception 'insufficient stock for %', v_product.name;
    end if;

    v_line_subtotal := (v_product.sale_price * v_qty) - v_line_discount;
    if v_line_subtotal < 0 then raise exception 'invalid discount'; end if;
    v_subtotal := v_subtotal + (v_product.sale_price * v_qty);
    v_discount := v_discount + v_line_discount;
  end loop;

  v_total := v_subtotal - v_discount;
  if v_total < 0 then raise exception 'invalid sale total'; end if;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payload->'payments','[]'::jsonb))
  loop
    v_method := v_payment->>'method';
    v_amount := coalesce((v_payment->>'amount')::numeric,0);
    if v_method not in ('DINHEIRO','PIX','DEBITO','CREDITO','VOUCHER','FIADO') then raise exception 'invalid payment method'; end if;
    if v_amount <= 0 then raise exception 'invalid payment amount'; end if;
    v_paid := v_paid + v_amount;
  end loop;

  if v_paid < v_total then raise exception 'insufficient payment'; end if;

  insert into public.sales(
    tenant_id,store_id,cash_session_id,cashier_id,customer_id,
    subtotal,discount,total,status,idempotency_key
  ) values(
    v_tenant,v_store,v_session_id,v_user,v_customer,
    v_subtotal,v_discount,v_total,'PAGA',v_idempotency
  ) returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_line_discount := greatest(0,coalesce((v_item->>'discount')::numeric,0));
    v_line_subtotal := (v_product.sale_price * v_qty) - v_line_discount;

    insert into public.sale_items(
      sale_id,tenant_id,product_id,product_name,barcode,unit_price,cost_price,quantity,discount,subtotal,is_combo
    ) values(
      v_sale,v_tenant,v_product.id,v_product.name,v_product.barcode,v_product.sale_price,
      v_product.cost_price,v_qty,v_line_discount,v_line_subtotal,v_product.is_combo
    );

    if not v_product.is_combo then
      select * into v_balance from public.stock_balances
      where store_id=v_store and product_id=v_product.id for update;

      update public.stock_balances
      set quantity=quantity-v_qty,updated_at=now()
      where store_id=v_store and product_id=v_product.id;

      insert into public.stock_movements(
        tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,
        reason,document_ref,created_by
      ) values(
        v_tenant,v_store,v_product.id,'VENDA',-v_qty,v_balance.quantity,v_balance.quantity-v_qty,
        'Venda PDV',v_sale::text,v_user
      );
    end if;
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payload->'payments')
  loop
    v_method := v_payment->>'method';
    v_amount := (v_payment->>'amount')::numeric;
    insert into public.sale_payments(
      sale_id,tenant_id,method,amount,change_amount,provider,authorization_code,nsu,status
    ) values(
      v_sale,v_tenant,v_method,v_amount,
      greatest(0,coalesce((v_payment->>'change_amount')::numeric,0)),
      coalesce(nullif(v_payment->>'provider',''),'MANUAL'),
      nullif(v_payment->>'authorization_code',''),
      nullif(v_payment->>'nsu',''),
      'CONFIRMADO'
    );

    if v_session_id is not null then
      update public.cash_sessions
      set total_sales=total_sales+v_amount,
          total_cash_sales=total_cash_sales+case when v_method='DINHEIRO' then v_amount else 0 end,
          total_pix_sales=total_pix_sales+case when v_method='PIX' then v_amount else 0 end,
          total_card_debit_sales=total_card_debit_sales+case when v_method='DEBITO' then v_amount else 0 end,
          total_card_credit_sales=total_card_credit_sales+case when v_method='CREDITO' then v_amount else 0 end,
          total_voucher_sales=total_voucher_sales+case when v_method='VOUCHER' then v_amount else 0 end,
          total_other_sales=total_other_sales+case when v_method='FIADO' then v_amount else 0 end,
          expected_cash=expected_cash+case when v_method='DINHEIRO' then v_amount-greatest(0,coalesce((v_payment->>'change_amount')::numeric,0)) else 0 end
      where id=v_session_id;
    end if;
  end loop;

  insert into public.financial_transactions(
    tenant_id,store_id,transaction_type,category,amount,description,source,reference_id,created_by
  ) values(v_tenant,v_store,'RECEITA','Vendas',v_total,'Venda PDV','VENDA',v_sale,v_user);

  if v_customer is not null then
    update public.customers
    set total_purchases=total_purchases+v_total,last_purchase_at=now(),updated_at=now()
    where id=v_customer and tenant_id=v_tenant;
  end if;

  return v_sale;
end
$$;

revoke all on function public.finalize_sale(jsonb) from public, anon;
grant execute on function public.finalize_sale(jsonb) to authenticated;

-- Cover all single-column foreign keys with indexes. Safe/idempotent generated names.
do $$
declare r record;
begin
  for r in
    select n.nspname schema_name, c.relname table_name, a.attname col_name
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    join unnest(con.conkey) with ordinality k(attnum,ord) on true
    join pg_attribute a on a.attrelid=c.oid and a.attnum=k.attnum
    where con.contype='f' and n.nspname='public'
      and array_length(con.conkey,1)=1
  loop
    execute format('create index if not exists %I on %I.%I(%I)',
      'idx_'||r.table_name||'_'||r.col_name,
      r.schema_name,r.table_name,r.col_name);
  end loop;
end $$;

-- Optimize auth.uid() policies called per row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (user_id=(select auth.uid()) or private.is_super_admin() or private.has_tenant_access(tenant_id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (user_id=(select auth.uid()) or private.is_super_admin())
with check (user_id=(select auth.uid()) or private.is_super_admin());

drop policy if exists usa_select on public.user_store_access;
create policy usa_select on public.user_store_access for select to authenticated
using (user_id=(select auth.uid()) or private.is_super_admin());

drop policy if exists ufa_select on public.user_feature_access;
create policy ufa_select on public.user_feature_access for select to authenticated
using (user_id=(select auth.uid()) or private.is_super_admin());

drop policy if exists legal_acceptances_self_read on public.legal_acceptances;
create policy legal_acceptances_self_read on public.legal_acceptances for select to authenticated
using (user_id=(select auth.uid()) or private.is_super_admin());
