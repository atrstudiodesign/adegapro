alter table public.cash_integrity_alerts add column if not exists resolved_by_operator_id uuid references public.operators(id);
create or replace function public.resolve_cash_integrity_alert_secure(p_store_id uuid,p_alert_id uuid,p_operator_token text,p_resolution_notes text) returns jsonb language plpgsql security definer set search_path='public','private','auth','pg_temp' as $$
declare op uuid; a public.cash_integrity_alerts%rowtype;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 if length(trim(coalesce(p_resolution_notes,'')))<5 then raise exception 'Informe uma justificativa para resolver o alerta'; end if;
 select * into a from public.cash_integrity_alerts where id=p_alert_id and store_id=p_store_id for update;
 if not found then raise exception 'Alerta não encontrado nesta loja'; end if;
 if a.resolved_at is not null then raise exception 'Alerta já resolvido'; end if;
 update public.cash_integrity_alerts set resolved_at=now(),resolution_notes=trim(p_resolution_notes),resolved_by_operator_id=op where id=p_alert_id returning * into a;
 return jsonb_build_object('id',a.id,'cash_session_id',a.cash_session_id,'resolved_at',a.resolved_at,'resolution_notes',a.resolution_notes,'resolved_by_operator_id',a.resolved_by_operator_id);
end $$;
revoke all on function public.resolve_cash_integrity_alert_secure(uuid,uuid,text,text) from public,anon;
grant execute on function public.resolve_cash_integrity_alert_secure(uuid,uuid,text,text) to authenticated;
create or replace function public.get_cash_integrity_alerts_secure(p_store_id uuid,p_operator_token text,p_limit integer default 100) returns jsonb language plpgsql stable security definer set search_path='public','private','auth' as $$
declare op uuid; r jsonb;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.detected_at desc),'[]'::jsonb) into r from (select a.id,a.cash_session_id,a.severity,a.code,a.message,a.details,a.detected_at,a.resolved_at,a.resolution_notes,a.resolved_by_operator_id,o.name resolved_by_operator_name from public.cash_integrity_alerts a left join public.operators o on o.id=a.resolved_by_operator_id and o.store_id=a.store_id where a.store_id=p_store_id order by a.detected_at desc limit greatest(1,least(coalesce(p_limit,100),500))) x; return r;
end $$;
revoke all on function public.get_cash_integrity_alerts_secure(uuid,text,integer) from public,anon;
grant execute on function public.get_cash_integrity_alerts_secure(uuid,text,integer) to authenticated;