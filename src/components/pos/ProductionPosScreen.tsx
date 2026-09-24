import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle2, AlertTriangle, Package, ScanLine } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { CashSession, Category, Customer, Product, User } from '../../types';

interface Props { currentUser: User; currentSession?: CashSession; onNavigate: (tab:string)=>void; }
type Line={product:Product;quantity:number};

export const ProductionPosScreen:React.FC<Props>=({currentUser,currentSession,onNavigate})=>{
  const [products,setProducts]=useState<Product[]>([]);
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [selectedCategory,setSelectedCategory]=useState('ALL');
  const [query,setQuery]=useState('');
  const [cart,setCart]=useState<Line[]>([]);
  const [customerId,setCustomerId]=useState('');
  const [discount,setDiscount]=useState(0);
  const [method,setMethod]=useState<'DINHEIRO'|'PIX'|'DEBITO'|'CREDITO'|'VOUCHER'|'FIADO'>('DINHEIRO');
  const [tendered,setTendered]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const searchRef=useRef<HTMLInputElement>(null);
  const customerRef=useRef<HTMLSelectElement>(null);
  const discountRef=useRef<HTMLInputElement>(null);

  const load=async()=>{
    try{
      const [p,c,cats]=await Promise.all([productionDb.getProducts(),productionDb.getCustomers(),productionDb.getCategories()]);
      setProducts(p.filter(x=>x.status==='ACTIVE'));
      setCustomers(c);
      setCategories(cats.filter(x=>x.active));
    }catch(e:any){
      setError(e?.message||'Falha ao carregar PDV.');
    }
  };

  useEffect(()=>{void load();},[]);

  const visibleProducts=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let base=q
      ? products.filter(p=>p.name.toLowerCase().includes(q)||p.barcode.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q))
      : products;
    if(selectedCategory!=='ALL') base=base.filter(p=>p.categoryId===selectedCategory);
    return base.slice(0,30);
  },[query,products,selectedCategory]);

  const subtotal=cart.reduce((s,l)=>s+l.product.salePrice*l.quantity,0);
  const total=Math.max(0,subtotal-discount);

  const add=(p:Product)=>{
    if(!p.isCombo&&p.currentStock<=0){setError('Produto sem estoque.');return;}
    setCart(prev=>{
      const hit=prev.find(x=>x.product.id===p.id);
      return hit
        ? prev.map(x=>x.product.id===p.id?{...x,quantity:x.quantity+1}:x)
        : [...prev,{product:p,quantity:1}];
    });
    setError('');
  };

  const qty=(id:string,d:number)=>setCart(prev=>prev.map(x=>x.product.id===id?{...x,quantity:Math.max(0,x.quantity+d)}:x).filter(x=>x.quantity>0));

  const finalize=async()=>{
    if(!currentSession){setError('Abra uma sessão de caixa antes de vender.');return;}
    if(cart.length===0||total<=0)return;
    if(method==='FIADO'&&!customerId){setError('Selecione um cliente para venda fiada.');return;}

    const amount=method==='DINHEIRO'?Number((tendered||String(total)).replace(',','.')):total;
    if(!Number.isFinite(amount)||amount<total){setError('Valor recebido insuficiente.');return;}
    const change=method==='DINHEIRO'?Math.max(0,amount-total):0;

    setBusy(true);setError('');setMessage('');
    try{
      const id=await productionDb.finalizeSale({
        cash_session_id:currentSession.id,
        customer_id:customerId||null,
        idempotency_key:crypto.randomUUID(),
        items:cart.map(l=>({product_id:l.product.id,quantity:l.quantity,discount:0})),
        payments:[{method,amount,change_amount:change,provider:'MANUAL'}],
        surcharge:0
      });
      setMessage('Venda registrada com sucesso. ID: '+String(id).slice(0,8)+'…');
      setCart([]);setCustomerId('');setDiscount(0);setTendered('');
      await load();
    }catch(e:any){
      setError(e?.message||'Venda não concluída.');
    }finally{
      setBusy(false);
    }
  };

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='F2'){e.preventDefault();searchRef.current?.focus();}
      else if(e.key==='F3'){e.preventDefault();customerRef.current?.focus();}
      else if(e.key==='F4'){e.preventDefault();discountRef.current?.focus();discountRef.current?.select();}
      else if(e.key==='F5'){e.preventDefault();if(!busy&&cart.length>0)void finalize();}
      else if(e.key==='Escape'){
        e.preventDefault();
        if(cart.length>0&&!window.confirm('Sair do PDV e descartar a venda atual?'))return;
        onNavigate('dashboard');
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[cart,busy,total,customerId,discount,method,tendered,currentSession,onNavigate]);

  if(!currentSession)return <div className="flex-1 grid place-items-center p-6 bg-neutral-950 text-white"><div className="max-w-md p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center"><AlertTriangle className="mx-auto text-amber-400" size={30}/><h1 className="font-black mt-3">Caixa fechado</h1><p className="text-sm text-neutral-400 mt-2">No ambiente de produção, toda venda exige sessão de caixa segura vinculada ao operador.</p><button onClick={()=>onNavigate('cash')} className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-sm">Abrir caixa</button></div></div>;

  return <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px] bg-[#080808] text-white overflow-y-auto xl:overflow-hidden">
    <section className="p-3 sm:p-4 lg:p-5 xl:overflow-y-auto border-b xl:border-b-0 xl:border-r border-neutral-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight">PDV · Venda rápida</h1>
          <p className="text-xs text-neutral-500 mt-1">Operador {currentUser.name} · {currentSession.cashRegisterNumber} · catálogo visual sincronizado</p>
        </div>
        <span className="w-fit text-[10px] px-2.5 py-1.5 rounded-full border border-emerald-800 bg-emerald-950/40 text-emerald-300">PRODUÇÃO · ONLINE</span>
      </div>

      {error&&<div className="mb-3 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {message&&<div className="mb-3 p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 size={14}/>{message}</div>}

      <div className="sticky top-0 z-10 py-2 bg-[#080808]/95 backdrop-blur">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"/>
          <input ref={searchRef} autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar produto por nome, marca, EAN ou SKU..." className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl pl-10 pr-12 py-3.5 text-sm outline-none focus:border-amber-400"/>
          <ScanLine size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400"/>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-neutral-500">
        <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900"><b className="text-amber-400">F2</b> Buscar</span>
        <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900"><b className="text-amber-400">F3</b> Cliente</span>
        <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900"><b className="text-amber-400">F4</b> Desconto</span>
        <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900"><b className="text-amber-400">F5</b> Finalizar</span>
        <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900"><b className="text-amber-400">ESC</b> Sair</span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={()=>setSelectedCategory('ALL')} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-black ${selectedCategory==='ALL'?'bg-amber-500 border-amber-400 text-neutral-950':'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}>TODOS</button>
        {categories.map(cat=><button key={cat.id} onClick={()=>setSelectedCategory(cat.id)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-black ${selectedCategory===cat.id?'bg-amber-500 border-amber-400 text-neutral-950':'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}>{cat.name.toUpperCase()}</button>)}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-neutral-500">{query ? 'Resultados da busca' : 'Catálogo de produtos'} · {visibleProducts.length} exibidos</div>
        <div className="text-[10px] text-neutral-600">Toque no produto para adicionar</div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-3">
        {visibleProducts.map(p=>{
          const unavailable=!p.isCombo&&p.currentStock<=0;
          return <button key={p.id} disabled={unavailable} onClick={()=>add(p)} className="group text-left rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-amber-500/50 active:scale-[.99] transition-all disabled:opacity-40">
            <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
              {p.imageUrl
                ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform" loading="lazy"/>
                : <div className="w-full h-full grid place-items-center bg-[radial-gradient(circle_at_center,rgba(245,158,11,.10),transparent_62%)]"><Package size={32} className="text-neutral-700"/></div>}
              {p.isCombo&&<span className="absolute left-2 top-2 px-2 py-1 rounded-full bg-violet-950 border border-violet-700 text-[8px] font-black text-violet-200">COMBO</span>}
              {p.isCold&&<span className="absolute right-2 top-2 px-2 py-1 rounded-full bg-sky-950 border border-sky-700 text-[8px] font-black text-sky-200">GELADO</span>}
            </div>
            <div className="p-2.5">
              <div className="text-[9px] text-neutral-500 truncate">{p.brand||p.sku}{p.packageSize?` · ${p.packageSize}`:''}</div>
              <div className="mt-1 text-[11px] sm:text-xs font-black leading-tight line-clamp-2 min-h-[2rem]">{p.name}</div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono font-black text-amber-400 text-sm">R$ {p.salePrice.toFixed(2)}</span>
                <span className={`text-[9px] font-mono ${unavailable?'text-rose-400':p.currentStock<=p.minStock?'text-amber-400':'text-neutral-500'}`}>{p.isCombo?'kit':`${p.currentStock} ${p.unit}`}</span>
              </div>
            </div>
          </button>
        })}
      </div>

      {visibleProducts.length===0&&<div className="py-20 text-center text-neutral-600"><Package size={38} className="mx-auto"/><div className="mt-3 text-sm">Nenhum produto encontrado.</div></div>}
    </section>

    <aside className="p-4 sm:p-5 bg-neutral-900/60 xl:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-black">Carrinho</h2><div className="text-[10px] text-neutral-500 mt-1">{cart.reduce((s,l)=>s+l.quantity,0)} item(ns)</div></div>
        <ShoppingCart size={20} className="text-amber-400"/>
      </div>

      <div className="mt-4 space-y-2">
        {cart.length===0
          ? <div className="py-12 text-center text-neutral-600 rounded-2xl border border-dashed border-neutral-800"><ShoppingCart size={34} className="mx-auto mb-3"/><p className="text-sm">Carrinho vazio</p><p className="text-[10px] mt-1">Selecione produtos no catálogo.</p></div>
          : cart.map(l=><div key={l.product.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-950 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0">
                {l.product.imageUrl?<img src={l.product.imageUrl} alt="" className="w-full h-full object-contain p-1"/>:<Package size={20} className="m-3 text-neutral-700"/>}
              </div>
              <div className="min-w-0 flex-1"><div className="font-bold text-xs truncate">{l.product.name}</div><div className="text-[10px] text-neutral-500">R$ {l.product.salePrice.toFixed(2)} cada</div></div>
              <div className="flex items-center gap-1"><button onClick={()=>qty(l.product.id,-1)} className="w-7 h-7 grid place-items-center rounded-lg bg-neutral-800"><Minus size={12}/></button><strong className="w-5 text-center text-xs">{l.quantity}</strong><button onClick={()=>qty(l.product.id,1)} className="w-7 h-7 grid place-items-center rounded-lg bg-neutral-800"><Plus size={12}/></button></div>
              <button onClick={()=>setCart(x=>x.filter(i=>i.product.id!==l.product.id))} className="text-rose-400"><Trash2 size={14}/></button>
            </div>)}
      </div>

      <div className="mt-5 border-t border-neutral-800 pt-4">
        <label className="block text-xs text-neutral-400 mb-1">Cliente</label>
        <select ref={customerRef} value={customerId} onChange={e=>setCustomerId(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-3 text-sm"><option value="">Consumidor não identificado</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div><label className="block text-[10px] text-neutral-500 mb-1">Desconto total</label><input ref={discountRef} type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(Number(e.target.value)||0)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-3 text-sm"/></div>
          <div><label className="block text-[10px] text-neutral-500 mb-1">Pagamento</label><select value={method} onChange={e=>setMethod(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2 py-3 text-xs"><option value="DINHEIRO">Dinheiro</option><option value="PIX">PIX — manual</option><option value="DEBITO">Débito — manual</option><option value="CREDITO">Crédito — manual</option><option value="VOUCHER">Voucher</option><option value="FIADO">Fiado</option></select></div>
        </div>

        {method==='DINHEIRO'&&<><label className="block text-[10px] text-neutral-500 mt-3 mb-1">Valor recebido</label><input value={tendered} onChange={e=>setTendered(e.target.value)} placeholder={total.toFixed(2)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-3 text-sm"/></>}

        <div className="mt-5 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="flex justify-between text-sm text-neutral-400"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-neutral-400"><span>Desconto</span><span>- R$ {discount.toFixed(2)}</span></div>
          <div className="flex justify-between text-xl font-black pt-3 border-t border-neutral-800"><span>Total</span><span className="text-amber-400">R$ {total.toFixed(2)}</span></div>
        </div>

        <button disabled={busy||cart.length===0} onClick={()=>void finalize()} className="mt-4 w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 font-black">{busy?'PROCESSANDO...':'FINALIZAR VENDA (F5)'}</button>
        <p className="mt-3 text-[10px] text-neutral-500 leading-relaxed">PIX e cartões permanecem confirmação manual até homologação do gateway/TEF. Nenhuma autorização financeira é simulada.</p>
      </div>
    </aside>
  </div>;
};