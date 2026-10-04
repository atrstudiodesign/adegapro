
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  cnpj text,
  plan text not null default 'PRO' check (plan in ('STARTER','PRO','ENTERPRISE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text not null,
  cnpj text,
  state_registration text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  zip_code text,
  instagram text,
  opening_hours text,
  logo_path text,
  thermal_width text not null default '80mm' check (thermal_width in ('58mm','80mm')),
  receipt_footer text,
  allow_sell_without_stock boolean not null default false,
  require_customer boolean not null default false,
  require_password_for_cancel boolean not null default true,
  max_discount_percent numeric(5,2) not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  full_name text not null default '',
  phone text,
  role text not null default 'CAIXA' check (role in ('SUPER_ADMIN','ADMINISTRADOR','GERENTE','CAIXA','ESTOQUISTA','FINANCEIRO')),
  active boolean not null default true,
  is_super_admin boolean not null default false,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_store_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, store_id)
);

create table public.user_feature_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  access_level text not null default 'USE' check (access_level in ('VIEW','USE','MANAGE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, store_id, feature_key)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_name text,
  trade_name text not null,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  name text not null,
  cpf text,
  phone text,
  whatsapp text,
  email text,
  address text,
  notes text,
  credit_limit numeric(14,2) not null default 0,
  credit_balance numeric(14,2) not null default 0,
  loyalty_points integer not null default 0,
  total_purchases numeric(14,2) not null default 0,
  last_purchase_at timestamptz,
  status text not null default 'LIBERADO' check (status in ('LIBERADO','BLOQUEADO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  description text,
  sku text not null,
  barcode text,
  brand text,
  unit text not null default 'UN',
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  min_stock numeric(14,3) not null default 0,
  max_stock numeric(14,3) not null default 0,
  image_path text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_combo boolean not null default false,
  is_cold boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, sku)
);

create table public.stock_balances (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (store_id, product_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('ENTRADA','SAIDA','VENDA','COMPRA','PERDA','AVARIA','QUEBRA','CONSUMO_INTERNO','AJUSTE','TRANSFERENCIA')),
  quantity numeric(14,3) not null,
  previous_stock numeric(14,3) not null,
  next_stock numeric(14,3) not null,
  reason text,
  document_ref text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  number text not null,
  status text not null default 'FECHADO' check (status in ('ABERTO','FECHADO')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id, number)
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete restrict,
  operator_id uuid references auth.users(id) on delete set null,
  initial_balance numeric(14,2) not null default 0,
  total_sales numeric(14,2) not null default 0,
  total_cash_sales numeric(14,2) not null default 0,
  total_pix_sales numeric(14,2) not null default 0,
  total_card_debit_sales numeric(14,2) not null default 0,
  total_card_credit_sales numeric(14,2) not null default 0,
  total_voucher_sales numeric(14,2) not null default 0,
  total_other_sales numeric(14,2) not null default 0,
  total_withdrawals numeric(14,2) not null default 0,
  total_supplies numeric(14,2) not null default 0,
  expected_cash numeric(14,2) not null default 0,
  counted_cash numeric(14,2),
  cash_difference numeric(14,2),
  closure_notes text,
  status text not null default 'ABERTO' check (status in ('ABERTO','FECHADO')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  movement_type text not null check (movement_type in ('SANGRIA','SUPRIMENTO')),
  amount numeric(14,2) not null check (amount > 0),
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  sale_number bigint generated by default as identity,
  cashier_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  surcharge numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','PAGA','CANCELADA','ESTORNADA')),
  cancel_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  digital_receipt_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique(tenant_id, idempotency_key),
  unique(digital_receipt_id)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  barcode text,
  unit_price numeric(14,2) not null,
  cost_price numeric(14,2) not null default 0,
  quantity numeric(14,3) not null,
  discount numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null,
  is_combo boolean not null default false
);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  method text not null check (method in ('DINHEIRO','PIX','DEBITO','CREDITO','VOUCHER','FIADO')),
  amount numeric(14,2) not null,
  change_amount numeric(14,2) not null default 0,
  provider text not null default 'MANUAL',
  authorization_code text,
  nsu text,
  status text not null default 'PENDENTE' check (status in ('CONFIRMADO','PENDENTE','CANCELADO')),
  created_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  issue_date date,
  subtotal numeric(14,2) not null default 0,
  freight numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_method text,
  payment_term text,
  status text not null default 'CONFIRMADA' check (status in ('CONFIRMADA','CANCELADA')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null,
  total_cost numeric(14,2) not null
);

create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text not null,
  category text,
  amount numeric(14,2) not null,
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  sale_id uuid references public.sales(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
  created_at timestamptz not null default now()
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('RECEITA','DESPESA')),
  category text,
  amount numeric(14,2) not null,
  description text not null,
  source text not null,
  reference_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  subject text not null,
  category text not null,
  description text not null,
  status text not null default 'ABERTO' check (status in ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','FECHADO')),
  priority text not null default 'NORMAL' check (priority in ('BAIXA','NORMAL','ALTA','CRITICA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_type text not null default 'USER' check (author_type in ('USER','ATR_STUDIO')),
  message text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce((select p.is_super_admin from public.profiles p where p.user_id = auth.uid()), false)
$$;

create or replace function private.has_tenant_access(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_super_admin()
    or exists (
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid()
        and usa.tenant_id = target_tenant
        and usa.active
    )
$$;

create or replace function private.has_store_access(target_store uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select private.is_super_admin()
    or exists (
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid()
        and usa.store_id = target_store
        and usa.active
    )
$$;

revoke all on function private.is_super_admin() from public;
revoke all on function private.has_tenant_access(uuid) from public;
revoke all on function private.has_store_access(uuid) from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.has_tenant_access(uuid) to authenticated;
grant execute on function private.has_store_access(uuid) to authenticated;

create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_tenant uuid;
  v_store uuid;
  v_entity_id text;
begin
  v_tenant := coalesce((to_jsonb(new)->>'tenant_id')::uuid, (to_jsonb(old)->>'tenant_id')::uuid);
  begin
    v_store := coalesce((to_jsonb(new)->>'store_id')::uuid, (to_jsonb(old)->>'store_id')::uuid);
  exception when others then
    v_store := null;
  end;
  v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  insert into public.audit_logs(tenant_id, store_id, user_id, action, entity, entity_id, old_data, new_data)
  values (
    v_tenant,
    v_store,
    auth.uid(),
    tg_op,
    tg_table_name,
    v_entity_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end
$$;

revoke all on function private.audit_row_change() from public;

do $$
declare t text;
begin
  foreach t in array array[
    'stores','profiles','user_store_access','user_feature_access','categories','suppliers','customers',
    'products','stock_balances','stock_movements','cash_registers','cash_sessions','cash_movements',
    'sales','sale_items','sale_payments','purchases','purchase_items','accounts_payable',
    'accounts_receivable','financial_transactions','support_tickets','support_messages'
  ]
  loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.audit_row_change()', t, t);
  end loop;
end $$;

alter table public.tenants enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.user_store_access enable row level security;
alter table public.user_feature_access enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_registers enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy tenants_select on public.tenants for select to authenticated using (private.has_tenant_access(id));
create policy stores_all on public.stores for all to authenticated using (private.has_store_access(id) or private.is_super_admin()) with check (private.has_tenant_access(tenant_id));
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid() or private.is_super_admin() or private.has_tenant_access(tenant_id));
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = auth.uid() or private.is_super_admin()) with check (user_id = auth.uid() or private.is_super_admin());
create policy usa_select on public.user_store_access for select to authenticated using (user_id = auth.uid() or private.is_super_admin());
create policy usa_manage on public.user_store_access for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy ufa_select on public.user_feature_access for select to authenticated using (user_id = auth.uid() or private.is_super_admin());
create policy ufa_manage on public.user_feature_access for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

create policy categories_all on public.categories for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy suppliers_all on public.suppliers for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy customers_all on public.customers for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy products_all on public.products for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy stock_balances_all on public.stock_balances for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy stock_movements_all on public.stock_movements for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy cash_registers_all on public.cash_registers for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy cash_sessions_all on public.cash_sessions for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy cash_movements_all on public.cash_movements for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy sales_all on public.sales for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy sale_items_all on public.sale_items for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy sale_payments_all on public.sale_payments for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy purchases_all on public.purchases for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy purchase_items_all on public.purchase_items for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy ap_all on public.accounts_payable for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy ar_all on public.accounts_receivable for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));
create policy financial_all on public.financial_transactions for all to authenticated using (private.has_store_access(store_id)) with check (private.has_store_access(store_id));

create policy audit_select on public.audit_logs for select to authenticated using (private.is_super_admin() or private.has_tenant_access(tenant_id));
create policy support_tickets_all on public.support_tickets for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));
create policy support_messages_all on public.support_messages for all to authenticated using (private.has_tenant_access(tenant_id)) with check (private.has_tenant_access(tenant_id));

revoke insert, update, delete on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

create index idx_stores_tenant on public.stores(tenant_id);
create index idx_profiles_tenant on public.profiles(tenant_id);
create index idx_user_store_access_user on public.user_store_access(user_id);
create index idx_products_tenant on public.products(tenant_id);
create index idx_products_barcode on public.products(tenant_id, barcode);
create index idx_stock_movements_store_product on public.stock_movements(store_id, product_id, created_at desc);
create index idx_sales_store_created on public.sales(store_id, created_at desc);
create index idx_purchases_store_created on public.purchases(store_id, created_at desc);
create index idx_audit_tenant_created on public.audit_logs(tenant_id, created_at desc);
create index idx_support_tenant_created on public.support_tickets(tenant_id, created_at desc);
