
alter table public.products
  drop constraint if exists products_image_url_https_check;

alter table public.products
  add constraint products_image_url_https_check
  check (
    image_url is null
    or image_url = ''
    or (
      image_url ~ '^https://'
      and lower(image_url) !~ '^https://(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|\[::1\])'
    )
  );
