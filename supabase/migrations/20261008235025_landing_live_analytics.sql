alter table public.landing_visits add column if not exists city text;
alter table public.landing_visits add column if not exists region text;
create table public.landing_presence (
 visitor_key text primary key check (char_length(visitor_key) between 8 and 128),
 request_path text not null, city text, region text, country text, device_type text,
 last_seen timestamptz not null default now()
);
alter table public.landing_presence enable row level security;
revoke all on public.landing_presence from public, anon, authenticated;
grant select, insert, update on public.landing_presence to service_role;
create index landing_presence_last_seen_idx on public.landing_presence(last_seen desc);

create function public.record_landing_activity_service(p_visitor text, p_path text, p_city text, p_region text, p_country text, p_device text, p_referrer text, p_pageview boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 if p_path not in ('/','/inicio','/recursos','/produtos','/integracoes','/planos','/promocao') or char_length(p_visitor) not between 8 and 128 then raise exception 'Invalid public visit'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visitor,0));
 if exists(select 1 from public.landing_presence where visitor_key=p_visitor and request_path=p_path and last_seen>now()-interval '20 seconds') and not p_pageview then return; end if;
 insert into public.landing_presence(visitor_key,request_path,city,region,country,device_type,last_seen)
 values(p_visitor,p_path,left(p_city,120),left(p_region,32),left(p_country,8),p_device,now())
 on conflict(visitor_key) do update set request_path=excluded.request_path,city=excluded.city,region=excluded.region,country=excluded.country,device_type=excluded.device_type,last_seen=excluded.last_seen;
 if p_pageview and not exists(select 1 from public.landing_visits where visitor_key=p_visitor and request_path=p_path and created_at>now()-interval '30 minutes') then
 insert into public.landing_visits(visitor_key,request_path,city,region,country,device_type,referrer_hostname)
 values(p_visitor,p_path,left(p_city,120),left(p_region,32),left(p_country,8),p_device,left(p_referrer,255));
 end if;
end $$;
revoke all on function public.record_landing_activity_service(text,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.record_landing_activity_service(text,text,text,text,text,text,text,boolean) to service_role;

create function public.get_landing_live_analytics_service(p_days integer default 30)
returns jsonb language sql security invoker set search_path = '' as $$
with visits as (
 select * from public.landing_visits where created_at >= now()-make_interval(days=>least(90,greatest(1,coalesce(p_days,30))))
), active as (
 select * from public.landing_presence where last_seen >= now()-interval '90 seconds'
), dates as (
 select generate_series((now() at time zone 'America/Sao_Paulo')::date-(least(90,greatest(1,coalesce(p_days,30)))-1),(now() at time zone 'America/Sao_Paulo')::date,interval '1 day')::date as day
), daily as (
 select (created_at at time zone 'America/Sao_Paulo')::date as day,count(*) as pageviews,count(distinct visitor_key) as visitors from visits group by 1
)
select jsonb_build_object(
 'generatedAt',now(),'onlineWindowSeconds',90,'online', (select count(*) from active),
 'today',(select jsonb_build_object('visitors',count(distinct visitor_key),'pageviews',count(*)) from visits where (created_at at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date),
 'cities',coalesce((select jsonb_agg(x order by (x->>'visitors')::int desc) from (select jsonb_build_object('name',coalesce(nullif(city,''),'Não identificada'),'region',region,'country',country,'visitors',count(distinct visitor_key),'pageviews',count(*)) x from visits group by city,region,country order by count(distinct visitor_key) desc limit 20) q),'[]'::jsonb),
 'onlineCities',coalesce((select jsonb_agg(x order by (x->>'visitors')::int desc) from (select jsonb_build_object('name',coalesce(nullif(city,''),'Não identificada'),'region',region,'country',country,'visitors',count(*)) x from active group by city,region,country order by count(*) desc limit 20) q),'[]'::jsonb),
 'onlinePaths',coalesce((select jsonb_agg(x order by (x->>'visitors')::int desc) from (select jsonb_build_object('name',request_path,'visitors',count(*)) x from active group by request_path order by count(*) desc) q),'[]'::jsonb),
 'timeline',(select jsonb_agg(jsonb_build_object('day',dates.day,'visitors',coalesce(daily.visitors,0),'pageviews',coalesce(daily.pageviews,0)) order by dates.day) from dates left join daily using(day))
);
$$;
revoke all on function public.get_landing_live_analytics_service(integer) from public,anon,authenticated;
grant execute on function public.get_landing_live_analytics_service(integer) to service_role;
