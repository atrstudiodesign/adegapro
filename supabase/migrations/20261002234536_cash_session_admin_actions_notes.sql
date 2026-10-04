create table if not exists public.cash_session_admin_notes(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id),store_id uuid not null references public.stores(id),cash_session_id uuid not null references public.cash_sessions(id),operator_id uuid not null references public.operators(id),
 note text not null,alert_enabled boolean not null default false,created_at timestamptz not null default now());
alter table public.cash_session_admin_notes enable row level security;
alter table public.cash_sessions add column if not exists admin_record_status text not null default 'ATIVO', add column if not exists admin_amended_at timestamptz, add column if not exists admin_amended_by uuid references public.operators(id), add column if not exists admin_amendment_reason text;
do $$ begin if not exists(select 1 from pg_constraint where conname='cash_sessions_admin_record_status_chk') then alter table public.cash_sessions add constraint cash_sessions_admin_record_status_chk check(admin_record_status in('ATIVO','CANCELADO')); end if; end $$;

create or replace function public.add_cash_session_admin_note(p_store_id uuid,p_operator_token text,p_session_id uuid,p_note text,p_alert boolean default false) returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare a record; t uuid; i uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select * into a from private.assert_hr_operator(p_store_id,p_operator_token);
 select tenant_id into t from cash_sessions where id=p_session_id and store_id=p_store_id;
 if t is null then raise exception 'session not found'; end if; if length(trim(coalesce(p_note,'')))<2 then raise exception 'note required'; end if;
 insert into cash_session_admin_notes(tenant_id,store_id,cash_session_id,operator_id,note,alert_enabled) values(t,p_store_id,p_session_id,a.operator_id,trim(p_note),p_alert) returning id into i; return i;
end $$;
revoke execute on function public.add_cash_session_admin_note(uuid,text,uuid,text,boolean) from public,anon; grant execute on function public.add_cash_session_admin_note(uuid,text,uuid,text,boolean) to authenticated;

create or replace function public.admin_amend_cash_session(p_store_id uuid,p_operator_token text,p_session_id uuid,p_action text,p_notes text,p_reason text) returns void language plpgsql security definer set search_path='public','private','auth' as $$
declare a record;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if; select * into a from private.assert_hr_operator(p_store_id,p_operator_token);
 if p_action not in('ALTERAR','CANCELAR') then raise exception 'invalid action'; end if; if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason required'; end if;
 update cash_sessions set closure_notes=case when p_action='ALTERAR' then nullif(trim(coalesce(p_notes,'')),'') else closure_notes end,admin_record_status=case when p_action='CANCELAR' then 'CANCELADO' else admin_record_status end,admin_amended_at=now(),admin_amended_by=a.operator_id,admin_amendment_reason=trim(p_reason) where id=p_session_id and store_id=p_store_id;
 if not found then raise exception 'session not found'; end if;
end $$;
revoke execute on function public.admin_amend_cash_session(uuid,text,uuid,text,text,text) from public,anon; grant execute on function public.admin_amend_cash_session(uuid,text,uuid,text,text,text) to authenticated;