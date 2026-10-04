
create or replace function public.get_platform_partner_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path='public','private','auth'
as $$
declare result jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'policy',coalesce((
      select jsonb_build_object('version',version,'effective_at',effective_at,'title',title,'content',content)
      from public.platform_partner_policies where active=true order by effective_at desc limit 1
    ),'{}'::jsonb),
    'metrics',jsonb_build_object(
      'partners_total',(select count(*) from public.platform_sales_partners),
      'partners_active',(select count(*) from public.platform_sales_partners where active=true),
      'referrals_total',(select count(*) from public.platform_partner_referrals),
      'referrals_converted',(select count(*) from public.platform_partner_referrals where status='CONVERTIDO'),
      'payments_waiting',(select count(*) from public.platform_partner_referrals where customer_payment_status='AGUARDANDO'),
      'payments_confirmed',(select count(*) from public.platform_partner_referrals where customer_payment_status='CONFIRMADO'),
      'commission_available',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where status='LIBERADA'),
      'commission_scheduled',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where status='AGENDADA'),
      'commission_paid',(select coalesce(sum(amount_due),0) from public.platform_partner_commissions where status='PAGA'),
      'conversion_value',(select coalesce(sum(converted_value),0) from public.platform_partner_referrals where status='CONVERTIDO')
    ),
    'partners',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'full_name',p.full_name,'email',p.email,'phone',p.phone,
        'email_verified',p.email_verified,'phone_verified',p.phone_verified,'active',p.active,
        'referral_code',p.referral_code,'subscription_commission_mode',p.subscription_commission_mode,
        'subscription_commission_value',p.subscription_commission_value,'custom_commission_mode',p.custom_commission_mode,
        'custom_commission_value',p.custom_commission_value,'payout_mode',p.payout_mode,
        'monthly_payout_day',p.monthly_payout_day,'accepted_policy_version',p.accepted_policy_version,
        'accepted_policy_at',p.accepted_policy_at,'pix_key',p.pix_key,'notes',p.notes,
        'created_at',p.created_at,'updated_at',p.updated_at,
        'referrals',(select count(*) from public.platform_partner_referrals r where r.partner_id=p.id),
        'converted',(select count(*) from public.platform_partner_referrals r where r.partner_id=p.id and r.status='CONVERTIDO'),
        'waiting_payment',(select count(*) from public.platform_partner_referrals r where r.partner_id=p.id and r.customer_payment_status='AGUARDANDO'),
        'available_amount',(select coalesce(sum(c.amount_due),0) from public.platform_partner_commissions c where c.partner_id=p.id and c.status='LIBERADA'),
        'scheduled_amount',(select coalesce(sum(c.amount_due),0) from public.platform_partner_commissions c where c.partner_id=p.id and c.status='AGENDADA'),
        'paid_amount',(select coalesce(sum(c.amount_due),0) from public.platform_partner_commissions c where c.partner_id=p.id and c.status='PAGA')
      ) order by p.created_at desc) from public.platform_sales_partners p
    ),'[]'::jsonb),
    'referrals',coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (select * from public.platform_partner_referrals order by created_at desc limit 300) r
    ),'[]'::jsonb),
    'commissions',coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc)
      from (select * from public.platform_partner_commissions order by created_at desc limit 400) c
    ),'[]'::jsonb),
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

revoke all on function public.get_platform_partner_snapshot() from public,anon;
grant execute on function public.get_platform_partner_snapshot() to authenticated;
