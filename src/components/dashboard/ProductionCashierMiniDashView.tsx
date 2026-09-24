import React,{useEffect,useMemo,useState} from 'react';
import { ShoppingCart, Wallet, Package, TrendingUp, RefreshCw } from 'lucide-react';
import { productionDb } from '../../services/productionDb';

export const ProductionCashierMiniDashView:React.FC<{onNavigate:(tab:string)=>void}>=({onNavigate})=>{
 const[sales,setSales]=useState<any[]>([]);const[session,setSession]=useState<any>(null);const[products,setProducts]=useState<any[]>([]);const[busy,setBusy]=useState(true);const[error,setError]=useState('');
 const load=async()=>{setBusy(true);setError('');try{const[s,p]=await Promise.all([productionDb.getSales(100),productionDb.getProducts()]);setSales(s);setProducts(p);setSession(await productionDb.getCurrentCashSession());}catch(e:any){setError(e?.message||'Falha ao carregar mini dashboard.');}finally{setBusy(false);}};
 useEffect(()=>{void load();},[]);
 const m=useMemo(()=>{const today=new Date().toISOString().slice(0,10);const todaySales=sales.filter(s=>s.status!=='CANCELADA'&&String(s.created_at||'').slice(0,10)===today);const total=todaySales.reduce((a,s)=>a+Number(s.total||0),0);const low=products.filter(p=>!p.isCombo&&p.currentStock<=p.minStock).length;return{count:todaySales.length,total,low};},[sales,products]);
 const cards=[['Vendas hoje',m.count,ShoppingCart,'sales'],['Faturamento',`R$ ${m.total.toFixed(2)}`,TrendingUp,'sales'],['Saldo caixa',session?`R$ ${Number(session.expectedCashInRegister||0).toFixed(2)}`:'Fechado',Wallet,'cash'],['Estoque baixo',m.low,Package,'stock']] as const;
 return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto bg-neutral-950 text-white space-y-5">
  <div className="flex items-center justify-between gap-3 pb-4 border-b border-neutral-800"><div><h1 className="text-xl font-black">Mini Dashboard do Caixa</h1><p className="text-xs text-neutral-400 mt-1">Dados reais do ambiente de produção.</p></div><button onClick={()=>void load()} disabled={busy} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button></div>
  {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([label,value,Icon,tab])=><button key={label} onClick={()=>onNavigate(tab)} className="text-left p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50"><Icon size={20} className="text-amber-400 mb-3"/><div className="text-xs text-neutral-500">{label}</div><div className="text-xl font-black mt-1">{value}</div></button>)}</div>
  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="text-sm font-bold">Sessão atual</div><div className="mt-3 text-xs text-neutral-400">{session?`${session.cashRegisterNumber} · aberta em ${new Date(session.openedAt).toLocaleString('pt-BR')}`:'Nenhum caixa aberto para o operador atual.'}</div></div>
 </div>;
};