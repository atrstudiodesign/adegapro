import React,{useEffect,useMemo,useState} from 'react';
import { Layers, Plus, RefreshCw, Save, X } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

type P={id:string;name:string;salePrice:number;currentStock:number;unit:string;isCombo?:boolean;status:string};
type Item={productId:string;quantity:number};
type Combo={id:string;name:string;price:number;originalPrice:number;items:Item[];active:boolean};

export const ProductionCombosView:React.FC=()=>{
  const[products,setProducts]=useState<P[]>([]);
  const[combos,setCombos]=useState<Combo[]>([]);
  const[busy,setBusy]=useState(true);
  const[error,setError]=useState('');
  const[open,setOpen]=useState(false);
  const[editing,setEditing]=useState<Combo|null>(null);
  const[name,setName]=useState('');
  const[price,setPrice]=useState(0);
  const[items,setItems]=useState<Item[]>([]);

  const available=useMemo(()=>products.filter(p=>!p.isCombo&&p.status==='ACTIVE'),[products]);
  const original=useMemo(()=>items.reduce((sum,i)=>sum+(available.find(p=>p.id===i.productId)?.salePrice||0)*i.quantity,0),[items,available]);

  const load=async()=>{setBusy(true);setError('');try{
    const[p,c]=await Promise.all([productionDb.getProducts(),productionDb.getCombos()]);
    setProducts(p as any);setCombos(c as any);
  }catch(e:any){setError(e?.message||'Falha ao carregar combos.');}finally{setBusy(false);}};

  useEffect(()=>{void load();},[]);

  const start=(combo?:Combo)=>{setEditing(combo||null);setName(combo?.name||'');setPrice(combo?.price||0);
    setItems(combo?.items?.length?combo.items:[{productId:available[0]?.id||'',quantity:1}]);setOpen(true);};

  const save=async(e:React.FormEvent)=>{e.preventDefault();setError('');
    if(!name.trim()||price<=0||items.length===0||items.some(i=>!i.productId||i.quantity<=0)){setError('Preencha nome, preço e componentes válidos.');return;}
    setBusy(true);try{
      await productionDb.saveCombo({id:editing?.id,name:name.trim(),price,items,active:true});
      setOpen(false);await load();
    }catch(err:any){setError(err?.message||'Não foi possível salvar o combo.');}finally{setBusy(false);}
  };

  const avgDiscount=combos.length?combos.reduce((s,c)=>s+(c.originalPrice>0?(1-c.price/c.originalPrice)*100:0),0)/combos.length:0;
  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 text-white">
    <PageHeader eyebrow="Catálogo" title="Combos & kits" description="A venda do combo baixa automaticamente o estoque físico de cada componente." actions={<div className="flex gap-2"><button onClick={()=>void load()} disabled={busy} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button><button onClick={()=>start()} disabled={busy||available.length===0} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-2"><Plus size={15}/>Novo combo</button></div>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><MetricCard label="Combos" value={combos.length} icon={Layers}/><MetricCard label="Ativos" value={combos.filter(c=>c.active).length} icon={Layers} tone="emerald"/><MetricCard label="Produtos disponíveis" value={available.length} icon={Layers}/><MetricCard label="Desconto médio" value={avgDiscount.toFixed(1)+'%'} icon={Layers} tone="violet"/></div>
    {combos.length===0&&!busy?<EmptyState title="Nenhum combo cadastrado" description="Crie kits promocionais mantendo a baixa transacional dos componentes." action={<button onClick={()=>start()} disabled={available.length===0} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black">Novo combo</button>}/>:<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{combos.map(c=><article key={c.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="flex justify-between gap-3"><div><h3 className="font-bold">{c.name}</h3><p className="text-[11px] text-neutral-500 mt-1">{c.items.length} componente(s)</p></div><div className="text-right"><span className="text-amber-400 font-mono font-black">R$ {c.price.toFixed(2)}</span><div className="mt-1"><StatusBadge tone={c.active?'success':'neutral'}>{c.active?'ATIVO':'INATIVO'}</StatusBadge></div></div></div>
      <div className="mt-4 space-y-2">{c.items.map((i,idx)=>{const p=products.find(x=>x.id===i.productId);return <div key={idx} className="flex justify-between text-xs bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2"><span>{i.quantity}x {p?.name||'Produto'}</span><span className="text-neutral-500">Estoque {p?.currentStock??0}</span></div>})}</div>
      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between"><span className="text-xs text-neutral-500">Avulso R$ {c.originalPrice.toFixed(2)}</span><button onClick={()=>start(c)} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-bold">Editar</button></div>
    </article>)}</div>}

    {open&&<div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4"><div className="w-full max-w-xl max-h-[94dvh] overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col">
      <div className="p-4 border-b border-neutral-800 flex justify-between"><h2 className="font-black">{editing?'Editar combo':'Novo combo'}</h2><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <form onSubmit={save} className="p-4 space-y-4 overflow-y-auto">
        <label className="block text-xs text-neutral-400">Nome<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white"/></label>
        <label className="block text-xs text-neutral-400">Preço promocional<input type="number" step="0.01" min="0.01" value={price||''} onChange={e=>setPrice(Number(e.target.value))} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-white"/></label>
        <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-xs font-bold">Componentes</span><button type="button" onClick={()=>setItems(v=>[...v,{productId:available[0]?.id||'',quantity:1}])} className="text-xs text-amber-400">+ adicionar</button></div>
          {items.map((it,idx)=><div key={idx} className="grid grid-cols-[1fr_90px_36px] gap-2"><select value={it.productId} onChange={e=>setItems(v=>v.map((x,i)=>i===idx?{...x,productId:e.target.value}:x))} className="bg-neutral-950 border border-neutral-700 rounded-xl px-2 text-xs">{available.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" min="0.001" step="0.001" value={it.quantity} onChange={e=>setItems(v=>v.map((x,i)=>i===idx?{...x,quantity:Number(e.target.value)}:x))} className="bg-neutral-950 border border-neutral-700 rounded-xl px-2 text-xs"/><button type="button" onClick={()=>setItems(v=>v.filter((_,i)=>i!==idx))} className="text-rose-400">×</button></div>)}
        </div>
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex justify-between"><span>Preço avulso estimado</span><strong>R$ {original.toFixed(2)}</strong></div>
        <button disabled={busy} className="w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-black flex items-center justify-center gap-2"><Save size={15}/>{busy?'Salvando...':'Salvar combo'}</button>
      </form>
    </div></div>}
  </div>;
};