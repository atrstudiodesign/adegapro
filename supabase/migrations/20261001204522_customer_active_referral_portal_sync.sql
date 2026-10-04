create or replace function public.get_my_customer_referral_snapshot()
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare v_user uuid:=auth.uid(); v_tenant uuid; v_active boolean; v_account jsonb; v_refs jsonb;
begin
 if v_user is null then raise exception 'authentication required'; end if;
 select tm.tenant_id,t.active into v_tenant,v_active from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id where tm.user_id=v_user and tm.active=true order by tm.created_at limit 1;
 if v_tenant is null or not v_active then raise exception 'active customer required'; end if;
 select to_jsonb(a) into v_account from public.customer_loyalty_accounts a where a.tenant_id=v_tenant;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into v_refs from public.customer_referrals r where r.tenant_id=v_tenant;
 return jsonb_build_object('tenant_id',v_tenant,'account',coalesce(v_account,'{}'::jsonb),'referrals',v_refs);
end $$;

create or replace function public.create_my_customer_referral(p_lead_name text,p_lead_phone text,p_lead_email text default null)
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_user uuid:=auth.uid(); v_tenant uuid; v_active boolean; v_id uuid; v_phone text:=regexp_replace(coalesce(p_lead_phone,''),'[^0-9]','','g');
begin
 if v_user is null then raise exception 'authentication required'; end if;
 select tm.tenant_id,t.active into v_tenant,v_active from public.tenant_memberships tm join public.tenants t on t.id=tm.tenant_id where tm.user_id=v_user and tm.active=true order by tm.created_at limit 1;
 if v_tenant is null or not v_active then raise exception 'active customer required'; end if;
 if length(trim(coalesce(p_lead_name,'')))<2 or length(v_phone)<10 then raise exception 'name and valid phone required'; end if;
 if exists(select 1 from public.customer_referrals where tenant_id=v_tenant and regexp_replace(lead_phone,'[^0-9]','','g')=v_phone and status not in ('CANCELLED','INELIGIBLE')) then raise exception 'referral already registered'; end if;
 insert into public.customer_referrals(tenant_id,lead_name,lead_phone,lead_email,status,benefit_type)
 values(v_tenant,trim(p_lead_name),v_phone,nullif(lower(trim(coalesce(p_lead_email,''))),''),'PENDING','CASHBACK') returning id into v_id;
 insert into public.customer_loyalty_accounts(tenant_id) values(v_tenant) on conflict(tenant_id) do nothing;
 return v_id;
end $$;
revoke all on function public.get_my_customer_referral_snapshot() from public,anon;
revoke all on function public.create_my_customer_referral(text,text,text) from public,anon;
grant execute on function public.get_my_customer_referral_snapshot() to authenticated;
grant execute on function public.create_my_customer_referral(text,text,text) to authenticated;