
create or replace function public.confirm_purchase(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  v_store uuid := (p_payload->>'store_id')::uuid;
  v_tenant uuid;
  v_supplier uuid := nullif(p_payload->>'supplier_id','')::uuid;
  v_operator uuid;
  v_purchase uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_balance public.stock_balances%rowtype;
  v_qty numeric;
  v_unit_cost numeric;
  v_subtotal numeric:=0;
  v_freight numeric:=greatest(0,coalesce((p_payload->>'freight')::numeric,0));
  v_discount numeric:=greatest(0,coalesce((p_payload->>'discount')::numeric,0));
  v_total numeric;
  v_term text:=coalesce(nullif(p_payload->>'payment_term',''),'A_VISTA');
  v_due date;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if v_store is null or not private.has_store_access(v_store) then raise exception 'store access denied'; end if;
  select tenant_id into v_tenant from public.stores where id=v_store and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;

  v_operator:=private.require_operator_session(v_store,p_payload->>'operator_session_token');
  if not private.operator_can(v_operator,'inventory.adjust') then raise exception 'operator cannot receive purchases'; end if;
  if not private.has_feature(v_tenant,'products.edit','USE') and not private.has_feature(v_tenant,'inventory.adjust','USE') then
    raise exception 'account cannot receive purchases';
  end if;

  if v_supplier is not null and not exists(select 1 from public.suppliers where id=v_supplier and tenant_id=v_tenant) then
    raise exception 'supplier not found';
  end if;
  if jsonb_array_length(coalesce(p_payload->'items','[]'::jsonb))=0 then raise exception 'purchase requires items'; end if;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_qty:=coalesce((v_item->>'quantity')::numeric,0);
    v_unit_cost:=coalesce((v_item->>'unit_cost')::numeric,0);
    if v_qty<=0 or v_unit_cost<0 then raise exception 'invalid purchase item'; end if;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant and status='ACTIVE';
    if not found then raise exception 'product not found'; end if;
    v_subtotal:=v_subtotal+(v_qty*v_unit_cost);
  end loop;

  v_total:=round(v_subtotal+v_freight-v_discount,2);
  if v_total<0 then raise exception 'invalid purchase total'; end if;

  insert into public.purchases(
    tenant_id,store_id,supplier_id,invoice_number,issue_date,subtotal,freight,discount,total,
    payment_method,payment_term,status,created_by
  ) values(
    v_tenant,v_store,v_supplier,nullif(trim(p_payload->>'invoice_number'),''),
    coalesce(nullif(p_payload->>'issue_date','')::date,current_date),
    v_subtotal,v_freight,v_discount,v_total,nullif(p_payload->>'payment_method',''),v_term,'CONFIRMADA',auth.uid()
  ) returning id into v_purchase;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_qty:=(v_item->>'quantity')::numeric;
    v_unit_cost:=(v_item->>'unit_cost')::numeric;
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant;

    insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
    values(v_tenant,v_store,v_product.id,0)
    on conflict(store_id,product_id) do nothing;

    select * into v_balance from public.stock_balances where store_id=v_store and product_id=v_product.id for update;

    insert into public.purchase_items(purchase_id,tenant_id,product_id,product_name,quantity,unit_cost,total_cost)
    values(v_purchase,v_tenant,v_product.id,v_product.name,v_qty,v_unit_cost,round(v_qty*v_unit_cost,2));

    update public.stock_balances set quantity=quantity+v_qty,updated_at=now()
    where store_id=v_store and product_id=v_product.id;

    update public.products set cost_price=v_unit_cost,updated_at=now()
    where id=v_product.id and tenant_id=v_tenant;

    insert into public.stock_movements(
      tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_by
    ) values(
      v_tenant,v_store,v_product.id,'COMPRA',v_qty,v_balance.quantity,v_balance.quantity+v_qty,
      'Entrada por compra','PURCHASE:'||v_purchase::text,auth.uid()
    );
  end loop;

  if v_term='A_VISTA' then
    insert into public.financial_transactions(
      tenant_id,store_id,transaction_type,category,amount,description,source,reference_id,created_by
    ) values(v_tenant,v_store,'DESPESA','Compras',v_total,'Compra de mercadorias','COMPRA',v_purchase,auth.uid());
  else
    v_due:=coalesce(nullif(p_payload->>'due_date','')::date,current_date+30);
    insert into public.accounts_payable(
      tenant_id,store_id,supplier_id,description,category,amount,due_date,status,notes
    ) values(v_tenant,v_store,v_supplier,'Compra de mercadorias','Fornecedores',v_total,v_due,'PENDENTE',
      'Compra '||v_purchase::text);
  end if;

  return v_purchase;
end $$;

revoke all on function public.confirm_purchase(jsonb) from public,anon;
grant execute on function public.confirm_purchase(jsonb) to authenticated;

drop policy if exists purchases_all on public.purchases;
create policy purchases_select on public.purchases for select to authenticated using(private.has_store_access(store_id));

drop policy if exists purchase_items_all on public.purchase_items;
create policy purchase_items_select on public.purchase_items for select to authenticated using(private.has_tenant_access(tenant_id));

drop policy if exists accounts_payable_all on public.accounts_payable;
create policy accounts_payable_select on public.accounts_payable for select to authenticated
using(private.has_store_access(store_id) and private.has_feature(tenant_id,'finance.view','VIEW'));

drop policy if exists accounts_receivable_all on public.accounts_receivable;
create policy accounts_receivable_select on public.accounts_receivable for select to authenticated
using(private.has_store_access(store_id) and private.has_feature(tenant_id,'finance.view','VIEW'));
