
alter table public.sales add column if not exists channel text not null default 'PDV';
do $$ begin
  alter table public.sales add constraint sales_channel_check check (channel in ('PDV','IFOOD','ONLINE','OTHER'));
exception when duplicate_object then null;
end $$;

create or replace function public.get_store_dashboard_analytics(p_store_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.user_store_access
    where user_id=v_user and store_id=p_store_id and active=true
  ) then raise exception 'store access denied'; end if;

  select jsonb_build_object(
    'today', jsonb_build_object(
      'count', count(*) filter (where s.status='PAGA' and s.created_at::date=current_date),
      'revenue', coalesce(sum(s.total) filter (where s.status='PAGA' and s.created_at::date=current_date),0),
      'ticket', coalesce(avg(s.total) filter (where s.status='PAGA' and s.created_at::date=current_date),0)
    ),
    'last7', (
      select coalesce(jsonb_agg(jsonb_build_object('date',g.d::date,'revenue',coalesce(x.revenue,0),'count',coalesce(x.cnt,0)) order by g.d), '[]'::jsonb)
      from generate_series(current_date-6,current_date,'1 day') as g(d)
      left join (
        select created_at::date as sales_day, sum(total) as revenue, count(*) as cnt
        from public.sales
        where store_id=p_store_id and status='PAGA' and created_at>=current_date-6
        group by created_at::date
      ) x on x.sales_day=g.d::date
    ),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object('channel',channel,'amount',amount,'count',cnt) order by amount desc),'[]'::jsonb)
      from (
        select channel, sum(total) amount, count(*) cnt
        from public.sales
        where store_id=p_store_id and status='PAGA' and created_at>=current_date-30
        group by channel
      ) q
    ),
    'payments', (
      select coalesce(jsonb_agg(jsonb_build_object('method',method,'amount',amount,'count',cnt) order by amount desc),'[]'::jsonb)
      from (
        select sp.method, sum(sp.amount) amount, count(*) cnt
        from public.sale_payments sp
        join public.sales ss on ss.id=sp.sale_id
        where ss.store_id=p_store_id and ss.status='PAGA' and sp.status='CONFIRMADO' and ss.created_at>=current_date-30
        group by sp.method
      ) q
    ),
    'top_products', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id',product_id,'name',product_name,'quantity',qty,'revenue',revenue) order by qty desc),'[]'::jsonb)
      from (
        select si.product_id, max(si.product_name) product_name, sum(si.quantity) qty, sum(si.subtotal) revenue
        from public.sale_items si
        join public.sales ss on ss.id=si.sale_id
        where ss.store_id=p_store_id and ss.status='PAGA' and ss.created_at>=current_date-30
        group by si.product_id
        order by qty desc
        limit 6
      ) q
    ),
    'payables', (
      select jsonb_build_object(
        'pending',coalesce(sum(amount) filter(where status in ('PENDENTE','ATRASADO')),0),
        'overdue',coalesce(sum(amount) filter(where status='ATRASADO' or (status='PENDENTE' and due_date<current_date)),0)
      ) from public.accounts_payable where store_id=p_store_id
    ),
    'receivables', (
      select jsonb_build_object(
        'pending',coalesce(sum(amount) filter(where status in ('PENDENTE','ATRASADO')),0),
        'overdue',coalesce(sum(amount) filter(where status='ATRASADO' or (status='PENDENTE' and due_date<current_date)),0)
      ) from public.accounts_receivable where store_id=p_store_id
    )
  ) into v_result
  from public.sales s
  where s.store_id=p_store_id;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

grant execute on function public.get_store_dashboard_analytics(uuid) to authenticated;
