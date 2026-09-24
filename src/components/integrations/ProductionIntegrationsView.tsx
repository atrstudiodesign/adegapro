import React,{useEffect,useState} from 'react';
import { Cable, Clock3, ShieldCheck, Webhook, Save, RefreshCw } from 'lucide-react';
import { productionDb } from '../../services/productionDb';

const Capability=({title,status,detail,ready}:{title:string;status:string;detail:string;ready:boolean})=><div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-white">{title}</h2><p className="text-xs text-neutral-400 mt-1 leading-relaxed">{detail}</p></div><span className={ready?'text-[10px] font-black px-2 py-1 rounded-full border border-emerald-800 bg-emerald-950/40 text-emerald-300':'text-[10px] font-black px-2 py-1 rounded-full border border-amber-800 bg-amber-950/40 text-amber-300'}>{status}</span></div></div>;

export const ProductionIntegrationsView:React.FC=()=>{
  const[configs,setConfigs]=useState<any[]>([]);
  const[provider,setProvider]=useState('CARD_TERMINAL');
  const[url,setUrl]=useState('');
  const[events,setEvents]=useState('payment.approved,payment.failed,receipt.ready');
  const[authMode,setAuthMode]=useState<'NONE'|'HMAC'|'BEARER'|'BASIC'>('HMAC');
  const[secretRef,setSecretRef]=useState('');
  const[enabled,setEnabled]=useState(false);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  const load=async()=>{setBusy(true);setError('');try{setConfigs(await productionDb.getIntegrationWebhookConfigs());}catch(e:any){setError(e?.message||'Falha ao carregar webhooks.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);

  const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{
    await productionDb.saveIntegrationWebhookConfig({
      provider,
      webhookUrl:url,
      eventTypes:events.split(',').map(x=>x.trim()).filter(Boolean),
      authMode,
      secretRef:secretRef.trim()||undefined,
      enabled
    });
    setMessage('Configuração salva. O segredo real deve permanecer no backend/Vault; este campo guarda apenas uma referência.');
    await load();
  }catch(err:any){setError(err?.message||'Não foi possível salvar o webhook.');}finally{setBusy(false);}};

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-neutral-950 text-white">
    <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-800"><div><h1 className="text-xl font-black flex items-center gap-2"><Cable size={22} className="text-amber-400"/>Integrações de Produção</h1><p className="text-xs text-neutral-400 mt-1">Configuração técnica para PSP, SmartPOS, TEF, fiscal e notificações externas.</p></div><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button></div>

    <div className="p-4 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 flex items-start gap-3"><ShieldCheck size={19} className="text-emerald-400 shrink-0"/><div><div className="text-sm font-bold">Supabase operacional</div><div className="text-xs text-neutral-400 mt-1">Autenticação, RLS, banco multi-tenant, auditoria e configurações de integração ficam separadas por loja.</div></div></div>

    <div className="grid md:grid-cols-2 gap-4">
      <Capability title="PIX integrado" status="PENDENTE DE PROVEDOR" ready={false} detail="Cobrança dinâmica e confirmação automática exigem API e webhook assinado de um PSP real."/>
      <Capability title="Máquina de cartão / SmartPOS / TEF" status="BASE PREPARADA · AGUARDA PROVEDOR" ready={false} detail="A base de terminais, eventos e webhook está pronta. Para disparar valor na máquina e receber NSU/comprovante ainda é necessário homologar o provedor."/>
      <Capability title="NFC-e / Fiscal" status="NÃO HOMOLOGADO" ready={false} detail="Certificado, CSC e transmissão fiscal devem ficar apenas no backend/provedor homologado."/>
      <Capability title="Offline transacional" status="PENDENTE" ready={false} detail="Vendas reais offline exigem outbox em IndexedDB, idempotência e confirmação posterior do servidor."/>
    </div>

    <form onSubmit={save} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
      <div className="flex items-center gap-2"><Webhook size={18} className="text-amber-400"/><div><h2 className="font-black">Configuração de Webhook</h2><p className="text-[11px] text-neutral-500">Use endpoint HTTPS. Segredos reais não devem ser digitados nem persistidos no navegador.</p></div></div>
      {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {message&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{message}</div>}
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs text-neutral-400">Provedor
          <select value={provider} onChange={e=>setProvider(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5">
            <option value="CARD_TERMINAL">Máquina / SmartPOS / TEF</option>
            <option value="PIX_PSP">PIX / PSP</option>
            <option value="FISCAL">Fiscal / NFC-e</option>
            <option value="CUSTOM">Customizado</option>
          </select>
        </label>
        <label className="text-xs text-neutral-400">URL do webhook
          <input required type="url" pattern="https://.*" placeholder="https://api.seudominio.com/webhooks/pagamentos" value={url} onChange={e=>setUrl(e.target.value)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/>
        </label>
        <label className="text-xs text-neutral-400 md:col-span-2">Eventos
          <input value={events} onChange={e=>setEvents(e.target.value)} placeholder="payment.approved,payment.failed,receipt.ready" className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5"/>
        </label>
        <label className="text-xs text-neutral-400">Autenticação
          <select value={authMode} onChange={e=>setAuthMode(e.target.value as any)} className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5">
            <option value="HMAC">HMAC</option>
            <option value="BEARER">Bearer</option>
            <option value="BASIC">Basic</option>
            <option value="NONE">Nenhuma</option>
          </select>
        </label>
        <label className="text-xs text-neutral-400">Referência do segredo
          <input value={secretRef} onChange={e=>setSecretRef(e.target.value)} placeholder="vault://payments/card-terminal" className="mt-1 w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 font-mono"/>
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>Ativar configuração após homologação</label>
      <button disabled={busy} className="px-5 py-3 rounded-xl bg-amber-500 text-neutral-950 font-black text-sm flex items-center gap-2"><Save size={15}/>{busy?'Salvando...':'Salvar webhook'}</button>
    </form>

    <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="text-sm font-black">Webhooks cadastrados</div>
      <div className="mt-3 space-y-2">{configs.length===0?<div className="text-xs text-neutral-500">Nenhuma configuração cadastrada.</div>:configs.map(c=><div key={c.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"><div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{c.provider}</span><span className={c.enabled?'text-emerald-400':'text-neutral-500'}>{c.enabled?'ATIVO':'INATIVO'}</span></div><div className="mt-1 text-neutral-400 break-all">{c.webhook_url}</div><div className="mt-1 text-neutral-600">{Array.isArray(c.event_types)?c.event_types.join(', '):''} · {c.auth_mode}</div></div>)}</div>
    </div>

    <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 space-y-2"><div className="flex items-center gap-2 text-white font-bold"><Clock3 size={15} className="text-amber-400"/>Próxima etapa</div><p>Depois de escolher o provedor real, o webhook deve ser recebido e validado em backend/Edge Function, com assinatura HMAC ou mecanismo equivalente, idempotência e reconciliação de eventos.</p></div>
  </div>;
};