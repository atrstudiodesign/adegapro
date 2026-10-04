import { supabase } from './supabase';

const TOKEN_KEY='adega_pro_operator_session_token';

export async function saveCashClosingReport(sessionId:string,pix:number,debit:number,credit:number,cash:number){
  const token=sessionStorage.getItem(TOKEN_KEY);
  if(!token) throw new Error('Sessão do operador não encontrada.');
  const {data,error}=await supabase.rpc('save_cash_closing_report_secure',{
    p_cash_session_id:sessionId,p_operator_token:token,p_pix:pix,p_debit:debit,p_credit:credit,p_cash:cash
  });
  if(error) throw error;
  return data as any;
}
