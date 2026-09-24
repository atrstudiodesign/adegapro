import React, { useEffect, useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { productionDb } from '../../services/productionDb';

export const ProductionSalesHistoryView:React.FC=()=>{
 const [rows,setRows]=useState<any[]>([]);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const load=async()=>{setBusy(true);setError('');try{setRows(await productionDb.getSales());}catch(e:any){setError(e?.message||'Falha ao carregar vendas.');}finally{setBusy(false);}};useEffect(()=>{void load();},[]);
 return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-neutral-950">
  <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-800"><div><h1 className="text-xl font-black text-white flex items-center gap-2"><Receipt size={22} className="text-amber-400"/>Vendas de Produção</h1><p className="text-xs text-neutral-400 mt-1">Histórico carregado diretamente do Supabase.</p></div><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button></div>
  {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral-950/70 text-neutral-400 uppercase"><tr><th className="p-3">Venda</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Desconto</th><th className="p-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-neutral-800">
   {rows.map(r=><tr key={r.id}><td className="p-3 font-mono text-white">#{r.sale_number}</td><td className="p-3 text-neutral-300">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3"><span className={r.status==='PAGA'?'text-emerald-400':'text-neutral-400'}>{r.status}</span></td><td className="p-3 text-right font-mono">R$ {Number(r.discount||0).toFixed(2)}</td><td className="p-3 text-right font-mono font-black text-amber-400">R$ {Number(r.total||0).toFixed(2)}</td></tr>)}
   {rows.length===0&&<tr><td colSpan={5} className="p-8 text-center text-neutral-500">Nenhuma venda em produção.</td></tr>}
  </tbody></table></div></div>
 </div>;
};