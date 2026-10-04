
update public.legal_documents
set active = false
where active = true
  and version <> '2026.09.23-r3';

insert into public.legal_documents(document_key, version, title, effective_at, content_hash, active)
values
('terms_of_use','2026.09.23-r3','Termos de Uso do ADEGA PRO','2026-09-23T00:00:00-03:00','adega-pro-terms-2026-09-23-r3-commercial-modes',true),
('privacy_policy','2026.09.23-r3','Política de Privacidade e Proteção de Dados','2026-09-23T00:00:00-03:00','adega-pro-privacy-2026-09-23-r3-commercial-modes',true),
('subscription_policy','2026.09.23-r3','Política de Assinaturas, Cobrança e Licenciamento','2026-09-23T00:00:00-03:00','adega-pro-subscription-2026-09-23-r3-commercial-modes',true),
('software_license','2026.09.23-r3','Licença de Uso e Propriedade Intelectual','2026-09-23T00:00:00-03:00','adega-pro-license-2026-09-23-r3-commercial-modes',true),
('legal_notice','2026.09.23-r3','Aviso Legal e Limitações Operacionais','2026-09-23T00:00:00-03:00','adega-pro-legal-notice-2026-09-23-r3-commercial-modes',true)
on conflict (document_key, version) do update
set active = true,
    title = excluded.title,
    effective_at = excluded.effective_at,
    content_hash = excluded.content_hash;

create table if not exists public.commercial_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  modality text not null check (modality in (
    'SUBSCRIPTION',
    'FULL_LICENSE',
    'PARTIAL_LICENSE',
    'CUSTOM_PROJECT',
    'DEDICATED_DEPLOYMENT'
  )),
  contract_reference text,
  scope jsonb not null default '{}'::jsonb,
  source_code_included boolean not null default false,
  ip_assignment_included boolean not null default false,
  exclusive boolean not null default false,
  white_label boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  maintenance_included boolean not null default false,
  updates_included boolean not null default false,
  hosting_included boolean not null default true,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','SUSPENDED','ENDED','CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commercial_licenses enable row level security;

drop policy if exists commercial_licenses_read on public.commercial_licenses;
create policy commercial_licenses_read
on public.commercial_licenses
for select
to authenticated
using (private.has_tenant_access(tenant_id) or private.is_super_admin());

drop policy if exists commercial_licenses_manage on public.commercial_licenses;
create policy commercial_licenses_manage
on public.commercial_licenses
for all
to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

create index if not exists idx_commercial_licenses_tenant
  on public.commercial_licenses(tenant_id, status, created_at desc);
