
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
    'webhooks',coalesce((select jsonb_agg(jsonb_build_object(
      'id',w.id,'store_id',w.store_id,'provider',w.provider,'webhook_url',w.webhook_url,'event_types',w.event_types,
      'auth_mode',w.auth_mode,'secret_ref',w.secret_ref,'enabled',w.enabled,'last_test_at',w.last_test_at,
      'last_test_status',w.last_test_status,'created_at',w.created_at,'updated_at',w.updated_at
    ) order by w.updated_at desc) from public.integration_webhook_configs w where w.tenant_id=p_tenant_id),'[]'::jsonb),
    'support',coalesce((select jsonb_agg(to_jsonb(st) order by st.updated_at desc) from public.support_tickets st where st.tenant_id=p_tenant_id),'[]'::jsonb),
    'communications',coalesce((select jsonb_agg(to_jsonb(pc) order by pc.created_at desc) from public.platform_communications pc where pc.tenant_id=p_tenant_id),'[]'::jsonb),
    'incidents',coalesce((select jsonb_agg(to_jsonb(pi) order by pi.created_at desc) from public.platform_incidents pi where pi.tenant_id=p_tenant_id or pi.tenant_id is null),'[]'::jsonb),
    'infrastructure',(select to_jsonb(i) from public.tenant_infrastructure i where i.tenant_id=p_tenant_id),
    'admin_audit',coalesce((select jsonb_agg(to_jsonb(pa) order by pa.created_at desc) from (select * from public.platform_admin_audit where tenant_id=p_tenant_id order by created_at desc limit 100) pa),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.save_platform_webhook_config(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_id uuid; v_tenant uuid; v_before jsonb; v_auth text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := (p_payload->>'tenant_id')::uuid;
  v_auth := upper(coalesce(p_payload->>'auth_mode','NONE'));
  if not exists(select 1 from public.tenants where id=v_tenant) then raise exception 'tenant not found'; end if;
  if v_auth not in ('NONE','HMAC','BEARER','BASIC') then raise exception 'invalid auth mode'; end if;
  if nullif(p_payload->>'webhook_url','') is not null and (p_payload->>'webhook_url') !~ '^https://' then raise exception 'webhook must use https'; end if;

  if nullif(p_payload->>'id','') is not null then
    v_id := (p_payload->>'id')::uuid;
    select to_jsonb(x) into v_before from public.integration_webhook_configs x where x.id=v_id and x.tenant_id=v_tenant;
    if v_before is null then raise exception 'webhook config not found'; end if;
    update public.integration_webhook_configs set
      store_id=nullif(p_payload->>'store_id','')::uuid,
      provider=coalesce(nullif(p_payload->>'provider',''),provider),
      webhook_url=case when p_payload ? 'webhook_url' then p_payload->>'webhook_url' else webhook_url end,
      event_types=case when p_payload ? 'event_types' then coalesce(p_payload->'event_types','[]'::jsonb) else event_types end,
      auth_mode=v_auth,
      secret_ref=case when p_payload ? 'secret_ref' then p_payload->>'secret_ref' else secret_ref end,
      enabled=coalesce((p_payload->>'enabled')::boolean,enabled),
      updated_at=now()
    where id=v_id;
  else
    insert into public.integration_webhook_configs(tenant_id,store_id,provider,webhook_url,event_types,auth_mode,secret_ref,enabled)
    values(v_tenant,nullif(p_payload->>'store_id','')::uuid,coalesce(nullif(p_payload->>'provider',''),'CUSTOM'),
      p_payload->>'webhook_url',coalesce(p_payload->'event_types','[]'::jsonb),v_auth,p_payload->>'secret_ref',coalesce((p_payload->>'enabled')::boolean,false))
    returning id into v_id;
  end if;

  perform private.platform_admin_log(v_tenant,'SAVE_WEBHOOK_CONFIG','integration_webhook_config',v_id::text,v_before,
    (select to_jsonb(x) from public.integration_webhook_configs x where x.id=v_id));
  return v_id;
end;
$$;

revoke all on function public.save_platform_webhook_config(jsonb) from public;
grant execute on function public.save_platform_webhook_config(jsonb) to authenticated;
