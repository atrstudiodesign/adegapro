
alter table public.auth_rate_limit_events
  add column if not exists ip_hash text;

create index if not exists idx_auth_rate_limit_ip
  on public.auth_rate_limit_events(action, ip_hash, created_at desc);

revoke all on function public.check_auth_rate_limit(text,text,text) from anon, authenticated, public;

create or replace function public.check_auth_rate_limit_internal(
  p_action text,
  p_identifier text,
  p_user_agent text default null,
  p_ip text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_action text := lower(trim(p_action));
  v_identifier_hash text;
  v_user_agent_hash text;
  v_ip_hash text;
  v_window interval;
  v_identifier_limit integer;
  v_ip_limit integer;
  v_identifier_count integer;
  v_ip_count integer;
  v_identifier_oldest timestamptz;
  v_ip_oldest timestamptz;
  v_retry integer := 0;
begin
  if v_action not in ('login','signup','recovery') then
    raise exception 'invalid action';
  end if;

  if p_identifier is null or length(trim(p_identifier)) < 3 then
    raise exception 'invalid identifier';
  end if;

  v_identifier_hash := encode(digest(lower(trim(p_identifier)), 'sha256'), 'hex');
  v_user_agent_hash := case when p_user_agent is null then null else encode(digest(p_user_agent, 'sha256'), 'hex') end;
  v_ip_hash := case when p_ip is null or trim(p_ip) = '' then null else encode(digest(trim(p_ip), 'sha256'), 'hex') end;

  if v_action = 'login' then
    v_window := interval '15 minutes';
    v_identifier_limit := 8;
    v_ip_limit := 25;
  elsif v_action = 'signup' then
    v_window := interval '60 minutes';
    v_identifier_limit := 3;
    v_ip_limit := 10;
  else
    v_window := interval '60 minutes';
    v_identifier_limit := 3;
    v_ip_limit := 10;
  end if;

  select count(*), min(created_at)
    into v_identifier_count, v_identifier_oldest
  from public.auth_rate_limit_events
  where action = v_action
    and identifier_hash = v_identifier_hash
    and created_at >= now() - v_window;

  if v_ip_hash is not null then
    select count(*), min(created_at)
      into v_ip_count, v_ip_oldest
    from public.auth_rate_limit_events
    where action = v_action
      and ip_hash = v_ip_hash
      and created_at >= now() - v_window;
  else
    v_ip_count := 0;
  end if;

  if v_identifier_count >= v_identifier_limit then
    v_retry := greatest(v_retry, greatest(1, ceil(extract(epoch from ((v_identifier_oldest + v_window) - now())))::integer));
  end if;

  if v_ip_hash is not null and v_ip_count >= v_ip_limit then
    v_retry := greatest(v_retry, greatest(1, ceil(extract(epoch from ((v_ip_oldest + v_window) - now())))::integer));
  end if;

  if v_retry > 0 then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', v_retry,
      'identifier_limit', v_identifier_limit,
      'ip_limit', v_ip_limit
    );
  end if;

  insert into public.auth_rate_limit_events(action, identifier_hash, user_agent_hash, ip_hash)
  values(v_action, v_identifier_hash, v_user_agent_hash, v_ip_hash);

  delete from public.auth_rate_limit_events
  where created_at < now() - interval '7 days';

  return jsonb_build_object(
    'allowed', true,
    'retry_after_seconds', 0,
    'remaining', greatest(0, v_identifier_limit - v_identifier_count - 1)
  );
end
$$;

revoke all on function public.check_auth_rate_limit_internal(text,text,text,text) from public, anon, authenticated;
grant execute on function public.check_auth_rate_limit_internal(text,text,text,text) to service_role;
