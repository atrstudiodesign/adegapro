create table if not exists public.hr_cash_withdrawals(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id),store_id uuid not null references public.stores(id),
 cash_movement_id uuid not null unique references public.cash_movements(id),cash_session_id uuid not null references public.cash_sessions(id),
 operator_id uuid not null references public.operators(id),employee_id uuid references public.hr_employees(id),
 amount numeric(12,2) not null check(amount>0),reason text not null,status text not null default 'PENDENTE' check(status in('PENDENTE','APLICADO_FOLHA','NAO_DESCONTAR','CANCELADO')),
 payroll_entry_id uuid references public.hr_payroll_entries(id),resolution_notes text,resolved_at timestamptz,resolved_by uuid references public.operators(id),created_at timestamptz not null default now());
alter table public.hr_cash_withdrawals enable row level security;

create or replace function public.sync_cash_withdrawal_to_hr() returns trigger language plpgsql security definer set search_path='public','private' as $$
declare v_employee uuid;
begin
 if new.movement_type<>'SANGRIA' then return new; end if;
 select h.id into v_employee from public.hr_employees h join public.operators o on o.tenant_id=h.tenant_id and o.store_id=h.store_id
 where o.id=new.operator_ref and h.tenant_id=new.tenant_id and h.store_id=new.store_id and h.active=true and lower(trim(h.full_name))=lower(trim(o.name)) order by h.created_at limit 1;
 insert into public.hr_cash_withdrawals(tenant_id,store_id,cash_movement_id,cash_session_id,operator_id,employee_id,amount,reason)
 values(new.tenant_id,new.store_id,new.id,new.cash_session_id,new.operator_ref,v_employee,new.amount,new.reason) on conflict(cash_movement_id) do nothing;
 return new;
end $$;
revoke execute on function public.sync_cash_withdrawal_to_hr() from public,anon,authenticated;
drop trigger if exists trg_sync_cash_withdrawal_to_hr on public.cash_movements;
create trigger trg_sync_cash_withdrawal_to_hr after insert on public.cash_movements for each row execute function public.sync_cash_withdrawal_to_hr();

create or replace function public.get_hr_cash_withdrawals(p_store_id uuid,p_operator_token text) returns setof public.hr_cash_withdrawals language plpgsql stable security definer set search_path='public','private','auth' as $$
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 perform private.assert_hr_operator(p_store_id,p_operator_token);
 return query select * from public.hr_cash_withdrawals where store_id=p_store_id order by created_at desc;
end $$;
revoke execute on function public.get_hr_cash_withdrawals(uuid,text) from public,anon; grant execute on function public.get_hr_cash_withdrawals(uuid,text) to authenticated;

create or replace function public.resolve_hr_cash_withdrawal(p_store_id uuid,p_operator_token text,p_id uuid,p_status text,p_payroll_entry_id uuid default null,p_notes text default null) returns void language plpgsql security definer set search_path='public','private','auth' as $$
declare v_admin record; v_row public.hr_cash_withdrawals%rowtype;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select * into v_admin from private.assert_hr_operator(p_store_id,p_operator_token);
 select * into v_row from public.hr_cash_withdrawals where id=p_id and store_id=p_store_id for update;
 if not found then raise exception 'withdrawal not found'; end if;
 if p_status not in('APLICADO_FOLHA','NAO_DESCONTAR','CANCELADO') then raise exception 'invalid resolution'; end if;
 if p_status='APLICADO_FOLHA' then
   if v_row.employee_id is null then raise exception 'operator is not linked to an HR employee'; end if;
   if p_payroll_entry_id is null or not exists(select 1 from public.hr_payroll_entries where id=p_payroll_entry_id and employee_id=v_row.employee_id and store_id=p_store_id and status='PENDENTE') then raise exception 'pending payroll entry required'; end if;
   update public.hr_payroll_entries set advances=advances+v_row.amount,updated_at=now(),notes=concat_ws(E'\n',notes,'Retirada de caixa aplicada: R$ '||to_char(v_row.amount,'FM999999990.00')||' · '||v_row.reason) where id=p_payroll_entry_id;
 end if;
 update public.hr_cash_withdrawals set status=p_status,payroll_entry_id=case when p_status='APLICADO_FOLHA' then p_payroll_entry_id else null end,resolution_notes=nullif(trim(coalesce(p_notes,'')),''),resolved_at=now(),resolved_by=v_admin.operator_id where id=p_id;
end $$;
revoke execute on function public.resolve_hr_cash_withdrawal(uuid,text,uuid,text,uuid,text) from public,anon; grant execute on function public.resolve_hr_cash_withdrawal(uuid,text,uuid,text,uuid,text) to authenticated;