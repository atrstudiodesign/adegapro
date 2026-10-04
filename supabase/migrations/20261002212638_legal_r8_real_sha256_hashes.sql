update public.legal_documents set content_hash = case document_key
when 'terms_of_use' then 'sha256:9dd46944f6be760d1f9006e909f9aa40448adbdff6ab758a6a9eeabf3a5496fe'
when 'privacy_policy' then 'sha256:4a3bfc2a0fd2fb7fa35fd4d510806b1a8b091015eab1fae6402056ac2846e0e1'
when 'subscription_policy' then 'sha256:c29e5ffb3825add7055f514d8b6e77c9f56f5ca38ebde5e6e8f306a639444f29'
when 'software_license' then 'sha256:32e6612d1a9a6bcbcda4d1fda6f39c5f7913b6d983bdd1c9e4aaa8be5a53f358'
when 'legal_notice' then 'sha256:317e85554d4ab087f9bb2e114bf5bde3d9388aa1e3d04edd5d1d656ed581f20d'
when 'loyalty_discount_policy' then 'sha256:4b0c253ff51d18f02c05e8790be38e890d9d945904ab37d1f4c1386fcdabc336'
else content_hash end
where version='2026.09.30-r8' and document_key in ('terms_of_use','privacy_policy','subscription_policy','software_license','legal_notice','loyalty_discount_policy');