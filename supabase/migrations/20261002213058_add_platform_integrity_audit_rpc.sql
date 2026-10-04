-- Read-only integrity audit for Adega Pro production.
-- Returns only counts; it never mutates business data.
create or replace function public.get_platform_integrity_audit()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public','private','auth'
as $function$
declare r jsonb;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'sales_without_items',(select count(*) from sales s left join sale_items i on i.sale_id=s.id where s.status='PAGA' and i.id is null),
    'sales_without_payments',(select count(*) from sales s left join sale_payments p on p.sale_id=s.id where s.status='PAGA' and p.id is null),
    'sale_item_tenant_mismatch',(select count(*) from sale_items i join sales s on s.id=i.sale_id where i.tenant_id<>s.tenant_id),
    'payment_tenant_mismatch',(select count(*) from sale_payments p join sales s on s.id=p.sale_id where p.tenant_id<>s.tenant_id),
    'stock_tenant_mismatch',(select count(*) from stock_balances b join stores st on st.id=b.store_id where b.tenant_id<>st.tenant_id),
    'negative_stock',(select count(*) from stock_balances where quantity<0),
    'cash_tenant_mismatch',(select count(*) from cash_sessions c join stores st on st.id=c.store_id where c.tenant_id<>st.tenant_id),
    'cash_operator_mismatch',(select count(*) from cash_sessions c join operators o on o.id=c.operator_ref where o.tenant_id<>c.tenant_id or o.store_id<>c.store_id),
    'duplicate_open_registers',(select count(*) from (select cash_register_id from cash_sessions where status='ABERTO' group by cash_register_id having count(*)>1) x),
    'orphan_combo_products',(select count(*) from products p left join combos c on c.product_id=p.id where p.is_combo=true and c.id is null),
    'active_combos_without_items',(select count(*) from combos c where c.active=true and not exists(select 1 from combo_items ci where ci.combo_id=c.id)),
    'checked_at',now()
  ) into r;
  return r;
end
$function$;

revoke execute on function public.get_platform_integrity_audit() from public,anon;
grant execute on function public.get_platform_integrity_audit() to authenticated;
