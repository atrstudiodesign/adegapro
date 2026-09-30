-- Agenda e alertas do RH interno (aplicado em produção em 2026-09-30)
create table if not exists public.hr_agenda_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid references public.hr_employees(id) on delete set null,
  title text not null,
  description text,
  event_type text not null default 'LEMBRETE',
  priority text not null default 'NORMAL',
  due_at timestamptz not null,
  alert_at timestamptz,
  status text not null default 'PENDENTE',
  created_by_operator uuid references public.operators(id) on delete set null,
  completed_by_operator uuid references public.operators(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_type in ('LEMBRETE','PAGAMENTO','DOCUMENTO','CONTRATACAO','FERIAS','REUNIAO','OUTRO')),
  check (priority in ('BAIXA','NORMAL','ALTA','URGENTE')),
  check (status in ('PENDENTE','CONCLUIDO','CANCELADO'))
);
create index if not exists hr_agenda_store_due_idx on public.hr_agenda_events(store_id,status,due_at);
alter table public.hr_agenda_events enable row level security;
revoke all on table public.hr_agenda_events from anon,authenticated;

-- As funções públicas exigem sessão autenticada + token de operador ADMINISTRADOR/GERENTE
-- validado por private.assert_hr_operator().
-- Definições completas estão sincronizadas no banco de produção e são usadas por productionDb.
