create or replace function public.update_platform_customer_referral(p_id uuid,p_status text,p_discount numeric default null,p_points integer default null,p_cashback numeric default null) returns void language plpgsql security definer set search_path='public' as $$
declare r public.customer_referrals%rowtype; v_month date:=date_trunc('month',now())::date;
begin
 if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
 if p_status not in('PENDING','ACTIVE','CONVERTED','CANCELLED','INELIGIBLE') then raise exception 'Status inválido'; end if;
 select * into r from public.customer_referrals where id=p_id for update;
 if not found then raise exception 'Indicação não encontrada'; end if;
 if p_status='CONVERTED' and r.status<>'CONVERTED' then
  if not exists(select 1 from public.tenants where id=r.tenant_id and active) then update public.customer_referrals set status='INELIGIBLE',ineligible_reason='CLIENTE_INATIVO',updated_at=now() where id=p_id; return; end if;
  if exists(select 1 from public.customer_referrals x where x.id<>r.id and x.tenant_id=r.tenant_id and x.status='CONVERTED' and ((nullif(lower(trim(r.lead_email)),'') is not null and lower(trim(x.lead_email))=lower(trim(r.lead_email))) or regexp_replace(x.lead_phone,'\D','','g')=regexp_replace(r.lead_phone,'\D','','g'))) then update public.customer_referrals set status='INELIGIBLE',ineligible_reason='DUPLICIDADE',updated_at=now() where id=p_id; return; end if;
  if exists(select 1 from public.customer_referrals x where x.tenant_id=r.tenant_id and x.cashback_credit_month=v_month and x.cashback_credited_at is not null and x.cashback_reversed_at is null) then update public.customer_referrals set status='CONVERTED',conversion_at=coalesce(conversion_at,now()),cashback_points=0,cashback_value=0,ineligible_reason='LIMITE_MENSAL_ATINGIDO',updated_at=now() where id=p_id; return; end if;
  insert into public.customer_loyalty_accounts(tenant_id,status,loyalty_months,free_months,half_price_months,regular_monthly_price,current_discount_percent,cashback_points,cashback_balance,updated_at) values(r.tenant_id,'ACTIVE',12,4,6,0,0,100,10,now()) on conflict(tenant_id) do update set cashback_points=customer_loyalty_accounts.cashback_points+100,cashback_balance=customer_loyalty_accounts.cashback_balance+10,updated_at=now();
  insert into public.customer_cashback_ledger(tenant_id,referral_id,event_type,points_delta,amount_delta,idempotency_key,reason) values(r.tenant_id,r.id,'CREDIT',100,10,'referral-credit:'||r.id::text,'INDICACAO_CONVERTIDA') on conflict(idempotency_key) do nothing;
  update public.customer_referrals set status='CONVERTED',conversion_at=coalesce(conversion_at,now()),cashback_points=100,cashback_value=10,cashback_credited_at=coalesce(cashback_credited_at,now()),cashback_credit_month=coalesce(cashback_credit_month,v_month),ineligible_reason=null,updated_at=now() where id=p_id; return;
 end if;
 if p_status in('CANCELLED','INELIGIBLE') and r.cashback_credited_at is not null and r.cashback_reversed_at is null then
  update public.customer_loyalty_accounts set cashback_points=greatest(0,cashback_points-100),cashback_balance=greatest(0,cashback_balance-10),updated_at=now() where tenant_id=r.tenant_id;
  insert into public.customer_cashback_ledger(tenant_id,referral_id,event_type,points_delta,amount_delta,idempotency_key,reason) values(r.tenant_id,r.id,'REVERSAL',-100,-10,'referral-reversal:'||r.id::text,'CANCELAMENTO_CHARGEBACK_ESTORNO') on conflict(idempotency_key) do nothing;
  update public.customer_referrals set cashback_reversed_at=now() where id=p_id;
 end if;
 update public.customer_referrals set status=p_status,discount_value=coalesce(p_discount,discount_value),conversion_at=case when p_status='CONVERTED' then coalesce(conversion_at,now()) else conversion_at end,cancelled_at=case when p_status='CANCELLED' then now() else cancelled_at end,updated_at=now() where id=p_id;
end $$;