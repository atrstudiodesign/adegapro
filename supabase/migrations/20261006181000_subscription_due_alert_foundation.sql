alter table public.billing_subscriptions
 add column if not exists payment_provider text not null default 'MANUAL',
 add column if not exists provider_payment_ref text,
 add column if not exists payment_url text,
 add column if not exists last_payment_status text,
 add column if not exists last_payment_at timestamptz,
 add column if not exists reminder_days_before integer not null default 5,
 add column if not exists grace_days integer not null default 5,
 add column if not exists access_suspended_at timestamptz;
alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_reminder_days_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_reminder_days_check check (reminder_days_before between 0 and 30);
alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_grace_days_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_grace_days_check check (grace_days between 0 and 30);

create or replace function public.get_my_subscription_status()
returns jsonb language plpgsql stable security definer set search_path='public','private','auth' as $$
declare v_user uuid:=auth.uid(); v_tenant uuid; v jsonb;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 select usa.tenant_id into v_tenant from public.user_store_access usa where usa.user_id=v_user and usa.active order by usa.created_at limit 1;
 if v_tenant is null then raise exception 'tenant access not found'; end if;
 select jsonb_build_object('tenant_id',b.tenant_id,'plan_code',b.plan_code,'status',b.status,'amount',b.amount,'currency',b.currency,'next_due_at',b.next_due_at,'payment_provider',b.payment_provider,'payment_url',b.payment_url,'last_payment_status',b.last_payment_status,'last_payment_at',b.last_payment_at,'reminder_days_before',b.reminder_days_before,'grace_days',b.grace_days,'days_to_due',case when b.next_due_at is null then null else (b.next_due_at::date-current_date) end,'alert_level',case when b.status in ('SUSPENDED','CANCELLED','ENDED') then 'BLOCKED' when b.next_due_at is null then 'UNCONFIGURED' when current_date>b.next_due_at::date+b.grace_days then 'OVERDUE_GRACE' when current_date>b.next_due_at::date then 'OVERDUE' when current_date>=b.next_due_at::date-b.reminder_days_before then 'DUE_SOON' else 'OK' end) into v
 from public.billing_subscriptions b where b.tenant_id=v_tenant and b.status in ('ACTIVE','TRIALING','PAST_DUE','SUSPENDED') order by b.created_at desc limit 1;
 return coalesce(v,jsonb_build_object('tenant_id',v_tenant,'alert_level','UNCONFIGURED'));
end $$;
revoke all on function public.get_my_subscription_status() from public,anon;
grant execute on function public.get_my_subscription_status() to authenticated;
