import React,{useEffect,useMemo,useState} from 'react';
import {
  BarChart3,CheckCircle2,Clock3,Copy,CreditCard,Download,Filter,Info,Link2,
  Plus,Search,ShoppingCart,UserPlus,Users,WalletCards,XCircle,Printer,Share2,Ban,CheckCircle
} from 'lucide-react';
import { platformDb } from '../../services/platformDb';

type Tab='OVERVIEW'|'SELLERS'|'REFERRALS'|'COMMISSIONS'|'PAYMENTS'|'REPORTS';
const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const PARTNER_CANONICAL_ORIGIN='https://adegapro.vercel.app';
const date=(v:any)=>v?new Date(v).toLocaleDateString('pt-BR'):'—';

export const PartnerControlView=({onFeedback,onError}:{onFeedback:(s:string)=>void;onError:(s:string)=>void})=>{
  const[data,setData]=useState<any>(null);
  const[busy,setBusy]=useState(false);
  const[tab,setTab]=useState<Tab>('OVERVIEW');
  const[q,setQ]=useState('');
  const[statusFilter,setStatusFilter]=useState<'ALL'|'ACTIVE'|'PENDING'|'CANCELLED'>('ALL');
  const[showSellerForm,setShowSellerForm]=useState(false);
  const[inviteEmail,setInviteEmail]=useState('');
  const[lastInvite,setLastInvite]=useState('');
  const[paymentValues,setPaymentValues]=useState<Record<string,string>>({});
  const[form,setForm]=useState<any>({
    full_name:'',email:'',phone:'',email_verified:false,phone_verified:false,active:true,
    referral_code:'',payout_mode:'IMEDIATO',monthly_payout_day:5,pix_key:'',notes:''
  });
  const[ref,setRef]=useState<any>({
    partner_id:'',referral_type:'ASSINATURA',lead_name:'',lead_email:'',lead_phone:'',
    status:'LEAD',estimated_value:149,converted_value:0,notes:''
  });

  const load=async()=>{
    setBusy(true);onError('');
    try{setData(await platformDb.getPlatformPartnerSnapshot());}
    catch(e:any){onError(e?.message||'Falha ao carregar vendedores.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{
    const refresh=()=>{
      if(document.visibilityState!=='visible')return;
      void load();
    };
    void load();
    const timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{
      window.clearInterval(timer);
      window.removeEventListener('focus',refresh);
      document.removeEventListener('visibilitychange',refresh);
    };
  },[]);

  const partners=data?.partners||[];
  const referrals=data?.referrals||[];
  const commissions=data?.commissions||[];
  const metrics=data?.metrics||{};
  const policy=data?.policy||{};
  const partnerMap=useMemo(()=>new Map(partners.map((p:any)=>[p.id,p])),[partners]);

  const sellerRows=useMemo(()=>{
    const term=q.trim().toLowerCase();
    return partners.filter((p:any)=>{
      const hay=[p.full_name,p.email,p.phone,p.referral_code].join(' ').toLowerCase();
      if(term&&!hay.includes(term))return false;
      if(statusFilter==='ACTIVE')return p.registration_status==='ATIVO';
      if(statusFilter==='PENDING')return p.registration_status==='PENDENTE';
      if(statusFilter==='CANCELLED')return p.registration_status==='CANCELADO';
      return true;
    });
  },[partners,q,statusFilter]);

  const filteredReferrals=useMemo(()=>{
    const term=q.trim().toLowerCase();
    return referrals.filter((r:any)=>{
      const p=partnerMap.get(r.partner_id) as any;
      const hay=[r.lead_name,r.lead_email,r.lead_phone,r.status,r.source,p?.full_name,p?.referral_code].join(' ').toLowerCase();
      return !term||hay.includes(term);
    });
  },[referrals,q,partnerMap]);

  const share=(p:any)=>`${window.location.origin}/?ref=${encodeURIComponent(p.referral_code)}`;

  const copy=async(v:string,label='Link')=>{
    await navigator.clipboard?.writeText(v);
    onFeedback(label+' copiado.');
  };

  const sendSellerInvite=async(p:any,channel:'EMAIL'|'SMS')=>{
    setBusy(true);onError('');
    try{
      const result=await platformDb.createPlatformPartnerInvite(p.email||undefined,7);
      const url=PARTNER_CANONICAL_ORIGIN+'/vendedor/cadastro?invite='+encodeURIComponent(result.token);
      const message='ADEGA PRO - convite de vendedor. Conclua seu cadastro por este link: '+url;
      if(channel==='EMAIL'){
        if(!p.email)throw new Error('Vendedor sem e-mail cadastrado.');
        window.location.href='mailto:'+encodeURIComponent(p.email)+'?subject='+encodeURIComponent('Convite de vendedor - ADEGA PRO')+'&body='+encodeURIComponent(message);
        onFeedback('Novo convite gerado. O aplicativo de e-mail foi aberto para envio.');
      }else{
        const phone=String(p.phone||'').replace(/\D/g,'');
        if(phone.length<10)throw new Error('Vendedor sem telefone válido para SMS.');
        window.location.href='sms:'+phone+'?body='+encodeURIComponent(message);
        onFeedback('Novo convite gerado. O aplicativo de SMS foi aberto para envio.');
      }
      setLastInvite(url);
      await load();
    }catch(e:any){onError(e?.message||'Não foi possível gerar o novo convite.');}
    finally{setBusy(false);}
  };
  const generateInvite=async()=>{
    setBusy(true);onError('');
    try{
      const result=await platformDb.createPlatformPartnerInvite(inviteEmail||undefined,7);
      const url=`${PARTNER_CANONICAL_ORIGIN}/vendedor/cadastro?invite=${encodeURIComponent(result.token)}`;
      setLastInvite(url);
      await navigator.clipboard?.writeText(url);
      onFeedback('Link de cadastro do vendedor gerado e copiado. Validade: 7 dias e uso único.');
      await load();
    }catch(e:any){onError(e?.message||'Não foi possível gerar o convite.');}
    finally{setBusy(false);}
  };

  const savePartner=async()=>{
    setBusy(true);onError('');
    try{
      await platformDb.savePlatformSalesPartner(form);
      onFeedback('Vendedor salvo.');
      setForm({full_name:'',email:'',phone:'',email_verified:false,phone_verified:false,active:true,referral_code:'',payout_mode:'IMEDIATO',monthly_payout_day:5,pix_key:'',notes:''});
      setShowSellerForm(false);
      await load();
    }catch(e:any){onError(e?.message||'Falha ao salvar vendedor.');}
    finally{setBusy(false);}
  };

  const saveReferral=async()=>{
    setBusy(true);onError('');
    try{
      await platformDb.savePlatformPartnerReferral(ref);
      onFeedback('Indicação registrada.');
      setRef({partner_id:'',referral_type:'ASSINATURA',lead_name:'',lead_email:'',lead_phone:'',status:'LEAD',estimated_value:149,converted_value:0,notes:''});
      await load();
    }catch(e:any){onError(e?.message||'Falha ao registrar indicação.');}
    finally{setBusy(false);}
  };

  const confirmPayment=async(r:any)=>{
    const amount=Number(String(paymentValues[r.id]||(r.referral_type==='PERSONALIZADO'?'330':'149')).replace(',','.'));
    if(!amount||amount<=0){onError('Informe um pagamento válido.');return;}
    setBusy(true);onError('');
    try{await platformDb.confirmPlatformPartnerCustomerPayment(r.id,amount);onFeedback('Pagamento confirmado e comissão gerada conforme política.');await load();}
    catch(e:any){onError(e?.message||'Falha ao confirmar pagamento.');}
    finally{setBusy(false);}
  };

  const markPaid=async(c:any)=>{
    setBusy(true);onError('');
    try{await platformDb.updatePlatformPartnerCommission(c.id,'PAGA','ATR-CONTROL');onFeedback('Comissão marcada como paga.');await load();}
    catch(e:any){onError(e?.message||'Falha ao registrar pagamento da comissão.');}
    finally{setBusy(false);}
  };

  const setSellerStatus=async(p:any,status:'PENDENTE'|'ATIVO'|'SUSPENSO'|'CANCELADO')=>{
    const label=status==='ATIVO'?(p.registration_status==='PENDENTE'?'aprovar':'reativar'):status==='SUSPENSO'?'suspender':status==='PENDENTE'?'marcar como pendente':'cancelar';
    if(!window.confirm(`Confirma ${label} o vendedor ${p.full_name}? O histórico financeiro e de indicações será preservado.`))return;
    setBusy(true);onError('');
    try{await platformDb.setPlatformSalesPartnerStatus(p.id,status);onFeedback(`Vendedor ${status.toLowerCase()} com sucesso.`);await load();}
    catch(e:any){onError(e?.message||'Falha ao alterar status do vendedor.');}
    finally{setBusy(false);}
  };

  const printSeller=(p:any)=>{
    const w=window.open('','_blank','width=900,height=700');
    if(!w){onError('O navegador bloqueou a janela de impressão.');return;}
    const esc=(value:any)=>String(value??'—').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
    const link=share(p);
    w.document.write(`<!doctype html><html><head><title>Ficha do vendedor</title><style>body{font-family:Arial;padding:32px;color:#111}h1{margin:0 0 8px}.row{padding:8px 0;border-bottom:1px solid #ddd}small{color:#666}</style></head><body><h1>ATR Control — Vendedor Autônomo</h1><small>Ficha administrativa</small><div class="row"><b>Nome:</b> ${esc(p.full_name)}</div><div class="row"><b>E-mail:</b> ${esc(p.email)}</div><div class="row"><b>Telefone:</b> ${esc(p.phone)}</div><div class="row"><b>Código:</b> ${esc(p.referral_code)}</div><div class="row"><b>Status:</b> ${esc(p.registration_status||(p.active?'ATIVO':'SUSPENSO'))}</div><div class="row"><b>Link:</b> ${esc(link)}</div><div class="row"><b>Vendas:</b> ${esc(money(p.sales_value||0))}</div><div class="row"><b>Comissões pagas:</b> ${esc(money(p.paid_amount||0))}</div></body></html>`);
    w.document.close();w.focus();w.print();
  };

  const shareSeller=async(p:any)=>{
    const url=share(p);
    if(navigator.share){try{await navigator.share({title:`Indicação — ${p.full_name}`,text:'Link de indicação Adega Pro',url});return;}catch{}}
    await copy(url,'Link');
  };

  const exportCsv=()=>{
    const rows=[['Vendedor','Código','Indicações','Convertidos','Pendentes','Cancelados','Vendas','Liberado','Agendado','Pago']];
    partners.forEach((p:any)=>rows.push([p.full_name,p.referral_code,p.referrals,p.converted,p.pending,p.cancelled,p.sales_value,p.available_amount,p.scheduled_amount,p.paid_amount].map(String)));
    const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='atr-control-vendedores.csv';a.click();URL.revokeObjectURL(a.href);
  };

  const topTabs:[Tab,string,any][]=[
    ['OVERVIEW','Visão Geral',BarChart3],['SELLERS','Vendedores',UserPlus],['REFERRALS','Indicações / Leads',Users],
    ['COMMISSIONS','Comissões',WalletCards],['PAYMENTS','Pagamentos',CreditCard],['REPORTS','Relatórios',BarChart3]
  ];

  return <div className="space-y-3 min-w-0 overflow-x-hidden">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
      <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {topTabs.map(([id,label,I])=><button key={id} onClick={()=>setTab(id)} className={`h-10 px-4 rounded-lg border flex items-center gap-2 whitespace-nowrap text-[11px] font-black ${tab===id?'bg-amber-400 border-amber-300 text-neutral-950':'bg-[#0c1115] border-neutral-800 text-neutral-300 hover:border-neutral-600'}`}><I size={14}/>{label}</button>)}
      </nav>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full xl:w-auto">
        <div className="px-3 h-10 rounded-lg border border-neutral-800 bg-[#0c1115] flex items-center justify-center sm:justify-start gap-2 text-[10px] text-neutral-400"><Clock3 size={13}/><span>Período</span><b className="text-neutral-200">Atual</b></div>
        <button onClick={()=>setShowSellerForm(v=>!v)} className="h-10 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-[10px] sm:text-xs font-black flex items-center justify-center gap-2"><Plus size={14}/>Novo vendedor</button>
      </div>
    </div>

    <div className="grid grid-cols-1 min-[390px]:grid-cols-2 xl:grid-cols-6 gap-3">
      <Kpi icon={Users} label="Vendedores ativos" value={metrics.partners_active||0} sub={`de ${metrics.partners_total||0} cadastrados`}/>
      <Kpi icon={Clock3} label="Aguardando aprovação" value={partners.filter((p:any)=>p.registration_status==='PENDENTE').length} sub="cadastros para validar no ATR Control"/>
      <Kpi icon={Users} label="Leads gerados" value={metrics.referrals_total||0} sub="via links, códigos e cadastro"/>
      <Kpi icon={ShoppingCart} label="Clientes convertidos" value={metrics.referrals_converted||0} sub="realizaram conversão"/>
      <Kpi icon={WalletCards} label="Comissões liberadas" value={money(metrics.commission_available||0)} sub="após confirmação do pagamento"/>
      <Kpi icon={CreditCard} label="Total pago aos vendedores" value={money(metrics.commission_paid||0)} sub="em comissões pagas"/>
    </div>

    <section className="rounded-xl border border-amber-500/70 bg-[#080d10] p-3">
      <div className="flex items-center gap-2 font-black text-sm"><Info size={17} className="text-amber-400"/>Como funciona o sistema de indicações?</div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2 mt-3">
        <Step n="1" icon={Link2} title="Cada vendedor tem seu link e código" text="Compartilhe o link personalizado ou código com seus clientes."/>
        <Step n="2" icon={Link2} title="O cliente acessa pelo link ou código" text="O sistema identifica automaticamente a origem da indicação."/>
        <Step n="3" icon={CreditCard} title="Cliente faz a compra e paga" text="A venda fica registrada e vinculada ao vendedor."/>
        <Step n="4" icon={WalletCards} title="Comissão liberada após pagamento" text="A comissão só é liberada depois da confirmação do pagamento."/>
      </div>
    </section>

    {showSellerForm&&<section className="rounded-xl border border-amber-500/30 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-black">Cadastro de vendedor</h2><p className="text-[10px] text-neutral-500 mt-1">Você pode cadastrar manualmente ou enviar um link para o próprio vendedor concluir o cadastro.</p></div><button onClick={()=>setShowSellerForm(false)} className="text-neutral-500"><XCircle size={18}/></button></div>
      <div className="grid xl:grid-cols-[1fr_.8fr] gap-4 mt-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Nome"><input className="input" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
          <Field label="E-mail"><input className="input" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          <Field label="Telefone"><input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
          <Field label="Código de indicação"><input className="input" value={form.referral_code||''} onChange={e=>setForm({...form,referral_code:e.target.value.toUpperCase()})}/></Field>
          <Field label="Chave PIX"><input className="input" value={form.pix_key||''} onChange={e=>setForm({...form,pix_key:e.target.value})}/></Field>
          <Field label="Repasse"><select className="input" value={form.payout_mode} onChange={e=>setForm({...form,payout_mode:e.target.value})}><option value="IMEDIATO">Imediato</option><option value="FECHAMENTO_MENSAL">Fechamento mensal</option></select></Field>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-neutral-400"><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Ativo</label><label><input type="checkbox" checked={!!form.email_verified} onChange={e=>setForm({...form,email_verified:e.target.checked})}/> E-mail validado</label><label><input type="checkbox" checked={!!form.phone_verified} onChange={e=>setForm({...form,phone_verified:e.target.checked})}/> Telefone validado</label></div>
          <button disabled={busy||!form.full_name||!form.email||!form.phone} onClick={()=>void savePartner()} className="sm:col-span-2 lg:col-span-3 btn-primary">Salvar vendedor manualmente</button>
        </div>
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="text-[10px] uppercase tracking-[.16em] text-amber-400 font-black">Autocadastro seguro</div>
          <h3 className="font-black mt-1">Enviar link para o vendedor</h3>
          <p className="text-[10px] text-neutral-500 mt-1">O convite é de uso único, expira em 7 dias e pode ser preso ao e-mail informado.</p>
          <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} type="email" placeholder="email@vendedor.com" className="input mt-3"/>
          <button disabled={busy} onClick={()=>void generateInvite()} className="mt-2 w-full h-10 rounded-lg bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-2"><Link2 size={14}/>Gerar e copiar link de cadastro</button>
          {lastInvite&&<div className="mt-3 p-2 rounded-lg border border-neutral-800 text-[9px] text-sky-400 break-all">{lastInvite}</div>}
        </div>
      </div>
    </section>}

    <div className="flex flex-col xl:flex-row gap-2 xl:items-center justify-between pt-1">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {([['SELLERS',`Todos os Vendedores (${metrics.partners_total||0})`],['REFERRALS',`Leads / Indicações (${metrics.referrals_total||0})`],['COMMISSIONS',`Comissões (${commissions.length})`],['PAYMENTS',`Pagamentos (${metrics.payments_confirmed||0})`]] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`h-9 px-4 rounded-lg border whitespace-nowrap text-[10px] font-black ${tab===id?'bg-amber-400 text-neutral-950 border-amber-300':'bg-[#0c1115] text-neutral-400 border-neutral-800'}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-2 sm:flex gap-2 w-full xl:w-auto min-w-0">
        <div className="relative col-span-2 sm:col-auto sm:min-w-[280px] sm:flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar vendedor, cliente, código, link..." className="h-10 w-full min-w-0 rounded-lg bg-[#0c1115] border border-neutral-800 pl-9 pr-3 text-xs outline-none focus:border-amber-500"/></div>
        <button onClick={()=>setStatusFilter(statusFilter==='ALL'?'PENDING':statusFilter==='PENDING'?'ACTIVE':statusFilter==='ACTIVE'?'CANCELLED':'ALL')} className="h-10 px-3 rounded-lg border border-neutral-800 bg-[#0c1115] text-[10px] font-black flex items-center justify-center gap-2"><Filter size={13}/>{statusFilter==='ALL'?'Filtros':statusFilter}</button>
        <button onClick={exportCsv} className="h-10 px-3 rounded-lg border border-neutral-800 bg-[#0c1115] text-[10px] font-black flex items-center justify-center gap-2"><Download size={13}/>Exportar</button>
      </div>
    </div>

    {(tab==='OVERVIEW'||tab==='SELLERS')&&<section className="rounded-xl border border-neutral-800 bg-[#080d10] overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-xs">
        <thead className="text-neutral-500 border-b border-neutral-800"><tr><th className="p-3 text-left">Vendedor</th><th className="p-3 text-left">Link de Indicação</th><th className="p-3 text-left">Código</th><th className="p-3 text-center">Leads</th><th className="p-3 text-center">Clientes</th><th className="p-3 text-right">Vendas (R$)</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-left">Status Comissão</th><th className="p-3 text-left">Status Pagamento</th><th className="p-3 text-left">Ações</th></tr></thead>
        <tbody>{sellerRows.map((p:any)=>{
          const commission=Number(p.available_amount||0)+Number(p.scheduled_amount||0);
          const commissionStatus=Number(p.available_amount||0)>0?'LIBERADA':Number(p.scheduled_amount||0)>0?'AGENDADA':Number(p.waiting_payment||0)>0?'AGUARDANDO PAGAMENTO':Number(p.cancelled||0)>0&&!p.converted?'NÃO CONVERTIDO':'SEM COMISSÃO';
          const partnerReferrals=referrals.filter((r:any)=>r.partner_id===p.id);
          const hasConfirmedPayment=partnerReferrals.some((r:any)=>r.customer_payment_status==='CONFIRMADO');
          const paymentStatus=Number(p.waiting_payment||0)>0?'PENDENTE':hasConfirmedPayment?'PAGO':'—';
          return <tr key={p.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
            <td className="p-3"><button onClick={()=>{setForm({...p});setShowSellerForm(true)}} className="text-left"><div className="font-black">{p.full_name}</div><div className="text-[9px] text-neutral-500">{p.email}</div><div className={`mt-1 text-[8px] font-black ${p.registration_status==='ATIVO'?'text-emerald-400':p.registration_status==='PENDENTE'?'text-amber-400':p.registration_status==='CANCELADO'?'text-rose-400':'text-orange-400'}`}>PORTAL {p.portal_registered?'CADASTRADO':'NÃO VINCULADO'} · {p.registration_status||'PENDENTE'}</div></button></td>
            <td className="p-3"><button onClick={()=>void copy(share(p))} className="text-sky-400 hover:underline inline-flex items-center gap-2">{share(p).replace(window.location.origin,'adegapro')}<Copy size={11}/></button></td>
            <td className="p-3"><button onClick={()=>void copy(p.referral_code,'Código')} className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 font-mono inline-flex items-center gap-2">{p.referral_code}<Copy size={10}/></button></td>
            <td className="p-3 text-center font-bold">{p.referrals||0}</td><td className="p-3 text-center font-bold">{p.converted||0}</td>
            <td className="p-3 text-right">{money(p.sales_value||0)}</td><td className="p-3 text-right text-amber-400 font-black">{money(commission)}</td>
            <td className="p-3"><Status value={commissionStatus}/></td>
            <td className="p-3">{paymentStatus==='—'?<span className="text-neutral-600">—</span>:<Status value={paymentStatus}/>}</td>
            <td className="p-3"><div className="flex flex-wrap gap-1">
              <button title="Alterar" onClick={()=>{setForm({...p});setShowSellerForm(true)}} className="h-8 px-2 rounded border border-neutral-800">Alterar</button>
              <button title="Compartilhar" onClick={()=>void shareSeller(p)} className="h-8 px-2 rounded border border-neutral-800 inline-flex items-center gap-1"><Share2 size={11}/>Compartilhar</button>
              {!p.portal_registered&&<button disabled={busy} title="Reenviar convite por e-mail" onClick={()=>void sendSellerInvite(p,'EMAIL')} className="h-8 px-2 rounded border border-sky-800 text-sky-300">E-mail convite</button>}
              {!p.portal_registered&&<button disabled={busy||!p.phone} title="Reenviar convite por SMS" onClick={()=>void sendSellerInvite(p,'SMS')} className="h-8 px-2 rounded border border-violet-800 text-violet-300 disabled:opacity-40">SMS convite</button>}
              <button title="Imprimir ficha" onClick={()=>printSeller(p)} className="h-8 px-2 rounded border border-neutral-800 inline-flex items-center gap-1"><Printer size={11}/>Imprimir</button>
              {p.registration_status==='PENDENTE'&&<button disabled={busy} title="Aprovar vendedor" onClick={()=>void setSellerStatus(p,'ATIVO')} className="h-8 px-2 rounded bg-emerald-700 text-white font-black inline-flex items-center gap-1"><CheckCircle size={11}/>Aprovar</button>}
              {p.registration_status==='ATIVO'&&<button disabled={busy} title="Suspender" onClick={()=>void setSellerStatus(p,'SUSPENSO')} className="h-8 px-2 rounded border border-amber-800 text-amber-300 inline-flex items-center gap-1"><Ban size={11}/>Suspender</button>}
              {p.registration_status==='SUSPENSO'&&<button disabled={busy} title="Reativar" onClick={()=>void setSellerStatus(p,'ATIVO')} className="h-8 px-2 rounded border border-emerald-800 text-emerald-300 inline-flex items-center gap-1"><CheckCircle size={11}/>Reativar</button>}
              {p.registration_status!=='CANCELADO'&&<button disabled={busy} title="Cancelar vínculo" onClick={()=>void setSellerStatus(p,'CANCELADO')} className="h-8 px-2 rounded border border-rose-800 text-rose-300">Cancelar</button>}
            </div></td>
          </tr>
        })}</tbody>
      </table></div>
      <div className="px-3 py-2 text-[9px] text-neutral-600">Mostrando {sellerRows.length} de {partners.length} vendedores</div>
    </section>}

    {tab==='REFERRALS'&&<div className="grid xl:grid-cols-[.65fr_1.35fr] gap-4">
      <section className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3"><h2 className="font-black">Registrar indicação</h2><Field label="Vendedor"><select className="input" value={ref.partner_id} onChange={e=>setRef({...ref,partner_id:e.target.value})}><option value="">Selecione...</option>{partners.filter((p:any)=>p.active).map((p:any)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field><Field label="Tipo"><select className="input" value={ref.referral_type} onChange={e=>setRef({...ref,referral_type:e.target.value,estimated_value:e.target.value==='PERSONALIZADO'?990:149})}><option value="ASSINATURA">ASSINATURA</option><option value="PERSONALIZADO">PERSONALIZADO</option></select></Field><Field label="Cliente / empresa"><input className="input" value={ref.lead_name} onChange={e=>setRef({...ref,lead_name:e.target.value})}/></Field><Field label="E-mail"><input className="input" value={ref.lead_email} onChange={e=>setRef({...ref,lead_email:e.target.value})}/></Field><Field label="Telefone"><input className="input" value={ref.lead_phone} onChange={e=>setRef({...ref,lead_phone:e.target.value})}/></Field><button disabled={!ref.partner_id||busy} onClick={()=>void saveReferral()} className="btn-primary w-full">Registrar indicação</button></section>
      <section className="rounded-xl border border-neutral-800 bg-[#080d10] overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead className="text-neutral-500"><tr><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Vendedor</th><th className="p-3 text-left">Origem</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Pagamento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Ação</th></tr></thead><tbody>{filteredReferrals.map((r:any)=>{const p=partnerMap.get(r.partner_id) as any;return <tr key={r.id} className="border-t border-neutral-800"><td className="p-3"><b>{r.lead_name||'Lead sem nome'}</b><div className="text-[9px] text-neutral-600">{r.lead_email||r.lead_phone||'—'}</div></td><td className="p-3">{p?.full_name||'—'}</td><td className="p-3">{r.source||'—'}</td><td className="p-3"><Status value={r.status}/></td><td className="p-3"><Status value={r.customer_payment_status}/></td><td className="p-3 text-right">{money(r.converted_value||r.estimated_value)}</td><td className="p-3">{r.customer_payment_status!=='CONFIRMADO'?<div className="flex gap-1"><input className="w-20 h-8 rounded bg-neutral-950 border border-neutral-700 px-2" value={paymentValues[r.id]??(r.referral_type==='PERSONALIZADO'?'330':'149')} onChange={e=>setPaymentValues(v=>({...v,[r.id]:e.target.value}))}/><button onClick={()=>void confirmPayment(r)} className="h-8 px-2 rounded bg-amber-400 text-neutral-950 font-black">Confirmar</button></div>:<span className="text-emerald-400">Confirmado</span>}</td></tr>})}</tbody></table></div></section>
    </div>}

    {tab==='COMMISSIONS'&&<CommissionTable rows={commissions} partnerMap={partnerMap} onPay={markPaid} busy={busy}/>}
    {tab==='PAYMENTS'&&<CommissionTable rows={commissions.filter((c:any)=>c.status==='PAGA'||c.status==='LIBERADA'||c.status==='AGENDADA')} partnerMap={partnerMap} onPay={markPaid} busy={busy}/>}
    {tab==='REPORTS'&&<div className="grid md:grid-cols-3 gap-3"><ReportCard title="Conversão" value={metrics.referrals_total?Math.round((metrics.referrals_converted/metrics.referrals_total)*100)+'%':'0%'} detail="indicações convertidas"/><ReportCard title="Venda convertida" value={money(metrics.conversion_value||0)} detail="valor comercial atribuído"/><ReportCard title="Comissões totais" value={money(Number(metrics.commission_available||0)+Number(metrics.commission_scheduled||0)+Number(metrics.commission_paid||0))} detail="liberadas, agendadas e pagas"/></div>}
  </div>;
};

const Kpi=({icon:Icon,label,value,sub}:{icon:any;label:string;value:any;sub:string})=><div className="rounded-xl border border-neutral-800 bg-[#0b1014] p-4"><div className="flex items-start justify-between"><div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 grid place-items-center"><Icon size={20}/></div><span className="text-[9px] text-emerald-400 font-black">↑ ativo</span></div><div className="text-[10px] text-neutral-400 mt-3">{label}</div><div className="text-2xl font-black mt-0.5">{value}</div><div className="text-[9px] text-neutral-500 mt-2">{sub}</div></div>;
const Step=({n,icon:Icon,title,text}:{n:string;icon:any;title:string;text:string})=><div className="p-3 rounded-lg border border-neutral-800 bg-[#0b1014] flex gap-3"><span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 grid place-items-center text-xs font-black">{n}</span><div className="w-9 h-9 rounded-lg bg-amber-400/10 text-amber-400 grid place-items-center"><Icon size={18}/></div><div><div className="text-[10px] font-black">{title}</div><div className="text-[9px] text-neutral-500 mt-1 leading-relaxed">{text}</div></div></div>;
const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="text-[10px] text-neutral-500 block mb-1">{label}</span>{children}</label>;
const Status=({value}:{value:string})=>{const v=String(value||'');const good=['LIBERADA','PAGA','CONVERTIDO','CONFIRMADO','CADASTRADO'].some(x=>v.includes(x));const bad=['CANCEL','NÃO CONVERTIDO','PERDIDO','INADIMPLENTE'].some(x=>v.includes(x));return <span className={`px-2 py-1 rounded-md border text-[9px] font-black ${good?'border-emerald-800 bg-emerald-950/40 text-emerald-300':bad?'border-rose-800 bg-rose-950/40 text-rose-300':'border-amber-800 bg-amber-950/30 text-amber-300'}`}>{v}</span>};
const CommissionTable=({rows,partnerMap,onPay,busy}:{rows:any[];partnerMap:Map<any,any>;onPay:(c:any)=>void;busy:boolean})=><section className="rounded-xl border border-neutral-800 bg-[#080d10] overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-xs"><thead className="text-neutral-500"><tr><th className="p-3 text-left">Vendedor</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Comissão</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Vencimento</th><th className="p-3 text-left">Pago em</th><th className="p-3 text-left">Ação</th></tr></thead><tbody>{rows.map((c:any)=>{const p=partnerMap.get(c.partner_id) as any;return <tr key={c.id} className="border-t border-neutral-800"><td className="p-3 font-bold">{p?.full_name||'—'}</td><td className="p-3">{c.commission_type}</td><td className="p-3 text-right">{money(c.base_amount)}</td><td className="p-3 text-right text-amber-400 font-black">{money(c.amount_due)}</td><td className="p-3"><Status value={c.status}/></td><td className="p-3">{date(c.due_at)}</td><td className="p-3">{date(c.paid_at)}</td><td className="p-3">{c.status!=='PAGA'&&c.status!=='CANCELADA'?<button disabled={busy} onClick={()=>void onPay(c)} className="h-8 px-3 rounded bg-emerald-700 text-white font-black">Marcar pago</button>:'—'}</td></tr>})}</tbody></table></div></section>;
const ReportCard=({title,value,detail}:{title:string;value:string;detail:string})=><div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900"><div className="text-[10px] text-neutral-500">{title}</div><div className="text-2xl font-black mt-2">{value}</div><div className="text-[10px] text-neutral-600 mt-2">{detail}</div></div>;
