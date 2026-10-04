revoke execute on function public.record_operator_attendance(uuid,uuid,text,text) from anon;
revoke execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) from anon;
grant execute on function public.record_operator_attendance(uuid,uuid,text,text) to authenticated;
grant execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) to authenticated;