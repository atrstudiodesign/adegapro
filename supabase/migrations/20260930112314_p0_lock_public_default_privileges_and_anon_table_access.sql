
-- Remove privilégios perigosos herdados em tabelas existentes.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname='public'
  loop
    execute format('revoke truncate, references, trigger on table %I.%I from anon, authenticated',r.schemaname,r.tablename);
  end loop;
end $$;

-- Anônimo não precisa consultar tabelas internas. Mantém somente documentos legais públicos.
do $$
declare r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname='public'
      and tablename <> 'legal_documents'
  loop
    execute format('revoke select, insert, update, delete on table public.%I from anon',r.tablename);
  end loop;
end $$;

grant select on public.legal_documents to anon;

-- Fecha a causa raiz: objetos futuros não recebem acesso amplo automaticamente.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
