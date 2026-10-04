
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists platform_admin_self_read on public.platform_admins;
create policy platform_admin_self_read
on public.platform_admins for select to authenticated
using (user_id = auth.uid());

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    exists(
      select 1 from public.platform_admins pa
      where pa.user_id = auth.uid() and pa.active = true
    )
    or
    exists(
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.is_super_admin = true
        and coalesce(p.active,true) = true
    ),
    false
  );
$$;

revoke all on table public.platform_admins from anon;
grant select on table public.platform_admins to authenticated;
