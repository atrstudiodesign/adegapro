alter table public.hr_employees add column if not exists operator_id uuid references public.operators(id);
create unique index if not exists hr_employees_store_operator_uidx on public.hr_employees(store_id,operator_id) where operator_id is not null;

create table if not exists public.hr_operator_vouchers(
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, store_id uuid not null,
 operator_id uuid not null references public.operators(id), employee_id uuid references public.hr_employees(id),
 cash_session_id uuid references public.cash_sessions(id), amount numeric(12,2) not null check(amount>0),
 reason text not null, status text not null default 'PENDENTE' check(status in('PENDENTE','APLICADO_FOLHA','CANCELADO')),
 payroll_entry_id uuid references public.hr_payroll_entries(id), created_by_operator uuid not null references public.operators(id),
 created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid references public.operators(id), resolution_notes text);
alter table public.hr_operator_vouchers enable row level security;

create or replace function public.register_hr_operator_voucher(p_store_id uuid,p_operator_token text,p_target_operator_id uuid,p_cash_session_id uuid,p_amount numeric,p_reason text)
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare actor uuid; t uuid; e uuid; i uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 actor:=private.require_operator_session(p_store_id,p_operator_token);
 if not private.operator_can(actor,'hr.manage') then raise exception 'Permissão de RH necessária'; end if;
 select tenant_id into t from public.operators where id=p_target_operator_id and store_id=p_store_id and active=true;
 if t is null then raise exception 'Operador inválido'; end if;
 if p_cash_session_id is not null and not exists(select 1 from public.cash_sessions where id=p_cash_session_id and store_id=p_store_id and operator_ref=p_target_operator_id) then raise exception 'Turno não pertence ao operador'; end if;
 if coalesce(p_amount,0)<=0 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Valor/motivo inválido'; end if;
 select id into e from public.hr_employees where tenant_id=t and store_id=p_store_id and operator_id=p_target_operator_id and active=true limit 1;
 insert into public.hr_operator_vouchers(tenant_id,store_id,operator_id,employee_id,cash_session_id,amount,reason,created_by_operator)
 values(t,p_store_id,p_target_operator_id,e,p_cash_session_id,p_amount,trim(p_reason),actor) returning id into i;
 return i;
end $$;
revoke execute on function public.register_hr_operator_voucher(uuid,text,uuid,uuid,numeric,text) from public,anon;
grant execute on function public.register_hr_operator_voucher(uuid,text,uuid,uuid,numeric,text) to authenticated;

create or replace function public.get_hr_operator_vouchers(p_store_id uuid,p_operator_token text)
returns setof public.hr_operator_vouchers language plpgsql security definer set search_path='public','private','auth' as $$
declare actor uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'Acesso negado'; end if;
 actor:=private.require_operator_session(p_store_id,p_operator_token);
 if not private.operator_can(actor,'hr.manage') then raise exception 'Permissão de RH necessária'; end if;
 return query select * from public.hr_operator_vouchers where store_id=p_store_id order by created_at desc;
end $$;
revoke execute on function public.get_hr_operator_vouchers(uuid,text) from public,anon;
grant execute on function public.get_hr_operator_vouchers(uuid,text) to authenticated;