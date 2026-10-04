
create or replace function public.save_platform_subscription(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare
  v_id uuid;
  v_tenant uuid;
  v_before jsonb;
  v_status text := upper(coalesce(p_payload->>'status','ACTIVE'));
  v_cycle text := upper(coalesce(p_payload->>'billing_cycle','MONTHLY'));
  v_plan text := upper(coalesce(p_payload->>'plan_code','PRO'));
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := (p_payload->>'tenant_id')::uuid;
  if not exists(select 1 from public.tenants where id=v_tenant) then raise exception 'tenant not found'; end if;
  if v_status not in ('PENDING','TRIALING','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED','ENDED') then raise exception 'invalid status'; end if;
  if v_cycle not in ('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','ONE_TIME') then raise exception 'invalid billing cycle'; end if;
  if v_plan not in ('STARTER','PRO','ENTERPRISE') then raise exception 'invalid plan'; end if;

  if nullif(p_payload->>'id','') is not null then
    v_id := (p_payload->>'id')::uuid;
    select to_jsonb(x) into v_before from public.billing_subscriptions x where x.id=v_id and x.tenant_id=v_tenant;
    if v_before is null then raise exception 'subscription not found'; end if;
    update public.billing_subscriptions set
      provider=coalesce(nullif(p_payload->>'provider',''),provider),
      provider_customer_ref=case when p_payload ? 'provider_customer_ref' then p_payload->>'provider_customer_ref' else provider_customer_ref end,
      provider_subscription_ref=case when p_payload ? 'provider_subscription_ref' then p_payload->>'provider_subscription_ref' else provider_subscription_ref end,
      plan_code=v_plan,status=v_status,billing_cycle=v_cycle,
      amount=case when p_payload ? 'amount' then nullif(p_payload->>'amount','')::numeric else amount end,
      currency=coalesce(nullif(p_payload->>'currency',''),currency),
      current_period_start=case when p_payload ? 'current_period_start' then nullif(p_payload->>'current_period_start','')::timestamptz else current_period_start end,
      current_period_end=case when p_payload ? 'current_period_end' then nullif(p_payload->>'current_period_end','')::timestamptz else current_period_end end,
      trial_start=case when p_payload ? 'trial_start' then nullif(p_payload->>'trial_start','')::timestamptz else trial_start end,
      trial_end=case when p_payload ? 'trial_end' then nullif(p_payload->>'trial_end','')::timestamptz else trial_end end,
      next_due_at=case when p_payload ? 'next_due_at' then nullif(p_payload->>'next_due_at','')::timestamptz else next_due_at end,
      grace_until=case when p_payload ? 'grace_until' then nullif(p_payload->>'grace_until','')::timestamptz else grace_until end,
      cancel_at_period_end=coalesce((p_payload->>'cancel_at_period_end')::boolean,cancel_at_period_end),
      admin_notes=case when p_payload ? 'admin_notes' then p_payload->>'admin_notes' else admin_notes end,
      updated_at=now()
    where id=v_id;
  else
    insert into public.billing_subscriptions(
      tenant_id,provider,provider_customer_ref,provider_subscription_ref,plan_code,status,billing_cycle,amount,currency,
      current_period_start,current_period_end,trial_start,trial_end,next_due_at,grace_until,cancel_at_period_end,admin_notes
    ) values(
      v_tenant,coalesce(nullif(p_payload->>'provider',''),'MANUAL'),p_payload->>'provider_customer_ref',p_payload->>'provider_subscription_ref',
      v_plan,v_status,v_cycle,nullif(p_payload->>'amount','')::numeric,coalesce(nullif(p_payload->>'currency',''),'BRL'),
      nullif(p_payload->>'current_period_start','')::timestamptz,nullif(p_payload->>'current_period_end','')::timestamptz,
      nullif(p_payload->>'trial_start','')::timestamptz,nullif(p_payload->>'trial_end','')::timestamptz,
      nullif(p_payload->>'next_due_at','')::timestamptz,nullif(p_payload->>'grace_until','')::timestamptz,
      coalesce((p_payload->>'cancel_at_period_end')::boolean,false),p_payload->>'admin_notes'
    ) returning id into v_id;
  end if;

  update public.tenants set plan=v_plan,updated_at=now() where id=v_tenant;
  perform private.platform_admin_log(v_tenant,'SAVE_SUBSCRIPTION','billing_subscription',v_id::text,v_before,(select to_jsonb(x) from public.billing_subscriptions x where x.id=v_id));
  return v_id;
end;
$$;

create or replace function public.update_platform_support_ticket(p_ticket_id uuid,p_status text,p_priority text)
returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_before jsonb; v_tenant uuid;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if upper(p_status) not in ('ABERTO','EM_ATENDIMENTO','RESOLVIDO','FECHADO') then raise exception 'invalid status'; end if;
  if upper(p_priority) not in ('BAIXA','NORMAL','ALTA','CRITICA') then raise exception 'invalid priority'; end if;
  select tenant_id,to_jsonb(st) into v_tenant,v_before from public.support_tickets st where id=p_ticket_id;
  if v_tenant is null then raise exception 'ticket not found'; end if;
  update public.support_tickets set status=upper(p_status),priority=upper(p_priority),updated_at=now() where id=p_ticket_id;
  perform private.platform_admin_log(v_tenant,'UPDATE_SUPPORT_TICKET','support_ticket',p_ticket_id::text,v_before,(select to_jsonb(x) from public.support_tickets x where x.id=p_ticket_id));
end;
$$;

create or replace function public.create_platform_communication(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_id uuid; v_tenant uuid; v_channel text; v_status text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := (p_payload->>'tenant_id')::uuid;
  v_channel := upper(coalesce(p_payload->>'channel','INTERNAL'));
  v_status := upper(coalesce(p_payload->>'status','DRAFT'));
  if v_channel not in ('INTERNAL','EMAIL','WHATSAPP') then raise exception 'invalid channel'; end if;
  if v_status not in ('DRAFT','QUEUED','SENT','FAILED','CANCELLED') then raise exception 'invalid status'; end if;
  insert into public.platform_communications(tenant_id,channel,recipient,subject,message,status,sent_at,created_by)
  values(v_tenant,v_channel,p_payload->>'recipient',coalesce(nullif(p_payload->>'subject',''),'Comunicação ATR Studio'),coalesce(p_payload->>'message',''),v_status,
    case when v_status='SENT' then now() else null end,auth.uid())
  returning id into v_id;
  perform private.platform_admin_log(v_tenant,'CREATE_COMMUNICATION','platform_communication',v_id::text,null,(select to_jsonb(x) from public.platform_communications x where x.id=v_id));
  return v_id;
end;
$$;

create or replace function public.save_platform_incident(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_id uuid; v_tenant uuid; v_before jsonb; v_status text; v_severity text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := nullif(p_payload->>'tenant_id','')::uuid;
  v_status := upper(coalesce(p_payload->>'status','OPEN'));
  v_severity := upper(coalesce(p_payload->>'severity','MEDIUM'));
  if v_status not in ('OPEN','INVESTIGATING','MONITORING','RESOLVED','CLOSED') then raise exception 'invalid incident status'; end if;
  if v_severity not in ('LOW','MEDIUM','HIGH','CRITICAL') then raise exception 'invalid severity'; end if;

  if nullif(p_payload->>'id','') is not null then
    v_id := (p_payload->>'id')::uuid;
    select to_jsonb(x) into v_before from public.platform_incidents x where x.id=v_id;
    if v_before is null then raise exception 'incident not found'; end if;
    update public.platform_incidents set tenant_id=v_tenant,severity=v_severity,title=coalesce(nullif(p_payload->>'title',''),title),
      description=coalesce(p_payload->>'description',description),status=v_status,
      resolved_at=case when v_status in ('RESOLVED','CLOSED') then coalesce(resolved_at,now()) else null end,updated_at=now()
    where id=v_id;
  else
    insert into public.platform_incidents(tenant_id,severity,title,description,status,created_by)
    values(v_tenant,v_severity,coalesce(nullif(p_payload->>'title',''),'Incidente'),coalesce(p_payload->>'description',''),v_status,auth.uid())
    returning id into v_id;
  end if;
  perform private.platform_admin_log(v_tenant,'SAVE_INCIDENT','platform_incident',v_id::text,v_before,(select to_jsonb(x) from public.platform_incidents x where x.id=v_id));
  return v_id;
end;
$$;

create or replace function public.save_platform_infrastructure(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_id uuid; v_tenant uuid; v_before jsonb; v_mode text; v_status text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  v_tenant := (p_payload->>'tenant_id')::uuid;
  v_mode := upper(coalesce(p_payload->>'database_mode','SHARED'));
  v_status := upper(coalesce(p_payload->>'status','READY'));
  if v_mode not in ('SHARED','DEDICATED') then raise exception 'invalid database mode'; end if;
  if v_status not in ('PENDING','PROVISIONING','READY','ERROR','SUSPENDED') then raise exception 'invalid infrastructure status'; end if;

  select id,to_jsonb(x) into v_id,v_before from public.tenant_infrastructure x where tenant_id=v_tenant;
  if v_id is null then
    insert into public.tenant_infrastructure(tenant_id,database_mode,provider,project_ref,region,status,notes,last_health_at)
    values(v_tenant,v_mode,coalesce(nullif(p_payload->>'provider',''),'SUPABASE'),p_payload->>'project_ref',p_payload->>'region',v_status,p_payload->>'notes',
      case when v_status='READY' then now() else null end)
    returning id into v_id;
  else
    update public.tenant_infrastructure set database_mode=v_mode,provider=coalesce(nullif(p_payload->>'provider',''),provider),
      project_ref=case when p_payload ? 'project_ref' then p_payload->>'project_ref' else project_ref end,
      region=case when p_payload ? 'region' then p_payload->>'region' else region end,
      status=v_status,notes=case when p_payload ? 'notes' then p_payload->>'notes' else notes end,
      last_health_at=case when v_status='READY' then now() else last_health_at end,updated_at=now()
    where id=v_id;
  end if;
  perform private.platform_admin_log(v_tenant,'SAVE_INFRASTRUCTURE','tenant_infrastructure',v_id::text,v_before,(select to_jsonb(x) from public.tenant_infrastructure x where x.id=v_id));
  return v_id;
end;
$$;

revoke all on function public.save_platform_subscription(jsonb) from public;
revoke all on function public.update_platform_support_ticket(uuid,text,text) from public;
revoke all on function public.create_platform_communication(jsonb) from public;
revoke all on function public.save_platform_incident(jsonb) from public;
revoke all on function public.save_platform_infrastructure(jsonb) from public;

grant execute on function public.save_platform_subscription(jsonb) to authenticated;
grant execute on function public.update_platform_support_ticket(uuid,text,text) to authenticated;
grant execute on function public.create_platform_communication(jsonb) to authenticated;
grant execute on function public.save_platform_incident(jsonb) to authenticated;
grant execute on function public.save_platform_infrastructure(jsonb) to authenticated;
