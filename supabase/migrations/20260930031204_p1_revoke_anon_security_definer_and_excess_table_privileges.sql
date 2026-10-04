
create temporary table if not exists keep_auth_exec(sig text) on commit drop;
insert into keep_auth_exec(sig)
select p.oid::regprocedure::text
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef=true
  and has_function_privilege('authenticated',p.oid,'EXECUTE');

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef=true
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
  end loop;

  for r in select sig from keep_auth_exec
  loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public'
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated',r.tablename);
    execute format('revoke insert, update, delete on table public.%I from anon',r.tablename);
  end loop;
end $$;
