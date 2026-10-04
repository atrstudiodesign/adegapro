
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  commercial_license_id uuid references public.commercial_licenses(id) on delete set null,
  provider text not null default 'MANUAL',
  provider_customer_ref text,
  provider_subscription_ref text,
  plan_code text not null default 'PRO',
  status text not null default 'PENDING' check (status in ('PENDING','TRIALING','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED','ENDED')),
  billing_cycle text check (billing_cycle in ('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','ONE_TIME')),
  amount numeric(14,2),
  currency text not null default 'BRL',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_subscription_ref)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text,
  payload jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists billing_subscriptions_tenant_read on public.billing_subscriptions;
create policy billing_subscriptions_tenant_read
on public.billing_subscriptions for select to authenticated
using (private.has_tenant_access(tenant_id) or private.is_super_admin());

drop policy if exists billing_subscriptions_platform_manage on public.billing_subscriptions;
create policy billing_subscriptions_platform_manage
on public.billing_subscriptions for all to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

drop policy if exists billing_events_platform_read on public.billing_events;
create policy billing_events_platform_read
on public.billing_events for select to authenticated
using (private.is_super_admin());

revoke insert,update,delete on public.billing_events from anon, authenticated;

create index if not exists idx_billing_subscriptions_tenant_status on public.billing_subscriptions(tenant_id,status,current_period_end);
create index if not exists idx_billing_events_provider_created on public.billing_events(provider,created_at desc);
