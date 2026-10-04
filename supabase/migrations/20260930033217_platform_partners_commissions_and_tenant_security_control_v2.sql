
create table if not exists public.platform_sales_partners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  active boolean not null default true,
  referral_code text not null unique,
  subscription_commission_mode text not null default 'PERCENTUAL' check (subscription_commission_mode in ('PERCENTUAL','FIXO')),
  subscription_commission_value numeric(12,2) not null default 0 check (subscription_commission_value>=0),
  custom_commission_mode text not null default 'PERCENTUAL' check (custom_commission_mode in ('PERCENTUAL','FIXO')),
  custom_commission_value numeric(12,2) not null default 0 check (custom_commission_value>=0),
  pix_key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.platform_partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.platform_sales_partners(id) on delete restrict,
  referral_type text not null check (referral_type in ('ASSINATURA','PERSONALIZADO')),
  lead_name text, lead_email text, lead_phone text,
  tenant_id uuid references public.tenants(id) on delete set null,
  status text not null default 'LEAD' check (status in ('LEAD','CONTATO','PROPOSTA','CONVERTIDO','PERDIDO','CANCELADO')),
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
  partner_id uuid not null references public.platform_sales_partners(id) on delete restrict,
  referral_id uuid references public.platform_partner_referrals(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  commission_type text not null check (commission_type in ('ASSINATURA','PERSONALIZADO','BONUS','AJUSTE')),
  base_amount numeric(12,2) not null default 0,
  commission_mode text not null default 'PERCENTUAL' check (commission_mode in ('PERCENTUAL','FIXO')),
  commission_value numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADA','PAGA','CANCELADA')),
  due_at date, paid_at timestamptz, payment_reference text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tenant_security_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  sensitive_data_encryption_status text not null default 'BLOQUEADA'
    check (sensitive_data_encryption_status in ('BLOQUEADA','DISPONIVEL','MIGRACAO','ATIVA')),
  allowed_by uuid references auth.users(id), allowed_at timestamptz, activated_at timestamptz,
  notes text, updated_at timestamptz not null default now()
);
alter table public.platform_sales_partners enable row level security;
alter table public.platform_partner_referrals enable row level security;
alter table public.platform_partner_commissions enable row level security;
alter table public.tenant_security_settings enable row level security;
revoke all on public.platform_sales_partners from anon,authenticated;
revoke all on public.platform_partner_referrals from anon,authenticated;
revoke all on public.platform_partner_commissions from anon,authenticated;
revoke all on public.tenant_security_settings from anon,authenticated;
create index if not exists idx_partner_referrals_partner on public.platform_partner_referrals(partner_id,status,created_at desc);
create index if not exists idx_partner_commissions_partner on public.platform_partner_commissions(partner_id,status,created_at desc);
create index if not exists idx_partner_commissions_tenant on public.platform_partner_commissions(tenant_id);
create index if not exists idx_partner_referrals_tenant on public.platform_partner_referrals(tenant_id);

create or replace function public.get_platform_partner_snapshot()
returns jsonb language plpgsql stable security definer
set search_path='public','private','auth'
as $$
declare result jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'metrics',jsonb_build_object(
      'partners_total',(select count(*) from public.platform_sales_partners),
      'partners_active',(select count(*) from public.platform_sales_partners where active=true),
      'referrals_total',(select count(*) from public.platform_partner_referrals),
      'referrals_converted',(select count(*) from public.platform_partner_referrals where status='CONVERTIDO'),
      'commission_pending',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where status in ('PENDENTE','APROVADA')),
      'commission_paid',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where status='PAGA'),
      'conversion_value',(select coalesce(sum(converted_value),0) from public.platform_partner_referrals where status='CONVERTIDO')
    ),
    'partners',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'full_name',p.full_name,'email',p.email,'phone',p.phone,
        'email_verified',p.email_verified,'phone_verified',p.phone_verified,'active',p.active,
        'referral_code',p.referral_code,'subscription_commission_mode',p.subscription_commission_mode,
        'subscription_commission_value',p.subscription_commission_value,'custom_commission_mode',p.custom_commission_mode,
        'custom_commission_value',p.custom_commission_value,'pix_key',p.pix_key,'notes',p.notes,
        'created_at',p.created_at,'updated_at',p.updated_at,
        'referrals',(select count(*) from public.platform_partner_referrals r where r.partner_id=p.id),
        'converted',(select count(*) from public.platform_partner_referrals r where r.partner_id=p.id and r.status='CONVERTIDO'),
        'pending_amount',(select coalesce(sum(c.amount_due),0) from public.platform_partner_commissions c where c.partner_id=p.id and c.status in ('PENDENTE','APROVADA')),
        'paid_amount',(select coalesce(sum(c.amount_due),0) from public.platform_partner_commissions c where c.partner_id=p.id and c.status='PAGA')
      ) order by p.created_at desc) from public.platform_sales_partners p
    ),'[]'::jsonb),
    'referrals',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select * from public.platform_partner_referrals order by created_at desc limit 200) r),'[]'::jsonb),
    'commissions',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (select * from public.platform_partner_commissions order by created_at desc limit 300) c),'[]'::jsonb),
    'monthly',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.month_key) from (
        select to_char(m,'YYYY-MM') as month_key,
          coalesce((select count(*) from public.platform_partner_referrals r where date_trunc('month',r.created_at)=m),0) as referrals,
          coalesce((select count(*) from public.platform_partner_referrals r where r.status='CONVERTIDO' and date_trunc('month',coalesce(r.converted_at,r.updated_at))=m),0) as converted,
          coalesce((select sum(c.amount_due) from public.platform_partner_commissions c where date_trunc('month',c.created_at)=m),0) as commissions
        from generate_series(date_trunc('month',now())-interval '5 months',date_trunc('month',now()),interval '1 month') as g(m)
      ) x
    ),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.save_platform_sales_partner(p_payload jsonb)
