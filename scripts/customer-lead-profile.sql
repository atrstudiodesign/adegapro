-- Cadastro simples de clientes/lead para todos os tenants do Adega Pro.
-- Preserva colunas legadas para compatibilidade com vendas e fiado.

alter table public.customers
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists nickname text,
  add column if not exists customer_type text not null default 'AVULSO';

update public.customers
set whatsapp = phone
where nullif(trim(coalesce(whatsapp,'')),'') is null
  and nullif(trim(coalesce(phone,'')),'') is not null;

update public.customers
set first_name = split_part(trim(name),' ',1),
    last_name = nullif(trim(substr(trim(name), length(split_part(trim(name),' ',1))+1)), '')
where first_name is null;

alter table public.customers drop constraint if exists customers_customer_type_check;
alter table public.customers
  add constraint customers_customer_type_check
  check (customer_type in ('MENSAL','AVULSO'));

alter table public.customers alter column whatsapp set not null;
