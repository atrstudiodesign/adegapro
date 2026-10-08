create or replace function public.get_partner_receipt_ledger()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare seller_id uuid; admin boolean;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 admin:=private.is_super_admin();
 if not admin then
 select id into seller_id from public.platform_sales_partners where auth_user_id=auth.uid() and active;
 if seller_id is null then raise exception 'seller access not linked'; end if;
 end if;
 return coalesce((select jsonb_agg(x order by x.created_at desc) from (
 select r.id,r.referral_id,r.partner_id,r.plan,r.amount,r.period,r.paid_at,r.created_at,
 c.id as commission_id,c.amount_due,c.status as commission_status,
 (select sum(t.amount) from public.platform_partner_receipts t where t.earning_key=r.earning_key) as received_total
 from public.platform_partner_receipts r left join public.platform_partner_commissions c on c.earning_key=r.earning_key
 where admin or r.partner_id=seller_id order by r.created_at desc limit 1000
 )x),'[]'::jsonb);
end $$;
revoke all on function public.get_partner_receipt_ledger() from public,anon;
grant execute on function public.get_partner_receipt_ledger() to authenticated;