returns uuid language plpgsql security definer set search_path='public','private','auth'
as $$
declare v_id uuid := nullif(p_payload->>'id','')::uuid; v_code text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if nullif(trim(p_payload->>'full_name'),'') is null then raise exception 'nome obrigatório'; end if;
  if nullif(trim(p_payload->>'email'),'') is null then raise exception 'email obrigatório'; end if;
  if nullif(trim(p_payload->>'phone'),'') is null then raise exception 'telefone obrigatório'; end if;
  v_code:=upper(coalesce(nullif(regexp_replace(p_payload->>'referral_code','[^A-Za-z0-9_-]','','g'),''),substr(replace(gen_random_uuid()::text,'-',''),1,10)));
  if v_id is null then
    insert into public.platform_sales_partners(full_name,email,phone,email_verified,phone_verified,active,referral_code,subscription_commission_mode,subscription_commission_value,custom_commission_mode,custom_commission_value,pix_key,notes)
    values(trim(p_payload->>'full_name'),lower(trim(p_payload->>'email')),trim(p_payload->>'phone'),
      coalesce((p_payload->>'email_verified')::boolean,false),coalesce((p_payload->>'phone_verified')::boolean,false),coalesce((p_payload->>'active')::boolean,true),v_code,
      coalesce(p_payload->>'subscription_commission_mode','PERCENTUAL'),coalesce((p_payload->>'subscription_commission_value')::numeric,0),
      coalesce(p_payload->>'custom_commission_mode','PERCENTUAL'),coalesce((p_payload->>'custom_commission_value')::numeric,0),
      nullif(trim(p_payload->>'pix_key'),''),nullif(trim(p_payload->>'notes'),''))
    returning id into v_id;
  else
    update public.platform_sales_partners set full_name=trim(p_payload->>'full_name'),email=lower(trim(p_payload->>'email')),phone=trim(p_payload->>'phone'),
      email_verified=coalesce((p_payload->>'email_verified')::boolean,false),phone_verified=coalesce((p_payload->>'phone_verified')::boolean,false),
      active=coalesce((p_payload->>'active')::boolean,true),referral_code=v_code,
      subscription_commission_mode=coalesce(p_payload->>'subscription_commission_mode','PERCENTUAL'),
      subscription_commission_value=coalesce((p_payload->>'subscription_commission_value')::numeric,0),
      custom_commission_mode=coalesce(p_payload->>'custom_commission_mode','PERCENTUAL'),custom_commission_value=coalesce((p_payload->>'custom_commission_value')::numeric,0),
      pix_key=nullif(trim(p_payload->>'pix_key'),''),notes=nullif(trim(p_payload->>'notes'),''),updated_at=now()
    where id=v_id;
    if not found then raise exception 'vendedor não encontrado'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.save_platform_partner_referral(p_payload jsonb)
