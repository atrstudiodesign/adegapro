
create or replace function public.confirm_platform_partner_customer_payment(
  p_referral_id uuid,
  p_amount numeric,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_ref public.platform_partner_referrals%rowtype;
  v_partner public.platform_sales_partners%rowtype;
  v_commission_id uuid;
  v_commission numeric;
  v_type text;
  v_status text;
  v_due date;
  v_period text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if p_amount<=0 then raise exception 'valor de pagamento inválido'; end if;

  select * into v_ref from public.platform_partner_referrals where id=p_referral_id;
  if v_ref.id is null then raise exception 'indicação não encontrada'; end if;
  select * into v_partner from public.platform_sales_partners where id=v_ref.partner_id and active=true;
  if v_partner.id is null then raise exception 'vendedor inativo ou inexistente'; end if;
  if not v_partner.email_verified or not v_partner.phone_verified then
    raise exception 'e-mail e telefone do vendedor precisam estar validados antes do repasse';
  end if;

  v_type:=v_ref.referral_type;
  if v_type='ASSINATURA' then
    v_commission:=35.00;
  elsif v_type='PERSONALIZADO' then
    v_commission:=200.00;
  else
    raise exception 'tipo de indicação inválido';
  end if;

  if exists(
    select 1 from public.platform_partner_commissions c
    where c.referral_id=p_referral_id and c.commission_type=v_type and c.status<>'CANCELADA'
  ) then
    raise exception 'comissão já existente para esta indicação';
  end if;

  update public.platform_partner_referrals
  set customer_payment_status='CONFIRMADO',
      first_payment_at=coalesce(first_payment_at,p_paid_at),
      first_payment_amount=coalesce(first_payment_amount,p_amount),
      payment_validated_by=auth.uid(),
      payment_validated_at=now(),
      status='CONVERTIDO',
      converted_at=coalesce(converted_at,p_paid_at),
      converted_value=case when converted_value>0 then converted_value
        when v_type='ASSINATURA' then 149.00 else 990.00 end,
      updated_at=now()
  where id=p_referral_id;

  if v_partner.payout_mode='IMEDIATO' then
    v_status:='LIBERADA';
    v_due:=current_date;
  else
    v_status:='AGENDADA';
    v_due:=((date_trunc('month',p_paid_at)+interval '1 month')::date
      + (least(v_partner.monthly_payout_day,28)-1));
  end if;
  v_period:=to_char(p_paid_at,'YYYY-MM');

  insert into public.platform_partner_commissions(
    partner_id,referral_id,tenant_id,commission_type,base_amount,commission_mode,commission_value,
    amount_due,status,due_at,client_paid_at,eligible_at,payout_mode,closing_period,released_at,approved_by,notes
  ) values(
    v_partner.id,p_referral_id,v_ref.tenant_id,v_type,
    case when v_type='ASSINATURA' then 149.00 else 990.00 end,
    'FIXO',v_commission,v_commission,v_status,v_due,p_paid_at,now(),v_partner.payout_mode,v_period,
    case when v_status='LIBERADA' then now() else null end,auth.uid(),
    'Comissão gerada após confirmação do primeiro pagamento do cliente.'
  ) returning id into v_commission_id;

  return v_commission_id;
end $$;

revoke all on function public.confirm_platform_partner_customer_payment(uuid,numeric,timestamptz) from public,anon;
grant execute on function public.confirm_platform_partner_customer_payment(uuid,numeric,timestamptz) to authenticated;
