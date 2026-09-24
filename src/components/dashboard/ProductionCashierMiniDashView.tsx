import React,{useEffect,useMemo,useState} from 'react';
import { Package, RefreshCw, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState, MetricCard, PageHeader, ProductThumb, StatusBadge } from '../ui/ProUi';

export const ProductionCashierMiniDashView:React.FC<{onNavigate:(tab:string)=>void}>=({onNavigate})=>{
  const[sales,setSales]=useState<any[]>([]);
  const[session,setSession]=useState<any>(null);
  const[products,setProducts]=useState<any[]>([]);
  const[busy,setBusy]=useState(true);
  const[error,setError]=useState('');

  const load=async()=>{
    setBusy(true);setError('');
    try{
      const[s,p]=await Promise.all([productionDb.getSales(100),productionDb.getProducts()]);
      setSales(s);setProducts(p);setSession(await productionDb.getCurrentCashSession());
    }catch(e:any){setError(e?.message||'Falha ao carregar mini dashboard.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);

  const m=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const todaySales=sales.filter(s=>s.status!=='CANCELADA'&&String(s.created_at||'').slice(0,10)===today);
    const total=todaySales.reduce((a,s)=>a+Number(s.total||0),0);
    const low=products.filter(p=>!p.isCombo&&p.currentStock<=p.minStock);
    return{count:todaySales.length,total,low};
  },[sales,products]);

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto text-white space-y-5">
    <PageHeader eyebrow="Frente de loja" title="Mini dashboard do caixa" description="Visão rápida para o operador com vendas, caixa e alertas de estoque." actions={
      <button onClick={()=>void load()} disabled={busy} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex items-center gap-2">
        <RefreshCw size={14}/>{busy?'Atualizando...':'Atualizar'}
      </button>
    }/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard label="Vendas hoje" value={m.count} icon={ShoppingCart} onClick={()=>onNavigate('sales')}/>
      <MetricCard label="Faturamento" value={'R$ '+m.total.toLocaleString('pt-BR',{minimumFractionDigits:2})} icon={TrendingUp} tone="emerald" onClick={()=>onNavigate('sales')}/>
      <MetricCard label="Saldo caixa" value={session?'R$ '+Number(session.expectedCashInRegister||0).toLocaleString('pt-BR',{minimumFractionDigits:2}):'Fechado'} icon={Wallet} tone={session?'amber':'rose'} onClick={()=>onNavigate('cash')}/>
      <MetricCard label="Estoque baixo" value={m.low.length} icon={Package} tone={m.low.length?'rose':'emerald'} onClick={()=>onNavigate('stock')}/>
    </div>

    <div className="grid xl:grid-cols-[.75fr_1.25fr] gap-4">
      <section className="ap-panel p-4">
        <div className="flex items-center justify-between"><h2 className="font-black">Sessão atual</h2><StatusBadge tone={session?'success':'danger'}>{session?'ABERTA':'FECHADA'}</StatusBadge></div>
        <div className="mt-4 text-xs text-neutral-400">{session?`${session.cashRegisterNumber} · aberta em ${new Date(session.openedAt).toLocaleString('pt-BR')}`:'Nenhum caixa aberto para o operador atual.'}</div>
        {!session&&<button onClick={()=>onNavigate('cash')} className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black">Abrir caixa</button>}
      </section>
      <section className="ap-panel p-4">
        <div className="flex justify-between gap-3"><div><h2 className="font-black">Atenção no estoque</h2><p className="text-[10px] text-neutral-500 mt-1">Produtos no mínimo ou abaixo.</p></div><button onClick={()=>onNavigate('stock')} className="text-[10px] text-amber-400 font-black">VER ESTOQUE</button></div>
        {m.low.length===0?<div className="mt-4"><EmptyState title="Estoque sob controle" description="Nenhum produto está abaixo do estoque mínimo."/></div>:<div className="grid sm:grid-cols-2 gap-2 mt-4">{m.low.slice(0,6).map((p:any)=><div key={p.id} className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3"><ProductThumb src={p.imageUrl} alt={p.name} size="sm"/><div className="min-w-0 flex-1"><div className="text-xs font-bold truncate">{p.name}</div><div className="text-[10px] text-rose-400 mt-1">{p.currentStock} {p.unit} · mínimo {p.minStock}</div></div></div>)}</div>}
      </section>
    </div>
  </div>;
};