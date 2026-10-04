
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select coalesce(private.is_super_admin(), false);
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.get_platform_control_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'tenants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'legal_name', t.legal_name,
        'trade_name', t.trade_name,
        'cnpj', t.cnpj,
        'plan', t.plan,
        'active', t.active,
        'created_at', t.created_at,
        'stores', (
          select count(*) from public.stores s where s.tenant_id=t.id
        ),
        'users', (
          select count(*) from public.profiles p where p.tenant_id=t.id
        ),
        'license', (
          select jsonb_build_object(
            'id',cl.id,'modality',cl.modality,'status',cl.status,
            'starts_at',cl.starts_at,'ends_at',cl.ends_at,
            'scope',cl.scope,'source_code_included',cl.source_code_included,
            'ip_assignment_included',cl.ip_assignment_included,
            'exclusive',cl.exclusive,'white_label',cl.white_label,
            'maintenance_included',cl.maintenance_included,
            'updates_included',cl.updates_included,'hosting_included',cl.hosting_included
          )
          from public.commercial_licenses cl
          where cl.tenant_id=t.id
          order by cl.created_at desc limit 1
        ),
        'billing', (
          select jsonb_build_object(
            'id',bs.id,'provider',bs.provider,'plan_code',bs.plan_code,
            'status',bs.status,'billing_cycle',bs.billing_cycle,
            'amount',bs.amount,'currency',bs.currency,
            'current_period_start',bs.current_period_start,
            'current_period_end',bs.current_period_end,
            'cancel_at_period_end',bs.cancel_at_period_end
          )
          from public.billing_subscriptions bs
          where bs.tenant_id=t.id
          order by bs.created_at desc limit 1
        ),
        'open_support', (
          select count(*) from public.support_tickets st
          where st.tenant_id=t.id and coalesce(st.status,'ABERTO') not in ('RESOLVIDO','FECHADO')
        )
      ) order by t.created_at desc)
      from public.tenants t
    ), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'tenant_count',(select count(*) from public.tenants),
      'active_tenants',(select count(*) from public.tenants where active=true),
      'active_licenses',(select count(*) from public.commercial_licenses where status='ACTIVE'),
      'past_due_subscriptions',(select count(*) from public.billing_subscriptions where status='PAST_DUE'),
      'open_support',(select count(*) from public.support_tickets where coalesce(status,'ABERTO') not in ('RESOLVIDO','FECHADO'))
    )
  ) into result;

  return result;
end
$$;
revoke all on function public.get_platform_control_snapshot() from public, anon;
grant execute on function public.get_platform_control_snapshot() to authenticated;

create or replace function public.set_platform_tenant_access(
  p_tenant_id uuid,
  p_active boolean,
  p_license_status text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, auth
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then
    raise exception 'forbidden';
  end if;

  update public.tenants
  set active=p_active
  where id=p_tenant_id;

  update public.stores
  set active=p_active, updated_at=now()
  where tenant_id=p_tenant_id;

  if p_license_status is not null then
    if p_license_status not in ('DRAFT','ACTIVE','SUSPENDED','ENDED','CANCELLED') then
      raise exception 'invalid license status';
    end if;

    update public.commercial_licenses
    set status=p_license_status, updated_at=now()
    where id=(
      select id from public.commercial_licenses
      where tenant_id=p_tenant_id
      order by created_at desc limit 1
    );
  end if;

  insert into public.audit_logs(tenant_id,user_id,action,entity,entity_id,details,created_at)
  values(
    p_tenant_id,auth.uid(),'PLATFORM_TENANT_ACCESS','TENANT',p_tenant_id::text,
    jsonb_build_object('active',p_active,'license_status',p_license_status)::text,now()
  );
end
$$;
revoke all on function public.set_platform_tenant_access(uuid,boolean,text) from public, anon;
grant execute on function public.set_platform_tenant_access(uuid,boolean,text) to authenticated;
