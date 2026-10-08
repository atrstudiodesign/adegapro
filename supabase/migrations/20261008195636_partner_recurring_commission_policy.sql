-- New receipt ledger. Existing commission amounts, payouts and acceptances remain untouched.
alter table public.platform_partner_commissions add column if not exists earning_key text, add column if not exists policy_version text;
create unique index if not exists partner_commission_earning_key on public.platform_partner_commissions(earning_key) where earning_key is not null;
create table if not exists public.platform_partner_receipts (
 id uuid primary key default gen_random_uuid(),
 referral_id uuid not null references public.platform_partner_referrals(id),
 partner_id uuid not null references public.platform_sales_partners(id),
 client_key text not null, earning_key text not null,
 plan text not null check(plan in ('MONTHLY149','MONTHLY7490','CUSTOM990','CUSTOM495','CUSTOM800')),
 amount numeric(12,2) not null check(amount>0),
 reference text not null unique,
 period text not null, contract_date date,
 paid_at timestamptz not null, validated_by uuid not null references auth.users(id),
 policy_version text not null default '2026.10.08-r7', created_at timestamptz not null default now()
);
alter table public.platform_partner_receipts enable row level security;
revoke all on public.platform_partner_receipts from public,anon,authenticated;
create index if not exists partner_receipt_earning_key on public.platform_partner_receipts(earning_key);

create or replace function private.partner_commission_quote(p_plan text,p_received numeric)
returns numeric language sql immutable set search_path='' as $$
 select case when p_plan='MONTHLY149' and p_received=149 then 49
 when p_plan='MONTHLY7490' and p_received=74.90 then 30
 when p_plan='CUSTOM990' and p_received=990 then 250
 when p_plan='CUSTOM495' and p_received=495 then 150
 when p_plan='CUSTOM800' and p_received=800 then 200 else 0 end::numeric;
$$;
revoke all on function private.partner_commission_quote(text,numeric) from public,anon,authenticated;

