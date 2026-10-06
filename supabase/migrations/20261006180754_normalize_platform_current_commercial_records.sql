-- ATR Control commercial-record normalization.
-- Historical duplicate rows are preserved and logically ended.
with ranked as (
 select id,tenant_id,row_number() over(partition by tenant_id order by created_at desc,id desc) rn
 from public.billing_subscriptions where status in ('ACTIVE','TRIALING','PAST_DUE')
)
update public.billing_subscriptions b set status='ENDED',updated_at=now(),
 admin_notes=concat_ws(E'\n',nullif(b.admin_notes,''),'Encerrada automaticamente na homologação ATR Control: registro vigente duplicado; histórico preservado.')
from ranked r where b.id=r.id and r.rn>1;

with ranked as (
 select id,tenant_id,row_number() over(partition by tenant_id order by created_at desc,id desc) rn
 from public.commercial_licenses where status='ACTIVE'
)
update public.commercial_licenses c set status='ENDED',updated_at=now(),
 notes=concat_ws(E'\n',nullif(c.notes,''),'Encerrada automaticamente na homologação ATR Control: licença ativa duplicada; histórico preservado.')
from ranked r where c.id=r.id and r.rn>1;

create unique index if not exists uq_billing_one_current_per_tenant on public.billing_subscriptions(tenant_id) where status in ('ACTIVE','TRIALING','PAST_DUE');
create unique index if not exists uq_license_one_active_per_tenant on public.commercial_licenses(tenant_id) where status='ACTIVE';
