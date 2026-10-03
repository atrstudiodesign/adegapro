-- Adega Pro: Vale Operador + vínculo explícito RH/operador + correção da auditoria de turno
-- Aplicado em produção em 2026-10-03. Este arquivo elimina drift entre banco e repositório.
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
-- Acesso direto permanece bloqueado por RLS; operações são exclusivamente via RPC autenticada/protegida.
