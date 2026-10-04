
insert into public.legal_documents(document_key,version,title,effective_at,content_hash,active)
values
  ('terms_of_use','2026.09.29-r4','Termos de Uso do ADEGA PRO','2026-09-29 03:00:00+00','adega-pro-terms-2026-09-29-r4-referral-commercial',true),
  ('privacy_policy','2026.09.29-r4','Política de Privacidade e Proteção de Dados','2026-09-29 03:00:00+00','adega-pro-privacy-2026-09-29-r4-referral-commercial',true),
  ('subscription_policy','2026.09.29-r4','Política de Assinaturas, Cobrança e Cancelamento','2026-09-29 03:00:00+00','adega-pro-subscription-2026-09-29-r4-referral-commercial',true),
  ('software_license','2026.09.29-r4','Licença de Uso e Propriedade Intelectual','2026-09-29 03:00:00+00','adega-pro-license-2026-09-29-r4-referral-commercial',true),
  ('legal_notice','2026.09.29-r4','Aviso Legal e Limitações Operacionais','2026-09-29 03:00:00+00','adega-pro-legal-notice-2026-09-29-r4-referral-commercial',true)
on conflict(document_key,version) do update set
  title=excluded.title,
  effective_at=excluded.effective_at,
  content_hash=excluded.content_hash,
  active=true;

update public.legal_documents
set active=false
where version <> '2026.09.29-r4'
  and document_key in ('terms_of_use','privacy_policy','subscription_policy','software_license','legal_notice')
  and active=true;
