create or replace function private.protect_closed_cash_records() returns trigger language plpgsql security definer set search_path='' as $$
declare sid uuid; st text;
begin
 if tg_table_name='cash_sessions' then
   if old.status='FECHADO' and (to_jsonb(new)-array['closure_notes','admin_record_status','admin_amended_at','admin_amended_by','admin_amendment_reason']) is distinct from (to_jsonb(old)-array['closure_notes','admin_record_status','admin_amended_at','admin_amended_by','admin_amendment_reason']) then raise exception 'Turno fechado é imutável; use retificação administrativa auditada'; end if; return new;
 elsif tg_table_name='sales' then sid:=old.cash_session_id;
 elsif tg_table_name='sale_payments' then select cash_session_id into sid from public.sales where id=coalesce(old.sale_id,new.sale_id);
 elsif tg_table_name='cash_movements' then sid:=coalesce(old.cash_session_id,new.cash_session_id); end if;
 if sid is not null then select status into st from public.cash_sessions where id=sid; if st='FECHADO' then raise exception 'Registro pertence a turno fechado e não pode ser alterado'; end if; end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.protect_closed_cash_records() from public,anon,authenticated;
drop trigger if exists trg_protect_closed_cash_session on public.cash_sessions; create trigger trg_protect_closed_cash_session before update on public.cash_sessions for each row execute function private.protect_closed_cash_records();
drop trigger if exists trg_protect_closed_sale on public.sales; create trigger trg_protect_closed_sale before update or delete on public.sales for each row execute function private.protect_closed_cash_records();
drop trigger if exists trg_protect_closed_sale_payment on public.sale_payments; create trigger trg_protect_closed_sale_payment before update or delete on public.sale_payments for each row execute function private.protect_closed_cash_records();
drop trigger if exists trg_protect_closed_cash_movement on public.cash_movements; create trigger trg_protect_closed_cash_movement before update or delete on public.cash_movements for each row execute function private.protect_closed_cash_records();