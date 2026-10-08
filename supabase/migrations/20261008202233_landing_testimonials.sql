create table if not exists public.landing_testimonials (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 120),
 message text not null check(length(trim(message)) between 5 and 1500),
 photo_url text not null check(photo_url like 'https://fwjsxknbdkxzkoxvuncp.supabase.co/storage/v1/object/public/landing-media/%'),
 published boolean not null default false,
 position integer not null default 0 check(position between 0 and 999),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.landing_testimonials enable row level security;
revoke all on public.landing_testimonials from public,anon,authenticated;
grant select(id,name,message,photo_url,position,created_at) on public.landing_testimonials to anon,authenticated;
create policy published_testimonials_public_read on public.landing_testimonials for select to anon,authenticated using(published);
create index landing_testimonials_order on public.landing_testimonials(position,created_at) where published;
create or replace function public.get_landing_testimonials()
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(x order by position,created_at desc),'[]'::jsonb) from (
 select id,name,message,photo_url,position,created_at from public.landing_testimonials order by position,created_at desc limit 30
 )x;
$$;
revoke all on function public.get_landing_testimonials() from public;
grant execute on function public.get_landing_testimonials() to anon,authenticated;
create or replace function public.get_admin_landing_testimonials()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
 return coalesce((select jsonb_agg(x order by position,created_at desc) from (select * from public.landing_testimonials order by position,created_at desc limit 300)x),'[]'::jsonb);
end $$;
revoke all on function public.get_admin_landing_testimonials() from public,anon;
grant execute on function public.get_admin_landing_testimonials() to authenticated;
create or replace function public.save_landing_testimonial(p_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_row public.landing_testimonials%rowtype;
begin
 if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
 v_id:=nullif(p_payload->>'id','')::uuid;
 if v_id is null then
 insert into public.landing_testimonials(name,message,photo_url,published,position,updated_by)
 values(trim(p_payload->>'name'),trim(p_payload->>'message'),trim(p_payload->>'photo_url'),coalesce((p_payload->>'published')::boolean,false),coalesce((p_payload->>'position')::integer,0),auth.uid()) returning id into v_id;
 else
 select * into v_row from public.landing_testimonials where id=v_id for update;
 if v_row.id is null then raise exception 'Depoimento não encontrado'; end if;
 if p_payload->>'updated_at' is null or v_row.updated_at<>(p_payload->>'updated_at')::timestamptz then raise exception 'Depoimento alterado por outra sessão. Atualize a lista antes de salvar'; end if;
 update public.landing_testimonials set name=trim(p_payload->>'name'),message=trim(p_payload->>'message'),photo_url=trim(p_payload->>'photo_url'),published=coalesce((p_payload->>'published')::boolean,false),position=coalesce((p_payload->>'position')::integer,0),updated_by=auth.uid(),updated_at=now() where id=v_id;
 end if;
 return v_id;
end $$;
revoke all on function public.save_landing_testimonial(jsonb) from public,anon;
grant execute on function public.save_landing_testimonial(jsonb) to authenticated;
