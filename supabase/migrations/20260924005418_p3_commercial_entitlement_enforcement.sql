
create or replace function private.license_allows_feature(
  p_tenant uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_total integer;
  v_license public.commercial_licenses%rowtype;
  v_features jsonb;
begin
  select count(*) into v_total
  from public.commercial_licenses
  where tenant_id=p_tenant;

  -- Tenants not yet assigned to a commercial contract remain in setup mode.
  if v_total=0 then return true; end if;

  select * into v_license
  from public.commercial_licenses
  where tenant_id=p_tenant
    and status='ACTIVE'
    and starts_at<=now()
    and (ends_at is null or ends_at>now())
  order by created_at desc
  limit 1;

  if v_license.id is null then return false; end if;

  v_features:=v_license.scope->'features';
  if v_features is null or jsonb_typeof(v_features)<>'array' then
    return v_license.modality <> 'PARTIAL_LICENSE';
  end if;

  return (v_features ? '*') or (v_features ? p_feature);
end
$$;

revoke all on function private.license_allows_feature(uuid,text) from public,anon;
grant execute on function private.license_allows_feature(uuid,text) to authenticated;

create or replace function public.get_my_entitlement()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth
as $$
declare
  v_tenant uuid;
  v_total integer;
  v_license public.commercial_licenses%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select tenant_id into v_tenant from public.profiles where user_id=auth.uid() and active=true;
  if v_tenant is null then raise exception 'tenant not found'; end if;

  select count(*) into v_total from public.commercial_licenses where tenant_id=v_tenant;
  if v_total=0 then
    return jsonb_build_object('managed',false,'active',true,'mode','SETUP');
  end if;

  select * into v_license
  from public.commercial_licenses
  where tenant_id=v_tenant
    and status='ACTIVE'
    and starts_at<=now()
    and (ends_at is null or ends_at>now())
  order by created_at desc limit 1;

  if v_license.id is null then
    return jsonb_build_object('managed',true,'active',false,'mode','SUSPENDED_OR_ENDED');
  end if;

  return jsonb_build_object(
    'managed',true,
    'active',true,
    'license_id',v_license.id,
    'modality',v_license.modality,
    'scope',v_license.scope,
    'starts_at',v_license.starts_at,
    'ends_at',v_license.ends_at,
    'hosting_included',v_license.hosting_included,
    'maintenance_included',v_license.maintenance_included,
    'updates_included',v_license.updates_included
  );
end
$$;

revoke all on function public.get_my_entitlement() from public,anon;
grant execute on function public.get_my_entitlement() to authenticated;

-- Commercial contract becomes part of feature authorization.
create or replace function private.has_feature(
  target_tenant uuid,
  target_feature text,
  required_level text default 'USE'
)
returns boolean
language sql
stable
security definer
set search_path=public,auth,private
as $$
  select private.license_allows_feature(target_tenant,target_feature)
    and (
      private.is_super_admin()
      or exists (
        select 1 from public.profiles p
        where p.user_id=auth.uid()
          and p.tenant_id=target_tenant
          and p.active=true
          and (
            p.role in ('ADMINISTRADOR','SUPER_ADMIN')
            or p.permissions ? '*'
            or p.permissions ? target_feature
            or exists (
              select 1 from public.user_feature_access ufa
              where ufa.user_id=auth.uid()
                and ufa.tenant_id=target_tenant
                and ufa.feature_key=target_feature
                and ufa.enabled=true
                and (
                  required_level='VIEW'
                  or ufa.access_level='MANAGE'
                  or (required_level='USE' and ufa.access_level in ('USE','MANAGE'))
                )
            )
          )
      )
    );
$$;
