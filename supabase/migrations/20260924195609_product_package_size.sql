
alter table public.products
  add column if not exists package_size text;

update public.products
set package_size = nullif(
  trim(
    substring(
      name from '([0-9]+([.,][0-9]+)?[[:space:]]*(ml|ML|l|L|kg|KG|g|G))'
    )
  ),
  ''
)
where package_size is null;

comment on column public.products.package_size is
  'Apresentação comercial do produto, ex.: 330ml, 1L, 5kg.';
