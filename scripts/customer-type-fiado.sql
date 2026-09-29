-- Amplia os tipos de cliente sem alterar os registros existentes.
alter table public.customers
  drop constraint if exists customers_customer_type_check;

alter table public.customers
  add constraint customers_customer_type_check
  check (customer_type in ('MENSAL','FIADO','AVULSO'));
