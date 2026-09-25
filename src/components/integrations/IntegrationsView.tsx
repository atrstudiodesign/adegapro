import React,{useMemo,useState} from 'react';
import { db } from '../../services/db';
import { paymentService } from '../../services/paymentService';
import {
  Cable, QrCode, CreditCard, FileCheck, CheckCircle2, Smartphone, Zap, ShieldCheck,
  Save, Webhook, RefreshCw, ServerCog
} from 'lucide-react';

type ProviderId='IFOOD'|'ASAAS'|'PAGSEGURO'|'MERCADO_PAGO'|'CARD_TERMINAL'|'FISCAL';
type ProviderConfig={
  provider:ProviderId;
  enabled:boolean;
  webhookUrl:string;
  authMode:'NONE'|'HMAC'|'BEARER'|'BASIC';
  secretRef:string;
  eventTypes:string[];
  accountRef?:string;
  merchantRef?:string;
  terminalRef?:string;
  notes?:string;
  updatedAt?:string;
};

const PROVIDERS=[
  {id:'IFOOD' as ProviderId,name:'iFood',desc:'Pedidos, catálogo, cardápio e status após homologação oficial.',tone:'bg-red-600',icon:Smartphone,events:['order.created','order.updated','order.cancelled']},
  {id:'ASAAS' as ProviderId,name:'Asaas',desc:'PIX, cobrança e recorrência via API e webhook.',tone:'bg-blue-700',icon:CreditCard,events:['payment.created','payment.confirmed','payment.overdue']},
  {id:'PAGSEGURO' as ProviderId,name:'PagSeguro',desc:'Pagamentos, PIX e terminais conforme produto homologado.',tone:'bg-emerald-700',icon:CreditCard,events:['payment.approved','payment.failed','charge.refunded']},
  {id:'MERCADO_PAGO' as ProviderId,name:'Mercado Pago',desc:'PIX e pagamentos digitais via integração oficial.',tone:'bg-sky-700',icon:Zap,events:['payment.created','payment.updated']},
  {id:'CARD_TERMINAL' as ProviderId,name:'SmartPOS / TEF',desc:'Envio do valor ao terminal e retorno de NSU após homologação.',tone:'bg-amber-600',icon:CreditCard,events:['terminal.ready','payment.approved','payment.failed']},
  {id:'FISCAL' as ProviderId,name:'NFC-e / Fiscal',desc:'Certificado, CSC e transmissão fiscal permanecem no backend.',tone:'bg-violet-700',icon:FileCheck,events:['invoice.authorized','invoice.rejected']}
];

const emptyConfig=(provider:ProviderId):ProviderConfig=>{
  const p=PROVIDERS.find(x=>x.id===provider)!;
  return {provider,enabled:false,webhookUrl:'',authMode:'HMAC',secretRef:'',eventTypes:p.events};
};

