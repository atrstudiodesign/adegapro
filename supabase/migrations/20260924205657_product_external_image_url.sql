
alter table public.products add column if not exists image_url text;

alter table public.products
  drop constraint if exists products_image_url_https_check;

alter table public.products
  add constraint products_image_url_https_check
  check (
    image_url is null
    or image_url = ''
    or image_url ~ '^https://'
  );
