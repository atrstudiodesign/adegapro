
create or replace function private.platform_admin_log(
  p_tenant_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_before jsonb,
  p_after jsonb,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $$
begin
  insert into public.platform_admin_audit(actor_user_id,tenant_id,action,target_type,target_id,before_data,after_data,metadata)
  values(auth.uid(),p_tenant_id,p_action,p_target_type,p_target_id,p_before,p_after,coalesce(p_metadata,'{}'::jsonb));
end;
$$;

create or replace function public.get_platform_control_snapshot()
returns jsonb
language plpgsql
stable security definer
set search_path='public','private','auth'
as $$
declare result jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'tenants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,'legal_name',t.legal_name,'trade_name',t.trade_name,'cnpj',t.cnpj,
        'plan',t.plan,'active',t.active,'created_at',t.created_at,
        'stores',(select count(*) from public.stores s where s.tenant_id=t.id),
        'users',(select count(*) from public.profiles p where p.tenant_id=t.id),
        'license',(select to_jsonb(cl) from public.commercial_licenses cl where cl.tenant_id=t.id order by cl.created_at desc limit 1),
        'billing',(select to_jsonb(bs) from public.billing_subscriptions bs where bs.tenant_id=t.id order by bs.created_at desc limit 1),
        'infrastructure',(select to_jsonb(i) from public.tenant_infrastructure i where i.tenant_id=t.id),
        'open_support',(select count(*) from public.support_tickets st where st.tenant_id=t.id and st.status not in ('RESOLVIDO','FECHADO')),
        'open_incidents',(select count(*) from public.platform_incidents pi where pi.tenant_id=t.id and pi.status not in ('RESOLVED','CLOSED'))
      ) order by t.created_at desc)
      from public.tenants t
    ),'[]'::jsonb),
    'metrics',jsonb_build_object(
      'tenant_count',(select count(*) from public.tenants),
      'active_tenants',(select count(*) from public.tenants where active),
      'active_licenses',(select count(*) from public.commercial_licenses where status='ACTIVE'),
      'past_due_subscriptions',(select count(*) from public.billing_subscriptions where status='PAST_DUE'),
      'trialing_subscriptions',(select count(*) from public.billing_subscriptions where status='TRIALING'),
      'open_support',(select count(*) from public.support_tickets where status not in ('RESOLVIDO','FECHADO')),
      'open_incidents',(select count(*) from public.platform_incidents where status not in ('RESOLVED','CLOSED')),
      'mrr',(select coalesce(sum(case when billing_cycle='MONTHLY' and status in ('ACTIVE','TRIALING','PAST_DUE') then amount else 0 end),0) from public.billing_subscriptions)
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.get_platform_tenant_detail(p_tenant_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path='public','private','auth'
as $$
declare result jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id) then raise exception 'tenant not found'; end if;

  select jsonb_build_object(
    'tenant',(select to_jsonb(t) from public.tenants t where t.id=p_tenant_id),
    'stores',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.stores s where s.tenant_id=p_tenant_id),'[]'::jsonb),
    'users',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',p.full_name,'phone',p.phone,'role',p.role,'active',p.active,'created_at',p.created_at) order by p.created_at) from public.profiles p where p.tenant_id=p_tenant_id),'[]'::jsonb),
    'licenses',coalesce((select jsonb_agg(to_jsonb(cl) order by cl.created_at desc) from public.commercial_licenses cl where cl.tenant_id=p_tenant_id),'[]'::jsonb),
    'subscriptions',coalesce((select jsonb_agg(to_jsonb(bs) order by bs.created_at desc) from public.billing_subscriptions bs where bs.tenant_id=p_tenant_id),'[]'::jsonb),
    'billing_events',coalesce((select jsonb_agg(to_jsonb(be)-'payload' order by be.created_at desc) from (select * from public.billing_events where tenant_id=p_tenant_id order by created_at desc limit 50) be),'[]'::jsonb),
    'support',coalesce((select jsonb_agg(to_jsonb(st) order by st.updated_at desc) from public.support_tickets st where st.tenant_id=p_tenant_id),'[]'::jsonb),
    'communications',coalesce((select jsonb_agg(to_jsonb(pc) order by pc.created_at desc) from public.platform_communications pc where pc.tenant_id=p_tenant_id),'[]'::jsonb),
    'incidents',coalesce((select jsonb_agg(to_jsonb(pi) order by pi.created_at desc) from public.platform_incidents pi where pi.tenant_id=p_tenant_id or pi.tenant_id is null),'[]'::jsonb),
    'infrastructure',(select to_jsonb(i) from public.tenant_infrastructure i where i.tenant_id=p_tenant_id),
    'admin_audit',coalesce((select jsonb_agg(to_jsonb(pa) order by pa.created_at desc) from (select * from public.platform_admin_audit where tenant_id=p_tenant_id order by created_at desc limit 100) pa),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_tenant_detail(uuid) from public;
grant execute on function public.get_platform_tenant_detail(uuid) to authenticated;
