alter table public.hr_shift_attendance
 add column if not exists access_origin text not null default 'NAO_INFORMADO',
 add column if not exists record_status text not null default 'ATIVO',
 add column if not exists amended_at timestamptz,
 add column if not exists amended_by uuid,
 add column if not exists amendment_reason text;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='hr_shift_attendance_access_origin_chk') then
  alter table public.hr_shift_attendance add constraint hr_shift_attendance_access_origin_chk check(access_origin in('NA_LOJA','EXTERNO','NAO_INFORMADO'));
 end if;
 if not exists(select 1 from pg_constraint where conname='hr_shift_attendance_record_status_chk') then
  alter table public.hr_shift_attendance add constraint hr_shift_attendance_record_status_chk check(record_status in('ATIVO','CANCELADO'));
 end if;
end $$;

create or replace function public.record_operator_attendance_v2(p_store_id uuid,p_operator_id uuid,p_event_type text,p_notes text default null,p_access_origin text default 'NAO_INFORMADO')
returns uuid language plpgsql security definer set search_path to 'public','private','auth'
as $$
declare v_tenant uuid; v_name text; v_id uuid;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 if p_event_type not in ('ENTRADA_PIN','SAIDA_TURNO','FALTA') then raise exception 'invalid attendance event'; end if;
 if p_access_origin not in ('NA_LOJA','EXTERNO','NAO_INFORMADO') then raise exception 'invalid access origin'; end if;
 select tenant_id into v_tenant from public.stores where id=p_store_id and active=true;
 select name into v_name from public.operators where id=p_operator_id and tenant_id=v_tenant and store_id=p_store_id and active=true;
 if v_name is null then raise exception 'operator not found'; end if;
 insert into public.hr_shift_attendance(tenant_id,store_id,operator_id,operator_name,event_type,notes,access_origin)
 values(v_tenant,p_store_id,p_operator_id,v_name,p_event_type,nullif(trim(coalesce(p_notes,'')),''),p_access_origin) returning id into v_id;
 return v_id;
end $$;
revoke execute on function public.record_operator_attendance_v2(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.record_operator_attendance_v2(uuid,uuid,text,text,text) to authenticated;

create or replace function public.admin_update_hr_attendance(p_store_id uuid,p_operator_token text,p_attendance_id uuid,p_action text,p_event_at timestamptz default null,p_notes text default null,p_access_origin text default null,p_reason text default null)
returns void language plpgsql security definer set search_path to 'public','private','auth'
as $$
declare v_admin record;
begin
 if auth.uid() is null or not private.has_store_access(p_store_id) then raise exception 'store access denied'; end if;
 select * into v_admin from private.assert_hr_operator(p_store_id,p_operator_token);
 if v_admin.operator_id is null then raise exception 'admin or manager required'; end if;
 if p_action not in ('ALTERAR','CANCELAR') then raise exception 'invalid action'; end if;
 if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'audit reason required'; end if;
 if p_access_origin is not null and p_access_origin not in ('NA_LOJA','EXTERNO','NAO_INFORMADO') then raise exception 'invalid access origin'; end if;
 update public.hr_shift_attendance set
   event_at=case when p_action='ALTERAR' then coalesce(p_event_at,event_at) else event_at end,
   notes=case when p_action='ALTERAR' then coalesce(p_notes,notes) else notes end,
   access_origin=case when p_action='ALTERAR' then coalesce(p_access_origin,access_origin) else access_origin end,
   record_status=case when p_action='CANCELAR' then 'CANCELADO' else record_status end,
   amended_at=now(),amended_by=v_admin.operator_id,amendment_reason=trim(p_reason)
 where id=p_attendance_id and store_id=p_store_id;
 if not found then raise exception 'attendance record not found'; end if;
end $$;
revoke execute on function public.admin_update_hr_attendance(uuid,text,uuid,text,timestamptz,text,text,text) from public,anon;
grant execute on function public.admin_update_hr_attendance(uuid,text,uuid,text,timestamptz,text,text,text) to authenticated;