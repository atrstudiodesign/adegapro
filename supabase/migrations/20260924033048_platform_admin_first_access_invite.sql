
create table if not exists public.platform_admin_invites (
  email text primary key,
  display_name text,
  active boolean not null default true,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_admin_invites enable row level security;
revoke all on table public.platform_admin_invites from anon, authenticated;

insert into public.platform_admin_invites(email,display_name,active)
values(lower('atrstudiodesign@gmail.com'),'ATR Studio',true)
on conflict(email) do update set display_name=excluded.display_name, active=true, updated_at=now();

create or replace function public.claim_platform_admin_invite()
returns boolean
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select lower(email), email_confirmed_at
    into v_email, v_confirmed
  from auth.users
  where id=v_user;

  if v_email is null or v_confirmed is null then
    raise exception 'confirmed email required';
  end if;

  if not exists(
    select 1 from public.platform_admin_invites
    where email=v_email and active=true
  ) then
    raise exception 'invite not found';
  end if;

  insert into public.platform_admins(user_id,display_name,active)
  select v_user,coalesce(display_name,v_email),true
  from public.platform_admin_invites
  where email=v_email
  on conflict(user_id) do update
    set active=true, display_name=excluded.display_name, updated_at=now();

  update public.platform_admin_invites
  set claimed_by=v_user, claimed_at=coalesce(claimed_at,now()), updated_at=now()
  where email=v_email;

  return true;
end
$$;

revoke all on function public.claim_platform_admin_invite() from public, anon;
grant execute on function public.claim_platform_admin_invite() to authenticated;
