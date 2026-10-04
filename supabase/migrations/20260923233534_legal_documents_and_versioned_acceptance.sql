
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  version text not null,
  title text not null,
  effective_at timestamptz not null,
  content_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(document_key, version)
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  document_key text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, document_key, version)
);

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

drop policy if exists legal_documents_public_read on public.legal_documents;
create policy legal_documents_public_read
on public.legal_documents for select
to anon, authenticated
using (active = true);

drop policy if exists legal_acceptances_self_read on public.legal_acceptances;
create policy legal_acceptances_self_read
on public.legal_acceptances for select
to authenticated
using (user_id = auth.uid() or private.is_super_admin());

revoke insert, update, delete on public.legal_acceptances from authenticated;

create or replace function public.accept_legal_documents(
  p_documents jsonb,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
  item jsonb;
  v_key text;
  v_version text;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select tenant_id into v_tenant
  from public.profiles
  where user_id = v_user;

  for item in select * from jsonb_array_elements(p_documents)
  loop
    v_key := item->>'document_key';
    v_version := item->>'version';

    if not exists (
      select 1 from public.legal_documents
      where document_key = v_key
        and version = v_version
        and active = true
    ) then
      raise exception 'invalid or inactive legal document: % %', v_key, v_version;
    end if;

    insert into public.legal_acceptances(
      user_id, tenant_id, document_key, version, user_agent, metadata
    )
    values(
      v_user, v_tenant, v_key, v_version, p_user_agent, coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (user_id, document_key, version) do nothing;
  end loop;
end
$$;

revoke all on function public.accept_legal_documents(jsonb,text,jsonb) from public, anon;
grant execute on function public.accept_legal_documents(jsonb,text,jsonb) to authenticated;

insert into public.legal_documents(document_key, version, title, effective_at, content_hash, active)
values
('terms_of_use','2026.09.23','Termos de Uso do ADEGA PRO','2026-09-23T00:00:00-03:00','adega-pro-terms-2026-09-23-v1',true),
('privacy_policy','2026.09.23','Política de Privacidade e Proteção de Dados','2026-09-23T00:00:00-03:00','adega-pro-privacy-2026-09-23-v1',true),
('subscription_policy','2026.09.23','Política de Assinaturas, Cobrança e Cancelamento','2026-09-23T00:00:00-03:00','adega-pro-subscription-2026-09-23-v1',true),
('software_license','2026.09.23','Licença de Uso e Propriedade Intelectual','2026-09-23T00:00:00-03:00','adega-pro-license-2026-09-23-v1',true),
('legal_notice','2026.09.23','Aviso Legal e Limitações Operacionais','2026-09-23T00:00:00-03:00','adega-pro-legal-notice-2026-09-23-v1',true)
on conflict (document_key, version) do nothing;

create index if not exists idx_legal_acceptances_user on public.legal_acceptances(user_id, accepted_at desc);
create index if not exists idx_legal_acceptances_tenant on public.legal_acceptances(tenant_id, accepted_at desc);
