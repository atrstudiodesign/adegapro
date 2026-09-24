import React, { useEffect, useState } from 'react';
import { Boxes, Users, Wallet, ShoppingCart, RefreshCw, Database } from 'lucide-react';
import { productionDb } from '../../services/productionDb';

export const ProductionDashboardView:React.FC<{onNavigate:(tab:string)=>void}> = ({onNavigate}) => {
  const [stats,setStats]=useState({products:0,low:0,customers:0,openCash:0}); const [busy,setBusy]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setBusy(true);setError('');try{const [p,c,s]=await Promise.all([productionDb.getProducts(),productionDb.getCustomers(),productionDb.getCashSessions()]);setStats({products:p.length,low:p.filter(x=>x.currentStock<=x.minStock).length,customers:c.length,openCash:s.filter(x=>x.status==='ABERTO').length});}catch(e:any){setError(e?.message||'Falha ao carregar dashboard.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const cards=[{label:'Produtos',value:stats.products,icon:Boxes,tab:'products'},{label:'Estoque baixo',value:stats.low,icon:ShoppingCart,tab:'products'},{label:'Clientes',value:stats.customers,icon:Users,tab:'customers'},{label:'Caixas abertos',value:stats.openCash,icon:Wallet,tab:'cash'}];
  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-neutral-950">
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800"><div><h1 className="text-xl font-black text-white flex items-center gap-2"><Database size={22} className="text-emerald-400"/>Dashboard Produção</h1><p className="text-xs text-neutral-400 mt-1">Indicadores carregados exclusivamente do Supabase.</p></div><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button></div>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(({label,value,icon:Icon,tab})=><button key={label} onClick={()=>onNavigate(tab)} className="text-left p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40"><Icon size={20} className="text-amber-400 mb-3"/><div className="text-3xl font-black text-white">{busy?'—':value}</div><div className="text-xs text-neutral-400 mt-1">{label}</div></button>)}</div>
    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/50 text-sm text-neutral-300">Ambiente real ativo: autenticação, aceite legal, operador seguro, catálogo, clientes, caixa, PDV, suporte e cadastro da loja estão conectados ao banco de produção.</div>
  </div>;
};