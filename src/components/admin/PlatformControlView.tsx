import React,{useEffect,useMemo,useState} from 'react';
import {
  Activity, AlertTriangle, Ban, BellRing, Building2, CheckCircle2, ClipboardList, CreditCard,
  Database, Headphones, History, MessageSquareText, RefreshCw, Search, ServerCog, ShieldCheck,
  Users, WalletCards, X
} from 'lucide-react';
import { platformDb } from '../../services/platformDb';

type Tab='OVERVIEW'|'TENANTS'|'BILLING'|'SUPPORT'|'INCIDENTS'|'AUDIT';
const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const dt=(v:any)=>v?new Date(v).toLocaleString('pt-BR'):'—';
const dateValue=(v:any)=>v?String(v).slice(0,10):'';

export const PlatformControlView:React.FC<{onClose:()=>void}>=({onClose})=>{
  const[data,setData]=useState<any>(null);
  const[detail,setDetail]=useState<any>(null);
  const[selectedTenantId,setSelectedTenantId]=useState<string>('');
  const[tab,setTab]=useState<Tab>('OVERVIEW');
  const[search,setSearch]=useState('');
  const[statusFilter,setStatusFilter]=useState<'ALL'|'ACTIVE'|'SUSPENDED'|'PAST_DUE'|'TRIALING'>('ALL');
  const[busy,setBusy]=useState(true);
  const[error,setError]=useState('');
  const[feedback,setFeedback]=useState('');

  const load=async()=>{
    setBusy(true);setError('');
    try{setData(await platformDb.getPlatformControlSnapshot());}
    catch(e:any){setError(e?.message||'Acesso negado.');}
    finally{setBusy(false);}
  };

  const loadDetail=async(id:string)=>{
    setBusy(true);setError('');
    try{
      setSelectedTenantId(id);
      setDetail(await platformDb.getPlatformTenantDetail(id));
    }catch(e:any){setError(e?.message||'Não foi possível carregar o cliente.');}
    finally{setBusy(false);}
  };

  useEffect(()=>{void load();},[]);

  const tenants=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return (data?.tenants||[]).filter((t:any)=>{
      const hay=[t.trade_name,t.legal_name,t.cnpj,t.plan,t.billing?.status].join(' ').toLowerCase();
      if(q&&!hay.includes(q))return false;
      if(statusFilter==='ACTIVE')return t.active===true;
      if(statusFilter==='SUSPENDED')return t.active===false;
      if(statusFilter==='PAST_DUE')return t.billing?.status==='PAST_DUE';
      if(statusFilter==='TRIALING')return t.billing?.status==='TRIALING';
      return true;
    });
  },[data,search,statusFilter]);

  const toggle=async(t:any)=>{
    const next=!t.active;
    const ok=window.confirm(next?'Reativar este cliente e suas lojas?':'Suspender este cliente e bloquear o ambiente de produção?');
    if(!ok)return;
    setBusy(true);setError('');setFeedback('');
    try{
      await platformDb.setPlatformTenantAccess(t.id,next,next?'ACTIVE':'SUSPENDED');
      await load();
      if(selectedTenantId===t.id)await loadDetail(t.id);
      setFeedback(next?'Cliente reativado.':'Cliente suspenso.');
    }catch(e:any){setError(e?.message||'Não foi possível alterar o acesso.');}
    finally{setBusy(false);}
  };

  const refreshAll=async()=>{
    await load();
    if(selectedTenantId)await loadDetail(selectedTenantId);
  };

  const metricCards=[
    ['Clientes',data?.metrics?.tenant_count||0,Building2,'neutral'],
    ['Ativos',data?.metrics?.active_tenants||0,CheckCircle2,'emerald'],
    ['Licenças ativas',data?.metrics?.active_licenses||0,ShieldCheck,'amber'],
    ['Em atraso',data?.metrics?.past_due_subscriptions||0,CreditCard,'rose'],
    ['Trials',data?.metrics?.trialing_subscriptions||0,Activity,'sky'],
    ['Suporte aberto',data?.metrics?.open_support||0,Headphones,'violet'],
    ['Incidentes',data?.metrics?.open_incidents||0,AlertTriangle,'rose'],
    ['MRR',money(data?.metrics?.mrr||0),WalletCards,'emerald']
  ];

  return <div className="fixed inset-0 z-[100] bg-[#080808] text-white overflow-hidden">
    <div className="h-full grid grid-rows-[auto_1fr]">
      <header className="px-4 sm:px-6 py-4 border-b border-neutral-800 bg-black/80 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[.22em] text-amber-400 font-black">ATR Studio · Control Plane</div>
            <h1 className="text-2xl font-black mt-1">Administração da Plataforma</h1>
            <p className="text-xs text-neutral-500 mt-1">Assinaturas, billing, suporte, incidentes, infraestrutura e auditoria administrativa.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>void refreshAll()} disabled={busy} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex items-center gap-2 hover:border-amber-500/40"><RefreshCw size={14}/>Atualizar</button>
            <button onClick={onClose} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800"><X size={18}/></button>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto">
          {([
            ['OVERVIEW','Visão geral',Activity],
            ['TENANTS','Clientes',Building2],
            ['BILLING','Assinaturas',CreditCard],
            ['SUPPORT','Suporte',Headphones],
            ['INCIDENTS','Incidentes',AlertTriangle],
            ['AUDIT','Auditoria',History]
          ] as [Tab,string,any][]).map(([id,label,I])=><button key={id} onClick={()=>setTab(id)} className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${tab===id?'bg-amber-500 text-neutral-950 border-amber-400':'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'}`}><I size={14}/>{label}</button>)}
        </nav>
      </header>

      <main className="overflow-y-auto px-4 sm:px-6 py-5">
        {error&&<div className="mb-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        {feedback&&<div className="mb-4 p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{feedback}</div>}

        {tab==='OVERVIEW'&&<>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            {metricCards.map(([l,v,I,tone]:any)=><Metric key={l} label={l} value={v} icon={I} tone={tone}/>)}
          </div>
          <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-4 mt-5">
            <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between"><div><h2 className="font-black">Clientes recentes</h2><p className="text-[10px] text-neutral-500 mt-1">Situação comercial e operacional</p></div><button onClick={()=>setTab('TENANTS')} className="text-[10px] text-amber-400 font-black">VER TODOS</button></div>
              <div className="mt-4 space-y-2">{(data?.tenants||[]).slice(0,6).map((t:any)=><TenantRow key={t.id} t={t} onOpen={()=>void loadDetail(t.id)} onToggle={()=>void toggle(t)}/>)}</div>
            </section>
            <section className="space-y-3">
              <HealthCard icon={ServerCog} title="Infraestrutura" value={(data?.tenants||[]).filter((t:any)=>t.infrastructure?.status==='READY').length+' READY'} detail="Registro de ambiente por tenant"/>
              <HealthCard icon={BellRing} title="Incidentes abertos" value={String(data?.metrics?.open_incidents||0)} detail="Operação e disponibilidade"/>
              <HealthCard icon={MessageSquareText} title="Suporte aberto" value={String(data?.metrics?.open_support||0)} detail="Tickets aguardando resolução"/>
            </section>
          </div>
        </>}

        {(tab==='TENANTS'||tab==='BILLING')&&<>
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between mb-4">
            <div className="relative flex-1 max-w-2xl"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, CNPJ, plano ou status..." className="w-full rounded-xl bg-neutral-900 border border-neutral-800 pl-9 pr-3 py-3 text-xs outline-none focus:border-amber-500"/></div>
            <div className="flex gap-2 overflow-x-auto">{(['ALL','ACTIVE','SUSPENDED','PAST_DUE','TRIALING'] as const).map(s=><button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-2 rounded-xl border text-[10px] font-black ${statusFilter===s?'bg-amber-500 text-neutral-950 border-amber-400':'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>{s}</button>)}</div>
          </div>
          <div className="space-y-3">{tenants.map((t:any)=><article key={t.id} className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{t.trade_name||t.legal_name}</h2><Badge tone={t.active?'emerald':'rose'}>{t.active?'ATIVO':'SUSPENSO'}</Badge><Badge tone={billingTone(t.billing?.status)}>{t.billing?.status||'SEM ASSINATURA'}</Badge></div>
                <div className="text-xs text-neutral-500 mt-1">{t.legal_name} · {t.cnpj||'CNPJ não informado'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>void loadDetail(t.id)} className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-black">Detalhes</button>
                <button disabled={busy} onClick={()=>void toggle(t)} className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 ${t.active?'bg-rose-950 text-rose-300 border border-rose-800':'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>{t.active?<Ban size={14}/>:<CheckCircle2 size={14}/>} {t.active?'Suspender':'Reativar'}</button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-2 mt-4 text-xs">
              <Info l="Plano" v={t.plan}/><Info l="Lojas" v={t.stores}/><Info l="Usuários" v={t.users}/><Info l="Licença" v={t.license?.modality||'—'}/><Info l="Valor" v={t.billing?.amount?money(t.billing.amount):'—'}/><Info l="Próx. vencimento" v={t.billing?.next_due_at?new Date(t.billing.next_due_at).toLocaleDateString('pt-BR'):'—'}/><Info l="Banco" v={t.infrastructure?.database_mode||'SHARED'}/>
            </div>
          </article>)}</div>
        </>}

        {tab==='SUPPORT'&&<GlobalSupport tenants={data?.tenants||[]} onOpen={id=>void loadDetail(id)}/>}
        {tab==='INCIDENTS'&&<GlobalIncidents tenants={data?.tenants||[]} onOpen={id=>void loadDetail(id)}/>}
        {tab==='AUDIT'&&<GlobalAudit tenants={data?.tenants||[]} onOpen={id=>void loadDetail(id)}/>}

        {busy&&!data&&<div className="py-20 text-center text-sm text-neutral-500">Validando privilégios e carregando plataforma...</div>}
      </main>
    </div>

    {detail&&<TenantDrawer detail={detail} busy={busy} onClose={()=>{setDetail(null);setSelectedTenantId('');}} onReload={()=>void refreshAll()} onError={setError} onFeedback={setFeedback}/>}
  </div>;
};

const TenantDrawer=({detail,busy,onClose,onReload,onError,onFeedback}:{detail:any;busy:boolean;onClose:()=>void;onReload:()=>void;onError:(s:string)=>void;onFeedback:(s:string)=>void})=>{
  const tenant=detail.tenant;
  const[sub,setSub]=useState<any>(detail.subscriptions?.[0]||{tenant_id:tenant.id,plan_code:tenant.plan||'PRO',status:'ACTIVE',billing_cycle:'MONTHLY',currency:'BRL',provider:'MANUAL'});
  const[license,setLicense]=useState<any>(detail.licenses?.[0]||{tenant_id:tenant.id,modality:'SUBSCRIPTION',status:'ACTIVE',hosting_included:true});
  const[infra,setInfra]=useState<any>(detail.infrastructure||{tenant_id:tenant.id,database_mode:'SHARED',provider:'SUPABASE',status:'READY'});
  const[comm,setComm]=useState<any>({tenant_id:tenant.id,channel:'INTERNAL',subject:'',message:'',status:'DRAFT'});
  const[incident,setIncident]=useState<any>({tenant_id:tenant.id,severity:'MEDIUM',status:'OPEN',title:'',description:''});
  const[webhook,setWebhook]=useState<any>(detail.webhooks?.[0]||{tenant_id:tenant.id,provider:'CUSTOM',webhook_url:'',event_types:[],auth_mode:'NONE',secret_ref:'',enabled:false});
  const[section,setSection]=useState<'SUMMARY'|'SUBSCRIPTION'|'LICENSE'|'STORES'|'USERS'|'SUPPORT'|'BILLING_EVENTS'|'WEBHOOKS'|'COMMS'|'INCIDENTS'|'INFRA'|'AUDIT'>('SUMMARY');

  const action=async(fn:()=>Promise<any>,ok:string)=>{
    onError('');onFeedback('');
    try{await fn();onFeedback(ok);onReload();}
    catch(e:any){onError(e?.message||'Falha na operação.');}
  };

  return <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm">
    <aside className="absolute inset-y-0 right-0 w-full max-w-5xl bg-[#0b0b0b] border-l border-neutral-800 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#0b0b0b]/95 backdrop-blur border-b border-neutral-800 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-[10px] text-amber-400 font-black uppercase tracking-wider">Tenant Control</div><h2 className="text-xl font-black mt-1">{tenant.trade_name||tenant.legal_name}</h2><div className="text-xs text-neutral-500 mt-1">{tenant.legal_name} · {tenant.cnpj||'sem CNPJ'}</div></div>
          <button onClick={onClose} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800"><X size={18}/></button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">{([
          ['SUMMARY','Resumo'],['SUBSCRIPTION','Assinatura'],['LICENSE','Licença'],['STORES','Lojas'],['USERS','Usuários'],['SUPPORT','Suporte'],['BILLING_EVENTS','Billing'],['WEBHOOKS','Webhooks'],['COMMS','Comunicação'],['INCIDENTS','Incidentes'],['INFRA','Infra'],['AUDIT','Auditoria']
        ] as const).map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-black ${section===id?'bg-amber-500 text-neutral-950 border-amber-400':'bg-neutral-900 border-neutral-800 text-neutral-500'}`}>{label}</button>)}</div>
      </div>

      <div className="p-4 sm:p-5">
        {section==='SUMMARY'&&<div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3"><Info l="Plano" v={tenant.plan}/><Info l="Status" v={tenant.active?'ATIVO':'SUSPENSO'}/><Info l="Lojas" v={detail.stores?.length||0}/><Info l="Usuários" v={detail.users?.length||0}/><Info l="Assinatura" v={detail.subscriptions?.[0]?.status||'—'}/><Info l="Valor" v={detail.subscriptions?.[0]?.amount?money(detail.subscriptions[0].amount):'—'}/><Info l="Licença" v={detail.licenses?.[0]?.modality||'—'}/><Info l="Banco" v={detail.infrastructure?.database_mode||'SHARED'}/></div>}

        {section==='SUBSCRIPTION'&&<FormCard title="Assinatura e cobrança" description="Controle comercial interno. Alterações ficam registradas em auditoria.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Plano"><select value={sub.plan_code||'PRO'} onChange={e=>setSub({...sub,plan_code:e.target.value})} className="input"><option>STARTER</option><option>PRO</option><option>ENTERPRISE</option></select></Field>
            <Field label="Status"><select value={sub.status||'ACTIVE'} onChange={e=>setSub({...sub,status:e.target.value})} className="input">{['PENDING','TRIALING','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED','ENDED'].map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field label="Ciclo"><select value={sub.billing_cycle||'MONTHLY'} onChange={e=>setSub({...sub,billing_cycle:e.target.value})} className="input">{['MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','ONE_TIME'].map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field label="Valor"><input type="number" step="0.01" value={sub.amount??''} onChange={e=>setSub({...sub,amount:e.target.value})} className="input"/></Field>
            <Field label="Próximo vencimento"><input type="date" value={dateValue(sub.next_due_at)} onChange={e=>setSub({...sub,next_due_at:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Fim do período"><input type="date" value={dateValue(sub.current_period_end)} onChange={e=>setSub({...sub,current_period_end:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Início trial"><input type="date" value={dateValue(sub.trial_start)} onChange={e=>setSub({...sub,trial_start:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Fim trial"><input type="date" value={dateValue(sub.trial_end)} onChange={e=>setSub({...sub,trial_end:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Carência até"><input type="date" value={dateValue(sub.grace_until)} onChange={e=>setSub({...sub,grace_until:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Provider"><input value={sub.provider||'MANUAL'} onChange={e=>setSub({...sub,provider:e.target.value})} className="input"/></Field>
            <Field label="Ref. cliente provider"><input value={sub.provider_customer_ref||''} onChange={e=>setSub({...sub,provider_customer_ref:e.target.value})} className="input"/></Field>
            <Field label="Ref. assinatura provider"><input value={sub.provider_subscription_ref||''} onChange={e=>setSub({...sub,provider_subscription_ref:e.target.value})} className="input"/></Field>
          </div>
          <Field label="Notas administrativas"><textarea value={sub.admin_notes||''} onChange={e=>setSub({...sub,admin_notes:e.target.value})} className="input min-h-24"/></Field>
          <label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={!!sub.cancel_at_period_end} onChange={e=>setSub({...sub,cancel_at_period_end:e.target.checked})}/>Cancelar ao final do período</label>
          <button disabled={busy} onClick={()=>void action(()=>platformDb.savePlatformSubscription({...sub,tenant_id:tenant.id}),'Assinatura salva.')} className="btn-primary">Salvar assinatura</button>
        </FormCard>}

        {section==='LICENSE'&&<FormCard title="Licença comercial" description="Modalidade contratual, escopo e vigência.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Modalidade"><select value={license.modality||'SUBSCRIPTION'} onChange={e=>setLicense({...license,modality:e.target.value})} className="input">{['SUBSCRIPTION','FULL_LICENSE','PARTIAL_LICENSE','CUSTOM_PROJECT','DEDICATED_DEPLOYMENT'].map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field label="Status"><select value={license.status||'ACTIVE'} onChange={e=>setLicense({...license,status:e.target.value})} className="input">{['DRAFT','ACTIVE','SUSPENDED','ENDED','CANCELLED'].map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field label="Contrato"><input value={license.contract_reference||''} onChange={e=>setLicense({...license,contract_reference:e.target.value})} className="input"/></Field>
            <Field label="Início"><input type="date" value={dateValue(license.starts_at)} onChange={e=>setLicense({...license,starts_at:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
            <Field label="Fim"><input type="date" value={dateValue(license.ends_at)} onChange={e=>setLicense({...license,ends_at:e.target.value?e.target.value+'T12:00:00Z':''})} className="input"/></Field>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-neutral-400">{[['maintenance_included','Manutenção'],['updates_included','Atualizações'],['hosting_included','Hospedagem'],['white_label','White label']].map(([k,l])=><label key={k} className="flex gap-2 items-center"><input type="checkbox" checked={!!license[k]} onChange={e=>setLicense({...license,[k]:e.target.checked})}/>{l}</label>)}</div>
          <Field label="Notas"><textarea value={license.notes||''} onChange={e=>setLicense({...license,notes:e.target.value})} className="input min-h-24"/></Field>
          <button disabled={busy} onClick={()=>void action(()=>platformDb.savePlatformLicense({...license,tenant_id:tenant.id}),'Licença salva.')} className="btn-primary">Salvar licença</button>
        </FormCard>}

        {section==='STORES'&&<List title="Lojas">{(detail.stores||[]).map((s:any)=><Row key={s.id} title={s.trade_name} subtitle={s.legal_name+' · '+(s.cnpj||'sem CNPJ')} right={<Badge tone={s.active?'emerald':'rose'}>{s.active?'ATIVA':'INATIVA'}</Badge>}/>)}</List>}
        {section==='USERS'&&<List title="Usuários">{(detail.users||[]).map((u:any)=><Row key={u.user_id} title={u.full_name||'Sem nome'} subtitle={u.role+' · '+(u.phone||'sem telefone')} right={<Badge tone={u.active?'emerald':'rose'}>{u.active?'ATIVO':'INATIVO'}</Badge>}/>)}</List>}

        {section==='SUPPORT'&&<List title="Tickets de suporte">{(detail.support||[]).map((t:any)=><div key={t.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-bold text-sm">{t.subject}</div><div className="text-[10px] text-neutral-500 mt-1">{t.category} · {dt(t.updated_at)}</div><div className="text-xs text-neutral-400 mt-2">{t.description}</div></div><div className="flex gap-2"><select defaultValue={t.priority} id={'p-'+t.id} className="input !py-2">{['BAIXA','NORMAL','ALTA','CRITICA'].map(x=><option key={x}>{x}</option>)}</select><select defaultValue={t.status} id={'s-'+t.id} className="input !py-2">{['ABERTO','EM_ATENDIMENTO','RESOLVIDO','FECHADO'].map(x=><option key={x}>{x}</option>)}</select><button onClick={()=>{const p=(document.getElementById('p-'+t.id) as HTMLSelectElement).value;const s=(document.getElementById('s-'+t.id) as HTMLSelectElement).value;void action(()=>platformDb.updatePlatformSupportTicket(t.id,s,p),'Ticket atualizado.');}} className="btn-secondary">Salvar</button></div></div></div>)}</List>}

        {section==='BILLING_EVENTS'&&<List title="Histórico de billing">{(detail.billing_events||[]).map((e:any)=><Row key={e.id} title={e.event_type} subtitle={e.provider+' · '+dt(e.created_at)+(e.error_message?' · '+e.error_message:'')} right={<Badge tone={e.processed?'emerald':'amber'}>{e.processed?'PROCESSADO':'PENDENTE'}</Badge>}/>)}</List>}

        {section==='WEBHOOKS'&&<div className="space-y-4"><FormCard title="Webhook / billing" description="Configuração administrativa por tenant. O segredo é apenas uma referência segura; credenciais reais não ficam no navegador.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Provider"><input value={webhook.provider||''} onChange={e=>setWebhook({...webhook,provider:e.target.value})} className="input"/></Field>
            <Field label="Auth"><select value={webhook.auth_mode||'NONE'} onChange={e=>setWebhook({...webhook,auth_mode:e.target.value})} className="input"><option>NONE</option><option>HMAC</option><option>BEARER</option><option>BASIC</option></select></Field>
            <Field label="Loja"><select value={webhook.store_id||''} onChange={e=>setWebhook({...webhook,store_id:e.target.value})} className="input"><option value="">Todas / tenant</option>{(detail.stores||[]).map((s:any)=><option key={s.id} value={s.id}>{s.trade_name}</option>)}</select></Field>
          </div>
          <Field label="URL HTTPS"><input value={webhook.webhook_url||''} onChange={e=>setWebhook({...webhook,webhook_url:e.target.value})} placeholder="https://..." className="input"/></Field>
          <Field label="Eventos (separados por vírgula)"><input value={Array.isArray(webhook.event_types)?webhook.event_types.join(', '):''} onChange={e=>setWebhook({...webhook,event_types:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} className="input"/></Field>
          <Field label="Referência do segredo"><input value={webhook.secret_ref||''} onChange={e=>setWebhook({...webhook,secret_ref:e.target.value})} placeholder="vault://..." className="input"/></Field>
          <label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={!!webhook.enabled} onChange={e=>setWebhook({...webhook,enabled:e.target.checked})}/>Webhook habilitado</label>
          <button onClick={()=>void action(()=>platformDb.savePlatformWebhookConfig({...webhook,tenant_id:tenant.id}),'Webhook salvo.')} className="btn-primary">Salvar webhook</button>
        </FormCard><List title="Configurações registradas">{(detail.webhooks||[]).map((w:any)=><Row key={w.id} title={w.provider} subtitle={(w.webhook_url||'sem URL')+' · '+w.auth_mode+' · '+(w.last_test_status||'não testado')} right={<Badge tone={w.enabled?'emerald':'neutral'}>{w.enabled?'ATIVO':'INATIVO'}</Badge>}/>)}</List></div>}

        {section==='COMMS'&&<div className="space-y-4"><FormCard title="Registrar comunicação" description="Registro administrativo. O painel não finge envio externo sem um provedor configurado.">
          <div className="grid sm:grid-cols-2 gap-3"><Field label="Canal"><select value={comm.channel} onChange={e=>setComm({...comm,channel:e.target.value})} className="input"><option>INTERNAL</option><option>EMAIL</option><option>WHATSAPP</option></select></Field><Field label="Destinatário"><input value={comm.recipient||''} onChange={e=>setComm({...comm,recipient:e.target.value})} className="input"/></Field></div>
          <Field label="Assunto"><input value={comm.subject} onChange={e=>setComm({...comm,subject:e.target.value})} className="input"/></Field>
          <Field label="Mensagem"><textarea value={comm.message} onChange={e=>setComm({...comm,message:e.target.value})} className="input min-h-28"/></Field>
          <button onClick={()=>void action(()=>platformDb.createPlatformCommunication({...comm,tenant_id:tenant.id,status:'DRAFT'}),'Comunicação registrada.')} className="btn-primary">Registrar comunicação</button>
        </FormCard><List title="Histórico">{(detail.communications||[]).map((c:any)=><Row key={c.id} title={c.subject} subtitle={c.channel+' · '+(c.recipient||'interno')+' · '+dt(c.created_at)} right={<Badge tone={c.status==='SENT'?'emerald':'neutral'}>{c.status}</Badge>}/>)}</List></div>}

        {section==='INCIDENTS'&&<div className="space-y-4"><FormCard title="Novo incidente" description="Use para disponibilidade, falhas operacionais ou risco técnico.">
          <div className="grid sm:grid-cols-2 gap-3"><Field label="Severidade"><select value={incident.severity} onChange={e=>setIncident({...incident,severity:e.target.value})} className="input">{['LOW','MEDIUM','HIGH','CRITICAL'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Status"><select value={incident.status} onChange={e=>setIncident({...incident,status:e.target.value})} className="input">{['OPEN','INVESTIGATING','MONITORING','RESOLVED','CLOSED'].map(x=><option key={x}>{x}</option>)}</select></Field></div>
          <Field label="Título"><input value={incident.title} onChange={e=>setIncident({...incident,title:e.target.value})} className="input"/></Field>
          <Field label="Descrição"><textarea value={incident.description} onChange={e=>setIncident({...incident,description:e.target.value})} className="input min-h-28"/></Field>
          <button onClick={()=>void action(()=>platformDb.savePlatformIncident({...incident,tenant_id:tenant.id}),'Incidente salvo.')} className="btn-primary">Salvar incidente</button>
        </FormCard><List title="Incidentes">{(detail.incidents||[]).map((i:any)=><Row key={i.id} title={i.title} subtitle={i.severity+' · '+i.status+' · '+dt(i.created_at)} right={<Badge tone={incidentTone(i.severity)}>{i.severity}</Badge>}/>)}</List></div>}

        {section==='INFRA'&&<FormCard title="Infraestrutura do tenant" description="O modo DEDICATED registra arquitetura e vínculo de projeto. O provisionamento físico do banco continua sendo uma operação backend/DevOps, não uma simulação no navegador.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Modo de banco"><select value={infra.database_mode||'SHARED'} onChange={e=>setInfra({...infra,database_mode:e.target.value})} className="input"><option>SHARED</option><option>DEDICATED</option></select></Field>
            <Field label="Provider"><input value={infra.provider||'SUPABASE'} onChange={e=>setInfra({...infra,provider:e.target.value})} className="input"/></Field>
            <Field label="Status"><select value={infra.status||'READY'} onChange={e=>setInfra({...infra,status:e.target.value})} className="input">{['PENDING','PROVISIONING','READY','ERROR','SUSPENDED'].map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field label="Project ref"><input value={infra.project_ref||''} onChange={e=>setInfra({...infra,project_ref:e.target.value})} className="input"/></Field>
            <Field label="Região"><input value={infra.region||''} onChange={e=>setInfra({...infra,region:e.target.value})} className="input"/></Field>
          </div>
          <Field label="Notas"><textarea value={infra.notes||''} onChange={e=>setInfra({...infra,notes:e.target.value})} className="input min-h-24"/></Field>
          <button onClick={()=>void action(()=>platformDb.savePlatformInfrastructure({...infra,tenant_id:tenant.id}),'Infraestrutura atualizada.')} className="btn-primary">Salvar infraestrutura</button>
        </FormCard>}

        {section==='AUDIT'&&<List title="Auditoria administrativa">{(detail.admin_audit||[]).map((a:any)=><Row key={a.id} title={a.action} subtitle={a.target_type+' · '+(a.target_id||'—')+' · '+dt(a.created_at)} right={<ClipboardList size={15} className="text-neutral-600"/>}/>)}</List>}
      </div>
    </aside>
  </div>;
};

const GlobalSupport=({tenants,onOpen}:{tenants:any[];onOpen:(id:string)=>void})=><GlobalList title="Suporte por cliente" icon={Headphones} tenants={tenants} field="open_support" label="ticket(s) aberto(s)" onOpen={onOpen}/>;
const GlobalIncidents=({tenants,onOpen}:{tenants:any[];onOpen:(id:string)=>void})=><GlobalList title="Incidentes por cliente" icon={AlertTriangle} tenants={tenants} field="open_incidents" label="incidente(s) aberto(s)" onOpen={onOpen}/>;
const GlobalAudit=({tenants,onOpen}:{tenants:any[];onOpen:(id:string)=>void})=><GlobalList title="Auditoria por cliente" icon={History} tenants={tenants} field="users" label="usuário(s) vinculados" onOpen={onOpen}/>;

const GlobalList=({title,icon:Icon,tenants,field,label,onOpen}:{title:string;icon:any;tenants:any[];field:string;label:string;onOpen:(id:string)=>void})=><section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex items-center gap-2"><Icon size={17} className="text-amber-400"/><h2 className="font-black">{title}</h2></div><div className="mt-4 space-y-2">{tenants.map((t:any)=><button key={t.id} onClick={()=>onOpen(t.id)} className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-left hover:border-amber-500/30"><div><div className="text-sm font-bold">{t.trade_name||t.legal_name}</div><div className="text-[10px] text-neutral-500">{t.plan} · {t.billing?.status||'SEM ASSINATURA'}</div></div><div className="text-xs text-neutral-400">{t[field]||0} {label}</div></button>)}</div></section>;

const TenantRow=({t,onOpen,onToggle}:{t:any;onOpen:()=>void;onToggle:()=>void})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3"><button onClick={onOpen} className="text-left min-w-0"><div className="font-bold text-sm truncate">{t.trade_name||t.legal_name}</div><div className="text-[10px] text-neutral-500 mt-1">{t.plan} · {t.billing?.status||'SEM ASSINATURA'} · {t.stores} loja(s)</div></button><div className="flex gap-2 items-center"><Badge tone={t.active?'emerald':'rose'}>{t.active?'ATIVO':'SUSPENSO'}</Badge><button onClick={onToggle} className="text-[10px] text-neutral-500 hover:text-white">{t.active?'Suspender':'Reativar'}</button></div></div>;

const Metric=({label,value,icon:Icon,tone}:{label:string;value:any;icon:any;tone:string})=><div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><div className={`w-9 h-9 rounded-xl grid place-items-center ${tone==='emerald'?'bg-emerald-950 text-emerald-400':tone==='rose'?'bg-rose-950 text-rose-400':tone==='sky'?'bg-sky-950 text-sky-400':tone==='violet'?'bg-violet-950 text-violet-400':'bg-amber-950 text-amber-400'}`}><Icon size={17}/></div><div className="text-xl font-black mt-3">{value}</div><div className="text-[10px] text-neutral-500 mt-1">{label}</div></div>;
const HealthCard=({icon:Icon,title,value,detail}:{icon:any;title:string;value:string;detail:string})=><div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 grid place-items-center"><Icon size={17} className="text-amber-400"/></div><div><div className="font-black">{value}</div><div className="text-xs text-neutral-400">{title}</div><div className="text-[9px] text-neutral-600">{detail}</div></div></div>;
const Info=({l,v}:{l:string;v:any})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">{l}</div><div className="font-bold mt-1 text-sm">{String(v??'—')}</div></div>;
const Badge=({tone='neutral',children}:{tone?:string;children:React.ReactNode})=><span className={`text-[9px] px-2 py-1 rounded-full border font-black ${tone==='emerald'?'text-emerald-300 border-emerald-800 bg-emerald-950/30':tone==='rose'?'text-rose-300 border-rose-800 bg-rose-950/30':tone==='amber'?'text-amber-300 border-amber-800 bg-amber-950/30':tone==='sky'?'text-sky-300 border-sky-800 bg-sky-950/30':'text-neutral-400 border-neutral-700 bg-neutral-900'}`}>{children}</span>;
const billingTone=(s:string)=>s==='ACTIVE'?'emerald':s==='PAST_DUE'||s==='SUSPENDED'?'rose':s==='TRIALING'?'sky':'neutral';
const incidentTone=(s:string)=>s==='CRITICAL'||s==='HIGH'?'rose':s==='MEDIUM'?'amber':'neutral';
const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="text-[10px] text-neutral-500 block mb-1">{label}</span>{children}</label>;
const FormCard=({title,description,children}:{title:string;description?:string;children:React.ReactNode})=><section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4"><div><h3 className="font-black">{title}</h3>{description&&<p className="text-[10px] text-neutral-500 mt-1">{description}</p>}</div>{children}</section>;
const List=({title,children}:{title:string;children:React.ReactNode})=><section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h3 className="font-black mb-4">{title}</h3><div className="space-y-2">{children}</div></section>;
const Row=({title,subtitle,right}:{title:string;subtitle:string;right?:React.ReactNode})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-sm font-bold truncate">{title}</div><div className="text-[10px] text-neutral-500 mt-1 truncate">{subtitle}</div></div>{right}</div>;
