
create or replace function public.save_platform_sales_partner(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_id uuid := nullif(p_payload->>'id','')::uuid;
  v_code text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if nullif(trim(p_payload->>'full_name'),'') is null then raise exception 'nome obrigatório'; end if;
  if nullif(trim(p_payload->>'email'),'') is null then raise exception 'email obrigatório'; end if;
  if nullif(trim(p_payload->>'phone'),'') is null then raise exception 'telefone obrigatório'; end if;

  v_code:=upper(coalesce(
    nullif(regexp_replace(p_payload->>'referral_code','[^A-Za-z0-9_-]','','g'),''),
    substr(replace(gen_random_uuid()::text,'-',''),1,10)
  ));

  if v_id is null then
    insert into public.platform_sales_partners(
      full_name,email,phone,email_verified,phone_verified,active,referral_code,
      subscription_commission_mode,subscription_commission_value,
      custom_commission_mode,custom_commission_value,
      payout_mode,monthly_payout_day,pix_key,notes
    ) values(
      trim(p_payload->>'full_name'),
      lower(trim(p_payload->>'email')),
      trim(p_payload->>'phone'),
      coalesce((p_payload->>'email_verified')::boolean,false),
      coalesce((p_payload->>'phone_verified')::boolean,false),
      coalesce((p_payload->>'active')::boolean,true),
      v_code,
      'FIXO',35,
      'FIXO',200,
      coalesce(p_payload->>'payout_mode','IMEDIATO'),
      coalesce((p_payload->>'monthly_payout_day')::integer,5),
      nullif(trim(p_payload->>'pix_key'),''),
      nullif(trim(p_payload->>'notes'),'')
    ) returning id into v_id;
  else
    update public.platform_sales_partners
    set full_name=trim(p_payload->>'full_name'),
        email=lower(trim(p_payload->>'email')),
        phone=trim(p_payload->>'phone'),
        email_verified=coalesce((p_payload->>'email_verified')::boolean,false),
        phone_verified=coalesce((p_payload->>'phone_verified')::boolean,false),
        active=coalesce((p_payload->>'active')::boolean,true),
        referral_code=v_code,
        subscription_commission_mode='FIXO',
        subscription_commission_value=35,
        custom_commission_mode='FIXO',
        custom_commission_value=200,
        payout_mode=coalesce(p_payload->>'payout_mode','IMEDIATO'),
        monthly_payout_day=coalesce((p_payload->>'monthly_payout_day')::integer,5),
        pix_key=nullif(trim(p_payload->>'pix_key'),''),
        notes=nullif(trim(p_payload->>'notes'),''),
        updated_at=now()
    where id=v_id;
    if not found then raise exception 'vendedor não encontrado'; end if;
  end if;
  return v_id;
end $$;

revoke all on function public.save_platform_sales_partner(jsonb) from public,anon;
grant execute on function public.save_platform_sales_partner(jsonb) to authenticated;
