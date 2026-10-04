
create or replace function public.confirm_purchase(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_store uuid := (p_payload->>'store_id')::uuid;
  v_tenant uuid;
  v_supplier uuid := nullif(p_payload->>'supplier_id','')::uuid;
  v_operator uuid;
  v_purchase uuid;
  v_purchase_item uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_balance public.stock_balances%rowtype;
  v_qty numeric;
  v_unit_cost numeric;
  v_new_sale_price numeric;
  v_subtotal numeric:=0;
  v_freight numeric:=greatest(0,coalesce((p_payload->>'freight')::numeric,0));
  v_discount numeric:=greatest(0,coalesce((p_payload->>'discount')::numeric,0));
  v_total numeric;
  v_term text:=coalesce(nullif(p_payload->>'payment_term',''),'A_VISTA');
  v_due date;
  v_expiry date;
  v_lot text;
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
    tenant_id,store_id,supplier_id,invoice_number,invoice_key,issue_date,subtotal,freight,discount,total,
    payment_method,payment_term,status,receipt_status,manifest_status,manifested_at,received_at,created_by
  ) values(
    v_tenant,v_store,v_supplier,nullif(trim(p_payload->>'invoice_number'),''),
    nullif(trim(p_payload->>'invoice_key'),''),
    coalesce(nullif(p_payload->>'issue_date','')::date,current_date),
    v_subtotal,v_freight,v_discount,v_total,nullif(p_payload->>'payment_method',''),v_term,'CONFIRMADA',
    coalesce(nullif(p_payload->>'receipt_status',''),'CONFERIDA'),
    coalesce(nullif(p_payload->>'manifest_status',''),'NAO_INTEGRADA'),
    case when coalesce(nullif(p_payload->>'manifest_status',''),'NAO_INTEGRADA') <> 'NAO_INTEGRADA' then now() else null end,
    now(),auth.uid()
  ) returning id into v_purchase;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    v_qty:=(v_item->>'quantity')::numeric;
    v_unit_cost:=(v_item->>'unit_cost')::numeric;
    v_new_sale_price:=nullif(v_item->>'new_sale_price','')::numeric;
    v_expiry:=nullif(v_item->>'expiry_date','')::date;
    v_lot:=nullif(trim(v_item->>'lot_number'),'');
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and tenant_id=v_tenant;

    insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
    values(v_tenant,v_store,v_product.id,0)
    on conflict(store_id,product_id) do nothing;

    select * into v_balance from public.stock_balances where store_id=v_store and product_id=v_product.id for update;

    insert into public.purchase_items(
      purchase_id,tenant_id,product_id,product_name,quantity,unit_cost,total_cost,
      lot_number,expiry_date,previous_cost,previous_sale_price,new_sale_price
    )
    values(
      v_purchase,v_tenant,v_product.id,v_product.name,v_qty,v_unit_cost,round(v_qty*v_unit_cost,2),
      v_lot,v_expiry,v_product.cost_price,v_product.sale_price,v_new_sale_price
    )
    returning id into v_purchase_item;

    update public.stock_balances set quantity=quantity+v_qty,updated_at=now()
    where store_id=v_store and product_id=v_product.id;

    update public.products
    set cost_price=v_unit_cost,
        sale_price=coalesce(v_new_sale_price,sale_price),
        updated_at=now()
    where id=v_product.id and tenant_id=v_tenant;

    if v_product.cost_price is distinct from v_unit_cost
       or (v_new_sale_price is not null and v_product.sale_price is distinct from v_new_sale_price)
    then
      insert into public.product_price_history(
        tenant_id,store_id,product_id,source,reference_id,
        old_cost,new_cost,old_sale_price,new_sale_price,changed_by
      ) values(
        v_tenant,v_store,v_product.id,'PURCHASE',v_purchase,
        v_product.cost_price,v_unit_cost,v_product.sale_price,coalesce(v_new_sale_price,v_product.sale_price),auth.uid()
      );
    end if;

    insert into public.product_batches(
      tenant_id,store_id,product_id,purchase_id,purchase_item_id,lot_number,expiry_date,
      quantity_received,quantity_remaining,unit_cost
    ) values(
      v_tenant,v_store,v_product.id,v_purchase,v_purchase_item,v_lot,v_expiry,v_qty,v_qty,v_unit_cost
    );

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
end
$$;
revoke all on function public.confirm_purchase(jsonb) from public, anon;
grant execute on function public.confirm_purchase(jsonb) to authenticated;

create table if not exists public.payment_terminal_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null,
  terminal_label text,
  external_terminal_id text,
  connection_mode text not null default 'API',
  active boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_terminal_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  terminal_connection_id uuid references public.payment_terminal_connections(id) on delete set null,
  provider text not null,
  event_type text not null,
  status text not null default 'PENDING',
  provider_reference text,
  amount numeric(14,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_terminal_connections enable row level security;
alter table public.payment_terminal_events enable row level security;

drop policy if exists payment_terminal_connections_read on public.payment_terminal_connections;
create policy payment_terminal_connections_read on public.payment_terminal_connections
for select to authenticated using (private.has_store_access(store_id));

drop policy if exists payment_terminal_connections_manage on public.payment_terminal_connections;
create policy payment_terminal_connections_manage on public.payment_terminal_connections
for all to authenticated
using (private.has_store_access(store_id) and private.has_feature(tenant_id,'settings.edit','MANAGE'))
with check (private.has_store_access(store_id) and private.has_feature(tenant_id,'settings.edit','MANAGE'));

drop policy if exists payment_terminal_events_read on public.payment_terminal_events;
create policy payment_terminal_events_read on public.payment_terminal_events
for select to authenticated using (private.has_store_access(store_id));

revoke insert,update,delete on public.payment_terminal_events from authenticated;
