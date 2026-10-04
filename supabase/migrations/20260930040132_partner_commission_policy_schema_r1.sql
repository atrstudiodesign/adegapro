
alter table public.platform_sales_partners
  add column if not exists payout_mode text not null default 'IMEDIATO',
  add column if not exists monthly_payout_day integer not null default 5,
  add column if not exists accepted_policy_version text,
  add column if not exists accepted_policy_at timestamptz;

alter table public.platform_sales_partners
  drop constraint if exists platform_sales_partners_payout_mode_check,
  add constraint platform_sales_partners_payout_mode_check check (payout_mode in ('IMEDIATO','FECHAMENTO_MENSAL')),
  drop constraint if exists platform_sales_partners_monthly_payout_day_check,
  add constraint platform_sales_partners_monthly_payout_day_check check (monthly_payout_day between 1 and 28);

update public.platform_sales_partners
set subscription_commission_mode='FIXO',
    subscription_commission_value=35,
    custom_commission_mode='FIXO',
    custom_commission_value=200
where subscription_commission_value=0 and custom_commission_value=0;

alter table public.platform_partner_referrals
  add column if not exists customer_payment_status text not null default 'AGUARDANDO',
  add column if not exists first_payment_at timestamptz,
  add column if not exists first_payment_amount numeric(12,2),
  add column if not exists payment_validated_by uuid references auth.users(id),
  add column if not exists payment_validated_at timestamptz;

alter table public.platform_partner_referrals
  drop constraint if exists platform_partner_referrals_customer_payment_status_check,
  add constraint platform_partner_referrals_customer_payment_status_check
    check (customer_payment_status in ('AGUARDANDO','CONFIRMADO','ESTORNADO','INADIMPLENTE'));

alter table public.platform_partner_commissions
  add column if not exists client_paid_at timestamptz,
  add column if not exists eligible_at timestamptz,
  add column if not exists payout_mode text,
  add column if not exists closing_period text,
  add column if not exists released_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

alter table public.platform_partner_commissions
  drop constraint if exists platform_partner_commissions_status_check,
  add constraint platform_partner_commissions_status_check
    check (status in ('AGUARDANDO_PAGAMENTO','LIBERADA','AGENDADA','PAGA','CANCELADA'));

update public.platform_partner_commissions
set status=case
  when status='PENDENTE' then 'AGUARDANDO_PAGAMENTO'
  when status='APROVADA' then 'LIBERADA'
  else status end
where status in ('PENDENTE','APROVADA');

create table if not exists public.platform_partner_policies (
  version text primary key,
  effective_at timestamptz not null,
  active boolean not null default false,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.platform_partner_policies enable row level security;
revoke all on public.platform_partner_policies from anon,authenticated;
