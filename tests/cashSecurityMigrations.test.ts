import {describe,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';

describe('cash database security gates',()=>{
  test('P7 keeps closed shifts and linked financial records immutable',()=>{
    const sql=readFileSync('supabase/migrations/20261007035130_closed_cash_immutability_p7.sql','utf8');
    expect(sql).toContain('trg_protect_closed_cash_session');
    expect(sql).toContain('trg_protect_closed_sale');
    expect(sql).toContain('trg_protect_closed_sale_payment');
    expect(sql).toContain('trg_protect_closed_cash_movement');
    expect(sql).toContain("old.status='FECHADO'");
  });
  test('P10 enforces tenant/store/session scope in foreign keys',()=>{
    const sql=readFileSync('supabase/migrations/20261007035339_cash_multitenant_scope_constraints_p10.sql','utf8');
    expect(sql).toContain('sales_session_scope_fk');
    expect(sql).toContain('cash_movements_session_scope_fk');
    expect(sql).toContain('sale_payments_sale_scope_fk');
    expect(sql).toContain('(cash_session_id,tenant_id,store_id)');
    expect(sql).toContain('(sale_id,tenant_id)');
  });
  test('P9 treats FIADO as receivable settlement, not physical cash',()=>{
    const sql=readFileSync('supabase/migrations/20261007035315_fiado_reconciliation_p9.sql','utf8');
    expect(sql).toContain('closing_report_fiado');
    expect(sql).toContain('cash_session_fiado_total');
    expect(sql).toContain('fiado_receivable');
  });
});
