-- Reconcile the r8 evidence hashes with the canonical payload rendered by the app.
-- The legal text and versions are unchanged; only the incorrect hash metadata is repaired.
update public.legal_documents
set content_hash = case document_key
  when 'privacy_policy' then 'sha256:646e8e3d283567b5bb920c70e967350df32dd7d120dde3c6ead709bc4bbb50f8'
  when 'subscription_policy' then 'sha256:765123f597b64a568a20888a683edf412e761bfd4546c13ff061e3a5f4e620c3'
  when 'software_license' then 'sha256:dcc618d1d378d9c0ff234d62183e4eade320891f26f6de103e918aa34eafb8d4'
  when 'legal_notice' then 'sha256:8e9f4b4da8d2767eb2091ed93b4b610b72aee2e458d0659b072d7292e4e80e50'
  when 'loyalty_discount_policy' then 'sha256:4928da44f078a292d07b33b6e2dc2e138f833993de54d3695139662c917f2118'
  else content_hash
end
where version = '2026.09.30-r8'
  and document_key in (
    'privacy_policy',
    'subscription_policy',
    'software_license',
    'legal_notice',
    'loyalty_discount_policy'
  );

-- This anonymous SECURITY DEFINER RPC is intentionally public because it only
-- returns the public landing CMS. Keep its name resolution fully controlled.
alter function public.get_landing_page_content() set search_path = '';
