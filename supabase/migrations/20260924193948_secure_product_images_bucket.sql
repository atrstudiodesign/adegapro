
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists product_images_select on storage.objects;
create policy product_images_select
on storage.objects for select to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id=auth.uid()
      and usa.active=true
      and usa.tenant_id::text=(storage.foldername(name))[1]
  )
);

drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='product-images'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id=auth.uid()
      and usa.active=true
      and usa.tenant_id::text=(storage.foldername(name))[1]
  )
);

drop policy if exists product_images_update on storage.objects;
create policy product_images_update
on storage.objects for update to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id=auth.uid()
      and usa.active=true
      and usa.tenant_id::text=(storage.foldername(name))[1]
  )
)
with check (
  bucket_id='product-images'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id=auth.uid()
      and usa.active=true
      and usa.tenant_id::text=(storage.foldername(name))[1]
  )
);

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete
on storage.objects for delete to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id=auth.uid()
      and usa.active=true
      and usa.tenant_id::text=(storage.foldername(name))[1]
  )
);
