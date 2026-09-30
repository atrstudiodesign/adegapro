import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  Search,ShoppingCart,Trash2,Plus,Minus,CheckCircle2,Package,ScanLine,
  UserRound,Printer,Banknote,QrCode,CreditCard,MoreHorizontal,X,WalletCards,Store as StoreIcon,Cable,Wifi,WifiOff
} from 'lucide-react';
import { db } from '../../services/db';
import type { CashSession, Customer, Product, Sale, User } from '../../types';
import { QuickSaleModal } from './QuickSaleModal';

interface PosScreenProps{
  currentUser:User;
  currentSession?:CashSession;
  onNavigate:(tab:string)=>void;
  onSessionUpdated?:()=>void|Promise<void>;
}
type DemoLine={product:Product;quantity:number};
type PayMethod='DINHEIRO'|'PIX'|'DEBITO'|'CREDITO'|'VOUCHER'|'FIADO';

const normalizeSearch=(value:string|undefined|null)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const money=(v:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

export const PosScreen:React.FC<PosScreenProps>=({currentUser,currentSession,onNavigate,onSessionUpdated})=>{
  const [refresh,setRefresh]=useState(0);
  const store=db.getStore();
  const products=useMemo(()=>db.getProducts().filter(p=>p.status==='ACTIVE'),[refresh]);
  const customers=useMemo(()=>db.getCustomers(),[refresh]);
  const categories=useMemo(()=>db.getCategories().filter(c=>c.active),[refresh]);
  const registers=useMemo(()=>db.getCashRegisters(),[refresh]);
  const demoProviderConfigs=useMemo(()=>db.getIntegrationProviderConfigs(),[refresh]);
  const demoLegacyIntegrations=useMemo(()=>db.getIntegrations(),[refresh]);

  const [selectedCategory,setSelectedCategory]=useState('ALL');
  const [query,setQuery]=useState('');
  const [customerQuery,setCustomerQuery]=useState('');
  const [showCustomerResults,setShowCustomerResults]=useState(false);
  const [cart,setCart]=useState<DemoLine[]>([]);
  const [customerId,setCustomerId]=useState('');
  const [discount,setDiscount]=useState(0);
  const [method,setMethod]=useState<PayMethod>('DINHEIRO');
  const [tendered,setTendered]=useState('');
  const [openingBalance,setOpeningBalance]=useState('100');
  const [selectedRegisterId,setSelectedRegisterId]=useState(registers.find(r=>r.status==='FECHADO')?.id||registers[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [miniPdvOpen,setMiniPdvOpen]=useState(false);
  const [lastReceipt,setLastReceipt]=useState<Sale|null>(null);
  const searchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if(!selectedRegisterId&&registers.length)setSelectedRegisterId(registers.find(r=>r.status==='FECHADO')?.id||registers[0]?.id||'');
  },[registers,selectedRegisterId]);

  const visibleProducts=useMemo(()=>{
    const q=normalizeSearch(query);
    let base=products;
    if(q)base=products.filter(p=>[p.name,p.barcode,p.sku,p.brand,p.packageSize].map(normalizeSearch).join(' ').includes(q));
    else if(selectedCategory!=='ALL')base=products.filter(p=>p.categoryId===selectedCategory);
    return base.slice(0,36);
  },[products,query,selectedCategory]);

  const filteredCustomers=useMemo(()=>{
    const q=normalizeSearch(customerQuery);
    if(!q)return customers.slice(0,6);
    return customers.filter(c=>[c.name,c.phone,c.whatsapp,c.cpf].map(normalizeSearch).join(' ').includes(q)).slice(0,8);
  },[customers,customerQuery]);

  const selectedCustomer=customers.find(c=>c.id===customerId);
  const subtotal=cart.reduce((s,l)=>s+l.product.salePrice*l.quantity,0);
  const total=Math.max(0,subtotal-discount);
  const tenderedNumber=Number((tendered||String(total)).replace(',','.'))||0;
  const change=method==='DINHEIRO'?Math.max(0,tenderedNumber-total):0;

  const add=(p:Product)=>{
    if(!store.allowSellWithoutStock&&p.currentStock<=0){setError('Produto sem estoque.');return;}
    setCart(prev=>{
      const hit=prev.find(x=>x.product.id===p.id);
      return hit?prev.map(x=>x.product.id===p.id?{...x,quantity:x.quantity+1}:x):[...prev,{product:p,quantity:1}];
    });
    setError('');
  };
  const qty=(id:string,d:number)=>setCart(prev=>prev.map(x=>x.product.id===id?{...x,quantity:Math.max(0,x.quantity+d)}:x).filter(x=>x.quantity>0));

  const openCash=async()=>{
    const reg=registers.find(r=>r.id===selectedRegisterId)||registers.find(r=>r.status==='FECHADO')||registers[0];
    if(!reg){setError('Nenhum caixa disponível no modo demo.');return;}
    const amount=Number(String(openingBalance||'0').replace(',','.'));
    if(!Number.isFinite(amount)||amount<0){setError('Saldo inicial inválido.');return;}
    setBusy(true);setError('');
    try{
      db.openCashSession(reg.id,amount);
      setRefresh(v=>v+1);
      await onSessionUpdated?.();
      setMessage('Caixa demo aberto. PDV pronto para venda.');
    }catch(e:any){setError(e?.message||'Não foi possível abrir o caixa demo.');}
    finally{setBusy(false);}
  };

  const finalize=async()=>{
    if(!currentSession){setError('Abra o caixa antes de finalizar a venda.');return;}
    if(!cart.length||total<=0)return;
    if(method==='FIADO'&&!customerId){setError('Selecione um cliente para venda fiada.');return;}
    const amount=method==='DINHEIRO'?tenderedNumber:total;
    if(!Number.isFinite(amount)||amount<total){setError('Valor recebido insuficiente.');return;}

    setBusy(true);setError('');setMessage('');
    try{
      const sale=db.createSale({
        items:cart.map(l=>({
          productId:l.product.id,
          productName:l.product.name,
          barcode:l.product.barcode,
          unitPrice:l.product.salePrice,
          costPrice:l.product.costPrice,
          quantity:l.quantity,
          discount:0,
          subtotal:l.product.salePrice*l.quantity,
          isCombo:l.product.isCombo
        })),
        subtotal,
        discount,
        surcharge:0,
        total,
        payments:[{
          id:'pay-'+Date.now(),
          method,
          amount,
          change,
          provider:'MANUAL',
          status:'CONFIRMADO'
        }],
        customerId:customerId||undefined,
        customerName:selectedCustomer?.name
      });
      setLastReceipt(sale);
      setMessage('Venda demo finalizada com sucesso.');
      setCart([]);setCustomerId('');setCustomerQuery('');setDiscount(0);setTendered('');
      setRefresh(v=>v+1);
    }catch(e:any){setError(e?.message||'Venda demo não concluída.');}
    finally{setBusy(false);}
  };

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='F12'||e.key==='F8'){e.preventDefault();searchRef.current?.focus();}
      else if(e.key==='F9'){e.preventDefault();if(!busy&&cart.length)void finalize();}
      else if(e.key==='F10'&&lastReceipt){e.preventDefault();window.print();}
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[busy,cart,lastReceipt,total,tendered,method,currentSession,customerId]);

  const integrationProviders=[
    {id:'IFOOD',label:'iFood'},
    {id:'ASAAS',label:'Asaas'},
    {id:'PAGSEGURO',label:'PagSeguro'},
    {id:'MERCADO_PAGO',label:'Mercado Pago'},
    {id:'CARD_TERMINAL',label:'SmartPOS / TEF'},
    {id:'FISCAL',label:'Fiscal'}
  ];
  const demoIntegrationStatus=(provider:string)=>{
    if(provider==='CARD_TERMINAL'&&demoLegacyIntegrations.tef.status==='CONNECTED')return {label:'ONLINE',online:true,active:true};
    if(provider==='FISCAL'&&demoLegacyIntegrations.fiscal.status==='READY')return {label:'ONLINE',online:true,active:true};
    const cfg=demoProviderConfigs.find((x:any)=>String(x.provider).toUpperCase()===provider);
    if(cfg?.enabled&&cfg?.webhookUrl)return {label:'ATIVO',online:false,active:true};
    if(cfg?.webhookUrl||cfg?.secretRef)return {label:'OFFLINE',online:false,active:false};
    return {label:'NÃO CONFIG.',online:false,active:false};
  };

  useEffect(()=>{
    const open=()=>setMiniPdvOpen(true);
    window.addEventListener('adega:open-mini-pdv',open as EventListener);
    return()=>window.removeEventListener('adega:open-mini-pdv',open as EventListener);
  },[]);

  const addQuickProduct=(product:Product,quantity:number)=>{
    if(quantity<=0)return;
    if(!product.isCombo&&product.currentStock<=0){setError('Produto sem estoque.');return;}
    setCart(prev=>{
      const hit=prev.find(x=>x.product.id===product.id);
      return hit
        ? prev.map(x=>x.product.id===product.id?{...x,quantity:x.quantity+quantity}:x)
        : [...prev,{product,quantity}];
    });
    setError('');
  };

  const paymentButton=(id:PayMethod,label:string,Icon:any)=>(
    <button onClick={()=>setMethod(id)} className={`flex-1 min-w-[82px] h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${method===id?'bg-amber-400 border-amber-300 text-neutral-950':'bg-[#10151b] border-neutral-700 text-neutral-200 hover:border-neutral-500'}`}>
      <Icon size={15}/>{label}
    </button>
  );

  return <>
    <QuickSaleModal
      isOpen={miniPdvOpen}
      onClose={()=>setMiniPdvOpen(false)}
      onAddToCart={(product,quantity)=>addQuickProduct(product,quantity)}
      onAddAndCheckout={(product,quantity)=>{addQuickProduct(product,quantity);setMiniPdvOpen(false);}}
      products={products}
      currentCartCount={cart.reduce((sum,line)=>sum+line.quantity,0)}
      currentCartTotal={subtotal}
    />
    <div className="flex-1 min-h-0 bg-[#070b0f] text-white overflow-hidden">
    {!currentSession&&<div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px] grid place-items-center p-4">
      <div className="w-full max-w-[520px] rounded-2xl border border-amber-400 bg-[#0d1217] shadow-[0_28px_90px_rgba(0,0,0,.65)] p-5 sm:p-6">
        <div className="flex justify-end"><button onClick={()=>onNavigate('dashboard')} className="text-neutral-400 hover:text-white"><X size={20}/></button></div>
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-400/10 text-amber-400 grid place-items-center"><WalletCards size={28}/></div>
        <h2 className="text-center text-2xl font-black mt-3">Abrir Caixa</h2>
        <p className="text-center text-xs text-neutral-400 mt-1">Para iniciar as vendas, abra o caixa informando os dados abaixo.</p>

        <label className="block mt-5 text-xs text-neutral-300">Operador
          <div className="mt-1.5 h-12 rounded-xl border border-neutral-700 bg-[#0a0e12] px-4 flex items-center gap-3">
            <UserRound size={17} className="text-neutral-400"/><span className="font-bold">{currentUser.name}</span>
          </div>
        </label>
        <label className="block mt-3 text-xs text-neutral-300">Caixa
          <div className="relative mt-1.5">
            <StoreIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"/>
            <select value={selectedRegisterId} onChange={e=>setSelectedRegisterId(e.target.value)} className="w-full h-12 rounded-xl border border-neutral-700 bg-[#0a0e12] pl-11 pr-4 text-sm font-bold outline-none focus:border-amber-400">
              {registers.map(r=><option key={r.id} value={r.id}>{r.number} - {r.name}</option>)}
            </select>
          </div>
        </label>
        <label className="block mt-3 text-xs text-neutral-300">Valor inicial do caixa
          <div className="mt-1.5 h-12 rounded-xl border border-neutral-700 bg-[#0a0e12] flex items-center">
            <span className="px-4 text-sm font-black">R$</span>
            <input value={openingBalance} onChange={e=>setOpeningBalance(e.target.value)} inputMode="decimal" className="flex-1 h-full bg-transparent outline-none text-sm font-bold"/>
          </div>
        </label>
        <div className="mt-4 p-3 rounded-xl border border-neutral-800 bg-neutral-900/60 flex gap-3 text-[11px] leading-relaxed text-neutral-400">
          <span className="w-5 h-5 shrink-0 rounded-full border border-amber-400 text-amber-400 grid place-items-center font-black">i</span>
          <span>Ao abrir o caixa, você poderá iniciar as vendas normalmente e o sistema registrará toda a movimentação desta sessão demo.</span>
        </div>
        {error&&<div className="mt-3 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={()=>onNavigate('dashboard')} className="h-11 rounded-xl border border-neutral-700 bg-[#0b0f13] font-black text-sm">Cancelar</button>
          <button disabled={busy||registers.length===0} onClick={()=>void openCash()} className="h-11 rounded-xl bg-amber-400 text-neutral-950 font-black text-sm disabled:bg-neutral-800 disabled:text-neutral-500">{busy?'Abrindo...':'▶  Abrir caixa e iniciar PDV'}</button>
        </div>
      </div>
    </div>}

    <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_490px] overflow-y-auto xl:overflow-hidden">
      <section className="min-w-0 p-3 sm:p-4 xl:overflow-y-auto border-r border-neutral-800/80">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"/>
            <input ref={searchRef} autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar produtos (código, nome, marca...)" className="w-full h-12 bg-[#10151b] border border-neutral-700 rounded-xl pl-11 pr-16 text-sm outline-none focus:border-amber-400"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-500 border border-neutral-700 rounded px-2 py-1">F12</span>
          </div>
          <button onClick={()=>searchRef.current?.focus()} className="hidden md:flex h-12 px-5 rounded-xl border border-neutral-700 bg-[#10151b] items-center gap-2 text-xs font-black hover:border-amber-400/60"><ScanLine size={17}/>Escanear Código (F8)</button>
        </div>

        {error&&currentSession&&<div className="mt-3 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        {message&&<div className="mt-3 p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{message}</div>}

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={()=>onNavigate('integrations')} className="shrink-0 h-9 px-3 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 flex items-center gap-2 text-[10px] font-black"><Cable size={13}/>Integrações DEMO</button>
          {integrationProviders.map(p=>{const s=demoIntegrationStatus(p.id);return <button key={p.id} onClick={()=>onNavigate('integrations')} className={`shrink-0 h-9 px-3 rounded-lg border flex items-center gap-2 text-[9px] font-black ${s.online?'border-emerald-700/60 bg-emerald-950/30 text-emerald-300':s.active?'border-amber-700/60 bg-amber-950/30 text-amber-300':'border-neutral-800 bg-neutral-900 text-neutral-500'}`}>{s.online?<Wifi size={12}/>:<WifiOff size={12}/>}<span>{p.label}</span><span className="opacity-70">{s.label}</span></button>})}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={()=>setSelectedCategory('ALL')} className={`shrink-0 px-5 h-11 rounded-xl border text-xs font-black ${selectedCategory==='ALL'?'bg-amber-400 border-amber-300 text-neutral-950':'bg-[#10151b] border-neutral-700 text-neutral-200'}`}>Todos</button>
          {categories.map(cat=><button key={cat.id} onClick={()=>setSelectedCategory(cat.id)} className={`shrink-0 px-5 h-11 rounded-xl border text-xs font-bold ${selectedCategory===cat.id?'bg-amber-400 border-amber-300 text-neutral-950':'bg-[#10151b] border-neutral-700 text-neutral-200'}`}>{cat.name}</button>)}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleProducts.map(p=>{
            const unavailable=!store.allowSellWithoutStock&&p.currentStock<=0;
            return <div key={p.id} className={`rounded-xl bg-[#0d1217] border border-neutral-800 overflow-hidden ${unavailable?'opacity-40':''}`}>
              <button disabled={unavailable} onClick={()=>add(p)} className="w-full text-left">
                <div className="aspect-[1.05/1] bg-[#0b0f13] grid place-items-center overflow-hidden">
                  {p.imageUrl?<img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-3" loading="lazy"/>:<Package size={34} className="text-neutral-700"/>}
                </div>
                <div className="p-3">
                  <div className="text-sm font-semibold leading-tight min-h-[2.25rem] line-clamp-2">{p.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{p.packageSize||p.brand||p.sku}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-base font-black text-amber-400">{money(p.salePrice)}</span>
                    <span className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 grid place-items-center"><Plus size={17} strokeWidth={3}/></span>
                  </div>
                </div>
              </button>
            </div>
          })}
        </div>
      </section>

      <aside className="bg-[#0a0e12] xl:overflow-y-auto p-3 sm:p-4">
        <section className="rounded-xl border border-neutral-800 bg-[#0d1217] p-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black">Cliente <span className="text-neutral-500 font-normal">(Opcional)</span></h2></div>
          <div className="relative mt-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
            <input value={customerQuery} onFocus={()=>setShowCustomerResults(true)} onChange={e=>{setCustomerQuery(e.target.value);setShowCustomerResults(true)}} placeholder="Buscar cliente por nome, telefone ou CPF..." className="w-full h-10 bg-[#11171d] border border-neutral-700 rounded-lg pl-9 pr-3 text-xs outline-none focus:border-amber-400"/>
            {showCustomerResults&&customerQuery&&<div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-neutral-700 bg-[#0c1116] shadow-2xl overflow-hidden">
              {filteredCustomers.map(c=><button key={c.id} onClick={()=>{setCustomerId(c.id);setCustomerQuery(c.name);setShowCustomerResults(false)}} className="w-full p-3 text-left hover:bg-neutral-800 border-b border-neutral-800 last:border-b-0"><div className="text-xs font-bold">{c.name}</div><div className="text-[10px] text-neutral-500">{c.phone||c.whatsapp||c.cpf||'Sem contato'}</div></button>)}
            </div>}
          </div>
          <div className="mt-2 p-2.5 rounded-lg border border-neutral-800 bg-[#0a0f14] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-800 grid place-items-center"><UserRound size={18}/></div>
            <div className="min-w-0 flex-1"><div className="text-xs font-black truncate">{selectedCustomer?.name||'+ Cliente Final'}</div><div className="text-[10px] text-neutral-500 truncate">{selectedCustomer?(selectedCustomer.cpf||selectedCustomer.phone||'Cliente cadastrado'):'Consumidor não identificado'}</div></div>
            {selectedCustomer&&<button onClick={()=>{setCustomerId('');setCustomerQuery('')}} className="px-3 py-1.5 rounded-lg border border-neutral-700 text-[10px] font-black">Trocar</button>}
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-neutral-800 bg-[#0d1217] p-3">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black">Carrinho de Vendas <span className="text-neutral-400 font-normal">({cart.reduce((s,l)=>s+l.quantity,0)} itens)</span></h2><button onClick={()=>setCart([])} className="px-2.5 py-1.5 rounded-lg border border-neutral-700 text-[10px] font-black flex items-center gap-1"><Trash2 size={12}/>Limpar</button></div>
          <div className="mt-2 divide-y divide-neutral-800">
            {cart.length===0?<div className="py-10 text-center text-neutral-600 text-xs">Adicione produtos ao carrinho.</div>:cart.map(l=><div key={l.product.id} className="py-2 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0">{l.product.imageUrl?<img src={l.product.imageUrl} alt="" className="w-full h-full object-contain p-1"/>:<Package size={18} className="m-2.5 text-neutral-700"/>}</div>
              <div className="min-w-0 flex-1"><div className="text-xs font-semibold truncate">{l.product.name}</div><div className="text-[9px] text-neutral-500">SKU: {l.product.sku||'—'}</div></div>
              <div className="flex items-center"><button onClick={()=>qty(l.product.id,-1)} className="w-7 h-7 rounded-l-lg border border-neutral-700 bg-[#11171d] grid place-items-center"><Minus size={11}/></button><span className="w-8 h-7 border-y border-neutral-700 grid place-items-center text-xs font-black">{l.quantity}</span><button onClick={()=>qty(l.product.id,1)} className="w-7 h-7 rounded-r-lg border border-neutral-700 bg-[#11171d] grid place-items-center"><Plus size={11}/></button></div>
              <div className="w-20 text-right text-xs font-black">{money(l.product.salePrice*l.quantity)}</div>
              <button onClick={()=>setCart(x=>x.filter(i=>i.product.id!==l.product.id))} className="text-rose-500"><Trash2 size={13}/></button>
            </div>)}
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1 text-xs">
            <div className="flex justify-between text-neutral-300"><span>Subtotal ({cart.reduce((s,l)=>s+l.quantity,0)} itens)</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-neutral-300"><span>Desconto</span><span>{money(discount)}</span></div>
            <div className="flex justify-between items-end pt-2"><span className="text-lg font-black">Total</span><span className="text-2xl font-black text-amber-400">{money(total)}</span></div>
          </div>

          <div className="mt-3"><div className="text-xs font-black mb-2">Pagamento</div><div className="flex gap-2 overflow-x-auto">{paymentButton('DINHEIRO','Dinheiro',Banknote)}{paymentButton('PIX','PIX',QrCode)}{paymentButton('CREDITO','Cartão',CreditCard)}{paymentButton('VOUCHER','Outros',MoreHorizontal)}</div></div>
          {method==='DINHEIRO'&&<div className="grid grid-cols-2 gap-3 mt-3">
            <label className="text-[10px] text-neutral-400">Valor recebido<input value={tendered} onChange={e=>setTendered(e.target.value)} placeholder={total.toFixed(2)} className="mt-1 w-full h-9 rounded-lg border border-neutral-700 bg-[#11171d] px-3 text-xs font-black outline-none focus:border-amber-400"/></label>
            <div className="text-[10px] text-neutral-400">Troco<div className="mt-1 h-9 rounded-lg flex items-center justify-end text-xs font-black">{money(change)}</div></div>
          </div>}
          <label className="block mt-3 text-[10px] text-neutral-400">Desconto<input type="number" min="0" step="0.01" value={discount||''} onChange={e=>setDiscount(Number(e.target.value)||0)} className="mt-1 w-full h-9 rounded-lg border border-neutral-700 bg-[#11171d] px-3 text-xs outline-none focus:border-amber-400"/></label>

          <button disabled={busy||cart.length===0||!currentSession} onClick={()=>void finalize()} className="mt-3 w-full h-12 rounded-xl bg-amber-400 text-neutral-950 font-black text-sm disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center justify-center gap-2"><CheckCircle2 size={18}/>{busy?'PROCESSANDO...':'Finalizar Venda (F9)'}</button>
        </section>

        <section className="mt-3 rounded-xl border border-neutral-800 bg-[#0d1217] p-3">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-black">Cupom / Comprovante</h2><div className="flex gap-2"><span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[9px] font-black">+ Pré-visualização</span><button disabled={!lastReceipt} onClick={()=>window.print()} className="px-2 py-1 rounded-lg border border-neutral-700 text-[9px] font-black flex items-center gap-1 disabled:opacity-40"><Printer size={11}/>Imprimir (F10)</button></div></div>
          {lastReceipt?<div className="mt-3 rounded-lg border border-dashed border-neutral-500 p-3 text-[10px]">
            <div className="flex justify-between gap-3"><div><b className="text-xs">ADEGA PRO</b><div>{store.tradeName||store.name}</div><div>CNPJ: {store.cnpj}</div><div>{store.address}</div></div><div className="text-right"><b>CUPOM NÃO FISCAL</b><div>{new Date(lastReceipt.createdAt).toLocaleString('pt-BR')}</div><div>Operador: {currentUser.name}</div><div>Caixa: {currentSession?.cashRegisterNumber||'—'}</div></div></div>
            <div className="grid grid-cols-[1fr_35px_55px_65px] gap-1 mt-3 pb-1 border-b border-neutral-700 font-black"><span>Item</span><span className="text-right">Qtd</span><span className="text-right">Unit.</span><span className="text-right">Total</span></div>
            {lastReceipt.items.map((it:any,i:number)=><div key={i} className="grid grid-cols-[1fr_35px_55px_65px] gap-1 py-0.5"><span className="truncate">{it.productName}</span><span className="text-right">{it.quantity}</span><span className="text-right">{Number(it.unitPrice).toFixed(2)}</span><span className="text-right">{Number(it.subtotal).toFixed(2)}</span></div>)}
            <div className="flex justify-between mt-2 pt-2 border-t border-neutral-700 text-base font-black"><span>Total</span><span>{money(lastReceipt.total)}</span></div>
          </div>:<div className="mt-3 rounded-lg border border-dashed border-neutral-800 p-5 text-center text-[10px] text-neutral-600">O comprovante aparecerá aqui após finalizar a venda.</div>}
        </section>
      </aside>
    </div>
  </div>
  </>;
};