create or replace function public.confirm_platform_partner_receipt_v2(
 p_referral_id uuid,p_plan text,p_amount numeric,p_reference text,p_period text,
 p_paid_at timestamptz default now(),p_contract_date date default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 r public.platform_partner_referrals%rowtype;
 seller public.platform_sales_partners%rowtype;
 client text; earning text; total numeric; target numeric; commission numeric;
 commission_id uuid; receipt public.platform_partner_receipts%rowtype;
 payout_status text; payout_due date; kind text;
begin
 if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'Recebimento inválido'; end if;
 if p_reference is null or length(trim(p_reference))<3 or length(trim(p_reference))>180 then raise exception 'Informe referência única do comprovante (3 a 180 caracteres)'; end if;
 if p_period is null or p_period!~'^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Informe competência AAAA-MM'; end if;
 select * into r from public.platform_partner_referrals where id=p_referral_id for update;
 if r.id is null then raise exception 'Indicação não encontrada'; end if;
 if r.status='CANCELADO' or r.customer_payment_status='ESTORNADO' then raise exception 'Indicação cancelada ou estornada exige revisão administrativa'; end if;
 select * into seller from public.platform_sales_partners where id=r.partner_id and active=true for update;
 if seller.id is null or not seller.email_verified or not seller.phone_verified then raise exception 'Vendedor deve estar ativo e validado'; end if;
 if p_plan not in ('MONTHLY149','MONTHLY7490','CUSTOM990','CUSTOM495','CUSTOM800') or p_plan is null then raise exception 'Modalidade inválida'; end if;
 kind:=case when p_plan like 'MONTHLY%' then 'ASSINATURA' else 'PERSONALIZADO' end;
 if kind='PERSONALIZADO' and r.referral_type<>'PERSONALIZADO' then raise exception 'Indicação não é de implantação personalizada'; end if;
 if p_plan in ('MONTHLY7490','CUSTOM495') and (p_contract_date is null or p_contract_date<date '2026-10-08' or p_contract_date>date '2026-10-12') then raise exception 'Valide contratação promocional e limite de 15 clientes no prazo da campanha'; end if;
 -- Stable client identity shared across referrals; no cross-seller duplicate acquisition.
 client:=coalesce('tenant:'||r.tenant_id::text,'email:'||nullif(lower(trim(r.lead_email)),''),'phone:'||nullif(regexp_replace(r.lead_phone,'[^0-9]','','g'),''));
 if client is null then raise exception 'Vincule empresa, e-mail ou telefone do cliente antes do recebimento'; end if;
 earning:=client||':'||kind||':'||case when kind='ASSINATURA' then p_period else 'UNICA' end;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(earning,0));
 -- Repeated transport of the same payment is idempotent; different payment data is rejected.
 select * into receipt from public.platform_partner_receipts where reference=lower(trim(p_reference));
 if receipt.id is not null then
  if receipt.referral_id<>r.id or receipt.plan<>p_plan or receipt.amount<>p_amount or receipt.period<>p_period then raise exception 'Comprovante já vinculado a outro recebimento'; end if;
  select id into commission_id from public.platform_partner_commissions where earning_key=receipt.earning_key;
  return jsonb_build_object('commission_id',commission_id,'received_total',(select sum(amount) from public.platform_partner_receipts where earning_key=receipt.earning_key),'replayed',true);
 end if;
 if exists(select 1 from public.platform_partner_commissions where earning_key=earning) then raise exception 'Comissão já registrada para cliente e competência/implantação'; end if;
 -- Legacy one-time setup prevents a second acquisition commission without rewriting it.
 if kind='PERSONALIZADO' and exists(select 1 from public.platform_partner_commissions c join public.platform_partner_referrals old on old.id=c.referral_id where c.commission_type='PERSONALIZADO' and (old.id=r.id or (r.tenant_id is not null and old.tenant_id=r.tenant_id) or (nullif(lower(trim(r.lead_email)),'') is not null and lower(trim(old.lead_email))=lower(trim(r.lead_email))))) then raise exception 'Implantação já possui comissão histórica'; end if;
 if kind='ASSINATURA' and exists(select 1 from public.platform_partner_commissions c join public.platform_partner_referrals old on old.id=c.referral_id where c.commission_type='ASSINATURA' and c.earning_key is null and c.closing_period=p_period and (old.id=r.id or (r.tenant_id is not null and old.tenant_id=r.tenant_id))) then raise exception 'Competência já possui comissão histórica'; end if;
 if exists(select 1 from public.platform_partner_receipts where earning_key=earning and (plan<>p_plan or partner_id<>r.partner_id)) then raise exception 'Modalidade/vendedor diverge do recebimento já registrado'; end if;
 target:=case p_plan when 'MONTHLY149' then 149 when 'MONTHLY7490' then 74.9 when 'CUSTOM990' then 990 when 'CUSTOM495' then 495 when 'CUSTOM800' then 800 end;
 if p_plan='CUSTOM800' and p_amount<>400 then raise exception 'Personalizado de R$ 800 exige duas parcelas de R$ 400'; end if;
 if p_plan<>'CUSTOM800' and p_amount<>target then raise exception 'Valor não corresponde à modalidade; não gera comissão automática'; end if;
 select coalesce(sum(amount),0)+p_amount into total from public.platform_partner_receipts where earning_key=earning;
 if total>target then raise exception 'Recebimento supera valor contratado'; end if;
 insert into public.platform_partner_receipts(referral_id,partner_id,client_key,earning_key,plan,amount,reference,period,paid_at,validated_by,contract_date)
 values(r.id,r.partner_id,client,earning,p_plan,p_amount,lower(trim(p_reference)),p_period,p_paid_at,auth.uid(),p_contract_date);
 update public.platform_partner_referrals set customer_payment_status='CONFIRMADO',first_payment_at=coalesce(first_payment_at,p_paid_at),first_payment_amount=coalesce(first_payment_amount,p_amount),payment_validated_by=auth.uid(),payment_validated_at=now(),status='CONVERTIDO',converted_at=coalesce(converted_at,p_paid_at),converted_value=case when kind=r.referral_type then target else converted_value end,updated_at=now() where id=r.id;
 commission:=private.partner_commission_quote(p_plan,total);
 if commission=0 then return jsonb_build_object('commission_id',null,'received_total',total); end if;
 payout_status:=case when seller.payout_mode='IMEDIATO' then 'LIBERADA' else 'AGENDADA' end;
 payout_due:=case when seller.payout_mode='IMEDIATO' then (now() at time zone 'America/Sao_Paulo')::date else (date_trunc('month',p_paid_at at time zone 'America/Sao_Paulo')+interval '1 month')::date+(least(seller.monthly_payout_day,28)-1) end;
 insert into public.platform_partner_commissions(partner_id,referral_id,tenant_id,commission_type,base_amount,commission_mode,commission_value,amount_due,status,due_at,client_paid_at,eligible_at,payout_mode,closing_period,released_at,approved_by,notes,earning_key,policy_version)
 values(r.partner_id,r.id,r.tenant_id,kind,target,'FIXO',commission,commission,payout_status,payout_due,p_paid_at,now(),seller.payout_mode,p_period,case when payout_status='LIBERADA' then now() else null end,auth.uid(),p_plan||' — recebimento confirmado; política 2026.10.08-r7',earning,'2026.10.08-r7') returning id into commission_id;
 return jsonb_build_object('commission_id',commission_id,'received_total',total);
