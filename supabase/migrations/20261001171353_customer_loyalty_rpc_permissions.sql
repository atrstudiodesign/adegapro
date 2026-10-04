
REVOKE ALL ON FUNCTION public.get_platform_customer_loyalty_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_customer_loyalty_snapshot() TO authenticated;
REVOKE ALL ON FUNCTION public.save_platform_customer_loyalty(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_platform_customer_loyalty(jsonb) TO authenticated;
