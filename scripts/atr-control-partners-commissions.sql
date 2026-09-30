-- ATR Control Premium: vendedores autônomos, indicações, comissões e segurança por tenant.
-- Aplicado em produção em 2026-09-30.

create table if not exists public.platform_sales_partners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  active boolean not null default true,
  referral_code text not null unique,
  subscription_commission_mode text not null default 'PERCENTUAL',
  subscription_commission_value numeric(12,2) not null default 0,
  custom_commission_mode text not null default 'PERCENTUAL',
  custom_commission_value numeric(12,2) not null default 0,
  pix_key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.platform_sales_partners(id),
  referral_type text not null,
  lead_name text,
  lead_email text,
  lead_phone text,
  tenant_id uuid references public.tenants(id),
  status text not null default 'LEAD',
  source text default 'LINK',
  estimated_value numeric(12,2) not null default 0,
  converted_value numeric(12,2) not null default 0,
  converted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.platform_sales_partners(id),
  referral_id uuid references public.platform_partner_referrals(id),
  tenant_id uuid references public.tenants(id),
  commission_type text not null,
  base_amount numeric(12,2) not null default 0,
  commission_mode text not null,
  commission_value numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  status text not null default 'PENDENTE',
  due_at date,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_security_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  sensitive_data_encryption_status text not null default 'BLOQUEADA',
  allowed_by uuid references auth.users(id),
  allowed_at timestamptz,
  activated_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

-- As tabelas acima ficam sem acesso direto para anon/authenticated.
-- Operações são feitas apenas por RPC SECURITY DEFINER com private.is_super_admin().
-- bootstrap_adega() também foi atualizado em produção para capturar store_data.referral_code
-- e registrar a conversão automática do link individual do vendedor.
