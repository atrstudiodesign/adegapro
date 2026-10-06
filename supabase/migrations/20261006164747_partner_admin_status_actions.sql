create or replace function public.set_platform_sales_partner_status(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='public','private','auth' as $$
declare v_status text:=upper(trim(coalesce(p_status,'')));
begin
 if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
 if v_status not in ('ATIVO','SUSPENSO','CANCELADO') then raise exception 'status inválido'; end if;
 update public.platform_sales_partners set registration_status=v_status,active=(v_status='ATIVO'),updated_at=now() where id=p_id;
 if not found then raise exception 'vendedor não encontrado'; end if;
end $$;
revoke all on function public.set_platform_sales_partner_status(uuid,text) from public,anon;
grant execute on function public.set_platform_sales_partner_status(uuid,text) to authenticated;
