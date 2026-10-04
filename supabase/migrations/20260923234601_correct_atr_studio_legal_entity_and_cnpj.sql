
update public.legal_documents
set active = false
where version = '2026.09.23';

insert into public.legal_documents(document_key, version, title, effective_at, content_hash, active)
values
('terms_of_use','2026.09.23-r2','Termos de Uso do ADEGA PRO','2026-09-23T00:00:00-03:00','adega-pro-terms-2026-09-23-r2-atr-57514866000138',true),
('privacy_policy','2026.09.23-r2','Política de Privacidade e Proteção de Dados','2026-09-23T00:00:00-03:00','adega-pro-privacy-2026-09-23-r2-atr-57514866000138',true),
('subscription_policy','2026.09.23-r2','Política de Assinaturas, Cobrança e Cancelamento','2026-09-23T00:00:00-03:00','adega-pro-subscription-2026-09-23-r2-atr-57514866000138',true),
('software_license','2026.09.23-r2','Licença de Uso e Propriedade Intelectual','2026-09-23T00:00:00-03:00','adega-pro-license-2026-09-23-r2-atr-57514866000138',true),
('legal_notice','2026.09.23-r2','Aviso Legal e Limitações Operacionais','2026-09-23T00:00:00-03:00','adega-pro-legal-notice-2026-09-23-r2-atr-57514866000138',true)
on conflict (document_key, version) do update
set active = excluded.active,
    title = excluded.title,
    effective_at = excluded.effective_at,
    content_hash = excluded.content_hash;
