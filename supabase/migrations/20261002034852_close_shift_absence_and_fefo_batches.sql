create or replace function public.close_cash_session_secure(p_cash_session_id uuid,p_operator_token text,p_counted_cash numeric,p_notes text default null)
returns jsonb language plpgsql security definer set search_path='public','private','auth' as $$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_expected numeric; v_difference numeric; v_name text;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
 if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
 v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
 if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
 if not private.operator_can(v_operator,'cash.close') then raise exception 'operator cannot close cash'; end if;
 if not private.has_feature(v_session.tenant_id,'cash.close','USE') then raise exception 'account cannot close cash'; end if;
 if coalesce(p_counted_cash,0)<0 then raise exception 'invalid counted cash'; end if;
 v_expected:=round(v_session.initial_balance+v_session.total_cash_sales-v_session.total_withdrawals+v_session.total_supplies,2);
 v_difference:=round(p_counted_cash-v_expected,2);
 update public.cash_sessions set expected_cash=v_expected,counted_cash=p_counted_cash,cash_difference=v_difference,closure_notes=nullif(trim(coalesce(p_notes,'')),''),status='FECHADO',closed_at=now() where id=p_cash_session_id;
 update public.cash_registers set status='FECHADO' where id=v_session.cash_register_id;
 select name into v_name from public.operators where id=v_operator;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes)
 values(v_session.tenant_id,v_session.store_id,v_operator,coalesce(v_name,'Operador'),'SAIDA_TURNO',nullif(trim(coalesce(p_notes,'Fechamento de caixa/turno')),''));
 return jsonb_build_object('session_id',p_cash_session_id,'expected_cash',v_expected,'counted_cash',p_counted_cash,'difference',v_difference);
end $$;

create or replace function public.register_hr_absence_secure(p_store_id uuid,p_operator_token text,p_absent_operator_id uuid,p_event_at timestamptz,p_notes text)
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_admin record; v_tenant uuid; v_name text; v_id uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select * into v_admin from private.assert_hr_operator(p_store_id,p_operator_token);
 if v_admin.operator_id is null then raise exception 'admin or manager required'; end if;
 if nullif(trim(coalesce(p_notes,'')),'') is null then raise exception 'absence notes required'; end if;
 select tenant_id,name into v_tenant,v_name from public.operators where id=p_absent_operator_id and store_id=p_store_id and active=true;
 if v_name is null then raise exception 'operator not found'; end if;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,event_at,notes)
 values(v_tenant,p_store_id,p_absent_operator_id,v_name,'FALTA',coalesce(p_event_at,now()),trim(p_notes)) returning id into v_id;
 return v_id;
end $$;
grant execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) to authenticated;

create or replace function public.consume_product_batches_fefo()
returns trigger language plpgsql security definer set search_path='public' as $$
declare v_needed numeric:=new.quantity; v_total numeric; v_valid numeric; b record; v_take numeric; v_sale uuid;
begin
 if new.movement_type<>'VENDA' or new.quantity<=0 then return new; end if;
 select coalesce(sum(quantity_remaining),0),coalesce(sum(quantity_remaining) filter(where expiry_date is null or expiry_date>=current_date),0)
 into v_total,v_valid from public.product_batches where tenant_id=new.tenant_id and store_id=new.store_id and product_id=new.product_id and quantity_remaining>0;
 if v_total<=0 then return new; end if;
 if v_valid<v_needed then raise exception 'Venda bloqueada: estoque por lote insuficiente ou vencido para o produto %',new.product_id; end if;
 begin v_sale:=nullif(split_part(coalesce(new.document_ref,''),':',2),'')::uuid; exception when others then v_sale:=null; end;
 for b in select id,quantity_remaining from public.product_batches where tenant_id=new.tenant_id and store_id=new.store_id and product_id=new.product_id and quantity_remaining>0 and (expiry_date is null or expiry_date>=current_date) order by expiry_date asc nulls last,received_at asc,id for update
 loop
   exit when v_needed<=0;
   v_take:=least(v_needed,b.quantity_remaining);
   update public.product_batches set quantity_remaining=quantity_remaining-v_take where id=b.id;
   insert into public.stock_batch_consumptions(tenant_id,store_id,product_id,batch_id,sale_id,stock_movement_id,quantity)
   values(new.tenant_id,new.store_id,new.product_id,b.id,v_sale,new.id,v_take);
   v_needed:=v_needed-v_take;
 end loop;
 return new;
end $$;
drop trigger if exists trg_consume_product_batches_fefo on public.stock_movements;
create trigger trg_consume_product_batches_fefo after insert on public.stock_movements for each row execute function public.consume_product_batches_fefo();