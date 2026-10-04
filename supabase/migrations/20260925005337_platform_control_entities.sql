
alter table public.billing_subscriptions add column if not exists trial_start timestamptz;
alter table public.billing_subscriptions add column if not exists trial_end timestamptz;
alter table public.billing_subscriptions add column if not exists next_due_at timestamptz;
alter table public.billing_subscriptions add column if not exists grace_until timestamptz;
alter table public.billing_subscriptions add column if not exists admin_notes text;

create table if not exists public.platform_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.platform_admin_audit enable row level security;

create table if not exists public.platform_communications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel text not null check (channel in ('INTERNAL','EMAIL','WHATSAPP')),
  recipient text,
  subject text not null,
  message text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','QUEUED','SENT','FAILED','CANCELLED')),
  provider_ref text,
  sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_communications enable row level security;

create table if not exists public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  severity text not null default 'MEDIUM' check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  title text not null,
  description text not null default '',
  status text not null default 'OPEN' check (status in ('OPEN','INVESTIGATING','MONITORING','RESOLVED','CLOSED')),
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.platform_incidents enable row level security;

create table if not exists public.tenant_infrastructure (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  database_mode text not null default 'SHARED' check (database_mode in ('SHARED','DEDICATED')),
  provider text not null default 'SUPABASE',
  project_ref text,
  region text,
  status text not null default 'READY' check (status in ('PENDING','PROVISIONING','READY','ERROR','SUSPENDED')),
  notes text,
  last_health_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tenant_infrastructure enable row level security;

insert into public.tenant_infrastructure(tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;

create index if not exists platform_admin_audit_tenant_created_idx on public.platform_admin_audit(tenant_id,created_at desc);
create index if not exists platform_communications_tenant_created_idx on public.platform_communications(tenant_id,created_at desc);
create index if not exists platform_incidents_tenant_status_idx on public.platform_incidents(tenant_id,status,created_at desc);
create index if not exists billing_events_tenant_created_idx on public.billing_events(tenant_id,created_at desc);
create index if not exists support_tickets_tenant_updated_idx on public.support_tickets(tenant_id,updated_at desc);
