
alter table public.platform_sales_partners
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists registration_status text not null default 'ATIVO';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='platform_sales_partners_registration_status_check'
      and conrelid='public.platform_sales_partners'::regclass
  ) then
    alter table public.platform_sales_partners
      add constraint platform_sales_partners_registration_status_check
      check (registration_status in ('PENDENTE','ATIVO','SUSPENSO'));
  end if;
end $$;

create unique index if not exists platform_sales_partners_auth_user_uidx
  on public.platform_sales_partners(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists platform_sales_partners_email_lower_uidx
  on public.platform_sales_partners(lower(email));

create table if not exists public.platform_partner_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  partner_id uuid references public.platform_sales_partners(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.platform_partner_invites enable row level security;
revoke all on table public.platform_partner_invites from anon, authenticated;

create or replace function public.create_platform_partner_invite(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path='public','private','auth','extensions'
as $$
declare
  v_token text;
  v_hash text;
  v_id uuid;
  v_expires timestamptz;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'forbidden';
  end if;

  p_days := greatest(1, least(coalesce(p_days,7),30));
  v_token := encode(gen_random_bytes(24),'hex');
  v_hash := encode(extensions.digest(v_token,'sha256'),'hex');
  v_expires := now() + make_interval(days => p_days);

  insert into public.platform_partner_invites(token_hash,created_by,expires_at)
  values(v_hash,auth.uid(),v_expires)
  returning id into v_id;

  return jsonb_build_object(
    'invite_id',v_id,
    'token',v_token,
    'expires_at',v_expires
  );
end;
$$;

create or replace function public.claim_platform_partner_invite(
  p_token text,
  p_full_name text,
  p_phone text,
  p_pix_key text default null,
  p_payout_mode text default 'IMEDIATO',
  p_monthly_payout_day integer default 5
)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth','extensions'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed boolean := false;
  v_hash text;
  v_inv public.platform_partner_invites%rowtype;
  v_partner public.platform_sales_partners%rowtype;
  v_id uuid;
  v_code text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if nullif(trim(p_token),'') is null then raise exception 'convite obrigatório'; end if;
  if nullif(trim(p_full_name),'') is null then raise exception 'nome obrigatório'; end if;
  if length(regexp_replace(coalesce(p_phone,''),'\D','','g')) not between 10 and 15 then
    raise exception 'telefone inválido';
  end if;
  if p_payout_mode not in ('IMEDIATO','FECHAMENTO_MENSAL') then
    raise exception 'modo de repasse inválido';
  end if;
  p_monthly_payout_day := greatest(1,least(coalesce(p_monthly_payout_day,5),28));

  select lower(email), email_confirmed_at is not null
    into v_email, v_email_confirmed
  from auth.users
  where id=v_uid;

  if v_email is null then raise exception 'e-mail autenticado não encontrado'; end if;

  v_hash := encode(extensions.digest(trim(p_token),'sha256'),'hex');

  select * into v_inv
  from public.platform_partner_invites
  where token_hash=v_hash and active=true and used_at is null and expires_at>now()
  for update;

  if v_inv.id is null then raise exception 'convite inválido, utilizado ou expirado'; end if;

  select * into v_partner
  from public.platform_sales_partners
  where auth_user_id=v_uid or lower(email)=v_email
  order by case when auth_user_id=v_uid then 0 else 1 end
  limit 1
  for update;

  if v_partner.id is not null then
    if v_partner.auth_user_id is not null and v_partner.auth_user_id<>v_uid then
      raise exception 'este e-mail já está vinculado a outro acesso';
    end if;

    update public.platform_sales_partners
    set auth_user_id=v_uid,
        full_name=trim(p_full_name),
        phone=trim(p_phone),
        email_verified=v_email_confirmed,
        active=true,
        registration_status='ATIVO',
        payout_mode=p_payout_mode,
        monthly_payout_day=p_monthly_payout_day,
        pix_key=nullif(trim(p_pix_key),''),
        updated_at=now()
    where id=v_partner.id
    returning id into v_id;
  else
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      exit when not exists(select 1 from public.platform_sales_partners where referral_code=v_code);
    end loop;

    insert into public.platform_sales_partners(
      full_name,email,phone,email_verified,phone_verified,active,referral_code,
      subscription_commission_mode,subscription_commission_value,
      custom_commission_mode,custom_commission_value,
      payout_mode,monthly_payout_day,pix_key,registration_status,auth_user_id
    ) values(
      trim(p_full_name),v_email,trim(p_phone),v_email_confirmed,false,true,v_code,
      'FIXO',35,'FIXO',200,
      p_payout_mode,p_monthly_payout_day,nullif(trim(p_pix_key),''),'ATIVO',v_uid
    ) returning id into v_id;
  end if;

  update public.platform_partner_invites
  set used_at=now(),used_by=v_uid,partner_id=v_id,active=false
  where id=v_inv.id;

  return v_id;
end;
$$;

create or replace function public.get_my_partner_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_partner public.platform_sales_partners%rowtype;
  result jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_partner
  from public.platform_sales_partners
  where auth_user_id=v_uid
  limit 1;

  if v_partner.id is null then raise exception 'seller access not linked'; end if;

  select jsonb_build_object(
    'partner',jsonb_build_object(
      'id',v_partner.id,
      'full_name',v_partner.full_name,
      'email',v_partner.email,
      'phone',v_partner.phone,
      'email_verified',v_partner.email_verified,
      'phone_verified',v_partner.phone_verified,
      'active',v_partner.active,
      'registration_status',v_partner.registration_status,
      'referral_code',v_partner.referral_code,
      'payout_mode',v_partner.payout_mode,
      'monthly_payout_day',v_partner.monthly_payout_day,
      'accepted_policy_version',v_partner.accepted_policy_version,
      'accepted_policy_at',v_partner.accepted_policy_at,
      'pix_key',v_partner.pix_key
    ),
    'policy',coalesce((
      select jsonb_build_object('version',version,'effective_at',effective_at,'title',title,'content',content)
      from public.platform_partner_policies
      where active=true
      order by effective_at desc
      limit 1
    ),'{}'::jsonb),
    'metrics',jsonb_build_object(
      'leads_total',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id),
      'pending',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id and status in ('LEAD','CONTATO','PROPOSTA')),
      'active_sales',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id and status='CONVERTIDO'),
      'cancelled',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id and status in ('PERDIDO','CANCELADO')),
      'payments_waiting',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id and customer_payment_status='AGUARDANDO'),
      'payments_confirmed',(select count(*) from public.platform_partner_referrals where partner_id=v_partner.id and customer_payment_status='CONFIRMADO'),
      'commission_available',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where partner_id=v_partner.id and status='LIBERADA'),
      'commission_scheduled',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where partner_id=v_partner.id and status='AGENDADA'),
      'commission_paid',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where partner_id=v_partner.id and status='PAGA')
    ),
    'referrals',coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (
        select id,referral_type,lead_name,lead_email,lead_phone,status,source,
               estimated_value,converted_value,converted_at,customer_payment_status,
               first_payment_at,first_payment_amount,created_at,updated_at
        from public.platform_partner_referrals
        where partner_id=v_partner.id
        order by created_at desc
        limit 300
      ) r
    ),'[]'::jsonb),
    'commissions',coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc)
      from (
        select id,referral_id,commission_type,base_amount,commission_value,amount_due,status,
               due_at,paid_at,client_paid_at,eligible_at,payout_mode,closing_period,
               released_at,payment_reference,created_at,updated_at
        from public.platform_partner_commissions
        where partner_id=v_partner.id
        order by created_at desc
        limit 300
      ) c
    ),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.save_my_partner_referral(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_partner public.platform_sales_partners%rowtype;
  v_id uuid;
  v_type text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_partner
  from public.platform_sales_partners
  where auth_user_id=v_uid and active=true and registration_status='ATIVO'
  limit 1;

  if v_partner.id is null then raise exception 'vendedor não autorizado'; end if;

  v_type := coalesce(p_payload->>'referral_type','ASSINATURA');
  if v_type not in ('ASSINATURA','PERSONALIZADO') then raise exception 'tipo inválido'; end if;
  if nullif(trim(p_payload->>'lead_name'),'') is null then raise exception 'nome do lead obrigatório'; end if;

  insert into public.platform_partner_referrals(
    partner_id,referral_type,lead_name,lead_email,lead_phone,status,source,
    estimated_value,converted_value,notes
  ) values(
    v_partner.id,v_type,trim(p_payload->>'lead_name'),
    nullif(lower(trim(p_payload->>'lead_email')),''),
    nullif(trim(p_payload->>'lead_phone'),''),
    'LEAD','PARTNER_PORTAL',
    case when v_type='PERSONALIZADO' then 990 else 149 end,
    0,nullif(trim(p_payload->>'notes'),'')
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_my_partner_profile(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_mode text := coalesce(p_payload->>'payout_mode','IMEDIATO');
  v_day integer := coalesce((p_payload->>'monthly_payout_day')::integer,5);
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if v_mode not in ('IMEDIATO','FECHAMENTO_MENSAL') then raise exception 'modo inválido'; end if;
  v_day := greatest(1,least(v_day,28));

  update public.platform_sales_partners
  set phone=coalesce(nullif(trim(p_payload->>'phone'),''),phone),
      pix_key=nullif(trim(p_payload->>'pix_key'),''),
      payout_mode=v_mode,
      monthly_payout_day=v_day,
      updated_at=now()
  where auth_user_id=v_uid;

  if not found then raise exception 'vendedor não encontrado'; end if;
end;
$$;

create or replace function public.accept_my_partner_policy(p_version text)
returns void
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.platform_partner_policies where version=p_version and active=true) then
    raise exception 'política inválida ou inativa';
  end if;

  update public.platform_sales_partners
  set accepted_policy_version=p_version,accepted_policy_at=now(),updated_at=now()
  where auth_user_id=v_uid;

  if not found then raise exception 'vendedor não encontrado'; end if;
end;
$$;

revoke all on function public.create_platform_partner_invite(integer) from public, anon;
revoke all on function public.claim_platform_partner_invite(text,text,text,text,text,integer) from public, anon;
revoke all on function public.get_my_partner_dashboard() from public, anon;
revoke all on function public.save_my_partner_referral(jsonb) from public, anon;
revoke all on function public.update_my_partner_profile(jsonb) from public, anon;
revoke all on function public.accept_my_partner_policy(text) from public, anon;

grant execute on function public.create_platform_partner_invite(integer) to authenticated;
grant execute on function public.claim_platform_partner_invite(text,text,text,text,text,integer) to authenticated;
grant execute on function public.get_my_partner_dashboard() to authenticated;
grant execute on function public.save_my_partner_referral(jsonb) to authenticated;
grant execute on function public.update_my_partner_profile(jsonb) to authenticated;
grant execute on function public.accept_my_partner_policy(text) to authenticated;
