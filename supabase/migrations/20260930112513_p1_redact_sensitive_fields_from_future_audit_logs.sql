
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  v_tenant uuid;
  v_store uuid;
  v_entity_id text;
  v_old jsonb;
  v_new jsonb;
  v_redact text[] := array[
    'cpf','phone','whatsapp','email','address','notes',
    'pin_hash','token_hash','secret_ref','pix_key'
  ];
begin
  v_tenant := coalesce((to_jsonb(new)->>'tenant_id')::uuid, (to_jsonb(old)->>'tenant_id')::uuid);
  begin
    v_store := coalesce((to_jsonb(new)->>'store_id')::uuid, (to_jsonb(old)->>'store_id')::uuid);
  exception when others then
    v_store := null;
  end;
  v_entity_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');

  v_old := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) - v_redact else null end;
  v_new := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - v_redact else null end;

  insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,old_data,new_data)
  values(v_tenant,v_store,auth.uid(),tg_op,tg_table_name,v_entity_id,v_old,v_new);

  return coalesce(new,old);
end
$$;
