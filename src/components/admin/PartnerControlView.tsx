import React,{useEffect,useMemo,useState} from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Copy, FileCheck2, Plus, Search, UserCheck, WalletCards } from 'lucide-react';
import { platformDb } from '../../services/platformDb';

const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const date=(v:any)=>v?new Date(v).toLocaleDateString('pt-BR'):'—';

export const PartnerControlView=({onFeedback,onError}:{onFeedback:(s:string)=>void;onError:(s:string)=>void})=>{
  const[data,setData]=useState<any>(null);
  const[busy,setBusy]=useState(false);
  const[q,setQ]=useState('');
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
    try{setData(await platformDb.getPlatformPartnerSnapshot())}
    catch(e:any){onError(e?.message||'Falha ao carregar parceiros.')}
    finally{setBusy(false)}
  };
  useEffect(()=>{void load()},[]);

  const partners=useMemo(()=>{
    const s=q.trim().toLowerCase();
    return(data?.partners||[]).filter((p:any)=>!s||[p.full_name,p.email,p.phone,p.referral_code].join(' ').toLowerCase().includes(s));
  },[data,q]);

  const monthly=data?.monthly||[];
  const max=Math.max(1,...monthly.map((m:any)=>Number(m.referrals||0)));
  const policy=data?.policy||{};
  const policyVersion=policy?.version||'2026.09-r1';
  const share=(p:any)=>`${window.location.origin}/?ref=${encodeURIComponent(p.referral_code)}`;

  const savePartner=async()=>{
    setBusy(true);onError('');
    try{
      await platformDb.savePlatformSalesPartner(form);
      onFeedback('Vendedor salvo com política de repasse atual.');
      setForm({full_name:'',email:'',phone:'',email_verified:false,phone_verified:false,active:true,referral_code:'',payout_mode:'IMEDIATO',monthly_payout_day:5,pix_key:'',notes:''});
      await load();
    }catch(e:any){onError(e?.message||'Falha ao salvar vendedor.')}
    finally{setBusy(false)}
  };

  const confirmPayment=async(r:any)=>{
    const fallback=r.referral_type==='PERSONALIZADO'?'330.00':'149.00';
    const raw=paymentValues[r.id]||fallback;
    const amount=Number(String(raw).replace(',','.'));
    if(!amount||amount<=0){onError('Informe um valor de pagamento válido.');return;}
    setBusy(true);onError('');
    try{
      await platformDb.confirmPlatformPartnerCustomerPayment(r.id,amount);
      onFeedback(r.referral_type==='PERSONALIZADO'
        ?'Primeira parcela confirmada. Comissão de R$ 200 gerada.'
        :'Primeira mensalidade confirmada. Comissão de R$ 35 gerada.');
      await load();
    }catch(e:any){onError(e?.message||'Falha ao confirmar pagamento.')}
    finally{setBusy(false)}
  };

  const acceptPolicy=async(p:any)=>{
    setBusy(true);onError('');
    try{
      await platformDb.acceptPlatformPartnerPolicy(p.id,policyVersion);
      onFeedback('Ciência da política registrada para o vendedor.');
      await load();
    }catch(e:any){onError(e?.message||'Falha ao registrar ciência.')}
    finally{setBusy(false)}
  };

  const saveReferral=async()=>{
    setBusy(true);onError('');
    try{
      await platformDb.savePlatformPartnerReferral(ref);
      onFeedback('Indicação registrada. Comissão continuará bloqueada até o primeiro pagamento.');
      setRef({partner_id:'',referral_type:'ASSINATURA',lead_name:'',lead_email:'',lead_phone:'',status:'LEAD',estimated_value:149,converted_value:0,notes:''});
      await load();
    }catch(e:any){onError(e?.message||'Falha ao registrar indicação.')}
    finally{setBusy(false)}
  };

  return <div className="space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      <Card l="Vendedores" v={data?.metrics?.partners_total||0}/>
      <Card l="Ativos" v={data?.metrics?.partners_active||0}/>
      <Card l="Indicações" v={data?.metrics?.referrals_total||0}/>
      <Card l="Aguardando cliente pagar" v={data?.metrics?.payments_waiting||0}/>
      <Card l="Pagamentos confirmados" v={data?.metrics?.payments_confirmed||0}/>
      <Card l="Liberado agora" v={money(data?.metrics?.commission_available||0)}/>
      <Card l="Fechamento mensal" v={money(data?.metrics?.commission_scheduled||0)}/>
      <Card l="Já pago" v={money(data?.metrics?.commission_paid||0)}/>
    </div>

    <section className="p-4 rounded-2xl bg-neutral-900 border border-amber-900/50">
      <div className="flex items-start gap-3">
        <FileCheck2 size={20} className="text-amber-400 shrink-0 mt-0.5"/>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[.18em] text-amber-400 font-black">Política comercial ativa · {policyVersion}</div>
          <h2 className="font-black text-lg mt-1">Indicação de vendedores autônomos</h2>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs text-neutral-500">ASSINATURA</div>
              <div className="text-2xl font-black mt-1">R$ 149/mês</div>
              <div className="text-sm text-emerald-400 font-black mt-2">Repasse único: R$ 35</div>
              <div className="text-[10px] text-neutral-500 mt-1">Liberado somente após a primeira mensalidade efetivamente paga.</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-xs text-neutral-500">PERSONALIZADO</div>
              <div className="text-2xl font-black mt-1">R$ 990 · 3× R$ 330</div>
              <div className="text-sm text-emerald-400 font-black mt-2">Repasse único: R$ 200</div>
              <div className="text-[10px] text-neutral-500 mt-1">Liberado somente após a primeira parcela efetivamente paga.</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-x-5 gap-y-2 mt-4 text-[11px] text-neutral-300">
            <PolicyRule>Cadastro, proposta ou promessa de pagamento não geram comissão.</PolicyRule>
            <PolicyRule>Estorno/fraude antes do repasse cancela a comissão.</PolicyRule>
            <PolicyRule>IMEDIATO: pagamento confirmado → comissão LIBERADA.</PolicyRule>
            <PolicyRule>FECHAMENTO MENSAL: pagamento confirmado → comissão AGENDADA.</PolicyRule>
            <PolicyRule>Uma comissão de aquisição por venda; bônus são tratados separadamente.</PolicyRule>
            <PolicyRule>Disputas de indicação precisam ser validadas no ATR Control.</PolicyRule>
            <PolicyRule>Comissão paga não é apagada nem reaberta; correção deve ser por ajuste.</PolicyRule>
            <PolicyRule>E-mail e telefone precisam estar validados antes do repasse.</PolicyRule>
          </div>
        </div>
      </div>
    </section>

    <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <h2 className="font-black">Funil comercial · últimos 6 meses</h2>
      <div className="h-52 flex items-end gap-3 mt-4">{monthly.map((m:any)=><div key={m.month_key} className="flex-1 h-full flex flex-col justify-end">
        <div className="flex items-end gap-1 h-40">
          <div className="flex-1 bg-amber-500/70 rounded-t" style={{height:`${Math.max(5,Number(m.referrals||0)/max*100)}%`}}/>
          <div className="flex-1 bg-emerald-500/70 rounded-t" style={{height:`${Math.max(5,Number(m.converted||0)/max*100)}%`}}/>
        </div>
        <div className="text-[9px] text-neutral-600 text-center mt-1">{String(m.month_key).slice(5)}</div>
      </div>)}</div>
      <div className="text-[10px] text-neutral-500 mt-2">Âmbar: indicações · Verde: conversões confirmadas</div>
    </section>

    <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div><h2 className="font-black">Vendedores parceiros</h2><p className="text-[10px] text-neutral-500">Autônomos comissionados, separados dos clientes lojistas.</p></div>
          <div className="relative"><Search size={13} className="absolute left-3 top-3 text-neutral-600"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="input !pl-8"/></div>
        </div>
        <div className="space-y-2 mt-4">{partners.map((p:any)=><div key={p.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex flex-wrap justify-between gap-2">
            <button className="text-left" onClick={()=>setForm({...p})}><b className="text-sm">{p.full_name}</b><div className="text-[10px] text-neutral-500">{p.email} · {p.phone}</div></button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={()=>navigator.clipboard?.writeText(share(p)).then(()=>onFeedback('Link copiado.'))}><Copy size={12} className="mr-1"/>Link</button>
              {p.accepted_policy_version!==policyVersion&&<button className="btn-secondary" onClick={()=>void acceptPolicy(p)}>Registrar ciência</button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Tag ok={p.email_verified}>E-mail {p.email_verified?'validado':'pendente'}</Tag>
            <Tag ok={p.phone_verified}>Telefone {p.phone_verified?'validado':'pendente'}</Tag>
            <Tag ok={p.accepted_policy_version===policyVersion}>Política {p.accepted_policy_version===policyVersion?'aceita':'pendente'}</Tag>
            <Tag ok={p.active}>{p.active?'Ativo':'Inativo'}</Tag>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3">
            <Mini l="Código" v={p.referral_code}/>
            <Mini l="Indicações" v={p.referrals}/>
            <Mini l="Aguard. pagamento" v={p.waiting_payment}/>
            <Mini l="Liberado" v={money(p.available_amount)}/>
            <Mini l="Agendado" v={money(p.scheduled_amount)}/>
            <Mini l="Pago" v={money(p.paid_amount)}/>
          </div>
          <div className="text-[10px] text-neutral-500 mt-3">Repasse: <b className="text-white">{p.payout_mode==='FECHAMENTO_MENSAL'?`Fechamento mensal · dia ${p.monthly_payout_day}`:'Imediato após pagamento confirmado'}</b></div>
          <div className="mt-2 text-[9px] text-neutral-600 break-all">{share(p)}</div>
        </div>)}</div>
      </section>

      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h2 className="font-black">{form.id?'Editar vendedor':'Novo vendedor'}</h2>
        <Field l="Nome"><input className="input" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
        <Field l="E-mail"><input className="input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
        <Field l="Telefone"><input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
        <Field l="Código de indicação"><input className="input" value={form.referral_code||''} onChange={e=>setForm({...form,referral_code:e.target.value.toUpperCase()})}/></Field>
        <div className="grid grid-cols-2 gap-2"><Mini l="Assinatura" v="R$ 35 · uma vez"/><Mini l="Personalizado" v="R$ 200 · uma vez"/></div>
        <Field l="Modo de repasse"><select className="input" value={form.payout_mode||'IMEDIATO'} onChange={e=>setForm({...form,payout_mode:e.target.value})}><option value="IMEDIATO">Imediato após cliente pagar</option><option value="FECHAMENTO_MENSAL">Acumular para fechamento mensal</option></select></Field>
        {form.payout_mode==='FECHAMENTO_MENSAL'&&<Field l="Dia do repasse mensal"><input type="number" min="1" max="28" className="input" value={form.monthly_payout_day||5} onChange={e=>setForm({...form,monthly_payout_day:Number(e.target.value)})}/></Field>}
        <Field l="Chave PIX"><input className="input" value={form.pix_key||''} onChange={e=>setForm({...form,pix_key:e.target.value})}/></Field>
        <div className="flex flex-wrap gap-3 text-xs">
          <label><input type="checkbox" checked={!!form.email_verified} onChange={e=>setForm({...form,email_verified:e.target.checked})}/> E-mail validado</label>
          <label><input type="checkbox" checked={!!form.phone_verified} onChange={e=>setForm({...form,phone_verified:e.target.checked})}/> Telefone validado</label>
          <label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Ativo</label>
        </div>
        <Field l="Notas"><textarea className="input min-h-20" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
        <button className="btn-primary w-full" disabled={busy} onClick={()=>void savePartner()}><UserCheck size={14} className="mr-2"/>Salvar vendedor</button>
      </section>
    </div>

    <div className="grid xl:grid-cols-[.7fr_1.3fr] gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h2 className="font-black">Registrar indicação</h2>
        <Field l="Vendedor"><select className="input" value={ref.partner_id} onChange={e=>setRef({...ref,partner_id:e.target.value})}><option value="">Selecione...</option>{(data?.partners||[]).filter((p:any)=>p.active).map((p:any)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
        <Field l="Tipo"><select className="input" value={ref.referral_type} onChange={e=>setRef({...ref,referral_type:e.target.value,estimated_value:e.target.value==='PERSONALIZADO'?990:149})}><option>ASSINATURA</option><option>PERSONALIZADO</option></select></Field>
        <Field l="Lead / empresa"><input className="input" value={ref.lead_name} onChange={e=>setRef({...ref,lead_name:e.target.value})}/></Field>
        <Field l="E-mail"><input className="input" value={ref.lead_email} onChange={e=>setRef({...ref,lead_email:e.target.value})}/></Field>
        <Field l="Telefone"><input className="input" value={ref.lead_phone} onChange={e=>setRef({...ref,lead_phone:e.target.value})}/></Field>
        <Mini l="Valor comercial" v={ref.referral_type==='PERSONALIZADO'?'R$ 990 · 3× R$ 330':'R$ 149/mês'}/>
        <button className="btn-primary w-full" disabled={!ref.partner_id||busy} onClick={()=>void saveReferral()}><Plus size={14} className="mr-2"/>Registrar indicação</button>
      </section>

      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h2 className="font-black">Validação das indicações</h2>
        <p className="text-[10px] text-neutral-500 mt-1">O repasse só é criado depois que você confirmar o primeiro pagamento real do cliente.</p>
        <div className="mt-4 space-y-2">{(data?.referrals||[]).map((r:any)=>{
          const p=(data?.partners||[]).find((x:any)=>x.id===r.partner_id);
          const defaultAmount=r.referral_type==='PERSONALIZADO'?'330.00':'149.00';
          return <div key={r.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div><div className="font-bold text-sm">{r.lead_name||'Lead sem nome'}</div><div className="text-[10px] text-neutral-500">{p?.full_name||'—'} · {r.referral_type} · {r.source}</div></div>
              <div className="flex flex-wrap gap-2">
                <Tag ok={r.customer_payment_status==='CONFIRMADO'}>{r.customer_payment_status}</Tag>
                <Tag ok={r.status==='CONVERTIDO'}>{r.status}</Tag>
              </div>
            </div>
            {r.customer_payment_status!=='CONFIRMADO'?<div className="grid sm:grid-cols-[1fr_auto] gap-2 mt-3">
              <input className="input" inputMode="decimal" value={paymentValues[r.id]??defaultAmount} onChange={e=>setPaymentValues(prev=>({...prev,[r.id]:e.target.value}))} aria-label="Valor pago pelo cliente"/>
              <button disabled={busy||!p?.email_verified||!p?.phone_verified} className="btn-primary" onClick={()=>void confirmPayment(r)}><CheckCircle2 size={14} className="mr-2"/>Confirmar cliente pagou</button>
            </div>:<div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3"><Mini l="Primeiro pagamento" v={money(r.first_payment_amount)}/><Mini l="Pago em" v={date(r.first_payment_at)}/><Mini l="Validado em" v={date(r.payment_validated_at)}/><Mini l="Comissão" v={r.referral_type==='PERSONALIZADO'?'R$ 200':'R$ 35'}/></div>}
            {(!p?.email_verified||!p?.phone_verified)&&r.customer_payment_status!=='CONFIRMADO'&&<div className="mt-2 text-[10px] text-amber-300 flex gap-2 items-center"><AlertTriangle size={12}/>Valide e-mail e telefone do vendedor antes de liberar comissão.</div>}
          </div>;
        })}</div>
      </section>
    </div>

    <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-center gap-2"><WalletCards size={17} className="text-emerald-400"/><div><h2 className="font-black">Repasses & fechamento</h2><p className="text-[10px] text-neutral-500">Histórico financeiro das comissões já originadas por pagamentos confirmados.</p></div></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[900px] text-xs">
        <thead className="text-neutral-500"><tr><th className="text-left p-2">Vendedor</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Regra</th><th className="text-right p-2">Repasse</th><th className="text-left p-2">Vencimento</th><th className="text-left p-2">Status</th><th className="text-left p-2">Ação</th></tr></thead>
        <tbody>{(data?.commissions||[]).map((x:any)=>{
          const p=(data?.partners||[]).find((y:any)=>y.id===x.partner_id);
          return <tr key={x.id} className="border-t border-neutral-800">
            <td className="p-2">{p?.full_name||'—'}</td>
            <td className="p-2">{x.commission_type}</td>
            <td className="p-2">{x.payout_mode==='FECHAMENTO_MENSAL'?<span className="flex gap-1 items-center"><Clock3 size={12}/>Fechamento mensal</span>:'Imediato'}</td>
            <td className="p-2 text-right font-black text-emerald-400">{money(x.amount_due)}</td>
            <td className="p-2">{date(x.due_at)}</td>
            <td className="p-2">{x.status}</td>
            <td className="p-2">
              {x.status==='AGENDADA'&&<button className="btn-secondary !py-1" onClick={()=>void platformDb.updatePlatformPartnerCommission(x.id,'LIBERADA').then(load)}>Liberar fechamento</button>}
              {x.status==='LIBERADA'&&<button className="btn-primary !py-1" onClick={()=>void platformDb.updatePlatformPartnerCommission(x.id,'PAGA').then(load)}>Marcar pago</button>}
              {x.status==='PAGA'&&<span className="text-emerald-400 text-[10px]">Pago {date(x.paid_at)}</span>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
  </div>
};

const Card=({l,v}:{l:string;v:any})=><div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="text-lg font-black">{v}</div><div className="text-[10px] text-neutral-500">{l}</div></div>;
const Mini=({l,v}:{l:string;v:any})=><div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800"><div className="text-[9px] text-neutral-600">{l}</div><div className="text-[11px] font-bold truncate">{String(v??'—')}</div></div>;
const Field=({l,children}:{l:string;children:React.ReactNode})=><label className="block"><span className="text-[10px] text-neutral-500 block mb-1">{l}</span>{children}</label>;
const Tag=({ok,children}:{ok:boolean;children:React.ReactNode})=><span className={`text-[9px] px-2 py-1 rounded-full border font-black ${ok?'text-emerald-300 border-emerald-800 bg-emerald-950/30':'text-amber-300 border-amber-800 bg-amber-950/30'}`}>{children}</span>;
const PolicyRule=({children}:{children:React.ReactNode})=><div className="flex gap-2"><CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5"/><span>{children}</span></div>;
