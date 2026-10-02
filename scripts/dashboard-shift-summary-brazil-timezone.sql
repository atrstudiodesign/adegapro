-- Adega Pro: align shift/day dashboard with America/Sao_Paulo business day.
-- Safe read-only reporting function change; does not close or mutate cash sessions.

CREATE OR REPLACE FUNCTION public.get_store_shift_summary(p_store_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth'
AS $function$
declare v_tenant uuid; v_result jsonb; v_today date := (now() at time zone 'America/Sao_Paulo')::date; v_start timestamptz; v_end timestamptz;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
 if v_tenant is null then raise exception 'store not found'; end if;
 v_start := (v_today::timestamp at time zone 'America/Sao_Paulo');
 v_end := ((v_today+1)::timestamp at time zone 'America/Sao_Paulo');
 select jsonb_build_object(
  'day_revenue',coalesce((select sum(total) from public.sales where tenant_id=v_tenant and store_id=p_store_id and status='PAGA' and created_at>=v_start and created_at<v_end),0),
  'day_count',coalesce((select count(*) from public.sales where tenant_id=v_tenant and store_id=p_store_id and status='PAGA' and created_at>=v_start and created_at<v_end),0),
  'shifts',coalesce((select jsonb_agg(jsonb_build_object(
    'id',cs.id,'opened_at',cs.opened_at,'closed_at',cs.closed_at,'status',cs.status,
    'operator_ref',cs.operator_ref,'operator_name',coalesce(o.name,'Operador'),
    'revenue',coalesce(x.revenue,0),'sales_count',coalesce(x.cnt,0),
    'initial_balance',coalesce(cs.initial_balance,0),'total_supplies',coalesce(cs.total_supplies,0),
    'total_withdrawals',coalesce(cs.total_withdrawals,0),'expected_cash',coalesce(cs.expected_cash,0),
    'counted_cash',cs.counted_cash,'cash_difference',cs.cash_difference
  ) order by cs.opened_at desc)
   from public.cash_sessions cs left join public.operators o on o.id=cs.operator_ref
   left join lateral (
     select sum(s.total) revenue,count(*) cnt from public.sales s
     where s.tenant_id=v_tenant and s.store_id=p_store_id and s.cash_session_id=cs.id and s.status='PAGA'
       and s.created_at>=v_start and s.created_at<v_end
   ) x on true
   where cs.tenant_id=v_tenant and cs.store_id=p_store_id
     and cs.opened_at<v_end and coalesce(cs.closed_at,now())>=v_start), '[]'::jsonb)
 ) into v_result;
 return v_result;
end $function$

