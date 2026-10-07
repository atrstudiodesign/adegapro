-- P3: immutable financial anomaly ledger for future cash closings. No historical financial rows are modified.
create table if not exists public.cash_integrity_alerts (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), store_id uuid not null references public.stores(id), cash_session_id uuid not null references public.cash_sessions(id),
 severity text not null check (severity in ('INFO','ATENCAO','CRITICO')), code text not null, message text not null, details jsonb not null default '{}'::jsonb,
 detected_at timestamptz not null default now(), resolved_at timestamptz, resolution_notes text, unique(cash_session_id,code));
alter table public.cash_integrity_alerts enable row level security;
revoke all on public.cash_integrity_alerts from anon, authenticated;
create index if not exists cash_integrity_alerts_store_detected_idx on public.cash_integrity_alerts(store_id,detected_at desc);
create index if not exists cash_integrity_alerts_unresolved_idx on public.cash_integrity_alerts(tenant_id,store_id,detected_at desc) where resolved_at is null;
create or replace function private.detect_cash_session_anomalies() returns trigger language plpgsql security definer set search_path='public','private','pg_temp' as $$
declare v_sales numeric; v_receipts numeric; v_recon numeric;
begin
 if new.status<>'FECHADO' or (old.status='FECHADO' and new.status='FECHADO') then return new; end if;
 select coalesce(sum(total),0) into v_sales from public.sales where cash_session_id=new.id and tenant_id=new.tenant_id and store_id=new.store_id and status='PAGA';
 v_receipts:=round(coalesce(new.closing_report_pix,0)+coalesce(new.closing_report_debit,0)+coalesce(new.closing_report_credit,0)+coalesce(new.closing_report_cash,0),2); v_recon:=round(v_receipts-v_sales,2);
 if abs(v_recon)>.01 then insert into public.cash_integrity_alerts(tenant_id,store_id,cash_session_id,severity,code,message,details) values(new.tenant_id,new.store_id,new.id,'CRITICO','CLOSING_RECONCILIATION_MISMATCH','Fechamento concluído com recebimentos diferentes das vendas',jsonb_build_object('sales',v_sales,'receipts',v_receipts,'difference',v_recon)) on conflict(cash_session_id,code) do update set severity=excluded.severity,message=excluded.message,details=excluded.details,detected_at=now(),resolved_at=null,resolution_notes=null; end if;
 if abs(coalesce(new.cash_difference,0))>.01 then insert into public.cash_integrity_alerts(tenant_id,store_id,cash_session_id,severity,code,message,details) values(new.tenant_id,new.store_id,new.id,'ATENCAO','PHYSICAL_CASH_DIFFERENCE','Fechamento com diferença na contagem física',jsonb_build_object('expected_physical_cash',new.expected_cash,'counted_cash',new.counted_cash,'difference',new.cash_difference)) on conflict(cash_session_id,code) do update set severity=excluded.severity,message=excluded.message,details=excluded.details,detected_at=now(),resolved_at=null,resolution_notes=null; end if;
 return new;
end $$;
revoke all on function private.detect_cash_session_anomalies() from public,anon,authenticated;
drop trigger if exists trg_detect_cash_session_anomalies on public.cash_sessions;
create trigger trg_detect_cash_session_anomalies after update of status on public.cash_sessions for each row when (new.status='FECHADO') execute function private.detect_cash_session_anomalies();
create or replace function public.get_cash_integrity_alerts_secure(p_store_id uuid,p_operator_token text,p_limit integer default 100) returns jsonb language plpgsql stable security definer set search_path='public','private','auth' as $$
declare op uuid; r jsonb;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 op:=private.require_operator_session(p_store_id,p_operator_token);
 if not exists(select 1 from public.operators where id=op and store_id=p_store_id and active=true and role in('ADMINISTRADOR','GERENTE')) then raise exception 'Permissão administrativa necessária'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.detected_at desc),'[]'::jsonb) into r from (select id,cash_session_id,severity,code,message,details,detected_at,resolved_at,resolution_notes from public.cash_integrity_alerts where store_id=p_store_id order by detected_at desc limit greatest(1,least(coalesce(p_limit,100),500))) x;
 return r;
end $$;
revoke all on function public.get_cash_integrity_alerts_secure(uuid,text,integer) from public,anon;
grant execute on function public.get_cash_integrity_alerts_secure(uuid,text,integer) to authenticated;