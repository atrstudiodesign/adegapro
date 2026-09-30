import React,{useEffect,useMemo,useState} from 'react';
import { Copy, Plus, Search, UserCheck } from 'lucide-react';
import { platformDb } from '../../services/platformDb';

const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
export const PartnerControlView=({onFeedback,onError}:{onFeedback:(s:string)=>void;onError:(s:string)=>void})=>{
  const[data,setData]=useState<any>(null);
  const[busy,setBusy]=useState(false);
  const[q,setQ]=useState('');
  const[form,setForm]=useState<any>({full_name:'',email:'',phone:'',email_verified:false,phone_verified:false,active:true,referral_code:'',subscription_commission_mode:'PERCENTUAL',subscription_commission_value:0,custom_commission_mode:'PERCENTUAL',custom_commission_value:0});
  const[ref,setRef]=useState<any>({partner_id:'',referral_type:'ASSINATURA',lead_name:'',status:'LEAD',estimated_value:0,converted_value:0});
  const[comm,setComm]=useState<any>({partner_id:'',commission_type:'ASSINATURA',base_amount:0,due_at:''});
  const load=async()=>{setBusy(true);try{setData(await platformDb.getPlatformPartnerSnapshot())}catch(e:any){onError(e?.message||'Falha ao carregar parceiros.')}finally{setBusy(false)}};
  useEffect(()=>{void load()},[]);
  const partners=useMemo(()=>{const s=q.toLowerCase();return(data?.partners||[]).filter((p:any)=>!s||[p.full_name,p.email,p.phone,p.referral_code].join(' ').toLowerCase().includes(s))},[data,q]);
  const monthly=data?.monthly||[];
  const max=Math.max(1,...monthly.map((m:any)=>Number(m.referrals||0)));
  const share=(p:any)=>`${window.location.origin}/?ref=${encodeURIComponent(p.referral_code)}`;

  const savePartner=async()=>{setBusy(true);try{await platformDb.savePlatformSalesPartner(form);onFeedback('Vendedor salvo.');setForm({full_name:'',email:'',phone:'',email_verified:false,phone_verified:false,active:true,referral_code:'',subscription_commission_mode:'PERCENTUAL',subscription_commission_value:0,custom_commission_mode:'PERCENTUAL',custom_commission_value:0});await load()}catch(e:any){onError(e?.message||'Falha ao salvar vendedor.')}finally{setBusy(false)}};

  return <div className="space-y-5">
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {[['Vendedores',data?.metrics?.partners_total],['Ativos',data?.metrics?.partners_active],['Indicações',data?.metrics?.referrals_total],['Convertidas',data?.metrics?.referrals_converted],['Vendas indicadas',money(data?.metrics?.conversion_value)],['A receber',money(data?.metrics?.commission_pending)],['Pago',money(data?.metrics?.commission_paid)]].map(([l,v])=><Card key={String(l)} l={String(l)} v={v||0}/>)}
    </div>

    <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <h2 className="font-black">Funil comercial · últimos 6 meses</h2>
      <div className="h-52 flex items-end gap-3 mt-4">{monthly.map((m:any)=><div key={m.month_key} className="flex-1 h-full flex flex-col justify-end">
        <div className="flex items-end gap-1 h-40">
          <div className="flex-1 bg-amber-500/70 rounded-t" style={{height:`${Math.max(5,Number(m.referrals||0)/max*100)}%`}}/>
          <div className="flex-1 bg-emerald-500/70 rounded-t" style={{height:`${Math.max(5,Number(m.converted||0)/max*100)}%`}}/>
        </div><div className="text-[9px] text-neutral-600 text-center mt-1">{String(m.month_key).slice(5)}</div></div>)}</div>
      <div className="text-[10px] text-neutral-500 mt-2">Âmbar: indicações · Verde: conversões</div>
    </section>

    <div className="grid xl:grid-cols-[1.2fr_.8fr] gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col sm:flex-row gap-3 justify-between"><div><h2 className="font-black">Vendedores parceiros</h2><p className="text-[10px] text-neutral-500">Autônomos comissionados, separados dos clientes lojistas.</p></div><div className="relative"><Search size={13} className="absolute left-3 top-3 text-neutral-600"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..." className="input !pl-8"/></div></div>
        <div className="space-y-2 mt-4">{partners.map((p:any)=><div key={p.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div className="flex flex-wrap justify-between gap-2"><button className="text-left" onClick={()=>setForm({...p})}><b className="text-sm">{p.full_name}</b><div className="text-[10px] text-neutral-500">{p.email} · {p.phone}</div></button><button className="btn-secondary" onClick={()=>navigator.clipboard?.writeText(share(p)).then(()=>onFeedback('Link copiado.'))}><Copy size={12} className="mr-1"/>Link</button></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">{[['Código',p.referral_code],['Indicações',p.referrals],['Convertidas',p.converted],['A receber',money(p.pending_amount)],['Pago',money(p.paid_amount)]].map(([l,v])=><Mini key={String(l)} l={String(l)} v={v}/>)}</div>
          <div className="mt-2 text-[9px] text-neutral-600 break-all">{share(p)}</div>
        </div>)}</div>
      </section>

      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h2 className="font-black">{form.id?'Editar vendedor':'Novo vendedor'}</h2>
        <Field l="Nome"><input className="input" value={form.full_name||''} onChange={e=>setForm({...form,full_name:e.target.value})}/></Field>
        <Field l="E-mail"><input className="input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
        <Field l="Telefone"><input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
        <Field l="Código de indicação"><input className="input" value={form.referral_code||''} onChange={e=>setForm({...form,referral_code:e.target.value.toUpperCase()})}/></Field>
        <Rule title="Assinatura" mode={form.subscription_commission_mode} value={form.subscription_commission_value} setMode={(v:string)=>setForm({...form,subscription_commission_mode:v})} setValue={(v:number)=>setForm({...form,subscription_commission_value:v})}/>
        <Rule title="Personalizado" mode={form.custom_commission_mode} value={form.custom_commission_value} setMode={(v:string)=>setForm({...form,custom_commission_mode:v})} setValue={(v:number)=>setForm({...form,custom_commission_value:v})}/>
        <div className="flex flex-wrap gap-3 text-xs"><label><input type="checkbox" checked={!!form.email_verified} onChange={e=>setForm({...form,email_verified:e.target.checked})}/> E-mail validado</label><label><input type="checkbox" checked={!!form.phone_verified} onChange={e=>setForm({...form,phone_verified:e.target.checked})}/> Telefone validado</label><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Ativo</label></div>
        <button className="btn-primary w-full" disabled={busy} onClick={()=>void savePartner()}><UserCheck size={14} className="mr-2"/>Salvar vendedor</button>
      </section>
    </div>

    <div className="grid xl:grid-cols-2 gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"><h2 className="font-black">Registrar indicação</h2>
        <Field l="Vendedor"><select className="input" value={ref.partner_id} onChange={e=>setRef({...ref,partner_id:e.target.value})}><option value="">Selecione...</option>{(data?.partners||[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
        <Field l="Tipo"><select className="input" value={ref.referral_type} onChange={e=>setRef({...ref,referral_type:e.target.value})}><option>ASSINATURA</option><option>PERSONALIZADO</option></select></Field>
        <Field l="Lead/empresa"><input className="input" value={ref.lead_name} onChange={e=>setRef({...ref,lead_name:e.target.value})}/></Field>
        <div className="grid grid-cols-2 gap-2"><Field l="Estimado"><input type="number" className="input" value={ref.estimated_value} onChange={e=>setRef({...ref,estimated_value:Number(e.target.value)})}/></Field><Field l="Convertido"><input type="number" className="input" value={ref.converted_value} onChange={e=>setRef({...ref,converted_value:Number(e.target.value)})}/></Field></div>
        <button className="btn-primary w-full" disabled={!ref.partner_id} onClick={()=>void platformDb.savePlatformPartnerReferral(ref).then(()=>{onFeedback('Indicação registrada.');return load()}).catch((e:any)=>onError(e.message))}><Plus size={14} className="mr-2"/>Registrar</button>
      </section>

      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3"><h2 className="font-black">Gerar comissão</h2>
        <Field l="Vendedor"><select className="input" value={comm.partner_id} onChange={e=>setComm({...comm,partner_id:e.target.value})}><option value="">Selecione...</option>{(data?.partners||[]).map((p:any)=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
        <Field l="Origem"><select className="input" value={comm.commission_type} onChange={e=>setComm({...comm,commission_type:e.target.value})}><option>ASSINATURA</option><option>PERSONALIZADO</option></select></Field>
        <Field l="Valor-base"><input type="number" className="input" value={comm.base_amount} onChange={e=>setComm({...comm,base_amount:Number(e.target.value)})}/></Field>
        <Field l="Vencimento"><input type="date" className="input" value={comm.due_at} onChange={e=>setComm({...comm,due_at:e.target.value})}/></Field>
        <button className="btn-primary w-full" disabled={!comm.partner_id} onClick={()=>void platformDb.createPlatformPartnerCommission(comm).then(()=>{onFeedback('Comissão criada.');return load()}).catch((e:any)=>onError(e.message))}>Calcular repasse</button>
      </section>
    </div>

    <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-center justify-between"><div><h2 className="font-black">Repasses & comissões</h2><p className="text-[10px] text-neutral-500">Aprovação e pagamento dos valores calculados por vendedor.</p></div></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-xs">
        <thead className="text-neutral-500"><tr><th className="text-left p-2">Vendedor</th><th className="text-left p-2">Tipo</th><th className="text-right p-2">Base</th><th className="text-right p-2">Repasse</th><th className="text-left p-2">Status</th><th className="text-left p-2">Ação</th></tr></thead>
        <tbody>{(data?.commissions||[]).map((x:any)=>{const p=(data?.partners||[]).find((y:any)=>y.id===x.partner_id);return <tr key={x.id} className="border-t border-neutral-800">
          <td className="p-2">{p?.full_name||'—'}</td><td className="p-2">{x.commission_type}</td><td className="p-2 text-right">{money(x.base_amount)}</td><td className="p-2 text-right font-black text-emerald-400">{money(x.amount_due)}</td><td className="p-2">{x.status}</td>
          <td className="p-2">{x.status==='PENDENTE'?<button className="btn-secondary !py-1" onClick={()=>void platformDb.updatePlatformPartnerCommission(x.id,'APROVADA').then(load)}>Aprovar</button>:x.status==='APROVADA'?<button className="btn-primary !py-1" onClick={()=>void platformDb.updatePlatformPartnerCommission(x.id,'PAGA').then(load)}>Marcar pago</button>:null}</td>
        </tr>})}</tbody>
      </table></div>
    </section>
  </div>
};
const Card=({l,v}:{l:string;v:any})=><div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="text-lg font-black">{v}</div><div className="text-[10px] text-neutral-500">{l}</div></div>;
const Mini=({l,v}:{l:string;v:any})=><div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800"><div className="text-[9px] text-neutral-600">{l}</div><div className="text-[11px] font-bold truncate">{String(v??'—')}</div></div>;
const Field=({l,children}:{l:string;children:React.ReactNode})=><label className="block"><span className="text-[10px] text-neutral-500 block mb-1">{l}</span>{children}</label>;
const Rule=({title,mode,value,setMode,setValue}:{title:string;mode:string;value:number;setMode:(v:string)=>void;setValue:(v:number)=>void})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><b className="text-xs">Comissão · {title}</b><div className="grid grid-cols-2 gap-2 mt-2"><select className="input" value={mode} onChange={e=>setMode(e.target.value)}><option value="PERCENTUAL">% percentual</option><option value="FIXO">R$ fixo</option></select><input type="number" className="input" value={value||0} onChange={e=>setValue(Number(e.target.value))}/></div></div>;
