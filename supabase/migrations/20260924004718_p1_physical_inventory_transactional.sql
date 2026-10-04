
create table if not exists public.inventory_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  operator_ref uuid not null references public.operators(id) on delete restrict,
  status text not null default 'EM_ANDAMENTO' check(status in ('EM_ANDAMENTO','FINALIZADO','CANCELADO')),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.inventory_audit_items (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.inventory_audits(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  system_qty numeric not null,
  counted_qty numeric not null,
  diff_qty numeric not null,
  cost_price numeric not null default 0,
  divergence_value numeric not null default 0,
  unique(audit_id,product_id)
);

alter table public.inventory_audits enable row level security;
alter table public.inventory_audit_items enable row level security;

create index if not exists idx_inventory_audits_store on public.inventory_audits(store_id,opened_at desc);
create index if not exists idx_inventory_items_audit on public.inventory_audit_items(audit_id);

drop policy if exists inventory_audits_select on public.inventory_audits;
create policy inventory_audits_select on public.inventory_audits for select to authenticated
using(private.has_store_access(store_id) and private.has_feature(tenant_id,'inventory.view','VIEW'));

drop policy if exists inventory_items_select on public.inventory_audit_items;
create policy inventory_items_select on public.inventory_audit_items for select to authenticated
using(private.has_tenant_access(tenant_id));

revoke insert,update,delete on public.inventory_audits from authenticated;
revoke insert,update,delete on public.inventory_audit_items from authenticated;

create or replace function public.start_inventory_audit(
  p_store_id uuid,
  p_operator_token text,
  p_notes text default null
)
returns uuid
language plpgsql security definer
set search_path=public,private,auth
as $$
declare v_tenant uuid; v_operator uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
  select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
  if v_tenant is null then raise exception 'store not found'; end if;
  v_operator:=private.require_operator_session(p_store_id,p_operator_token);
  if not private.operator_can(v_operator,'inventory.adjust') then raise exception 'operator cannot inventory'; end if;
  if not private.has_feature(v_tenant,'inventory.adjust','USE') then raise exception 'account cannot inventory'; end if;
  if exists(select 1 from public.inventory_audits where store_id=p_store_id and status='EM_ANDAMENTO') then
    raise exception 'an inventory audit is already open';
  end if;
  insert into public.inventory_audits(tenant_id,store_id,operator_ref,notes)
  values(v_tenant,p_store_id,v_operator,nullif(trim(coalesce(p_notes,'')),'')) returning id into v_id;
  return v_id;
end $$;

create or replace function public.finalize_inventory_audit(
  p_audit_id uuid,
  p_operator_token text,
  p_counts jsonb
)
returns jsonb
language plpgsql security definer
set search_path=public,private,auth
as $$
declare
  v_audit public.inventory_audits%rowtype;
  v_operator uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_balance public.stock_balances%rowtype;
  v_counted numeric;
  v_diff numeric;
  v_items integer:=0;
  v_changed integer:=0;
  v_impact numeric:=0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_audit from public.inventory_audits where id=p_audit_id for update;
  if not found or v_audit.status<>'EM_ANDAMENTO' then raise exception 'inventory audit not open'; end if;
  if not private.has_store_access(v_audit.store_id) then raise exception 'store access denied'; end if;
  v_operator:=private.require_operator_session(v_audit.store_id,p_operator_token);
  if not private.operator_can(v_operator,'inventory.adjust') then raise exception 'operator cannot inventory'; end if;
  if jsonb_typeof(p_counts)<>'array' or jsonb_array_length(p_counts)=0 then raise exception 'counts required'; end if;

  for v_item in select * from jsonb_array_elements(p_counts)
  loop
    v_counted:=coalesce((v_item->>'counted_qty')::numeric,-1);
    if v_counted<0 then raise exception 'invalid counted quantity'; end if;

    select * into v_product from public.products
    where id=(v_item->>'product_id')::uuid and tenant_id=v_audit.tenant_id;
    if not found then raise exception 'product not found'; end if;

    insert into public.stock_balances(tenant_id,store_id,product_id,quantity)
    values(v_audit.tenant_id,v_audit.store_id,v_product.id,0)
    on conflict(store_id,product_id) do nothing;

    select * into v_balance from public.stock_balances
    where store_id=v_audit.store_id and product_id=v_product.id for update;

    v_diff:=v_counted-v_balance.quantity;
    insert into public.inventory_audit_items(
      audit_id,tenant_id,product_id,system_qty,counted_qty,diff_qty,cost_price,divergence_value
    ) values(
      v_audit.id,v_audit.tenant_id,v_product.id,v_balance.quantity,v_counted,v_diff,v_product.cost_price,round(v_diff*v_product.cost_price,2)
    );

    if v_diff<>0 then
      update public.stock_balances set quantity=v_counted,updated_at=now()
      where store_id=v_audit.store_id and product_id=v_product.id;

      insert into public.stock_movements(
        tenant_id,store_id,product_id,movement_type,quantity,previous_stock,next_stock,reason,document_ref,created_by
      ) values(
        v_audit.tenant_id,v_audit.store_id,v_product.id,'AJUSTE',abs(v_diff),v_balance.quantity,v_counted,
        'Inventário físico','INVENTORY:'||v_audit.id::text,auth.uid()
      );
      v_changed:=v_changed+1;
      v_impact:=v_impact+round(v_diff*v_product.cost_price,2);
    end if;
    v_items:=v_items+1;
  end loop;

  update public.inventory_audits set status='FINALIZADO',closed_at=now() where id=v_audit.id;

  return jsonb_build_object('audit_id',v_audit.id,'items',v_items,'changed',v_changed,'financial_impact',v_impact);
end $$;

revoke all on function public.start_inventory_audit(uuid,text,text) from public,anon;
grant execute on function public.start_inventory_audit(uuid,text,text) to authenticated;
revoke all on function public.finalize_inventory_audit(uuid,text,jsonb) from public,anon;
grant execute on function public.finalize_inventory_audit(uuid,text,jsonb) to authenticated;
