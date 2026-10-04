
insert into public.platform_partner_policies(version,effective_at,active,title,content)
values(
 '2026.09-r1',now(),true,'Política Comercial de Indicação — Autônomos',
 jsonb_build_object(
  'subscription',jsonb_build_object('price',149.00,'commission',35.00,'trigger','PRIMEIRO_PAGAMENTO_CONFIRMADO','recurrence','UNICA'),
  'custom',jsonb_build_object('price',990.00,'installments',3,'installment_value',330.00,'commission',200.00,'trigger','PRIMEIRA_PARCELA_CONFIRMADA','recurrence','UNICA'),
  'rules',jsonb_build_array(
    'A comissão só nasce após confirmação de pagamento real do cliente.',
    'Cadastro, proposta, promessa de pagamento ou boleto emitido não geram comissão.',
    'Em caso de estorno, fraude, chargeback ou cancelamento do primeiro pagamento antes do repasse, a comissão é cancelada.',
    'Modo IMEDIATO: comissão fica LIBERADA assim que o pagamento do cliente for validado.',
    'Modo FECHAMENTO_MENSAL: comissão validada entra no fechamento mensal e fica AGENDADA para o dia definido do parceiro.',
    'Cada venda gera uma única comissão de aquisição, salvo bônus ou campanhas formalmente cadastradas.',
    'Venda duplicada ou disputa de indicação deve ser validada no ATR Control antes do repasse.',
    'O vínculo da indicação considera o código/link registrado no onboarding ou lançamento manual validado.',
    'Comissões pagas permanecem no histórico; correções são feitas por ajuste.',
    'E-mail e telefone do parceiro devem estar validados para liberação de repasse.'
  )
 )
)
on conflict(version) do update set active=true,title=excluded.title,content=excluded.content;
update public.platform_partner_policies set active=false where version<>'2026.09-r1';
