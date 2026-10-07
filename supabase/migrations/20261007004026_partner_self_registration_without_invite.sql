create or replace function public.register_platform_partner_self(
  p_full_name text,
  p_phone text,
  p_pix_key text default null,
  p_payout_mode text default 'IMEDIATO',
  p_monthly_payout_day integer default 5
)
returns uuid
language plpgsql
security definer
set search_path to 'public','private','auth','extensions'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed boolean := false;
  v_partner public.platform_sales_partners%rowtype;
  v_id uuid;
  v_code text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
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
  from auth.users where id=v_uid;

  if v_email is null then raise exception 'e-mail autenticado não encontrado'; end if;

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

  return v_id;
end
$function$;

revoke execute on function public.register_platform_partner_self(text,text,text,text,integer) from public, anon;
grant execute on function public.register_platform_partner_self(text,text,text,text,integer) to authenticated, service_role;
