
create or replace function public.save_platform_license(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_id uuid;
  v_tenant uuid;
  v_before jsonb;
  v_mod text := upper(coalesce(p_payload->>'modality','SUBSCRIPTION'));
  v_status text := upper(coalesce(p_payload->>'status','ACTIVE'));
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := (p_payload->>'tenant_id')::uuid;
  if not exists(select 1 from public.tenants where id=v_tenant) then raise exception 'tenant not found'; end if;
  if v_mod not in ('SUBSCRIPTION','FULL_LICENSE','PARTIAL_LICENSE','CUSTOM_PROJECT','DEDICATED_DEPLOYMENT') then raise exception 'invalid modality'; end if;
  if v_status not in ('DRAFT','ACTIVE','SUSPENDED','ENDED','CANCELLED') then raise exception 'invalid status'; end if;

  if nullif(p_payload->>'id','') is not null then
    v_id := (p_payload->>'id')::uuid;
    select to_jsonb(x) into v_before from public.commercial_licenses x where x.id=v_id and x.tenant_id=v_tenant;
    if v_before is null then raise exception 'license not found'; end if;
    update public.commercial_licenses set
      modality=v_mod,
      status=v_status,
      contract_reference=case when p_payload ? 'contract_reference' then p_payload->>'contract_reference' else contract_reference end,
      starts_at=coalesce(nullif(p_payload->>'starts_at','')::timestamptz,starts_at),
      ends_at=case when p_payload ? 'ends_at' then nullif(p_payload->>'ends_at','')::timestamptz else ends_at end,
      maintenance_included=coalesce((p_payload->>'maintenance_included')::boolean,maintenance_included),
      updates_included=coalesce((p_payload->>'updates_included')::boolean,updates_included),
      hosting_included=coalesce((p_payload->>'hosting_included')::boolean,hosting_included),
      white_label=coalesce((p_payload->>'white_label')::boolean,white_label),
      notes=case when p_payload ? 'notes' then p_payload->>'notes' else notes end,
      updated_at=now()
    where id=v_id;
  else
    insert into public.commercial_licenses(
      tenant_id,modality,contract_reference,starts_at,ends_at,maintenance_included,updates_included,hosting_included,white_label,status,notes
    ) values(
      v_tenant,v_mod,p_payload->>'contract_reference',coalesce(nullif(p_payload->>'starts_at','')::timestamptz,now()),
      nullif(p_payload->>'ends_at','')::timestamptz,coalesce((p_payload->>'maintenance_included')::boolean,false),
      coalesce((p_payload->>'updates_included')::boolean,false),coalesce((p_payload->>'hosting_included')::boolean,true),
      coalesce((p_payload->>'white_label')::boolean,false),v_status,p_payload->>'notes'
    ) returning id into v_id;
  end if;

  perform private.platform_admin_log(v_tenant,'SAVE_LICENSE','commercial_license',v_id::text,v_before,(select to_jsonb(x) from public.commercial_licenses x where x.id=v_id));
  return v_id;
end;
$$;

revoke all on function public.save_platform_license(jsonb) from public;
grant execute on function public.save_platform_license(jsonb) to authenticated;
