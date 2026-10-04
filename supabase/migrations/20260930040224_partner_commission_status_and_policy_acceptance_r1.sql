
create or replace function public.update_platform_partner_commission(
  p_id uuid,p_status text,p_payment_reference text default null
)
returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $$
declare v_current text;
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('LIBERADA','AGENDADA','PAGA','CANCELADA') then raise exception 'status inválido'; end if;

  select status into v_current from public.platform_partner_commissions where id=p_id;
  if v_current is null then raise exception 'comissão não encontrada'; end if;
  if v_current='PAGA' and p_status<>'PAGA' then
    raise exception 'comissão paga não pode ser reaberta; use ajuste';
  end if;

  update public.platform_partner_commissions
  set status=p_status,
      released_at=case when p_status='LIBERADA' then coalesce(released_at,now()) else released_at end,
      paid_at=case when p_status='PAGA' then coalesce(paid_at,now()) else paid_at end,
      payment_reference=coalesce(nullif(p_payment_reference,''),payment_reference),
      approved_by=auth.uid(),
      updated_at=now()
  where id=p_id;
end $$;

create or replace function public.accept_platform_partner_policy(p_partner_id uuid,p_version text)
returns void
language plpgsql
security definer
set search_path='public','private','auth'
as $$
begin
  if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.platform_partner_policies where version=p_version and active=true) then
    raise exception 'política inválida ou inativa';
  end if;
  update public.platform_sales_partners
  set accepted_policy_version=p_version,accepted_policy_at=now(),updated_at=now()
  where id=p_partner_id;
  if not found then raise exception 'vendedor não encontrado'; end if;
end $$;

revoke all on function public.update_platform_partner_commission(uuid,text,text) from public,anon;
grant execute on function public.update_platform_partner_commission(uuid,text,text) to authenticated;
revoke all on function public.accept_platform_partner_policy(uuid,text) from public,anon;
grant execute on function public.accept_platform_partner_policy(uuid,text) to authenticated;
