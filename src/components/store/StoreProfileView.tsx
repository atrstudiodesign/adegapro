import React,{useEffect,useRef,useState} from 'react';
import { Building2, CheckCircle2, ExternalLink, Loader2, MapPin, Plus, Save, ShieldCheck, Store as StoreIcon, Upload } from 'lucide-react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import type { Store } from '../../types';
import { PageHeader,StatusBadge } from '../ui/ProUi';
import { adegaPrompt } from '../ui/AdegaDialog';

export const StoreProfileView:React.FC<{appMode?:AppMode}>=({appMode='DEMO'})=>{
  const[store,setStore]=useState<Store>(db.getStore());
  const[stores,setStores]=useState<Store[]>([]);
  const[overview,setOverview]=useState<any[]>([]);
  const[saved,setSaved]=useState(false),[busy,setBusy]=useState(appMode==='PRODUCTION'),[error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  const load=async()=>{
    setError('');
    if(appMode==='DEMO'){setStore(db.getStore());setStores([db.getStore()]);setBusy(false);return;}
    setBusy(true);
    try{const [active,all,summary]=await Promise.all([productionDb.getStore(),productionDb.getAccessibleStores(),productionDb.getMultiStoreOverview()]);setStore(active);setStores(all);setOverview(summary);}
    catch(e:any){setError(e?.message||'Falha ao carregar lojas.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[appMode]);

  const switchStore=async(id:string)=>{
    if(appMode==='DEMO')return;
    setBusy(true);setError('');
    try{await productionDb.selectStore(id);window.location.reload();}
    catch(e:any){setError(e?.message||'Não foi possível acessar esta loja.');setBusy(false);}
  };

  const createUnit=async()=>{
    if(appMode==='DEMO'){setError('O cadastro de novas unidades é liberado no ambiente contratado.');return;}
    const tradeName=(await adegaPrompt({title:'Nova unidade',label:'Nome da Loja / Unidade',confirmLabel:'Continuar'}))?.trim();
    if(!tradeName)return;
    const legalName=(await adegaPrompt({title:'Nova unidade',label:'Razão social',defaultValue:store.name,confirmLabel:'Criar unidade'}))?.trim()||store.name;
    setBusy(true);setError('');
    try{const id=await productionDb.createStore({name:legalName,tradeName});await productionDb.selectStore(id);window.location.reload();}
    catch(e:any){setError(e?.message||'Não foi possível criar a unidade.');setBusy(false);}
  };

  const onLogo=async(file?:File)=>{
    if(!file)return;
    if(appMode==='DEMO'){
      if(!file.type.startsWith('image/'))return setError('Selecione uma imagem válida.');
      const reader=new FileReader();reader.onload=()=>setStore({...store,logoUrl:String(reader.result)});reader.readAsDataURL(file);return;
    }
    setBusy(true);try{const url=await productionDb.uploadStoreLogo(file);setStore(s=>({...s,logoUrl:url}));}catch(e:any){setError(e?.message||'Falha ao enviar logo.');}finally{setBusy(false);}
  };

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try{if(appMode==='DEMO')db.saveStore(store);else setStore(await productionDb.saveStore(store));setSaved(true);setTimeout(()=>setSaved(false),2500);}
    catch(e:any){setError(e?.message||'Não foi possível salvar os dados.');}
    finally{setBusy(false);}
  };

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto"><div className="max-w-6xl mx-auto space-y-5">
    <PageHeader eyebrow="Administração" title="Lojas & Unidades" description="Cadastre Loja 01, Loja 02 e escolha em qual unidade o sistema está operando." actions={<div className="flex gap-2"><StatusBadge tone={appMode==='PRODUCTION'?'success':'info'}>{appMode==='PRODUCTION'?'PRODUÇÃO':'DEMO'}</StatusBadge><button disabled={busy} onClick={()=>void createUnit()} className="btn-secondary"><Plus size={14} className="mr-2"/>Nova unidade</button></div>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {busy&&<div className="text-xs text-neutral-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Sincronizando unidades...</div>}

    <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {stores.map((s,i)=><button key={s.id} onClick={()=>void switchStore(s.id)} disabled={busy||s.id===store.id} className={`p-4 rounded-2xl border text-left transition ${s.id===store.id?'bg-amber-500/10 border-amber-500/40':'bg-neutral-900 border-neutral-800 hover:border-neutral-600'}`}>
        <div className="flex items-start justify-between gap-2"><div><div className="text-[10px] uppercase tracking-wider text-neutral-500">Loja {String(i+1).padStart(2,'0')}</div><div className="font-black text-white mt-1">{s.tradeName}</div></div>{s.id===store.id&&<CheckCircle2 size={18} className="text-emerald-400"/>}</div>
        <div className="text-[11px] text-neutral-500 mt-2 flex items-start gap-1"><MapPin size={12} className="mt-0.5 shrink-0"/>{s.address||'Endereço ainda não informado'}</div>
        <div className="text-[10px] mt-3 font-black text-amber-400">{s.id===store.id?'UNIDADE ATIVA':'ACESSAR ESTA LOJA'}</div>
      </button>)}
    </section>

    <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3"><ShieldCheck size={18} className="text-amber-400 shrink-0"/><div className="text-xs text-neutral-300"><b className="text-white">Separação por unidade:</b> estoque, caixa, vendas, compras, inventário e financeiro usam a loja ativa. O catálogo de produtos permanece compartilhado pelo mesmo cliente.</div></div>

    {appMode==='PRODUCTION'&&overview.length>0&&<section className="space-y-3">
      <div><h2 className="font-black text-white">Visão administrativa multi-loja</h2><p className="text-[11px] text-neutral-500 mt-1">Indicadores de hoje separados por unidade. Estoques nunca são consolidados entre lojas.</p></div>
      <div className="grid lg:grid-cols-2 gap-3">
        {overview.map((item:any)=><div key={item.store.id} className={`p-4 rounded-2xl border ${item.active?'border-amber-500/40 bg-amber-500/5':'border-neutral-800 bg-neutral-900'}`}>
          <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-neutral-500">{item.active?'Loja ativa':'Outra unidade'}</div><div className="font-black text-white mt-1">{item.store.tradeName||item.store.name}</div></div><StatusBadge tone={item.cashOpen?'success':'info'}>{item.cashOpen?'CAIXA ABERTO':'CAIXA FECHADO'}</StatusBadge></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[9px] text-neutral-500">Faturamento hoje</div><div className="text-xs font-black text-emerald-400 mt-1">{Number(item.revenue||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[9px] text-neutral-500">Entradas</div><div className="text-xs font-black text-emerald-400 mt-1">{Number(item.entries||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[9px] text-neutral-500">Saídas</div><div className="text-xs font-black text-rose-400 mt-1">{Number(item.exits||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[9px] text-neutral-500">Saldo</div><div className="text-xs font-black text-amber-400 mt-1">{Number(item.balance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
          </div>
          {!item.active&&<button type="button" disabled={busy} onClick={()=>void switchStore(item.store.id)} className="mt-3 text-[10px] font-black text-amber-400">ABRIR ESTA LOJA →</button>}
        </div>)}
      </div>
    </section>}

    <form onSubmit={save} className="grid lg:grid-cols-[280px_1fr] gap-5">
      <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h2 className="font-bold text-white text-sm mb-4">Logo desta unidade</h2>
        <div className="aspect-square rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden grid place-items-center">{store.logoUrl?<img src={store.logoUrl} alt={store.tradeName} className="w-full h-full object-contain p-3"/>:<StoreIcon size={48} className="text-neutral-700"/>}</div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e=>void onLogo(e.target.files?.[0])}/>
        <button disabled={busy} type="button" onClick={()=>fileRef.current?.click()} className="mt-3 w-full btn-secondary"><Upload size={14} className="mr-2"/>Enviar logo</button>
      </section>
      <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2"><Building2 size={17} className="text-amber-400"/><h2 className="font-black text-white">Dados da unidade ativa</h2></div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Razão social" value={store.name} onChange={v=>setStore({...store,name:v})}/>
          <Field label="Nome fantasia" value={store.tradeName} onChange={v=>setStore({...store,tradeName:v})}/>
          <Field label="CNPJ" value={store.cnpj} onChange={v=>setStore({...store,cnpj:v})}/>
          <Field label="Inscrição estadual" value={store.stateRegistration} onChange={v=>setStore({...store,stateRegistration:v})}/>
          <Field label="Telefone" value={store.phone} onChange={v=>setStore({...store,phone:v})}/>
          <Field label="WhatsApp" value={store.whatsapp} onChange={v=>setStore({...store,whatsapp:v})}/>
          <Field label="E-mail" value={store.email} onChange={v=>setStore({...store,email:v})}/>
          <Field label="Instagram" value={store.instagram} onChange={v=>setStore({...store,instagram:v})}/>
          <div className="md:col-span-2"><Field label="Endereço" value={store.address} onChange={v=>setStore({...store,address:v})}/></div>
          <Field label="Cidade" value={store.city} onChange={v=>setStore({...store,city:v})}/>
          <Field label="UF" value={store.state} onChange={v=>setStore({...store,state:v.toUpperCase().slice(0,2)})}/>
          <Field label="CEP" value={store.zipCode} onChange={v=>setStore({...store,zipCode:v})}/>
          <Field label="Horário" value={store.openingHours} onChange={v=>setStore({...store,openingHours:v})}/>
        </div>
        <div className="pt-3 border-t border-neutral-800 flex justify-between items-center"><span className="text-xs text-emerald-400">{saved?'Dados salvos.':''}</span><button disabled={busy} className="btn-primary"><Save size={15} className="mr-2"/>Salvar unidade</button></div>
      </section>
    </form>

    <footer className="pt-4 border-t border-neutral-900 text-[11px] text-neutral-500 flex flex-wrap justify-between gap-3"><span>© 2026 ADEGA PRO · Gestão multiunidade.</span><a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="text-amber-400 flex items-center gap-1">ATR Studio <ExternalLink size={11}/></a></footer>
  </div></div>;
};

const Field=({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void})=><label className="block"><span className="text-[11px] text-neutral-400 block mb-1">{label}</span><input value={value||''} onChange={e=>onChange(e.target.value)} className="input"/></label>;
