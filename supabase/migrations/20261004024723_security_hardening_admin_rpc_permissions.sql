create or replace function private.assert_hr_operator(p_store_id uuid,p_token text)
returns table(operator_id uuid,tenant_id uuid,role text)
language sql security definer set search_path='public','auth','extensions','private' as $$
 select o.id,o.tenant_id,o.role
 from public.operator_sessions s join public.operators o on o.id=s.operator_id
 where s.auth_user_id=auth.uid() and s.store_id=p_store_id
   and s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
   and s.revoked_at is null and s.expires_at>now()
   and o.active=true and o.store_id=p_store_id and o.role in('ADMINISTRADOR','GERENTE')
   and private.has_store_access(p_store_id)
   and private.has_feature(o.tenant_id,'hr.manage','MANAGE')
 limit 1
$$;

revoke all on function private.assert_hr_operator(uuid,text) from public,anon,authenticated;

revoke execute on function public.add_cash_session_admin_note(uuid,text,uuid,text,boolean) from public,anon;
revoke execute on function public.admin_amend_cash_session(uuid,text,uuid,text,text,text) from public,anon;
revoke execute on function public.admin_update_hr_attendance(uuid,text,uuid,text,timestamptz,text,text,text) from public,anon;
revoke execute on function public.audit_cash_session_secure(uuid,text,uuid) from public,anon;
revoke execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) from public,anon;
revoke execute on function public.resolve_hr_cash_withdrawal(uuid,text,uuid,text,uuid,text) from public,anon;
grant execute on function public.add_cash_session_admin_note(uuid,text,uuid,text,boolean) to authenticated;
grant execute on function public.admin_amend_cash_session(uuid,text,uuid,text,text,text) to authenticated;
grant execute on function public.admin_update_hr_attendance(uuid,text,uuid,text,timestamptz,text,text,text) to authenticated;
grant execute on function public.audit_cash_session_secure(uuid,text,uuid) to authenticated;
grant execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) to authenticated;
grant execute on function public.resolve_hr_cash_withdrawal(uuid,text,uuid,text,uuid,text) to authenticated;