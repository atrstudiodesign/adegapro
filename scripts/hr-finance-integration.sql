-- Integração RH -> Financeiro
-- Pagamentos marcados como PAGO geram uma única saída financeira de RH.
create unique index if not exists financial_transactions_hr_reference_uidx
  on public.financial_transactions(store_id,source,reference_id)
  where source='RH' and reference_id is not null;

-- Função save_hr_payroll_entry em produção foi atualizada para:
-- 1) preservar isolamento tenant/loja e autorização ADMINISTRADOR/GERENTE via private.assert_hr_operator;
-- 2) impedir que um holerite já pago volte a PENDENTE/CANCELADO;
-- 3) ao status PAGO, fazer UPSERT idempotente em financial_transactions com:
--      transaction_type='DESPESA', category='RH', source='RH', reference_id=<payroll_id>;
-- 4) não expor nome do funcionário na descrição financeira geral.

-- Lançamentos manuais de RH (entrada/saída) também exigem ADMINISTRADOR/GERENTE.
-- Assinatura:
-- public.save_hr_financial_movement(uuid,text,jsonb)
-- Tipos aceitos: RECEITA | DESPESA
-- source='RH_MANUAL', category='RH'; employee_id opcional em reference_id.
