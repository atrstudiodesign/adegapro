
do $$
declare r record; cname text;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema='public' and column_name in ('tenant_id','store_id')
    group by table_name
    having count(distinct column_name)=2
  loop
    if r.table_name='user_store_access' then continue; end if;
    cname := r.table_name || '_tenant_store_fk';
    if not exists (
      select 1 from pg_constraint pc
      join pg_class c on c.oid=pc.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=r.table_name and pc.conname=cname
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key(tenant_id,store_id) references public.stores(tenant_id,id) on update restrict on delete restrict not valid',
        r.table_name,cname
      );
      execute format('alter table public.%I validate constraint %I',r.table_name,cname);
    end if;
  end loop;
end $$;
