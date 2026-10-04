
alter table public.purchases
  add column if not exists invoice_key text,
  add column if not exists receipt_status text not null default 'CONFERIDA',
  add column if not exists manifest_status text not null default 'NAO_INTEGRADA',
  add column if not exists manifested_at timestamptz,
  add column if not exists received_at timestamptz not null default now();

alter table public.purchase_items
  add column if not exists lot_number text,
  add column if not exists expiry_date date,
  add column if not exists previous_cost numeric(14,4),
  add column if not exists previous_sale_price numeric(14,2),
  add column if not exists new_sale_price numeric(14,2);

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  purchase_id uuid references public.purchases(id) on delete set null,
  purchase_item_id uuid references public.purchase_items(id) on delete set null,
  lot_number text,
  expiry_date date,
  quantity_received numeric(14,3) not null check (quantity_received > 0),
  quantity_remaining numeric(14,3) not null check (quantity_remaining >= 0),
  unit_cost numeric(14,4) not null default 0,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.stock_batch_consumptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  batch_id uuid not null references public.product_batches(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  stock_movement_id uuid references public.stock_movements(id) on delete set null,
  quantity numeric(14,3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null default 'MANUAL',
  reference_id uuid,
  old_cost numeric(14,4),
  new_cost numeric(14,4),
  old_sale_price numeric(14,2),
  new_sale_price numeric(14,2),
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.product_batches enable row level security;
alter table public.stock_batch_consumptions enable row level security;
alter table public.product_price_history enable row level security;

drop policy if exists product_batches_read on public.product_batches;
create policy product_batches_read on public.product_batches
for select to authenticated using (private.has_store_access(store_id));

drop policy if exists batch_consumptions_read on public.stock_batch_consumptions;
create policy batch_consumptions_read on public.stock_batch_consumptions
for select to authenticated using (private.has_store_access(store_id));

drop policy if exists price_history_read on public.product_price_history;
create policy price_history_read on public.product_price_history
for select to authenticated using (private.has_tenant_access(tenant_id));

revoke insert,update,delete on public.product_batches from authenticated;
revoke insert,update,delete on public.stock_batch_consumptions from authenticated;
revoke insert,update,delete on public.product_price_history from authenticated;

create index if not exists idx_batches_expiry on public.product_batches(store_id, expiry_date, quantity_remaining);
create index if not exists idx_batches_product_fefo on public.product_batches(store_id, product_id, expiry_date, received_at);
create index if not exists idx_batch_consumptions_sale on public.stock_batch_consumptions(sale_id);
create index if not exists idx_price_history_product on public.product_price_history(product_id, created_at desc);

create or replace function private.consume_batches_from_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_remaining numeric := new.quantity;
  v_batch record;
  v_take numeric;
  v_sale uuid;
begin
  if new.movement_type <> 'VENDA' or new.quantity <= 0 then
    return new;
  end if;

  if new.document_ref like 'SALE:%' then
    begin
      v_sale := replace(new.document_ref,'SALE:','')::uuid;
    exception when others then
      v_sale := null;
    end;
  end if;

  for v_batch in
    select id, quantity_remaining
    from public.product_batches
    where store_id=new.store_id
      and product_id=new.product_id
      and quantity_remaining > 0
    order by expiry_date nulls last, received_at, id
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining, v_batch.quantity_remaining);

    update public.product_batches
    set quantity_remaining = quantity_remaining - v_take
    where id=v_batch.id;

    insert into public.stock_batch_consumptions(
      tenant_id,store_id,product_id,batch_id,sale_id,stock_movement_id,quantity
    ) values(
      new.tenant_id,new.store_id,new.product_id,v_batch.id,v_sale,new.id,v_take
    );

    v_remaining := v_remaining - v_take;
  end loop;

  return new;
end
$$;

drop trigger if exists trg_consume_batches_on_sale on public.stock_movements;
create trigger trg_consume_batches_on_sale
after insert on public.stock_movements
for each row execute function private.consume_batches_from_stock_movement();

create or replace function public.get_expiry_alerts(p_days integer default 30)
returns table(
  batch_id uuid,
  product_id uuid,
  product_name text,
  lot_number text,
  expiry_date date,
  quantity_remaining numeric,
  days_to_expiry integer,
  purchase_id uuid,
  invoice_number text
)
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select b.id,b.product_id,p.name,b.lot_number,b.expiry_date,b.quantity_remaining,
         (b.expiry_date-current_date)::integer,b.purchase_id,pu.invoice_number
  from public.product_batches b
  join public.products p on p.id=b.product_id
  left join public.purchases pu on pu.id=b.purchase_id
  where private.has_store_access(b.store_id)
    and b.quantity_remaining > 0
    and b.expiry_date is not null
    and b.expiry_date <= current_date + greatest(0,p_days)
  order by b.expiry_date, p.name;
$$;
revoke all on function public.get_expiry_alerts(integer) from public, anon;
grant execute on function public.get_expiry_alerts(integer) to authenticated;

create or replace function public.get_sale_details(p_sale_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth
as $$
declare
  v_sale public.sales%rowtype;
  v_result jsonb;
begin
  select * into v_sale from public.sales where id=p_sale_id;
  if v_sale.id is null or not private.has_store_access(v_sale.store_id) then raise exception 'sale not found'; end if;

  select jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', coalesce((select jsonb_agg(to_jsonb(si) order by si.id) from public.sale_items si where si.sale_id=v_sale.id),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(sp) order by sp.created_at) from public.sale_payments sp where sp.sale_id=v_sale.id),'[]'::jsonb),
    'customer', (select to_jsonb(c) from public.customers c where c.id=v_sale.customer_id),
    'operator', (select jsonb_build_object('id',o.id,'name',o.name,'role',o.role) from public.operators o where o.id=v_sale.operator_ref),
    'batch_consumptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id',bc.product_id,'batch_id',bc.batch_id,'quantity',bc.quantity,
        'lot_number',b.lot_number,'expiry_date',b.expiry_date
      ) order by bc.created_at)
      from public.stock_batch_consumptions bc
      join public.product_batches b on b.id=bc.batch_id
      where bc.sale_id=v_sale.id
    ),'[]'::jsonb)
  ) into v_result;
  return v_result;
end
$$;
revoke all on function public.get_sale_details(uuid) from public, anon;
grant execute on function public.get_sale_details(uuid) to authenticated;

create or replace function public.get_purchase_details(p_purchase_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth
as $$
declare
  v_purchase public.purchases%rowtype;
begin
  select * into v_purchase from public.purchases where id=p_purchase_id;
  if v_purchase.id is null or not private.has_store_access(v_purchase.store_id) then raise exception 'purchase not found'; end if;
  return jsonb_build_object(
    'purchase',to_jsonb(v_purchase),
    'items',coalesce((select jsonb_agg(to_jsonb(pi) order by pi.id) from public.purchase_items pi where pi.purchase_id=v_purchase.id),'[]'::jsonb),
    'supplier',(select to_jsonb(s) from public.suppliers s where s.id=v_purchase.supplier_id)
  );
end
$$;
revoke all on function public.get_purchase_details(uuid) from public, anon;
grant execute on function public.get_purchase_details(uuid) to authenticated;
