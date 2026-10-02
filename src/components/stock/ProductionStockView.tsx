import React, { useEffect, useState } from 'react';
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

 const critical=products.filter(p=>!p.isCombo&&p.currentStock<=0).length;
 const low=products.filter(p=>!p.isCombo&&p.currentStock>0&&p.currentStock<=p.minStock).length;
 const excess=products.filter(p=>!p.isCombo&&p.maxStock>0&&p.currentStock>p.maxStock).length;

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
      <p className="text-[11px] text-neutral-500 mt-1">Adega = loja ativa. Estoque final = saldo atual. Valor final só aparece quando há custo cadastrado.</p>
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
            <th className="p-3 text-right">Valor estoque final</th>
            <th className="p-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {products.map(p=>{const s=statsFor(p);const level=p.isCombo?'normal':p.currentStock<=0?'critical':p.currentStock<=p.minStock?'low':p.maxStock>0&&p.currentStock>p.maxStock?'excess':'normal';const rowTone=level==='critical'?'bg-rose-950/45 hover:bg-rose-950/60':level==='low'?'bg-amber-950/30 hover:bg-amber-950/45':level==='excess'?'bg-violet-950/30 hover:bg-violet-950/45':'hover:bg-neutral-800/40';return <tr key={p.id} className={rowTone}>
            <td className="p-3 text-white font-bold"><div className="flex items-center gap-2 flex-wrap"><span>{p.name}</span>{level==='critical'&&<span className="px-2 py-0.5 rounded-full border border-rose-500/50 bg-rose-500/15 text-rose-300 text-[9px] uppercase font-black">Crítico</span>}{level==='low'&&<span className="px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 text-[9px] uppercase font-black">Estoque baixo</span>}{level==='excess'&&<span className="px-2 py-0.5 rounded-full border border-violet-500/50 bg-violet-500/15 text-violet-300 text-[9px] uppercase font-black">Acima da média</span>}</div><div className="text-[10px] font-normal text-neutral-500 mt-1">{p.sku||'SKU não informado'}</div></td>
            <td className="p-3 text-neutral-300">{p.unit||'—'}</td>
            <td className="p-3 text-right font-mono">{p.costPrice>0?money(p.costPrice):'—'}</td>
            <td className="p-3 text-right font-mono">{p.salePrice>0?money(p.salePrice):'—'}</td>
            <td className="p-3 text-neutral-300">{store?.tradeName||store?.name||'—'}</td>
            <td className="p-3 text-right font-mono">{s.initial==null?'—':s.initial}</td>
            <td className="p-3 text-right font-mono text-emerald-400">{s.entries}</td>
            <td className="p-3 text-right font-mono text-rose-400">{s.exits}</td>
            <td className="p-3 text-right font-mono font-black">{s.final} {p.unit}</td>
            <td className="p-3 text-right font-mono">{s.value==null?'—':money(s.value)}</td>
            <td className="p-3 text-right"><button disabled={busy} onClick={()=>void adjust(p)} className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 inline-flex items-center gap-2"><SlidersHorizontal size={14}/>Ajustar</button></td>
          </tr>})}
        </tbody>
      </table>
    </div>
  </section>}

  <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
    <h2 className="font-bold text-white mb-3">Últimas movimentações</h2>
    <div className="space-y-2">{moves.slice(0,50).map(m=><div key={m.id} className="grid grid-cols-[100px_1fr_auto] gap-3 text-xs border-b border-neutral-800 pb-2"><span className="text-amber-400">{m.movement_type}</span><span className="text-neutral-300">{m.reason||'—'}</span><span className="font-mono text-neutral-400">{m.previous_stock} → {m.next_stock}</span></div>)}</div>
  </section>
 </div>;
};
