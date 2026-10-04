
create or replace function public.settle_customer_credit(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_operator_token text,
  p_cash_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  v_customer public.customers%rowtype;
  v_store uuid;
  v_tenant uuid;
  v_operator uuid;
  v_applied numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_amount<=0 then raise exception 'invalid amount'; end if;
  if p_payment_method not in ('DINHEIRO','PIX','DEBITO','CREDITO') then raise exception 'invalid payment method'; end if;

  select * into v_customer from public.customers where id=p_customer_id for update;
  if not found then raise exception 'customer not found'; end if;
  v_tenant:=v_customer.tenant_id;
  v_store:=coalesce(v_customer.store_id,(select usa.store_id from public.user_store_access usa where usa.user_id=auth.uid() and usa.tenant_id=v_tenant and usa.active limit 1));
  if v_store is null or not private.has_store_access(v_store) then raise exception 'store access denied'; end if;

  v_operator:=private.require_operator_session(v_store,p_operator_token);
  if not private.operator_can(v_operator,'cash.operate') and not private.operator_can(v_operator,'cash.movement') then
    raise exception 'operator cannot receive customer credit';
  end if;

  v_applied:=least(p_amount,v_customer.credit_balance);
  if v_applied<=0 then raise exception 'customer has no outstanding balance'; end if;

  update public.customers
  set credit_balance=credit_balance-v_applied,updated_at=now()
  where id=p_customer_id;

  insert into public.financial_transactions(
    tenant_id,store_id,transaction_type,category,amount,description,source,created_by
  ) values(
    v_tenant,v_store,'RECEITA','Recebimento de Fiado',v_applied,
    'Recebimento de saldo do cliente '||v_customer.name,'MANUAL',auth.uid()
  );

  if p_payment_method='DINHEIRO' and p_cash_session_id is not null then
    update public.cash_sessions
    set total_cash_sales=total_cash_sales+v_applied,
        total_other_sales=total_other_sales+v_applied,
        expected_cash=expected_cash+v_applied
    where id=p_cash_session_id and store_id=v_store and status='ABERTO' and operator_ref=v_operator;
    if not found then raise exception 'open cash session required for cash receipt'; end if;
  end if;

  insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,metadata)
  values(v_tenant,v_store,auth.uid(),'CUSTOMER_CREDIT_SETTLED','customer',p_customer_id::text,
    jsonb_build_object('operator_id',v_operator,'amount',v_applied,'payment_method',p_payment_method));

  return jsonb_build_object('customer_id',p_customer_id,'applied',v_applied,'remaining',v_customer.credit_balance-v_applied);
end $$;

revoke all on function public.settle_customer_credit(uuid,numeric,text,text,uuid) from public,anon;
grant execute on function public.settle_customer_credit(uuid,numeric,text,text,uuid) to authenticated;
