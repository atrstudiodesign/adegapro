-- Seller approval workflow. Does not touch client/tenant cash, sales or stock.

alter table public.platform_sales_partners
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.platform_sales_partners
  drop constraint if exists platform_sales_partners_registration_status_check;

alter table public.platform_sales_partners
  add constraint platform_sales_partners_registration_status_check
  check (registration_status in ('PENDENTE','ATIVO','SUSPENSO','CANCELADO'));

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
as $function$
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
  if v_inv.intended_email is not null and lower(v_inv.intended_email)<>v_email then
    raise exception 'este convite pertence a outro e-mail';
  end if;

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
        active=false,
        registration_status='PENDENTE',
        approved_at=null,
        approved_by=null,
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
      trim(p_full_name),v_email,trim(p_phone),v_email_confirmed,false,false,v_code,
      'FIXO',35,'FIXO',200,
      p_payout_mode,p_monthly_payout_day,nullif(trim(p_pix_key),''),'PENDENTE',v_uid
    ) returning id into v_id;
  end if;

  update public.platform_partner_invites
  set used_at=now(),used_by=v_uid,partner_id=v_id,active=false
  where id=v_inv.id;

  return v_id;
end;
$function$;

create or replace function public.set_platform_sales_partner_status(p_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $function$
declare
  v_status text:=upper(trim(coalesce(p_status,'')));
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if v_status not in ('PENDENTE','ATIVO','SUSPENSO','CANCELADO') then raise exception 'status inválido'; end if;

  update public.platform_sales_partners
  set registration_status=v_status,
      active=(v_status='ATIVO'),
      approved_at=case when v_status='ATIVO' then now() else approved_at end,
      approved_by=case when v_status='ATIVO' then auth.uid() else approved_by end,
      updated_at=now()
  where id=p_id;

  if not found then raise exception 'vendedor não encontrado'; end if;
end;
$function$;

revoke all on function public.claim_platform_partner_invite(text,text,text,text,text,integer) from public,anon;
grant execute on function public.claim_platform_partner_invite(text,text,text,text,text,integer) to authenticated;
revoke all on function public.set_platform_sales_partner_status(uuid,text) from public,anon;
grant execute on function public.set_platform_sales_partner_status(uuid,text) to authenticated;
