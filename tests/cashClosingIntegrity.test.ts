import {describe,expect,test} from 'bun:test';
import {calculateCashClosing} from '../src/domain/cashClosingIntegrity';

describe('cash closing integrity',()=>{
  test('perfect close reconciles sales and receipts',()=>{
    const r=calculateCashClosing({salesTotal:500,cashReceived:120,pixReceived:200,debitReceived:150,creditReceived:30,openingBalance:50,supplies:0,withdrawals:0,linkedCashExpenses:0,countedCash:170});
    expect(r.receiptsTotal).toBe(500); expect(r.reconciliationDifference).toBe(0); expect(r.reconciled).toBe(true);
    expect(r.expectedPhysicalCash).toBe(170); expect(r.physicalCashDifference).toBe(0);
  });

  test('receipt mismatch is separate from physical cash',()=>{
    const r=calculateCashClosing({salesTotal:500,cashReceived:120,pixReceived:220,debitReceived:150,creditReceived:30,openingBalance:50,supplies:0,withdrawals:0,linkedCashExpenses:0,countedCash:170});
    expect(r.reconciliationDifference).toBe(20); expect(r.reconciled).toBe(false);
    expect(r.physicalCashDifference).toBe(0);
  });

  test('physical shortage does not change sales reconciliation',()=>{
    const r=calculateCashClosing({salesTotal:500,cashReceived:120,pixReceived:200,debitReceived:150,creditReceived:30,openingBalance:50,supplies:0,withdrawals:0,linkedCashExpenses:0,countedCash:160});
    expect(r.reconciliationDifference).toBe(0); expect(r.reconciled).toBe(true); expect(r.physicalCashDifference).toBe(-10);
  });

  test('withdrawals supplies and linked expenses only affect physical expected cash',()=>{
    const r=calculateCashClosing({salesTotal:300,cashReceived:100,pixReceived:200,debitReceived:0,creditReceived:0,openingBalance:20,supplies:30,withdrawals:15,linkedCashExpenses:10,countedCash:125});
    expect(r.receiptsTotal).toBe(300); expect(r.reconciliationDifference).toBe(0);
    expect(r.expectedPhysicalCash).toBe(125); expect(r.physicalCashDifference).toBe(0);
  });

  test('no count produces no invented physical difference',()=>{
    const r=calculateCashClosing({salesTotal:100,cashReceived:40,pixReceived:60,debitReceived:0,creditReceived:0,openingBalance:10,supplies:0,withdrawals:0,linkedCashExpenses:0});
    expect(r.reconciliationDifference).toBe(0); expect(r.countedCash).toBeNull(); expect(r.physicalCashDifference).toBeNull();
  });

  test('RAVI-style declared mix remains a reconciliation mismatch, not a physical conclusion',()=>{
    const r=calculateCashClosing({salesTotal:282.42,cashReceived:46.80,pixReceived:232,debitReceived:120,creditReceived:18,openingBalance:.10,supplies:14,withdrawals:14,linkedCashExpenses:0,countedCash:46.80});
    expect(r.receiptsTotal).toBe(416.80); expect(r.reconciliationDifference).toBe(134.38); expect(r.reconciled).toBe(false);
    expect(r.expectedPhysicalCash).toBe(46.90); expect(r.physicalCashDifference).toBe(-.10);
  });
});
