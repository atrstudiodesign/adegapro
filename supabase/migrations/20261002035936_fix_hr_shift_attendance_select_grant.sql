grant select on table public.hr_shift_attendance to authenticated;
revoke insert,update,delete on table public.hr_shift_attendance from authenticated;
grant execute on function public.record_operator_attendance(uuid,uuid,text,text) to authenticated;
grant execute on function public.register_hr_absence_secure(uuid,text,uuid,timestamptz,text) to authenticated;