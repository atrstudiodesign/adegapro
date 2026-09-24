import React,{useEffect,useState} from 'react';
import { Building2, CreditCard, Headphones, RefreshCw, ShieldCheck, X, Ban, CheckCircle2 } from 'lucide-react';
import { productionDb } from '../../services/productionDb';

export const PlatformControlView:React.FC<{onClose:()=>void}>=({onClose})=>{
  const[data,setData]=useState<any>(null);
  const[busy,setBusy]=useState(true);
  const[error,setError]=useState('');
  const load=async()=>{setBusy(true);setError('');try{setData(await productionDb.getPlatformControlSnapshot());}catch(e:any){setError(e?.message||'Acesso negado.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const toggle=async(t:any)=>{
    const next=!t.active;
    const ok=window.confirm(next?'Reativar este cliente e suas lojas?':'Suspender este cliente e bloquear o ambiente de produção?');
    if(!ok)return;
    setBusy(true);setError('');
    try{await productionDb.setPlatformTenantAccess(t.id,next,next?'ACTIVE':'SUSPENDED');await load();}
    catch(e:any){setError(e?.message||'Não foi possível alterar o acesso.');}
    finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-[100] bg-neutral-950 text-white overflow-y-auto">
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
        <div><div className="text-[10px] uppercase tracking-[.2em] text-amber-400 font-black">ATR Studio · Control Plane</div><h1 className="text-2xl font-black mt-1">Administração da Plataforma</h1><p className="text-xs text-neutral-500 mt-1">Área restrita a administradores da plataforma. Não existe entrada pública no sistema.</p></div>
        <div className="flex gap-2"><button onClick={()=>void load()} disabled={busy} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button><button onClick={onClose} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800"><X size={18}/></button></div>
      </div>
      {error&&<div className="mt-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {data&&<><div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
        {[['Clientes',data.metrics?.tenant_count||0,Building2],['Ativos',data.metrics?.active_tenants||0,CheckCircle2],['Licenças ativas',data.metrics?.active_licenses||0,ShieldCheck],['Em atraso',data.metrics?.past_due_subscriptions||0,CreditCard],['Suporte aberto',data.metrics?.open_support||0,Headphones]].map(([l,v,I]:any)=><div key={l} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><I size={18} className="text-amber-400"/><div className="text-2xl font-black mt-3">{v}</div><div className="text-[11px] text-neutral-500">{l}</div></div>)}
      </div>
      <div className="mt-5 space-y-3">{(data.tenants||[]).map((t:any)=><article key={t.id} className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{t.trade_name||t.legal_name}</h2><span className={`text-[10px] px-2 py-1 rounded-full border ${t.active?'text-emerald-300 border-emerald-800 bg-emerald-950/30':'text-rose-300 border-rose-800 bg-rose-950/30'}`}>{t.active?'ATIVO':'SUSPENSO'}</span></div><div className="text-xs text-neutral-500 mt-1">{t.legal_name} · {t.cnpj||'CNPJ não informado'}</div></div><button disabled={busy} onClick={()=>void toggle(t)} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 ${t.active?'bg-rose-950 text-rose-300 border border-rose-800':'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>{t.active?<Ban size={14}/>:<CheckCircle2 size={14}/>} {t.active?'Suspender':'Reativar'}</button></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-xs"><Info l="Plano" v={t.plan}/><Info l="Lojas" v={t.stores}/><Info l="Usuários" v={t.users}/><Info l="Licença" v={t.license?.modality||'SETUP'}/><Info l="Cobrança" v={t.billing?.status||'NÃO CONFIGURADA'}/></div>
      </article>)}</div></>}
      {busy&&!data&&<div className="py-20 text-center text-sm text-neutral-500">Validando privilégios e carregando plataforma...</div>}
    </div>
  </div>;
};
const Info=({l,v}:{l:string;v:any})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">{l}</div><div className="font-bold mt-1">{String(v??'-')}</div></div>;
