revoke execute on function public.consume_product_batches_fefo() from public, anon, authenticated;
revoke execute on function public.save_landing_page_content(jsonb) from public, anon;
grant execute on function public.save_landing_page_content(jsonb) to authenticated;
-- get_landing_page_content intentionally remains public: it only returns public landing-page copy.