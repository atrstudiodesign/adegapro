
CREATE OR REPLACE FUNCTION public.update_platform_customer_referral(
  p_id uuid, p_status text, p_discount numeric DEFAULT NULL, p_points integer DEFAULT NULL, p_cashback numeric DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
declare
  r public.customer_referrals%rowtype;
  v_month date := date_trunc('month', now())::date;
  v_email text;
  v_phone text;
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if p_status not in ('PENDING','ACTIVE','CONVERTED','CANCELLED','INELIGIBLE') then raise exception 'Status inválido'; end if;

  select * into r from public.customer_referrals where id=p_id for update;
  if not found then raise exception 'Indicação não encontrada'; end if;

  if p_status='CONVERTED' and r.status<>'CONVERTED' then
    if not exists(select 1 from public.tenants where id=r.tenant_id and active=true) then
      update public.customer_referrals set status='INELIGIBLE',ineligible_reason='CLIENTE_INATIVO',updated_at=now() where id=p_id;
      return;
    end if;

    v_email := nullif(lower(trim(r.lead_email)),'');
    v_phone := nullif(regexp_replace(coalesce(r.lead_phone,''),'\D','','g'),'');

    if (v_email is not null and exists(
          select 1 from public.profiles p join auth.users u on u.id=p.user_id
          where p.tenant_id=r.tenant_id and lower(trim(coalesce(u.email,'')))=v_email
       ))
       or (v_phone is not null and exists(
          select 1 from public.profiles p
          where p.tenant_id=r.tenant_id
            and nullif(regexp_replace(coalesce(p.phone,''),'\D','','g'),'')=v_phone
       )) then
      update public.customer_referrals set status='INELIGIBLE',ineligible_reason='AUTOINDICACAO',updated_at=now() where id=p_id;
      return;
    end if;

    if exists(
      select 1 from public.customer_referrals x
      where x.id<>r.id and x.tenant_id=r.tenant_id and x.status='CONVERTED'
        and (
          (v_email is not null and lower(trim(coalesce(x.lead_email,'')))=v_email)
          or
          (v_phone is not null and nullif(regexp_replace(coalesce(x.lead_phone,''),'\D','','g'),'')=v_phone)
        )
    ) then
      update public.customer_referrals set status='INELIGIBLE',ineligible_reason='DUPLICIDADE',updated_at=now() where id=p_id;
      return;
    end if;

    if exists(
      select 1 from public.customer_referrals x
      where x.tenant_id=r.tenant_id and x.cashback_credit_month=v_month
        and x.cashback_credited_at is not null and x.cashback_reversed_at is null
    ) then
      update public.customer_referrals
      set status='CONVERTED',conversion_at=coalesce(conversion_at,now()),
          cashback_points=0,cashback_value=0,ineligible_reason='LIMITE_MENSAL_ATINGIDO',updated_at=now()
      where id=p_id;
      return;
    end if;

    insert into public.customer_cashback_ledger(
      tenant_id,referral_id,event_type,points_delta,amount_delta,idempotency_key,reason
    ) values (
      r.tenant_id,r.id,'CREDIT',100,10,'referral-credit:'||r.id::text,'INDICACAO_CONVERTIDA'
    ) on conflict(idempotency_key) do nothing;

    if found then
      insert into public.customer_loyalty_accounts(
        tenant_id,status,loyalty_months,free_months,half_price_months,regular_monthly_price,
        current_discount_percent,cashback_points,cashback_balance,updated_at
      ) values(r.tenant_id,'ACTIVE',12,4,6,0,0,100,10,now())
      on conflict(tenant_id) do update
      set cashback_points=customer_loyalty_accounts.cashback_points+100,
          cashback_balance=customer_loyalty_accounts.cashback_balance+10,updated_at=now();
    end if;

    update public.customer_referrals
    set status='CONVERTED',conversion_at=coalesce(conversion_at,now()),
        cashback_points=100,cashback_value=10,
        cashback_credited_at=coalesce(cashback_credited_at,now()),
        cashback_credit_month=coalesce(cashback_credit_month,v_month),
        ineligible_reason=null,updated_at=now()
    where id=p_id;
    return;
  end if;

  if p_status in ('CANCELLED','INELIGIBLE') and r.cashback_credited_at is not null and r.cashback_reversed_at is null then
    insert into public.customer_cashback_ledger(
      tenant_id,referral_id,event_type,points_delta,amount_delta,idempotency_key,reason
    ) values (
      r.tenant_id,r.id,'REVERSAL',-100,-10,'referral-reversal:'||r.id::text,'CANCELAMENTO_CHARGEBACK_ESTORNO'
    ) on conflict(idempotency_key) do nothing;

    if found then
      update public.customer_loyalty_accounts
      set cashback_points=greatest(0,cashback_points-100),
          cashback_balance=greatest(0,cashback_balance-10),updated_at=now()
      where tenant_id=r.tenant_id;
    end if;
    update public.customer_referrals set cashback_reversed_at=now() where id=p_id;
  end if;

  update public.customer_referrals
  set status=p_status,discount_value=coalesce(p_discount,discount_value),
      conversion_at=case when p_status='CONVERTED' then coalesce(conversion_at,now()) else conversion_at end,
      cancelled_at=case when p_status='CANCELLED' then now() else cancelled_at end,
      updated_at=now()
  where id=p_id;
end $$;

CREATE OR REPLACE FUNCTION public.redeem_customer_cashback_for_subscription(
  p_tenant_id uuid, p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  l public.customer_loyalty_accounts%rowtype;
  v_gross numeric;
  v_discount numeric;
  v_net numeric;
  v_cap numeric;
  v_redeem numeric;
  v_points integer;
  v_existing public.customer_cashback_ledger%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if nullif(trim(p_idempotency_key),'') is null then raise exception 'idempotency_key obrigatório'; end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id and active=true) then raise exception 'Cliente inativo'; end if;

  select * into v_existing from public.customer_cashback_ledger where idempotency_key=p_idempotency_key;
  if found then
    return jsonb_build_object('idempotent',true,'redeemed',abs(v_existing.amount_delta),'points',abs(v_existing.points_delta));
  end if;

  select * into l from public.customer_loyalty_accounts where tenant_id=p_tenant_id for update;
  if not found or l.status<>'ACTIVE' then raise exception 'Fidelidade inativa'; end if;

  select amount into v_gross
  from public.billing_subscriptions
  where tenant_id=p_tenant_id and status in ('ACTIVE','TRIALING','PAST_DUE')
  order by updated_at desc limit 1;

  v_gross := coalesce(v_gross,l.regular_monthly_price,0);
  v_discount := greatest(0,least(100,coalesce(l.current_discount_percent,0)));
  v_net := round(v_gross*(1-v_discount/100),2);
  v_cap := round(v_net*0.50,2);
  v_redeem := floor(least(coalesce(l.cashback_balance,0),v_cap)*10)/10;
  v_points := (v_redeem*10)::integer;

  if v_redeem<=0 or v_points<=0 then
    return jsonb_build_object('idempotent',false,'redeemed',0,'points',0,'net_before_cashback',v_net,'max_cashback',v_cap,'final_amount',v_net);
  end if;

  insert into public.customer_cashback_ledger(
    tenant_id,referral_id,event_type,points_delta,amount_delta,idempotency_key,reason
  ) values (
    p_tenant_id,null,'REDEMPTION',-v_points,-v_redeem,p_idempotency_key,'MENSALIDADE_MAX_50_LIQUIDA'
  );

  update public.customer_loyalty_accounts
  set cashback_points=greatest(0,cashback_points-v_points),
      cashback_balance=greatest(0,cashback_balance-v_redeem),updated_at=now()
  where tenant_id=p_tenant_id;

  return jsonb_build_object(
    'idempotent',false,'redeemed',v_redeem,'points',v_points,
    'gross',v_gross,'discount_percent',v_discount,'net_before_cashback',v_net,
    'max_cashback',v_cap,'final_amount',round(v_net-v_redeem,2)
  );
end $$;

REVOKE ALL ON FUNCTION public.update_platform_customer_referral(uuid,text,numeric,integer,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_platform_customer_referral(uuid,text,numeric,integer,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_customer_cashback_for_subscription(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_customer_cashback_for_subscription(uuid,text) TO authenticated;
