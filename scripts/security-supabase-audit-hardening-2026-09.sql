-- Supabase / cybersecurity hardening audit — 2026-09-30
-- Applied in production project fwjsxknbdkxzkoxvuncp.
-- Purpose: reduce Data API exposure, close dangerous inherited privileges,
-- correct RLS authorization logic, and stop future audit logs from duplicating PII.

-- 1. Existing tables: remove non-DML privileges not protected by RLS.
do $$
declare r record;
begin
  for r in select schemaname,tablename from pg_tables where schemaname='public'
  loop
    execute format('revoke truncate, references, trigger on table %I.%I from anon, authenticated',r.schemaname,r.tablename);
  end loop;
end $$;

-- 2. Anonymous role: only active legal documents remain directly readable.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' and tablename<>'legal_documents'
  loop
    execute format('revoke select, insert, update, delete on table public.%I from anon',r.tablename);
  end loop;
end $$;
grant select on public.legal_documents to anon;

-- 3. Future objects: do not inherit broad Data API access.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

-- 4. Control-plane tables are RPC-only.
revoke all on public.platform_admin_audit from anon, authenticated;
revoke all on public.platform_admin_invites from anon, authenticated;
revoke all on public.platform_communications from anon, authenticated;
revoke all on public.platform_incidents from anon, authenticated;
revoke all on public.platform_partner_commissions from anon, authenticated;
revoke all on public.platform_partner_policies from anon, authenticated;
revoke all on public.platform_partner_referrals from anon, authenticated;
revoke all on public.platform_sales_partners from anon, authenticated;
revoke all on public.tenant_infrastructure from anon, authenticated;
revoke all on public.tenant_security_settings from anon, authenticated;

revoke insert, update, delete on public.platform_admins from authenticated;
revoke insert, update, delete on public.legal_documents from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke delete on public.customers from authenticated;

-- 5. user_store_access policies were corrected to compare the target store tenant
-- with user_store_access.tenant_id (previous predicate had a tautology).
-- 6. AP/AR SELECT policies were separated from write policies so finance.view
-- cannot be bypassed by a permissive ALL policy.
-- 7. private.audit_row_change() now removes cpf/phone/whatsapp/email/address/notes/
-- pin_hash/token_hash/secret_ref/pix_key from FUTURE audit snapshots.
-- Historical audit data was not deleted by this hardening.
