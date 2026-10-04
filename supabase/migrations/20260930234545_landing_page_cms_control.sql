create table if not exists public.landing_page_content (
  id text primary key default 'adega-pro',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);
alter table public.landing_page_content enable row level security;
insert into public.landing_page_content(id,content) values ('adega-pro','{}'::jsonb) on conflict(id) do nothing;

create or replace function public.get_landing_page_content()
returns jsonb language sql security definer set search_path=public as $$
  select coalesce((select content from public.landing_page_content where id='adega-pro'),'{}'::jsonb)
$$;
grant execute on function public.get_landing_page_content() to anon, authenticated;

create or replace function public.save_landing_page_content(p_content jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  insert into public.landing_page_content(id,content,updated_at,updated_by)
  values('adega-pro',coalesce(p_content,'{}'::jsonb),now(),auth.uid())
  on conflict(id) do update set content=excluded.content,updated_at=now(),updated_by=auth.uid();
end $$;
grant execute on function public.save_landing_page_content(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('landing-media','landing-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "landing media admin insert" on storage.objects;
drop policy if exists "landing media admin update" on storage.objects;
drop policy if exists "landing media admin delete" on storage.objects;
create policy "landing media admin insert" on storage.objects for insert to authenticated with check(bucket_id='landing-media' and public.is_platform_admin());
create policy "landing media admin update" on storage.objects for update to authenticated using(bucket_id='landing-media' and public.is_platform_admin()) with check(bucket_id='landing-media' and public.is_platform_admin());
create policy "landing media admin delete" on storage.objects for delete to authenticated using(bucket_id='landing-media' and public.is_platform_admin());