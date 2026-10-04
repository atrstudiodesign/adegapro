
create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','private','auth'
as $$
declare
  v_tenant uuid;
  v_total integer;
  v_license public.commercial_licenses%rowtype;
  v_is_platform_admin boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select tenant_id into v_tenant
  from public.profiles
  where user_id=auth.uid() and active=true
  limit 1;

  if v_tenant is null then
    v_is_platform_admin := private.is_super_admin();
    return jsonb_build_object(
      'managed', false,
      'active', false,
      'mode', case when v_is_platform_admin then 'PLATFORM_ADMIN_ACCOUNT' else 'NO_TENANT' end,
      'reason', 'NO_TENANT'
    );
  end if;

  select count(*) into v_total
  from public.commercial_licenses
  where tenant_id=v_tenant;

  if v_total=0 then
    return jsonb_build_object('managed',false,'active',true,'mode','SETUP','tenant_id',v_tenant);
  end if;

  select * into v_license
  from public.commercial_licenses
  where tenant_id=v_tenant
    and status='ACTIVE'
    and starts_at<=now()
    and (ends_at is null or ends_at>now())
  order by created_at desc
  limit 1;

  if v_license.id is null then
    return jsonb_build_object('managed',true,'active',false,'mode','SUSPENDED_OR_ENDED','tenant_id',v_tenant);
  end if;

  return jsonb_build_object(
    'managed',true,
    'active',true,
    'tenant_id',v_tenant,
    'license_id',v_license.id,
    'modality',v_license.modality,
    'scope',v_license.scope,
    'starts_at',v_license.starts_at,
    'ends_at',v_license.ends_at,
    'hosting_included',v_license.hosting_included,
    'maintenance_included',v_license.maintenance_included,
    'updates_included',v_license.updates_included
  );
end;
$$;
