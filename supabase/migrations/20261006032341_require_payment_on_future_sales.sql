-- Future-sale guard only: does not mutate existing sales, cash sessions or stock.
alter function public.finalize_sale(jsonb) rename to finalize_sale_legacy;

create or replace function public.finalize_sale(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public','private','auth'
as $function$
declare
  v_payments jsonb := coalesce(p_payload->'payments','[]'::jsonb);
begin
  if jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments)=0 then
    raise exception 'payment required';
  end if;

  return public.finalize_sale_legacy(p_payload);
end
$function$;

revoke execute on function public.finalize_sale_legacy(jsonb) from public, anon, authenticated;
revoke execute on function public.finalize_sale(jsonb) from public, anon;
grant execute on function public.finalize_sale(jsonb) to authenticated, service_role;
