create table if not exists public.customer_loyalty_accounts(
 tenant_id uuid primary key references public.tenants(id) on delete cascade,
 status text not null default 'ACTIVE' check(status in('ACTIVE','PAUSED','CANCELLED')),
 loyalty_months integer not null default 12,
 free_months integer not null default 4,
 half_price_months integer not null default 6,
 regular_monthly_price numeric(12,2) not null default 0,
 current_discount_percent numeric(5,2) not null default 0,
 cashback_points integer not null default 0,
 cashback_balance numeric(12,2) not null default 0,
 benefit_started_at timestamptz,
 loyalty_ends_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.customer_referrals(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id) on delete cascade,
 lead_name text not null,
 lead_phone text not null,
 lead_email text,
 status text not null default 'PENDING' check(status in('PENDING','ACTIVE','CONVERTED','CANCELLED','INELIGIBLE')),
 benefit_type text not null default 'NONE' check(benefit_type in('NONE','SUBSCRIPTION_30_3M','PERSONALIZED_LOYALTY')),
 discount_value numeric(12,2) not null default 0,
 cashback_points integer not null default 0,
 cashback_value numeric(12,2) not null default 0,
 conversion_at timestamptz,
 cancelled_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists customer_referrals_tenant_created_idx on public.customer_referrals(tenant_id,created_at desc);
alter table public.customer_loyalty_accounts enable row level security;
alter table public.customer_referrals enable row level security;

create or replace function public.get_platform_customer_loyalty_snapshot()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb;
begin
 if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
 select jsonb_build_object(
  'metrics',jsonb_build_object(
   'total',count(*),
   'pending',count(*) filter(where r.status='PENDING'),
   'active',count(*) filter(where r.status='ACTIVE'),
   'converted',count(*) filter(where r.status='CONVERTED'),
   'cancelled',count(*) filter(where r.status='CANCELLED'),
   'cashback_points',coalesce(sum(r.cashback_points),0),
   'cashback_value',coalesce(sum(r.cashback_value),0)
  ),
  'referrals',coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'tenant_id',r.tenant_id,'client',coalesce(t.trade_name,t.legal_name),'lead_name',r.lead_name,'lead_phone',r.lead_phone,'lead_email',r.lead_email,
   'status',r.status,'benefit_type',r.benefit_type,'discount_value',r.discount_value,'cashback_points',r.cashback_points,'cashback_value',r.cashback_value,'created_at',r.created_at,'conversion_at',r.conversion_at
  ) order by r.created_at desc),'[]'::jsonb),
  'loyalty',coalesce((select jsonb_agg(jsonb_build_object(
   'tenant_id',l.tenant_id,'client',coalesce(tt.trade_name,tt.legal_name),'status',l.status,'loyalty_months',l.loyalty_months,'free_months',l.free_months,'half_price_months',l.half_price_months,
   'regular_monthly_price',l.regular_monthly_price,'current_discount_percent',l.current_discount_percent,
   'final_monthly_price',round(l.regular_monthly_price*(1-l.current_discount_percent/100),2),'cashback_points',l.cashback_points,'cashback_balance',l.cashback_balance,
   'benefit_started_at',l.benefit_started_at,'loyalty_ends_at',l.loyalty_ends_at
  ) order by tt.trade_name) from public.customer_loyalty_accounts l join public.tenants tt on tt.id=l.tenant_id),'[]'::jsonb)
 ) into v
 from public.customer_referrals r join public.tenants t on t.id=r.tenant_id;
 return coalesce(v,jsonb_build_object('metrics',jsonb_build_object('total',0,'pending',0,'active',0,'converted',0,'cancelled',0,'cashback_points',0,'cashback_value',0),'referrals','[]'::jsonb,'loyalty','[]'::jsonb));
end $$;
grant execute on function public.get_platform_customer_loyalty_snapshot() to authenticated;

create or replace function public.save_platform_customer_loyalty(p_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
 insert into public.customer_loyalty_accounts(tenant_id,status,loyalty_months,free_months,half_price_months,regular_monthly_price,current_discount_percent,cashback_points,cashback_balance,benefit_started_at,loyalty_ends_at,updated_at)
 values((p_payload->>'tenant_id')::uuid,coalesce(p_payload->>'status','ACTIVE'),coalesce((p_payload->>'loyalty_months')::int,12),coalesce((p_payload->>'free_months')::int,4),coalesce((p_payload->>'half_price_months')::int,6),coalesce((p_payload->>'regular_monthly_price')::numeric,0),coalesce((p_payload->>'current_discount_percent')::numeric,0),coalesce((p_payload->>'cashback_points')::int,0),coalesce((p_payload->>'cashback_balance')::numeric,0),nullif(p_payload->>'benefit_started_at','')::timestamptz,nullif(p_payload->>'loyalty_ends_at','')::timestamptz,now())
 on conflict(tenant_id) do update set status=excluded.status,loyalty_months=excluded.loyalty_months,free_months=excluded.free_months,half_price_months=excluded.half_price_months,regular_monthly_price=excluded.regular_monthly_price,current_discount_percent=excluded.current_discount_percent,cashback_points=excluded.cashback_points,cashback_balance=excluded.cashback_balance,benefit_started_at=excluded.benefit_started_at,loyalty_ends_at=excluded.loyalty_ends_at,updated_at=now();
end $$;
grant execute on function public.save_platform_customer_loyalty(jsonb) to authenticated;

create or replace function public.update_platform_customer_referral(p_id uuid,p_status text,p_discount numeric default null,p_points integer default null,p_cashback numeric default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
 if p_status not in('PENDING','ACTIVE','CONVERTED','CANCELLED','INELIGIBLE') then raise exception 'Status inválido'; end if;
 update public.customer_referrals set status=p_status,discount_value=coalesce(p_discount,discount_value),cashback_points=coalesce(p_points,cashback_points),cashback_value=coalesce(p_cashback,cashback_value),conversion_at=case when p_status='CONVERTED' then coalesce(conversion_at,now()) else conversion_at end,cancelled_at=case when p_status='CANCELLED' then now() else cancelled_at end,updated_at=now() where id=p_id;
end $$;
grant execute on function public.update_platform_customer_referral(uuid,text,numeric,integer,numeric) to authenticated;