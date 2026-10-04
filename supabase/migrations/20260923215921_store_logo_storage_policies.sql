
drop policy if exists store_logos_read on storage.objects;
create policy store_logos_read
on storage.objects for select
to public
using (bucket_id = 'store-logos');

drop policy if exists store_logos_insert on storage.objects;
create policy store_logos_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'store-logos'
  and exists (
    select 1
    from public.user_store_access usa
    where usa.user_id = auth.uid()
      and usa.active
      and name like usa.tenant_id::text || '/%'
  )
);

drop policy if exists store_logos_update on storage.objects;
create policy store_logos_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'store-logos'
  and exists (
    select 1 from public.user_store_access usa
    where usa.user_id = auth.uid()
      and usa.active
      and name like usa.tenant_id::text || '/%'
  )
)
with check (
  bucket_id = 'store-logos'
  and exists (
    select 1 from public.user_store_access usa
    where usa.user_id = auth.uid()
      and usa.active
      and name like usa.tenant_id::text || '/%'
  )
);

drop policy if exists store_logos_delete on storage.objects;
create policy store_logos_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'store-logos'
  and exists (
    select 1 from public.user_store_access usa
    where usa.user_id = auth.uid()
      and usa.active
      and name like usa.tenant_id::text || '/%'
  )
);
