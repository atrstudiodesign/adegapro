create or replace function public.register_cash_movement_secure(p_cash_session_id uuid,p_operator_token text,p_movement_type text,p_amount numeric,p_reason text)
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_session public.cash_sessions%rowtype; v_operator uuid; v_id uuid; v_available numeric;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select * into v_session from public.cash_sessions where id=p_cash_session_id for update;
 if not found or v_session.status<>'ABERTO' then raise exception 'cash session is not open'; end if;
 if not private.has_store_access(v_session.store_id) then raise exception 'forbidden'; end if;
 v_operator:=private.require_operator_session(v_session.store_id,p_operator_token);
 if v_session.operator_ref is distinct from v_operator then raise exception 'operator does not own cash session'; end if;
 if not private.operator_can(v_operator,'cash.movement') then raise exception 'operator cannot move cash'; end if;
 if not private.has_feature(v_session.tenant_id,'cash.movement','USE') then raise exception 'account cannot move cash'; end if;
 if p_movement_type not in ('SANGRIA','SUPRIMENTO') then raise exception 'invalid movement type'; end if;
 if coalesce(p_amount,0)<=0 then raise exception 'invalid amount'; end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason required'; end if;
 v_available:=round(v_session.initial_balance+v_session.total_cash_sales-v_session.total_withdrawals+v_session.total_supplies,2);
 if p_movement_type='SANGRIA' and round(p_amount,2)>v_available then raise exception 'Sangria de R$ % excede o dinheiro disponível no caixa (R$ %). Confira vendas em dinheiro, suprimentos e sangrias anteriores.',to_char(p_amount,'FM999999990D00'),to_char(v_available,'FM999999990D00'); end if;
 insert into public.cash_movements(tenant_id,store_id,cash_session_id,movement_type,amount,reason,created_by,operator_ref)
 values(v_session.tenant_id,v_session.store_id,p_cash_session_id,p_movement_type,round(p_amount,2),trim(p_reason),auth.uid(),v_operator) returning id into v_id;
 if p_movement_type='SANGRIA' then update public.cash_sessions set total_withdrawals=total_withdrawals+round(p_amount,2),expected_cash=v_available-round(p_amount,2) where id=p_cash_session_id;
 else update public.cash_sessions set total_supplies=total_supplies+round(p_amount,2),expected_cash=v_available+round(p_amount,2) where id=p_cash_session_id; end if;
 return v_id;
end $$;
revoke execute on function public.register_cash_movement_secure(uuid,text,text,numeric,text) from public,anon;
grant execute on function public.register_cash_movement_secure(uuid,text,text,numeric,text) to authenticated;