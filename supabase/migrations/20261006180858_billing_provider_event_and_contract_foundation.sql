create table if not exists public.billing_provider_events (
 id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null, event_type text not null,
 tenant_id uuid references public.tenants(id) on delete set null, subscription_id uuid references public.billing_subscriptions(id) on delete set null,
 provider_customer_ref text, provider_subscription_ref text, provider_payment_ref text, payload jsonb not null default '{}'::jsonb,
 processing_status text not null default 'RECEIVED' check(processing_status in ('RECEIVED','PROCESSED','IGNORED','ERROR')),
 processed_at timestamptz,error_message text,created_at timestamptz not null default now(),unique(provider,provider_event_id));
alter table public.billing_provider_events enable row level security;
revoke all on public.billing_provider_events from anon,authenticated;
create index if not exists idx_billing_provider_events_tenant_created on public.billing_provider_events(tenant_id,created_at desc);
create index if not exists idx_billing_provider_events_payment on public.billing_provider_events(provider,provider_payment_ref);
create table if not exists public.billing_contract_snapshots (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete cascade,
 subscription_id uuid references public.billing_subscriptions(id) on delete set null,plan_code text not null,billing_cycle text not null,
 regular_amount numeric,effective_amount numeric,discount_percent numeric not null default 0,loyalty_months integer,offer_source text,
 legal_version text,accepted_at timestamptz,effective_from timestamptz not null default now(),effective_until timestamptz,created_at timestamptz not null default now());
alter table public.billing_contract_snapshots enable row level security;
revoke all on public.billing_contract_snapshots from anon,authenticated;
create index if not exists idx_billing_contract_snapshots_tenant on public.billing_contract_snapshots(tenant_id,effective_from desc);