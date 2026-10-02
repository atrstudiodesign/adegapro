import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, RefreshCw, SlidersHorizontal, AlertTriangle, TrendingUp } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { Product, Store } from '../../types';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

const money = (value:number) => 'R$ ' + value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

export const ProductionStockView:React.FC=()=>{
 const [products,setProducts]=useState<Product[]>([]);
 const[moves,setMoves]=useState<any[]>([]);
 const[expiry,setExpiry]=useState<any[]>([]);
 const[store,setStore]=useState<Store|null>(null);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[feedback,setFeedback]=useState('');
 const[filter,setFilter]=useState<'ALL'|'CRITICAL'|'LOW'|'NORMAL'|'EXCESS'|'EXPIRED'|'EXP7'|'EXP15'|'EXP30'|'NOEXP'>('ALL');

 const load=async()=>{
   setBusy(true);setError('');
   try{
     const[p,m,e,s]=await Promise.all([
       productionDb.getProducts(),
       productionDb.getStockMovements(),
       productionDb.getExpiryAlerts(3650),
       productionDb.getStore()
     ]);
     setProducts(p);setMoves(m);setExpiry(e);setStore(s);
   }catch(e:any){setError(e?.message||'Falha ao carregar estoque.');}
   finally{setBusy(false);}
 };
 useEffect(()=>{void load();},[]);

 const adjust=async(p:Product)=>{
   const raw=window.prompt('Novo saldo para '+p.name+':',String(p.currentStock));
   if(raw===null)return;
   const qty=Number(raw.replace(',','.'));
   if(!Number.isFinite(qty)||qty<0){setError('Quantidade inválida.');return;}
   const reason=window.prompt('Motivo do ajuste:')?.trim()||'Ajuste manual';
   setBusy(true);
   try{await productionDb.adjustStock(p.id,qty,reason);setFeedback('Estoque ajustado com trilha de auditoria.');await load();}
   catch(e:any){setError(e?.message||'Falha ao ajustar estoque.');}
   finally{setBusy(false);}
 };

 const statsFor=(p:Product)=>{
   const pm=moves
     .filter((m:any)=>m.product_id===p.id)
     .sort((a:any,b:any)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
   const first=pm[0];
   const firstIsInitial=Boolean(first&&/estoque inicial do produto/i.test(String(first.reason||'')));
   const initial=first ? Number(firstIsInitial?first.next_stock:first.previous_stock) : null;
   const flow=firstIsInitial?pm.slice(1):pm;
   let entries=0,exits=0;
   flow.forEach((m:any)=>{
     const delta=Number(m.next_stock||0)-Number(m.previous_stock||0);
     if(delta>0)entries+=delta;
     if(delta<0)exits+=Math.abs(delta);
   });
   return {
     initial,
     entries,
     exits,
     final:Number(p.currentStock||0),
     value:Number(p.costPrice||0)>0?Number(p.currentStock||0)*Number(p.costPrice||0):null
   };
 };

 const inventoryRanking=useMemo(()=>products.filter(p=>!p.isCombo).map(p=>{const pm=moves.filter((m:any)=>m.product_id===p.id);const exits30=pm.filter((m:any)=>{const d=Date.now()-new Date(m.created_at).getTime();const delta=Number(m.next_stock||0)-Number(m.previous_stock||0);return d<=30*86400000&&delta<0;}).reduce((n:number,m:any)=>n+Math.abs(Number(m.next_stock||0)-Number(m.previous_stock||0)),0);const lastExit=pm.filter((m:any)=>Number(m.next_stock||0)<Number(m.previous_stock||0)).sort((a:any,b:any)=>String(b.created_at).localeCompare(String(a.created_at)))[0];const daysWithoutExit=lastExit?Math.floor((Date.now()-new Date(lastExit.created_at).getTime())/86400000):999;const suggested=Math.max(0,Math.ceil(Math.max(Number(p.minStock||0),exits30)-Number(p.currentStock||0)));return{p,exits30,daysWithoutExit,suggested};}).sort((a,b)=>b.exits30-a.exits30),[products,moves]);
 const fastMoving=inventoryRanking.filter(x=>x.exits30>0).slice(0,10);
 const slowMoving=[...inventoryRanking].filter(x=>x.exits30>0).sort((a,b)=>a.exits30-b.exits30).slice(0,10);
 const stagnant=inventoryRanking.filter(x=>x.p.currentStock>0&&x.daysWithoutExit>=30).sort((a,b)=>b.daysWithoutExit-a.daysWithoutExit);
 const replenishment=inventoryRanking.filter(x=>x.suggested>0).sort((a,b)=>b.suggested-a.suggested);
 const critical=products.filter(p=>!p.isCombo&&p.currentStock<=0).length;
 const low=products.filter(p=>!p.isCombo&&p.currentStock>0&&p.currentStock<=p.minStock).length;
 const excess=products.filter(p=>!p.isCombo&&p.maxStock>0&&p.currentStock>p.maxStock).length;
 const expiryFor=(p:Product)=>{const rows=expiry.filter((x:any)=>x.product_id===p.id&&Number(x.quantity_remaining||0)>0);if(!rows.length)return null;return rows.sort((a:any,b:any)=>Number(a.days_to_expiry??99999)-Number(b.days_to_expiry??99999))[0];};
 const filteredProducts=products.filter(p=>{const ex=expiryFor(p);if(filter==='ALL')return true;if(filter==='EXPIRED')return !!ex&&Number(ex.days_to_expiry)<0;if(filter==='EXP7')return !!ex&&Number(ex.days_to_expiry)>=0&&Number(ex.days_to_expiry)<=7;if(filter==='EXP15')return !!ex&&Number(ex.days_to_expiry)>7&&Number(ex.days_to_expiry)<=15;if(filter==='EXP30')return !!ex&&Number(ex.days_to_expiry)>15&&Number(ex.days_to_expiry)<=30;if(filter==='NOEXP')return !ex;if(p.isCombo)return filter==='NORMAL';if(filter==='CRITICAL')return p.currentStock<=0;if(filter==='LOW')return p.currentStock>0&&p.currentStock<=p.minStock;if(filter==='EXCESS')return p.maxStock>0&&p.currentStock>p.maxStock;return p.currentStock>p.minStock&&!(p.maxStock>0&&p.currentStock>p.maxStock);});

 return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
  <PageHeader eyebrow="Inventário" title="Estoque" description="Campos alinhados à planilha sem duplicar dados: entradas, saídas e saldos são calculados pelas movimentações auditadas." actions={<button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button>}/>
  {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
  {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{feedback}</div>}

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <MetricCard label="Produtos" value={products.length} icon={Boxes}/>
    <MetricCard label="Críticos" value={critical} icon={AlertTriangle} tone={critical?'rose':'emerald'}/>
    <MetricCard label="Estoque baixo" value={low} icon={TrendingUp} tone={low?'amber':'emerald'}/>
    <MetricCard label="Acima do máximo" value={excess} icon={Boxes} tone={excess?'violet':'emerald'}/>
  </div>

  {products.length===0?<EmptyState title="Nenhum produto em estoque" description="A planilha foi comparada, mas nenhum item foi criado porque SKU e preços não foram informados. O sistema não inventa esses dados."/>:
  <section className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
    <div className="p-4 border-b border-neutral-800">
      <h2 className="font-bold text-white">Controle de estoque — visão compatível com a planilha</h2>
      <p className="text-[11px] text-neutral-500 mt-1">Adega = loja ativa. Estoque final = saldo atual. Valor final só aparece quando há custo cadastrado.</p><div className="flex flex-wrap gap-2 mt-3">{[['ALL','Todos'],['CRITICAL','Críticos'],['LOW','Estoque baixo'],['NORMAL','Normal'],['EXCESS','Acima da média'],['EXPIRED','Vencidos'],['EXP7','≤ 7 dias'],['EXP15','8–15 dias'],['EXP30','16–30 dias'],['NOEXP','Sem validade']].map(([value,label])=><button key={value} onClick={()=>setFilter(value as any)} className={'px-3 py-1.5 rounded-lg border text-[10px] font-black '+(filter===value?'border-amber-400 bg-amber-400/10 text-amber-300':'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white')}>{label}</button>)}</div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-xs">
        <thead className="bg-neutral-950/70 text-neutral-400 uppercase">
          <tr>
            <th className="p-3 text-left">Produto</th>
            <th className="p-3 text-left">Unidade</th>
            <th className="p-3 text-right">Preço custo</th>
            <th className="p-3 text-right">Preço venda</th>
            <th className="p-3 text-left">Adega</th>
            <th className="p-3 text-right">Estoque inicial</th>
            <th className="p-3 text-right">Entradas</th>
            <th className="p-3 text-right">Saídas</th>
            <th className="p-3 text-right">Estoque final</th>
            <th className="p-3 text-right">Valor estoque final</th><th className="p-3 text-left">Validade / lote</th>
            <th className="p-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {filteredProducts.map(p=>{const s=statsFor(p);const level=p.isCombo?'normal':p.currentStock<=0?'critical':p.currentStock<=p.minStock?'low':p.maxStock>0&&p.currentStock>p.maxStock?'excess':'normal';const ex=expiryFor(p);const expDays=ex?Number(ex.days_to_expiry):null;const rowTone=expDays!==null&&expDays<0?'bg-rose-950/55 hover:bg-rose-950/70':expDays!==null&&expDays<=7?'bg-orange-950/40 hover:bg-orange-950/55':level==='critical'?'bg-rose-950/45 hover:bg-rose-950/60':level==='low'?'bg-amber-950/30 hover:bg-amber-950/45':level==='excess'?'bg-violet-950/30 hover:bg-violet-950/45':'hover:bg-neutral-800/40';return <tr key={p.id} className={rowTone}>
            <td className="p-3 text-white font-bold"><div className="flex items-center gap-2 flex-wrap"><span>{p.name}</span>{level==='critical'&&<span className="px-2 py-0.5 rounded-full border border-rose-500/50 bg-rose-500/15 text-rose-300 text-[9px] uppercase font-black">Crítico</span>}{level==='low'&&<span className="px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 text-[9px] uppercase font-black">Estoque baixo</span>}{level==='excess'&&<span className="px-2 py-0.5 rounded-full border border-violet-500/50 bg-violet-500/15 text-violet-300 text-[9px] uppercase font-black">Acima da média</span>}</div><div className="text-[10px] font-normal text-neutral-500 mt-1">{p.sku||'SKU não informado'}</div></td>
            <td className="p-3 text-neutral-300">{p.unit||'—'}</td>
            <td className="p-3 text-right font-mono">{p.costPrice>0?money(p.costPrice):'—'}</td>
            <td className="p-3 text-right font-mono">{p.salePrice>0?money(p.salePrice):'—'}</td>
            <td className="p-3 text-neutral-300">{store?.tradeName||store?.name||'—'}</td>
            <td className="p-3 text-right font-mono">{s.initial==null?'—':s.initial}</td>
            <td className="p-3 text-right font-mono text-emerald-400">{s.entries}</td>
            <td className="p-3 text-right font-mono text-rose-400">{s.exits}</td>
            <td className="p-3 text-right font-mono font-black">{s.final} {p.unit}</td>
            <td className="p-3 text-right font-mono">{s.value==null?'—':money(s.value)}</td><td className="p-3">{ex?<><div className={expDays!<0?'font-black text-rose-400':expDays!<=7?'font-black text-orange-300':expDays!<=30?'font-black text-amber-300':'font-black text-emerald-400'}>{expDays!<0?'VENCIDO há '+Math.abs(expDays!)+'d':expDays===0?'VENCE HOJE':'vence em '+expDays+'d'}</div><div className="text-[10px] text-neutral-500">{new Date(ex.expiry_date+'T00:00:00').toLocaleDateString('pt-BR')} · lote {ex.lot_number||'—'} · {Number(ex.quantity_remaining)} un.</div></>:<span className="text-neutral-600">Sem validade cadastrada</span>}</td>
            <td className="p-3 text-right"><button disabled={busy} onClick={()=>void adjust(p)} className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 inline-flex items-center gap-2"><SlidersHorizontal size={14}/>Ajustar</button></td>
          </tr>})}
        </tbody>
      </table>
    </div>
  </section>}

  <div className="grid xl:grid-cols-2 gap-4">
   <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="font-black text-white">Ranking de saída · 30 dias</h2><p className="text-[10px] text-neutral-500 mt-1">Produtos com maior giro para orientar reposição.</p><div className="mt-3 space-y-2">{fastMoving.length?fastMoving.map((x,i)=><div key={x.p.id} className="flex justify-between gap-3 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><span><b className="text-amber-400 mr-2">#{i+1}</b>{x.p.name}</span><strong>{x.exits30} {x.p.unit}</strong></div>):<div className="text-xs text-neutral-500">Sem saídas nos últimos 30 dias.</div>}</div></section>
   <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="font-black text-white">Menor saída / baixo giro</h2><p className="text-[10px] text-neutral-500 mt-1">Itens com movimento reduzido no período.</p><div className="mt-3 space-y-2">{slowMoving.length?slowMoving.map(x=><div key={x.p.id} className="flex justify-between gap-3 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><span>{x.p.name}</span><strong className="text-neutral-400">{x.exits30} {x.p.unit}</strong></div>):<div className="text-xs text-neutral-500">Sem histórico suficiente.</div>}</div></section>
   <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="font-black text-white">Estoque estacionado</h2><p className="text-[10px] text-neutral-500 mt-1">Saldo disponível sem saída há 30 dias ou mais.</p><div className="mt-3 space-y-2">{stagnant.slice(0,12).map(x=><div key={x.p.id} className="flex justify-between gap-3 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><span>{x.p.name} · saldo {x.p.currentStock}</span><strong className="text-rose-300">{x.daysWithoutExit>=999?'sem saída registrada':x.daysWithoutExit+' dias'}</strong></div>)}</div></section>
   <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="font-black text-white">Sugestão de compra / reposição</h2><p className="text-[10px] text-neutral-500 mt-1">Base: giro dos últimos 30 dias, estoque mínimo e saldo atual. É uma sugestão operacional, não gera compra automática.</p><div className="mt-3 space-y-2">{replenishment.slice(0,15).map(x=><div key={x.p.id} className="flex justify-between gap-3 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><span>{x.p.name}<span className="block text-[9px] text-neutral-500">saldo {x.p.currentStock} · saída 30d {x.exits30} · mínimo {x.p.minStock}</span></span><strong className="text-emerald-400">Comprar {x.suggested}</strong></div>)}</div></section>
  </div>

  <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
    <h2 className="font-bold text-white mb-3">Últimas movimentações</h2>
    <div className="space-y-2">{moves.slice(0,50).map(m=><div key={m.id} className="grid grid-cols-[100px_1fr_auto] gap-3 text-xs border-b border-neutral-800 pb-2"><span className="text-amber-400">{m.movement_type}</span><span className="text-neutral-300">{m.reason||'—'}</span><span className="font-mono text-neutral-400">{m.previous_stock} → {m.next_stock}</span></div>)}</div>
  </section>
 </div>;
};
