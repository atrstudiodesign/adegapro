
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
  select private.is_super_admin()
    or (
      private.license_allows_feature(target_tenant,target_feature)
      and exists (
        select 1 from public.profiles p
        where p.user_id=auth.uid()
          and p.tenant_id=target_tenant
          and p.active=true
          and (
            p.role='ADMINISTRADOR'
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
