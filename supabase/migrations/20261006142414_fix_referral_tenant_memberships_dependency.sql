-- Historical production hotfix placeholder.
-- The live change replaced obsolete public.tenant_memberships lookup in referral RPCs
-- with active public.user_store_access tenant resolution. Current function definitions
-- are established by subsequent schema state; this file restores migration-history parity.
select 1;
