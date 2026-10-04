
create or replace function private.enforce_sale_operator_permission()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
begin
  if new.operator_ref is null then
    raise exception 'sale requires internal operator';
  end if;
  if not private.operator_can(new.operator_ref,'sales.create') then
    raise exception 'operator cannot create sales';
  end if;
  return new;
end $$;

drop trigger if exists trg_sales_operator_permission on public.sales;
create trigger trg_sales_operator_permission
before insert on public.sales
for each row execute function private.enforce_sale_operator_permission();

revoke all on function private.enforce_sale_operator_permission() from public,anon,authenticated;
