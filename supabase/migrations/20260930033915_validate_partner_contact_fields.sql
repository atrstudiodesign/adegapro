
alter table public.platform_sales_partners
  drop constraint if exists platform_sales_partners_email_format_check,
  add constraint platform_sales_partners_email_format_check
    check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

alter table public.platform_sales_partners
  drop constraint if exists platform_sales_partners_phone_format_check,
  add constraint platform_sales_partners_phone_format_check
    check (length(regexp_replace(phone,'\D','','g')) between 10 and 15);

create unique index if not exists platform_sales_partners_email_unique
  on public.platform_sales_partners(lower(email));
