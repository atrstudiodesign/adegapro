-- Allow CAIXA operators to open and close their own cash session.
-- close_cash_session_secure still enforces operator_ref ownership server-side.
create or replace function private.operator_can(p_operator_id uuid,p_permission text)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  with op as (select * from public.operators where id=p_operator_id and active=true),
  explicit as (
    select enabled from public.operator_feature_access
    where operator_id=p_operator_id and feature_key=p_permission
  )
  select exists(
    select 1 from op where case
      when exists(select 1 from explicit) then coalesce((select enabled from explicit limit 1),false)
      when role='ADMINISTRADOR' then true
      when role='GERENTE' then p_permission in ('sales.create','sales.discount','sales.cancel','cash.open','cash.close','cash.movement','cash.operate','inventory.adjust','products.edit','finance.view','reports.view')
      when role='CAIXA' then p_permission in ('sales.create','cash.open','cash.close','cash.movement','cash.operate')
      when role='ESTOQUISTA' then p_permission in ('inventory.adjust','products.edit')
      when role='FINANCEIRO' then p_permission in ('finance.view','reports.view')
      else false
    end
  );
$function$;
