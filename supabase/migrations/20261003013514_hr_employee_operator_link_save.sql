create or replace function public.save_hr_employee(p_store_id uuid,p_operator_token text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path='public','private','auth' as $$
declare v_operator uuid;v_tenant uuid;v_id uuid;v_link uuid:=nullif(p_payload->>'operator_id','')::uuid;
v_model text:=coalesce(p_payload->>'employment_model','OUTRO');v_frequency text:=coalesce(p_payload->>'payment_frequency','MENSAL');
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 select operator_id,tenant_id into v_operator,v_tenant from private.assert_hr_operator(p_store_id,p_operator_token);
 if v_operator is null then raise exception 'forbidden'; end if;
 if nullif(trim(p_payload->>'full_name'),'') is null then raise exception 'nome obrigatório'; end if;
 if v_model not in ('CLT','AUTONOMO','DIARISTA','TEMPORARIO','SEM_CONTRATO_FORMAL','OUTRO') then raise exception 'modalidade inválida'; end if;
 if v_frequency not in ('DIARIO','SEMANAL','QUINZENAL','MENSAL','OUTRO') then raise exception 'frequência inválida'; end if;
 if v_link is not null and not exists(select 1 from public.operators where id=v_link and store_id=p_store_id and tenant_id=v_tenant and active=true) then raise exception 'operador inválido'; end if;
 v_id:=nullif(p_payload->>'id','')::uuid;
 if v_id is null then
  insert into public.hr_employees(tenant_id,store_id,operator_id,full_name,cpf,admission_date,role_title,employment_model,payment_frequency,base_amount,phone,address,active,notes,created_by_operator)
  values(v_tenant,p_store_id,v_link,trim(p_payload->>'full_name'),nullif(regexp_replace(coalesce(p_payload->>'cpf',''),'\D','','g'),''),nullif(p_payload->>'admission_date','')::date,nullif(trim(p_payload->>'role_title'),''),v_model,v_frequency,greatest(0,coalesce((p_payload->>'base_amount')::numeric,0)),nullif(trim(p_payload->>'phone'),''),nullif(trim(p_payload->>'address'),''),coalesce((p_payload->>'active')::boolean,true),nullif(trim(p_payload->>'notes'),''),v_operator) returning id into v_id;
 else
  update public.hr_employees set operator_id=v_link,full_name=trim(p_payload->>'full_name'),cpf=nullif(regexp_replace(coalesce(p_payload->>'cpf',''),'\D','','g'),''),admission_date=nullif(p_payload->>'admission_date','')::date,role_title=nullif(trim(p_payload->>'role_title'),''),employment_model=v_model,payment_frequency=v_frequency,base_amount=greatest(0,coalesce((p_payload->>'base_amount')::numeric,0)),phone=nullif(trim(p_payload->>'phone'),''),address=nullif(trim(p_payload->>'address'),''),active=coalesce((p_payload->>'active')::boolean,true),notes=nullif(trim(p_payload->>'notes'),''),updated_at=now() where id=v_id and store_id=p_store_id and tenant_id=v_tenant;
  if not found then raise exception 'funcionário não encontrado'; end if;
 end if;
 insert into public.audit_logs(tenant_id,store_id,user_id,action,entity,entity_id,metadata) values(v_tenant,p_store_id,auth.uid(),'HR_EMPLOYEE_SAVED','hr_employee',v_id::text,jsonb_build_object('operator_id',v_operator,'linked_operator_id',v_link));
 return v_id;
end $$;