returns uuid language plpgsql security definer set search_path='public','private','auth'
as $$
declare v_id uuid := nullif(p_payload->>'id','')::uuid;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.platform_sales_partners where id=(p_payload->>'partner_id')::uuid) then raise exception 'vendedor inválido'; end if;
  if v_id is null then
    insert into public.platform_partner_referrals(partner_id,referral_type,lead_name,lead_email,lead_phone,tenant_id,status,source,estimated_value,converted_value,converted_at,notes)
    values((p_payload->>'partner_id')::uuid,coalesce(p_payload->>'referral_type','ASSINATURA'),nullif(p_payload->>'lead_name',''),nullif(p_payload->>'lead_email',''),
      nullif(p_payload->>'lead_phone',''),nullif(p_payload->>'tenant_id','')::uuid,coalesce(p_payload->>'status','LEAD'),coalesce(p_payload->>'source','MANUAL'),
      coalesce((p_payload->>'estimated_value')::numeric,0),coalesce((p_payload->>'converted_value')::numeric,0),
      nullif(p_payload->>'converted_at','')::timestamptz,nullif(p_payload->>'notes',''))
    returning id into v_id;
  else
    update public.platform_partner_referrals set referral_type=coalesce(p_payload->>'referral_type',referral_type),
      lead_name=nullif(p_payload->>'lead_name',''),lead_email=nullif(p_payload->>'lead_email',''),lead_phone=nullif(p_payload->>'lead_phone',''),
      tenant_id=nullif(p_payload->>'tenant_id','')::uuid,status=coalesce(p_payload->>'status',status),
      estimated_value=coalesce((p_payload->>'estimated_value')::numeric,estimated_value),
      converted_value=coalesce((p_payload->>'converted_value')::numeric,converted_value),
      converted_at=case when coalesce(p_payload->>'status',status)='CONVERTIDO' then coalesce(converted_at,now()) else converted_at end,
      notes=nullif(p_payload->>'notes',''),updated_at=now()
    where id=v_id;
  end if;
  return v_id;
end $$;

create or replace function public.create_platform_partner_commission(p_payload jsonb)
returns uuid language plpgsql security definer set search_path='public','private','auth'
as $$
declare v_id uuid; v_partner public.platform_sales_partners%rowtype; v_mode text; v_value numeric; v_base numeric; v_due numeric; v_type text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  select * into v_partner from public.platform_sales_partners where id=(p_payload->>'partner_id')::uuid and active=true;
  if v_partner.id is null then raise exception 'vendedor inválido'; end if;
  v_type:=coalesce(p_payload->>'commission_type','ASSINATURA');
  v_base:=coalesce((p_payload->>'base_amount')::numeric,0);
  if v_type='PERSONALIZADO' then v_mode:=v_partner.custom_commission_mode; v_value:=v_partner.custom_commission_value;
  else v_mode:=v_partner.subscription_commission_mode; v_value:=v_partner.subscription_commission_value; end if;
  v_due:=case when v_mode='PERCENTUAL' then round(v_base*v_value/100,2) else v_value end;
  insert into public.platform_partner_commissions(partner_id,referral_id,tenant_id,commission_type,base_amount,commission_mode,commission_value,amount_due,status,due_at,notes)
  values(v_partner.id,nullif(p_payload->>'referral_id','')::uuid,nullif(p_payload->>'tenant_id','')::uuid,v_type,v_base,v_mode,v_value,v_due,'PENDENTE',
    nullif(p_payload->>'due_at','')::date,nullif(p_payload->>'notes','')) returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_platform_partner_commission(p_id uuid,p_status text,p_payment_reference text default null)
returns void language plpgsql security definer set search_path='public','private','auth'
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('PENDENTE','APROVADA','PAGA','CANCELADA') then raise exception 'status inválido'; end if;
  update public.platform_partner_commissions set status=p_status,
    paid_at=case when p_status='PAGA' then coalesce(paid_at,now()) else paid_at end,
    payment_reference=coalesce(nullif(p_payment_reference,''),payment_reference),updated_at=now()
  where id=p_id;
end $$;

create or replace function public.get_platform_tenant_security(p_tenant_id uuid)
returns jsonb language plpgsql stable security definer set search_path='public','private','auth'
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  return coalesce((select to_jsonb(s) from public.tenant_security_settings s where s.tenant_id=p_tenant_id),
    jsonb_build_object('tenant_id',p_tenant_id,'sensitive_data_encryption_status','BLOQUEADA'));
end $$;

create or replace function public.set_platform_tenant_security(p_tenant_id uuid,p_status text,p_notes text default null)
returns void language plpgsql security definer set search_path='public','private','auth'
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('BLOQUEADA','DISPONIVEL','MIGRACAO') then raise exception 'ATIVA só pode ser definida pelo processo técnico após migração e validação criptográfica'; end if;
  insert into public.tenant_security_settings(tenant_id,sensitive_data_encryption_status,allowed_by,allowed_at,notes,updated_at)
  values(p_tenant_id,p_status,auth.uid(),case when p_status='DISPONIVEL' then now() else null end,p_notes,now())
  on conflict(tenant_id) do update set sensitive_data_encryption_status=excluded.sensitive_data_encryption_status,
    allowed_by=excluded.allowed_by,allowed_at=case when excluded.sensitive_data_encryption_status='DISPONIVEL' then now() else tenant_security_settings.allowed_at end,
    notes=excluded.notes,updated_at=now();
end $$;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('get_platform_partner_snapshot','save_platform_sales_partner','save_platform_partner_referral','create_platform_partner_commission','update_platform_partner_commission','get_platform_tenant_security','set_platform_tenant_security')
  loop
    execute format('revoke all on function %s from public,anon',r.sig);
    execute format('grant execute on function %s to authenticated',r.sig);
  end loop;
end $$;