export const IntegrationsView:React.FC=()=>{
  const [legacy,setLegacy]=useState(db.getIntegrations());
  const [saved,setSaved]=useState<ProviderConfig[]>(()=>db.getIntegrationProviderConfigs());
  const [provider,setProvider]=useState<ProviderId>('IFOOD');
  const [draft,setDraft]=useState<ProviderConfig>(()=>saved.find(x=>x.provider==='IFOOD')||emptyConfig('IFOOD'));
  const [feedback,setFeedback]=useState('');
  const [testPixUrl,setTestPixUrl]=useState<string|null>(null);

  const currentProvider=PROVIDERS.find(p=>p.id===provider)!;
  const savedMap=useMemo(()=>new Map(saved.map(x=>[x.provider,x])),[saved]);

  const selectProvider=(id:ProviderId)=>{
    setProvider(id);
    setDraft(savedMap.get(id)||emptyConfig(id));
    setFeedback('');
  };

  const providerStatus=(id:ProviderId)=>{
    const cfg=savedMap.get(id);
    if(id==='CARD_TERMINAL'&&legacy.tef.status==='CONNECTED') return 'CONECTADO';
    if(id==='FISCAL'&&legacy.fiscal.status==='READY') return 'CONECTADO';
    if(cfg?.enabled&&cfg.webhookUrl) return 'HOMOLOGAÇÃO PENDENTE';
    if(cfg?.webhookUrl||cfg?.secretRef||cfg?.accountRef||cfg?.merchantRef||cfg?.terminalRef) return 'CONFIGURANDO';
    return 'NÃO CONFIGURADO';
  };

  const saveProvider=(e:React.FormEvent)=>{
    e.preventDefault();
    if(draft.webhookUrl && !/^https:\/\//i.test(draft.webhookUrl)) {
      setFeedback('A URL do webhook precisa começar com https://');
      return;
    }
    const savedConfig=db.saveIntegrationProviderConfig({...draft,provider});
    const next=db.getIntegrationProviderConfigs();
    setSaved(next);
    setDraft(savedConfig);
    setFeedback('Configuração salva no ambiente de demonstração. Nenhum provedor foi marcado como conectado sem homologação real.');
  };

  const saveLegacy=(section:'pix'|'tef'|'fiscal')=>{
    db.saveIntegrations({[section]:(legacy as any)[section]} as any);
    setFeedback('Configuração local salva no DEMO.');
  };

  const testPix=async()=>{
    try{
      const res=await paymentService.generatePix(10,'Teste Conectividade ADEGA PRO');
      setTestPixUrl(res.qrCodeDataUrl);
      setFeedback('QR Code de teste gerado localmente.');
    }catch{setFeedback('Falha ao gerar QR Code de teste.');}
  };

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-neutral-950">
    <div className="pb-4 border-b border-neutral-800">
      <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2"><Cable size={22} className="text-amber-400"/>Integrações & Pagamentos</h1>
      <p className="text-xs text-neutral-400 mt-1">Delivery, pagamentos, PIX, SmartPOS/TEF, fiscal e webhooks em um único hub.</p>
    </div>

    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 size={15}/>{feedback}</div>}

    <div className="p-4 rounded-2xl border border-emerald-800/40 bg-emerald-950/15 flex items-start gap-3">
      <ShieldCheck size={18} className="text-emerald-400 shrink-0"/>
      <div><div className="text-sm font-black">Hub funcional de configuração</div><div className="text-xs text-neutral-500 mt-1">Clique em um provedor para configurar endpoint, eventos, autenticação e referências. No DEMO os dados ficam somente no navegador.</div></div>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {PROVIDERS.map(p=>{
        const status=providerStatus(p.id);
        const I=p.icon;
        return <button key={p.id} onClick={()=>selectProvider(p.id)} className={`text-left p-4 rounded-2xl border transition-all ${provider===p.id?'border-amber-500/70 bg-amber-500/5':'border-neutral-800 bg-neutral-900 hover:border-neutral-700'}`}>
          <div className="flex items-start justify-between gap-3"><div className={`w-11 h-11 rounded-xl ${p.tone} grid place-items-center text-white`}><I size={19}/></div><span className={`text-[9px] px-2 py-1 rounded-full border font-black ${status==='CONECTADO'?'text-emerald-300 border-emerald-800 bg-emerald-950/30':status==='CONFIGURANDO'?'text-sky-300 border-sky-800 bg-sky-950/30':status==='HOMOLOGAÇÃO PENDENTE'?'text-amber-300 border-amber-800 bg-amber-950/30':'text-neutral-400 border-neutral-700 bg-neutral-950'}`}>{status}</span></div>
          <div className="mt-4 font-black">{p.name}</div><div className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{p.desc}</div>
        </button>;
      })}
    </div>

    <div className="grid xl:grid-cols-[1.1fr_.9fr] gap-4">
      <form onSubmit={saveProvider} className="ap-panel p-5 space-y-4">
        <div className="flex items-center gap-2"><Webhook size={18} className="text-amber-400"/><div><h2 className="font-black">{currentProvider.name}</h2><p className="text-[10px] text-neutral-500">Configuração técnica do conector selecionado</p></div></div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs text-neutral-400">URL do webhook
            <input type="url" value={draft.webhookUrl} onChange={e=>setDraft({...draft,webhookUrl:e.target.value})} placeholder="https://..." className="mt-1 input"/>
          </label>
          <label className="text-xs text-neutral-400">Autenticação
            <select value={draft.authMode} onChange={e=>setDraft({...draft,authMode:e.target.value as any})} className="mt-1 input"><option>HMAC</option><option>BEARER</option><option>BASIC</option><option>NONE</option></select>
          </label>
          <label className="text-xs text-neutral-400">Referência do segredo
            <input value={draft.secretRef} onChange={e=>setDraft({...draft,secretRef:e.target.value})} placeholder="vault://..." className="mt-1 input"/>
          </label>
          <label className="text-xs text-neutral-400">{provider==='CARD_TERMINAL'?'ID do terminal':provider==='IFOOD'?'Merchant / restaurante':provider==='FISCAL'?'CSC / certificado ref':'Conta / customer ref'}
            <input value={draft.accountRef||''} onChange={e=>setDraft({...draft,accountRef:e.target.value})} className="mt-1 input"/>
          </label>
          <label className="text-xs text-neutral-400 md:col-span-2">Eventos
            <input value={draft.eventTypes.join(', ')} onChange={e=>setDraft({...draft,eventTypes:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} className="mt-1 input"/>
          </label>
          <label className="text-xs text-neutral-400 md:col-span-2">Notas
            <textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})} className="mt-1 input min-h-24"/>
          </label>
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Configuração habilitada para homologação</label>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary"><Save size={14} className="mr-2"/>Salvar configuração</button>
          <button type="button" onClick={()=>{setDraft(emptyConfig(provider));setFeedback('Formulário limpo. Salve para substituir a configuração atual.');}} className="btn-secondary"><RefreshCw size={14} className="mr-2"/>Limpar</button>
        </div>
      </form>

      <section className="ap-panel p-5">
        <div className="flex items-center gap-2"><ServerCog size={17} className="text-amber-400"/><h2 className="font-black">Estado do conector</h2></div>
        <div className="mt-4 space-y-3">
          <Info label="Provedor" value={currentProvider.name}/>
          <Info label="Status" value={providerStatus(provider)}/>
          <Info label="Webhook" value={draft.webhookUrl||'Não informado'}/>
          <Info label="Auth" value={draft.authMode}/>
          <Info label="Eventos" value={draft.eventTypes.join(', ')||'Nenhum'}/>
          <Info label="Atualizado" value={draft.updatedAt?new Date(draft.updatedAt).toLocaleString('pt-BR'):'Ainda não salvo'}/>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[10px] text-amber-200 leading-relaxed">
          Este ambiente não simula conexão externa. Para ficar CONECTADO é necessário implementar o adapter oficial do provedor, credenciais backend e homologação.
        </div>
      </section>
    </div>

    <div className="pt-2 border-t border-neutral-800">
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500 mb-3">Configuração local complementar</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2 text-teal-400 mb-3"><QrCode size={20}/><h3 className="font-bold text-white">PIX EMV</h3></div>
          <label className="text-[11px] text-neutral-400">Chave PIX<input value={legacy.pix.pixKey} onChange={e=>setLegacy({...legacy,pix:{...legacy.pix,pixKey:e.target.value}})} className="mt-1 input"/></label>
          <label className="text-[11px] text-neutral-400 block mt-3">Favorecido<input value={legacy.pix.merchantName} onChange={e=>setLegacy({...legacy,pix:{...legacy.pix,merchantName:e.target.value}})} className="mt-1 input"/></label>
          <div className="mt-3 flex gap-2"><button onClick={()=>saveLegacy('pix')} className="btn-primary flex-1">Salvar</button><button onClick={()=>void testPix()} className="btn-secondary">Testar</button></div>
          {testPixUrl&&<img src={testPixUrl} alt="QR Code de teste" className="w-28 h-28 bg-white p-1 rounded-lg mt-4 mx-auto"/>}
        </div>

        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2 text-blue-400 mb-3"><CreditCard size={20}/><h3 className="font-bold text-white">TEF / PinPad</h3></div>
          <label className="text-[11px] text-neutral-400">IP / concentrador<input value={legacy.tef.terminalIp} onChange={e=>setLegacy({...legacy,tef:{...legacy.tef,terminalIp:e.target.value}})} className="mt-1 input"/></label>
          <label className="text-[11px] text-neutral-400 block mt-3">Terminal ID<input value={legacy.tef.terminalId} onChange={e=>setLegacy({...legacy,tef:{...legacy.tef,terminalId:e.target.value}})} className="mt-1 input"/></label>
          <button onClick={()=>saveLegacy('tef')} className="btn-primary w-full mt-3">Salvar TEF</button>
        </div>

        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-2 text-amber-400 mb-3"><FileCheck size={20}/><h3 className="font-bold text-white">Fiscal NFC-e</h3></div>
          <label className="text-[11px] text-neutral-400">Ambiente<select value={legacy.fiscal.environment} onChange={e=>setLegacy({...legacy,fiscal:{...legacy.fiscal,environment:e.target.value as any}})} className="mt-1 input"><option value="HOMOLOGACAO">Homologação</option><option value="PRODUCAO">Produção</option></select></label>
          <label className="text-[11px] text-neutral-400 block mt-3">Série<input type="number" value={legacy.fiscal.series} onChange={e=>setLegacy({...legacy,fiscal:{...legacy.fiscal,series:Number(e.target.value)||1}})} className="mt-1 input"/></label>
          <button onClick={()=>saveLegacy('fiscal')} className="btn-primary w-full mt-3">Salvar fiscal</button>
        </div>
      </div>
    </div>
  </div>;
};

const Info=({label,value}:{label:string;value:string})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">{label}</div><div className="text-xs font-bold mt-1 break-all">{value}</div></div>;
