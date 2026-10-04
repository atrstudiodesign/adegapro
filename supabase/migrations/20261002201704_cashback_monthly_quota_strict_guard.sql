
create unique index if not exists customer_cashback_one_credit_month_strict_idx
on public.customer_referrals (tenant_id, cashback_credit_month)
where cashback_credited_at is not null;
