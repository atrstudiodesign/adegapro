-- /AUDIT /TRUEMODE 2026-10-02
-- Harden RPC execution discovered by Supabase security advisor.
-- HR save RPCs remain authenticated-only and keep their internal operator/session checks.
revoke execute on function public.record_operator_attendance(uuid,uuid,text,text) from public, anon;
revoke execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) from public, anon;
grant execute on function public.record_operator_attendance(uuid,uuid,text,text) to authenticated;
grant execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) to authenticated;

-- Internal trigger function must never be callable through Data API.
revoke execute on function public.consume_product_batches_fefo() from public, anon, authenticated;

-- Landing-page writes require an authenticated platform admin (function also checks is_platform_admin()).
revoke execute on function public.save_landing_page_content(jsonb) from public, anon;
grant execute on function public.save_landing_page_content(jsonb) to authenticated;

-- get_landing_page_content() intentionally remains public because it returns public website copy.
