create or replace function public.record_operator_attendance_v2(p_store_id uuid,p_operator_id uuid,p_event_type text,p_notes text default null,p_access_origin text default 'NAO_INFORMADO')
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_tenant uuid; v_name text; v_id uuid; v_actor uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 if p_event_type not in ('ENTRADA_PIN','SAIDA_TURNO','FALTA') then raise exception 'invalid attendance event'; end if;
 if p_access_origin not in ('NA_LOJA','EXTERNO','NAO_INFORMADO') then raise exception 'invalid access origin'; end if;
 select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
 select name into v_name from public.operators where id=p_operator_id and tenant_id=v_tenant and store_id=p_store_id and active=true;
 if v_name is null then raise exception 'operator not found'; end if;
 -- FALTA é ação administrativa. Entrada/saída só podem ser lançadas pelo próprio operador autenticado por sessão.
 if p_event_type='FALTA' then
   if not exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.tenant_id=v_tenant and p.active and (p.role='ADMINISTRADOR' or p.permissions?'*' or p.permissions?'hr.manage')) then raise exception 'admin permission required'; end if;
 else
   select os.operator_id into v_actor from public.operator_sessions os where os.store_id=p_store_id and os.operator_id=p_operator_id and os.user_id=auth.uid() and os.revoked_at is null and os.expires_at>now() order by os.created_at desc limit 1;
   if v_actor is null then raise exception 'operator session required'; end if;
 end if;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes,access_origin)
 values(v_tenant,p_store_id,p_operator_id,v_name,p_event_type,nullif(trim(coalesce(p_notes,'')),''),p_access_origin) returning id into v_id;
 return v_id;
end $$;

create or replace function public.get_sale_details(p_sale_id uuid) returns jsonb language plpgsql stable security definer set search_path='public','private','auth' as $$
declare v_sale public.sales%rowtype; v_result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_sale from public.sales where id=p_sale_id;
 if v_sale.id is null or not private.has_store_access(v_sale.store_id) or not private.has_feature(v_sale.tenant_id,'sales','VIEW') then raise exception 'sale not found'; end if;
 select jsonb_build_object('sale',to_jsonb(v_sale),'items',coalesce((select jsonb_agg(to_jsonb(si) order by si.id) from public.sale_items si where si.sale_id=v_sale.id),'[]'::jsonb),'payments',coalesce((select jsonb_agg(to_jsonb(sp) order by sp.created_at) from public.sale_payments sp where sp.sale_id=v_sale.id),'[]'::jsonb),'customer',(select to_jsonb(c) from public.customers c where c.id=v_sale.customer_id),'operator',(select jsonb_build_object('id',o.id,'name',o.name,'role',o.role) from public.operators o where o.id=v_sale.operator_ref),'batch_consumptions',coalesce((select jsonb_agg(jsonb_build_object('product_id',bc.product_id,'batch_id',bc.batch_id,'quantity',bc.quantity,'lot_number',b.lot_number,'expiry_date',b.expiry_date) order by bc.created_at) from public.stock_batch_consumptions bc join public.product_batches b on b.id=bc.batch_id where bc.sale_id=v_sale.id),'[]'::jsonb)) into v_result;
 return v_result;
end $$;

create or replace function public.get_purchase_details(p_purchase_id uuid) returns jsonb language plpgsql stable security definer set search_path='public','private','auth' as $$
declare v_purchase public.purchases%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_purchase from public.purchases where id=p_purchase_id;
 if v_purchase.id is null or not private.has_store_access(v_purchase.store_id) or not private.has_feature(v_purchase.tenant_id,'purchases','VIEW') then raise exception 'purchase not found'; end if;
 return jsonb_build_object('purchase',to_jsonb(v_purchase),'items',coalesce((select jsonb_agg(to_jsonb(pi) order by pi.id) from public.purchase_items pi where pi.purchase_id=v_purchase.id),'[]'::jsonb),'supplier',(select to_jsonb(s) from public.suppliers s where s.id=v_purchase.supplier_id));
end $$;

revoke execute on function public.record_operator_attendance_v2(uuid,uuid,text,text,text) from public,anon;
revoke execute on function public.get_sale_details(uuid) from public,anon;
revoke execute on function public.get_purchase_details(uuid) from public,anon;
grant execute on function public.record_operator_attendance_v2(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.get_sale_details(uuid) to authenticated;
grant execute on function public.get_purchase_details(uuid) to authenticated;