end $$;
revoke all on function public.confirm_platform_partner_receipt_v2(uuid,text,numeric,text,text,timestamptz,date) from public,anon;
grant execute on function public.confirm_platform_partner_receipt_v2(uuid,text,numeric,text,text,timestamptz,date) to authenticated;
-- Old clients must refresh, rather than accidentally generating the previous R$35/R$200 rules.
create or replace function public.confirm_platform_partner_customer_payment(p_referral_id uuid,p_amount numeric,p_paid_at timestamptz default now())
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_super_admin() then raise exception 'forbidden'; end if;
 raise exception 'Atualize o painel: informe modalidade, competência e referência pelo novo fluxo de recebimentos';
end $$;
revoke all on function public.confirm_platform_partner_customer_payment(uuid,numeric,timestamptz) from public,anon;
grant execute on function public.confirm_platform_partner_customer_payment(uuid,numeric,timestamptz) to authenticated;

insert into public.platform_partner_policies(version,effective_at,active,title,content)
values('2026.10.08-r7',now(),true,'Comissões recorrentes e implantação — outubro 2026',jsonb_build_object(
 'subscription',jsonb_build_object('price',149,'commission',49,'recurrence','MENSAL_PAGO'),
 'custom',jsonb_build_object('price',990,'commission',250,'recurrence','UNICA_POR_CLIENTE'),
 'rules',jsonb_build_array(
 'Assinatura regular paga: R$149 gera R$49 por competência. Promocional paga: R$74,90 gera R$30. Ao retornar ao preço regular, comissão R$49.',
 'Teste, dois meses gratuitos, inadimplência ou promessa de pagamento não geram comissão.',
 'Implantação única por cliente: R$990 quitados gera R$250; R$495 à vista gera R$150; R$800 em duas parcelas de R$400 gera R$200 depois das duas confirmações.',
 'Parcelas, troca de plano ou indicação duplicada não repetem a comissão de implantação. Mensalidade paga do personalizado é evento distinto e pode gerar comissão recorrente.',
 'Competência e referência única obrigatórias. A ATR confirma pagamento real e vínculo da indicação antes de liberar saldo.',
 'Promoção para 15 novos clientes com contratação confirmada de 08/10 a 12/10/2026 às23h59 Brasília; validação administrativa de vaga, contrato e benefício. Cadastro não reserva vaga.',
 'Repasse imediato ou fechamento mensal conforme cadastro. Não há vínculo empregatício, salário fixo, exclusividade ou garantia de renda.',
 'Cancelamento interrompe comissões futuras; estorno, fraude e divergência exigem ajuste administrativo documentado. Histórico anterior preservado, sem recálculo ou retroativo automático.',
 'Cada vendedor consulta somente seus registros. A nova versão fica disponível para leitura e aceite específico.'
 ))) on conflict(version) do nothing;
update public.platform_partner_policies set active=false where active and version<>'2026.10.08-r7';
