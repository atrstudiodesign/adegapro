export type CashClosingInput = {
  salesTotal:number;
  cashReceived:number;
  pixReceived:number;
  debitReceived:number;
  creditReceived:number;
  openingBalance:number;
  supplies:number;
  withdrawals:number;
  linkedCashExpenses:number;
  countedCash?:number|null;
};

const cents=(value:number)=>Math.round((Number(value)||0)*100)/100;

export function calculateCashClosing(input:CashClosingInput){
  const receiptsTotal=cents(input.cashReceived+input.pixReceived+input.debitReceived+input.creditReceived);
  const reconciliationDifference=cents(receiptsTotal-input.salesTotal);
  const expectedPhysicalCash=cents(input.openingBalance+input.cashReceived+input.supplies-input.withdrawals-input.linkedCashExpenses);
  const countedCash=input.countedCash==null?null:cents(input.countedCash);
  const physicalCashDifference=countedCash==null?null:cents(countedCash-expectedPhysicalCash);
  return {receiptsTotal,reconciliationDifference,expectedPhysicalCash,countedCash,physicalCashDifference,reconciled:Math.abs(reconciliationDifference)<=0.01};
}
