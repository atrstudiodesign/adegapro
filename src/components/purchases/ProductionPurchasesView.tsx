import React,{useEffect,useMemo,useState} from 'react';
import { ShoppingBag, Plus, RefreshCw, AlertTriangle, CalendarClock, Eye, X, Save, Trash2, PackageCheck } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { Product, Supplier } from '../../types';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

type EntryItem={productId:string;quantity:number;unitCost:number;lotNumber:string;expiryDate:string;newSalePrice:string};
const today=()=>new Date().toISOString().slice(0,10);
const plusDays=(n:number)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);

export const ProductionPurchasesView:React.FC=()=>{
 const[rows,setRows]=useState<any[]>([]);
 const[products,setProducts]=useState<Product[]>([]);
 const[suppliers,setSuppliers]=useState<Supplier[]>([]);
 const[alerts,setAlerts]=useState<any[]>([]);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[feedback,setFeedback]=useState('');
 const[open,setOpen]=useState(false);
 const[details,setDetails]=useState<any>(null);

 const[supplierId,setSupplierId]=useState('');
 const[invoice,setInvoice]=useState('');
 const[invoiceKey,setInvoiceKey]=useState('');
 const[issueDate,setIssueDate]=useState(today());
 const[paymentTerm,setPaymentTerm]=useState('30_DIAS');
 const[dueDate,setDueDate]=useState(plusDays(30));
 const[receiptStatus,setReceiptStatus]=useState('CONFERIDA');
 const[manifestStatus,setManifestStatus]=useState('NAO_INTEGRADA');
 const[freight,setFreight]=useState(0);
 const[discount,setDiscount]=useState(0);
 const[items,setItems]=useState<EntryItem[]>([]);

 const load=async()=>{setBusy(true);setError('');try{
   const[r,p,s,a]=await Promise.all([
     productionDb.getPurchases(),
     productionDb.getProducts(),
     productionDb.getSuppliers(),
     productionDb.getExpiryAlerts(30)
   ]);
   setRows(r);setProducts(p);setSuppliers(s);setAlerts(a);
 }catch(e:any){setError(e?.message||'Falha ao carregar compras.');}finally{setBusy(false);}};

 useEffect(()=>{void load();},[]);

 const start=()=>{setSupplierId('');setInvoice('');setInvoiceKey('');setIssueDate(today());setPaymentTerm('30_DIAS');setDueDate(plusDays(30));setReceiptStatus('CONFERIDA');setManifestStatus('NAO_INTEGRADA');setFreight(0);setDiscount(0);setItems([{productId:products[0]?.id||'',quantity:1,unitCost:products[0]?.costPrice||0,lotNumber:'',expiryDate:'',newSalePrice:''}]);setOpen(true);};

 const subtotal=useMemo(()=>items.reduce((s,i)=>s+(Number(i.quantity)||0)*(Number(i.unitCost)||0),0),[items]);
 const total=Math.max(0,subtotal+freight-discount);

 const addItem=()=>setItems(v=>[...v,{productId:products[0]?.id||'',quantity:1,unitCost:products[0]?.costPrice||0,lotNumber:'',expiryDate:'',newSalePrice:''}]);
 const patchItem=(idx:number,patch:Partial<EntryItem>)=>setItems(v=>v.map((it,i)=>i===idx?{...it,...patch}:it));

 const save=async(e:React.FormEvent)=>{e.preventDefault();setError('');
   if(!items.length||items.some(i=>!i.productId||i.quantity<=0||i.unitCost<0)){setError('Revise os itens da entrada.');return;}
   setBusy(true);
   try{
     await productionDb.confirmPurchase({
       supplier_id:supplierId||null,
       invoice_number:invoice||null,
       invoice_key:invoiceKey||null,
       issue_date:issueDate,
       freight,discount,
       payment_method:'OUTRO',
       payment_term:paymentTerm,
       due_date:paymentTerm==='A_VISTA'?null:dueDate,
       receipt_status:receiptStatus,
       manifest_status:manifestStatus,
       items:items.map(i=>({
         product_id:i.productId,
         quantity:i.quantity,
         unit_cost:i.unitCost,
         lot_number:i.lotNumber||null,
         expiry_date:i.expiryDate||null,
         new_sale_price:i.newSalePrice===''?null:Number(i.newSalePrice)
       }))
     });
     setFeedback('Entrada confirmada: estoque, lote, custo, preço e financeiro atualizados em transação única.');
     setOpen(false);await load();
   }catch(err:any){setError(err?.message||'Não foi possível confirmar a entrada.');}
   finally{setBusy(false);}
 };

 const showDetails=async(id:string)=>{setBusy(true);setError('');try{setDetails(await productionDb.getPurchaseDetails(id));}catch(e:any){setError(e?.message||'Falha ao abrir detalhes.');}finally{setBusy(false);}};

 const monthTotal=rows.filter(r=>String(r.created_at||'').slice(0,7)===new Date().toISOString().slice(0,7)).reduce((s,r)=>s+Number(r.total||0),0);
 return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 text-white">
   <PageHeader eyebrow="Suprimentos" title="Compras & entradas de mercadorias" description="Recebimento, nota, lotes, validade, custo, troca de preço, estoque e contas a pagar." actions={<><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button><button disabled={busy||products.length===0} onClick={start} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-2"><Plus size={14}/>Nova entrada</button></>}/>

   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><MetricCard label="Entradas" value={rows.length} icon={ShoppingBag}/><MetricCard label="Compras no mês" value={'R$ '+monthTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})} icon={PackageCheck} tone="emerald"/><MetricCard label="Alertas de validade" value={alerts.length} icon={CalendarClock} tone={alerts.length?'rose':'emerald'}/><MetricCard label="Produtos cadastrados" value={products.length} icon={PackageCheck}/></div>

   {alerts.length>0&&<div className="p-4 rounded-2xl border border-amber-700/60 bg-amber-950/20">
     <div className="flex items-center gap-2 text-amber-300 font-black text-sm"><CalendarClock size={18}/>Alertas de validade — próximos 30 dias</div>
     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 mt-3">{alerts.slice(0,12).map(a=><div key={a.batch_id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><div className="font-bold">{a.product_name}</div><div className={`mt-1 ${a.days_to_expiry<0?'text-rose-400':a.days_to_expiry<=7?'text-amber-300':'text-neutral-400'}`}>{a.days_to_expiry<0?`Vencido há ${Math.abs(a.days_to_expiry)} dia(s)`:`Vence em ${a.days_to_expiry} dia(s)`} · {new Date(a.expiry_date+'T00:00:00').toLocaleDateString('pt-BR')}</div><div className="text-neutral-500 mt-1">Lote {a.lot_number||'—'} · saldo {Number(a.quantity_remaining)}</div></div>)}</div>
   </div>}

   {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
   {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{feedback}</div>}

   {rows.length===0?<EmptyState title="Nenhuma entrada registrada" description="Use Nova entrada para conferir mercadorias, registrar lotes, validade, custo e alterações de preço." action={<button disabled={products.length===0} onClick={start} className="px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black">Nova entrada</button>}/>:<div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-neutral-950/70 text-neutral-400 uppercase"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Nota</th><th className="p-3 text-left">Prazo</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody className="divide-y divide-neutral-800">{rows.map(r=><tr key={r.id}><td className="p-3 text-neutral-400">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3 text-white">{r.invoice_number||'—'}</td><td className="p-3 text-neutral-300">{r.payment_term||'—'}</td><td className="p-3 text-right font-mono font-bold text-amber-400">R$ {Number(r.total||0).toFixed(2)}</td><td className="p-3 text-emerald-400">{r.status}</td><td className="p-3 text-right"><button onClick={()=>void showDetails(r.id)} className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 inline-flex items-center gap-1"><Eye size={13}/>Detalhes</button></td></tr>)}</tbody></table></div></div>}

   {open&&<div className="fixed inset-0 z-50 bg-black/85 grid place-items-center p-3"><div className="w-full max-w-6xl max-h-[95dvh] overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col">
     <div className="p-4 border-b border-neutral-800 flex justify-between items-center"><div><h2 className="font-black">Nova entrada de mercadoria</h2><p className="text-[11px] text-neutral-500 mt-1">Conferência interna da NF-e. Manifestação fiscal oficial depende de integração homologada com SEFAZ/provedor.</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
     <div className="px-4 pt-4 grid grid-cols-4 md:grid-cols-8 gap-2">{['Nota','Fornecedor','Produtos','Lotes','Validades','Custos','Preços','Conferência'].map((x,i)=><div key={x} className="text-center"><div className="mx-auto w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 grid place-items-center text-[10px] font-black">{i+1}</div><div className="text-[9px] text-neutral-500 mt-1">{x}</div></div>)}</div>
     <form onSubmit={save} className="p-4 overflow-y-auto space-y-5">
       <div className="grid md:grid-cols-4 gap-3">
         <label className="text-xs text-neutral-400">Fornecedor<select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"><option value="">Não informado</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.tradeName}</option>)}</select></label>
         <label className="text-xs text-neutral-400">Nº da nota<input value={invoice} onChange={e=>setInvoice(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/></label>
         <label className="text-xs text-neutral-400">Chave NF-e<input value={invoiceKey} onChange={e=>setInvoiceKey(e.target.value.replace(/\D/g,'').slice(0,44))} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 font-mono"/></label>
         <label className="text-xs text-neutral-400">Emissão<input type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/></label>
       </div>
       <div className="grid md:grid-cols-5 gap-3">
         <label className="text-xs text-neutral-400">Conferência<select value={receiptStatus} onChange={e=>setReceiptStatus(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"><option value="CONFERIDA">Conferida</option><option value="COM_DIVERGENCIA">Com divergência</option><option value="PENDENTE">Pendente</option></select></label>
         <label className="text-xs text-neutral-400">Status NF-e interno<select value={manifestStatus} onChange={e=>setManifestStatus(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"><option value="NAO_INTEGRADA">Não integrada</option><option value="CIENCIA">Ciência registrada</option><option value="CONFIRMADA">Confirmação registrada</option><option value="DESCONHECIDA">Operação desconhecida</option></select></label>
         <label className="text-xs text-neutral-400">Prazo<select value={paymentTerm} onChange={e=>{setPaymentTerm(e.target.value);if(e.target.value==='30_DIAS')setDueDate(plusDays(30));}} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"><option value="A_VISTA">À vista</option><option value="30_DIAS">30 dias</option><option value="PARCELADO">Parcelado</option></select></label>
         <label className="text-xs text-neutral-400">Vencimento financeiro<input disabled={paymentTerm==='A_VISTA'} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 disabled:opacity-40"/></label>
         <div className="grid grid-cols-2 gap-2"><label className="text-xs text-neutral-400">Frete<input type="number" min="0" step="0.01" value={freight} onChange={e=>setFreight(Number(e.target.value)||0)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/></label><label className="text-xs text-neutral-400">Desconto<input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value)||0)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/></label></div>
       </div>

       <div className="space-y-2">
         <div className="flex items-center justify-between"><h3 className="font-bold text-sm flex items-center gap-2"><PackageCheck size={16} className="text-amber-400"/>Itens recebidos</h3><button type="button" onClick={addItem} className="text-xs text-amber-400">+ adicionar item</button></div>
         {items.map((it,idx)=>{const p=products.find(x=>x.id===it.productId);return <div key={idx} className="grid lg:grid-cols-[2fr_.7fr_1fr_1fr_1fr_1fr_38px] gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
           <select value={it.productId} onChange={e=>{const np=products.find(x=>x.id===e.target.value);patchItem(idx,{productId:e.target.value,unitCost:np?.costPrice||0});}} className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs">{products.filter(x=>!x.isCombo&&x.status==='ACTIVE').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
           <input title="Quantidade" type="number" min="0.001" step="0.001" value={it.quantity} onChange={e=>patchItem(idx,{quantity:Number(e.target.value)||0})} className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs"/>
           <input title="Custo unitário" type="number" min="0" step="0.01" value={it.unitCost} onChange={e=>patchItem(idx,{unitCost:Number(e.target.value)||0})} className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs"/>
           <div><input title="Novo preço de venda" placeholder={`Preço atual ${p?.salePrice?.toFixed(2)||'0.00'}`} type="number" min="0" step="0.01" value={it.newSalePrice} onChange={e=>patchItem(idx,{newSalePrice:e.target.value})} className={`w-full bg-neutral-900 border rounded-xl px-2 py-2 text-xs ${it.newSalePrice!==''&&Number(it.newSalePrice)!==Number(p?.salePrice||0)?'border-amber-500/60 text-amber-300':'border-neutral-700'}`}/>{it.newSalePrice!==''&&Number(it.newSalePrice)!==Number(p?.salePrice||0)&&<div className="text-[9px] text-amber-400 mt-1">Troca: R$ {Number(p?.salePrice||0).toFixed(2)} → R$ {Number(it.newSalePrice).toFixed(2)}</div>}</div>
           <input title="Lote" placeholder="Lote" value={it.lotNumber} onChange={e=>patchItem(idx,{lotNumber:e.target.value})} className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs"/>
           <input title="Validade" type="date" value={it.expiryDate} onChange={e=>patchItem(idx,{expiryDate:e.target.value})} className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs"/>
           <button type="button" onClick={()=>setItems(v=>v.filter((_,i)=>i!==idx))} className="text-rose-400"><Trash2 size={15}/></button>
         </div>})}
       </div>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800"><div><div className="text-xs text-neutral-500">Total da entrada</div><div className="text-2xl font-black text-amber-400">R$ {total.toFixed(2)}</div></div><button disabled={busy||!items.length} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2"><Save size={15}/>{busy?'Confirmando...':'Conferir e dar entrada'}</button></div>
     </form>
   </div></div>}

   {details&&<div className="fixed inset-0 z-50 bg-black/85 grid place-items-center p-3"><div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl bg-neutral-900 border border-neutral-800 p-5"><div className="flex justify-between gap-3"><div><h2 className="font-black">Detalhes da entrada</h2><p className="text-xs text-neutral-500">Nota {details.purchase?.invoice_number||'—'} · {details.supplier?.trade_name||'Fornecedor não informado'}</p></div><button onClick={()=>setDetails(null)}><X size={18}/></button></div><div className="mt-4 space-y-2">{(details.items||[]).map((i:any)=><div key={i.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><div className="flex justify-between gap-3"><strong>{i.product_name}</strong><span>R$ {Number(i.total_cost||0).toFixed(2)}</span></div><div className="text-neutral-500 mt-1">{Number(i.quantity)} × R$ {Number(i.unit_cost||0).toFixed(2)} · lote {i.lot_number||'—'} · validade {i.expiry_date?new Date(i.expiry_date+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</div><div className="text-neutral-500 mt-1">Custo anterior R$ {Number(i.previous_cost||0).toFixed(2)} → R$ {Number(i.unit_cost||0).toFixed(2)} · venda anterior R$ {Number(i.previous_sale_price||0).toFixed(2)}{i.new_sale_price!=null?` → R$ ${Number(i.new_sale_price).toFixed(2)}`:''}</div></div>)}</div></div></div>}
 </div>;
};
