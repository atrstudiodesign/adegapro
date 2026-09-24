import React,{useEffect,useMemo,useState} from 'react';
import { BarChart3, Boxes, CalendarClock, CreditCard, Database, ReceiptText, RefreshCw, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState, MetricCard, PageHeader, ProductThumb, StatusBadge } from '../ui/ProUi';

const money=(v:any)=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

export const ProductionDashboardView:React.FC<{onNavigate:(tab:string)=>void}> = ({onNavigate}) => {
  const[products,setProducts]=useState<any[]>([]);
  const[customers,setCustomers]=useState<any[]>([]);
  const[sessions,setSessions]=useState<any[]>([]);
  const[expiry,setExpiry]=useState<any[]>([]);
  const[analytics,setAnalytics]=useState<any>({});
  const[busy,setBusy]=useState(true);
  const[error,setError]=useState('');

  const load=async()=>{
    setBusy(true);setError('');
    try{
      const[p,c,s,e,a]=await Promise.all([
        productionDb.getProducts(),
        productionDb.getCustomers(),
        productionDb.getCashSessions(),
        productionDb.getExpiryAlerts(30),
        productionDb.getDashboardAnalytics()
      ]);
      setProducts(p);setCustomers(c);setSessions(s);setExpiry(e);setAnalytics(a||{});
    }catch(err:any){setError(err?.message||'Falha ao carregar dashboard.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);

  const low=useMemo(()=>products.filter(p=>!p.isCombo&&p.currentStock<=p.minStock),[products]);
  const openCash=sessions.filter(s=>s.status==='ABERTO').length;
  const today=analytics?.today||{};
  const last7=Array.isArray(analytics?.last7)?analytics.last7:[];
  const channels=Array.isArray(analytics?.channels)?analytics.channels:[];
  const payments=Array.isArray(analytics?.payments)?analytics.payments:[];
  const topProducts=Array.isArray(analytics?.top_products)?analytics.top_products:[];
  const maxRevenue=Math.max(1,...last7.map((x:any)=>Number(x.revenue||0)));
  const payables=analytics?.payables||{};
  const receivables=analytics?.receivables||{};

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-transparent">
    <PageHeader eyebrow="Visão geral" title="Dashboard da operação" description="Indicadores reais do tenant e da loja ativa, sincronizados com vendas, estoque, caixa e financeiro." actions={
      <button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2 hover:border-amber-500/40"><RefreshCw size={14}/>{busy?'Atualizando...':'Atualizar'}</button>
    }/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-3">
      <MetricCard label="Vendas hoje" value={busy?'—':today.count||0} icon={ShoppingCart} onClick={()=>onNavigate('sales')}/>
      <MetricCard label="Faturamento" value={busy?'—':money(today.revenue)} icon={TrendingUp} tone="emerald" onClick={()=>onNavigate('sales')}/>
      <MetricCard label="Ticket médio" value={busy?'—':money(today.ticket)} icon={ReceiptText} tone="sky" onClick={()=>onNavigate('reports')}/>
      <MetricCard label="Clientes" value={busy?'—':customers.length} icon={Users} onClick={()=>onNavigate('customers')}/>
      <MetricCard label="Estoque baixo" value={busy?'—':low.length} icon={Boxes} tone={low.length?'rose':'emerald'} onClick={()=>onNavigate('stock')}/>
      <MetricCard label="Vencendo ≤30d" value={busy?'—':expiry.length} icon={CalendarClock} tone={expiry.length?'warning':'emerald' as any} onClick={()=>onNavigate('purchases')}/>
      <MetricCard label="Caixas abertos" value={busy?'—':openCash} icon={Wallet} tone={openCash?'emerald':'warning' as any} onClick={()=>onNavigate('cash')}/>
      <MetricCard label="A receber" value={busy?'—':money(receivables.pending)} icon={CreditCard} tone="violet" onClick={()=>onNavigate('finance')}/>
    </div>

    <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-4">
      <section className="ap-panel p-4 sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-black text-white">Vendas dos últimos 7 dias</h2><p className="text-[10px] text-neutral-500 mt-1">Receita paga por dia</p></div><BarChart3 size={18} className="text-amber-400"/></div>
        {last7.length?<div className="h-52 mt-6 flex items-end gap-2 sm:gap-3">{last7.map((x:any)=><div key={String(x.date)} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2"><div title={money(x.revenue)} className="w-full max-w-16 rounded-t-lg bg-gradient-to-t from-amber-700 to-amber-300 min-h-1" style={{height:`${Math.max(3,Number(x.revenue||0)/maxRevenue*150)}px`}}/><div className="text-[9px] text-neutral-500">{new Date(String(x.date)+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'short'})}</div></div>)}</div>:<div className="mt-5"><EmptyState title="Sem vendas no período" description="O gráfico será preenchido automaticamente conforme as vendas forem registradas."/></div>}
      </section>

      <section className="ap-panel p-4 sm:p-5">
        <h2 className="font-black text-white">Canais de venda</h2><p className="text-[10px] text-neutral-500 mt-1">Últimos 30 dias</p>
        <div className="mt-4 space-y-4">{channels.length?channels.map((c:any)=>{const total=channels.reduce((a:number,x:any)=>a+Number(x.amount||0),0)||1;const pct=Number(c.amount||0)/total*100;return <div key={c.channel}><div className="flex justify-between text-xs"><span className="text-neutral-300">{c.channel==='PDV'?'PDV / Balcão':c.channel}</span><span className="font-mono text-neutral-400">{pct.toFixed(0)}%</span></div><div className="mt-1.5 h-2 rounded-full bg-neutral-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-600 to-amber-300" style={{width:`${pct}%`}}/></div></div>}):<div className="text-xs text-neutral-500 mt-5">Ainda não há canais com vendas pagas.</div>}</div>
      </section>
    </div>

    <div className="grid xl:grid-cols-3 gap-4">
      <section className="ap-panel p-4">
        <div className="flex justify-between gap-3"><div><h2 className="font-black text-white">Produtos mais vendidos</h2><p className="text-[10px] text-neutral-500">Últimos 30 dias</p></div><button onClick={()=>onNavigate('products')} className="text-[10px] font-black text-amber-400">CATÁLOGO</button></div>
        <div className="mt-4 space-y-2">{topProducts.length?topProducts.map((tp:any)=>{const p=products.find(x=>x.id===tp.product_id);return <div key={tp.product_id} className="flex items-center gap-3 p-2 rounded-xl bg-neutral-950 border border-neutral-800"><ProductThumb src={p?.imageUrl} alt={tp.name} size="sm"/><div className="min-w-0 flex-1"><div className="text-xs font-bold truncate">{tp.name}</div><div className="text-[10px] text-neutral-500">{Number(tp.quantity||0).toFixed(0)} un. · {money(tp.revenue)}</div></div></div>}):<div className="text-xs text-neutral-500">Sem ranking de produtos ainda.</div>}</div>
      </section>

      <section className="ap-panel p-4">
        <h2 className="font-black text-white">Formas de pagamento</h2><p className="text-[10px] text-neutral-500">Últimos 30 dias</p>
        <div className="mt-4 space-y-2">{payments.length?payments.map((p:any)=><div key={p.method} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div><div className="text-xs font-bold">{p.method}</div><div className="text-[9px] text-neutral-500">{p.count} lançamento(s)</div></div><div className="font-mono text-xs text-amber-400">{money(p.amount)}</div></div>):<div className="text-xs text-neutral-500">Sem pagamentos no período.</div>}</div>
      </section>

      <section className="ap-panel p-4 space-y-3">
        <h2 className="font-black text-white">Alertas operacionais</h2>
        <button onClick={()=>onNavigate('stock')} className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between gap-3 text-left"><span><span className="block text-xs font-bold">Estoque baixo</span><span className="text-[10px] text-neutral-500">{low.length} produto(s)</span></span><StatusBadge tone={low.length?'danger':'success'}>{low.length?'Atenção':'OK'}</StatusBadge></button>
        <button onClick={()=>onNavigate('purchases')} className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between gap-3 text-left"><span><span className="block text-xs font-bold">Validades</span><span className="text-[10px] text-neutral-500">{expiry.length} lote(s) em até 30 dias</span></span><StatusBadge tone={expiry.length?'warning':'success'}>{expiry.length?'Revisar':'OK'}</StatusBadge></button>
        <button onClick={()=>onNavigate('finance')} className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between gap-3 text-left"><span><span className="block text-xs font-bold">Contas vencidas</span><span className="text-[10px] text-neutral-500">Pagar {money(payables.overdue)} · Receber {money(receivables.overdue)}</span></span><StatusBadge tone={Number(payables.overdue||0)+Number(receivables.overdue||0)>0?'danger':'success'}>Financeiro</StatusBadge></button>
      </section>
    </div>

    <div className="p-4 rounded-2xl bg-emerald-950/15 border border-emerald-800/40 text-xs text-neutral-400 flex items-start gap-2"><Database size={15} className="text-emerald-400 shrink-0 mt-0.5"/>Dados do dashboard são calculados no backend da loja atual. Nenhum indicador usa dados de outro tenant.</div>
  </div>;
};