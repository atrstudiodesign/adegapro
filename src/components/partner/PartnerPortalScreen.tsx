import React,{useEffect,useMemo,useState} from 'react';
import {
  BarChart3,CheckCircle2,Clock3,Copy,CreditCard,Eye,EyeOff,Link2,LockKeyhole,
  LogOut,Mail,Plus,RefreshCw,ShoppingCart,UserRound,Users,WalletCards,XCircle
} from 'lucide-react';
import { partnerSupabase } from '../../services/partnerSupabase';
import { partnerDb } from '../../services/partnerDb';

const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const dt=(v:any)=>v?new Date(v).toLocaleDateString('pt-BR'):'—';
const statusTone=(s:string)=>{
  if(['CONVERTIDO','CONFIRMADO','LIBERADA','PAGA'].includes(s))return 'emerald';
  if(['PERDIDO','CANCELADO','CANCELADA','ESTORNADO','INADIMPLENTE'].includes(s))return 'rose';
  return 'amber';
};

type PortalTab='OVERVIEW'|'REFERRALS'|'COMMISSIONS'|'PROFILE';

export const PartnerPortalScreen:React.FC=()=>{
  const inviteFromUrl=new URLSearchParams(window.location.search).get('invite')?.trim()||'';
  const[ready,setReady]=useState(false);
  const[session,setSession]=useState<any>(null);
  const[data,setData]=useState<any>(null);
  const[mode,setMode]=useState<'LOGIN'|'REGISTER'>(()=>inviteFromUrl||window.location.pathname.includes('/cadastro')?'REGISTER':'LOGIN');
  const[tab,setTab]=useState<PortalTab>('OVERVIEW');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[confirmPassword,setConfirmPassword]=useState('');
  const[showPassword,setShowPassword]=useState(false);
  const[form,setForm]=useState({
    fullName:'',phone:'',pixKey:'',payoutMode:'IMEDIATO' as 'IMEDIATO'|'FECHAMENTO_MENSAL',monthlyPayoutDay:5
  });
  const[lead,setLead]=useState({referral_type:'ASSINATURA',lead_name:'',lead_email:'',lead_phone:'',notes:''});

  useEffect(()=>{
    if(inviteFromUrl)localStorage.setItem('adega_partner_invite',inviteFromUrl);
    const {data:{subscription}}=partnerSupabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    void partnerSupabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});
    return()=>subscription.unsubscribe();
  },[]);

  const invite=inviteFromUrl||localStorage.getItem('adega_partner_invite')||'';

  const load=async()=>{
    setBusy(true);setError('');
    try{setData(await partnerDb.getDashboard());}
    catch(e:any){
      setData(null);
      const msg=String(e?.message||'');
      if(!msg.includes('seller access not linked'))setError(msg||'Não foi possível carregar seu painel.');
    }finally{setBusy(false);}
  };
  useEffect(()=>{if(session)void load();else setData(null)},[session]);

  const persistPending=()=>{
    localStorage.setItem('adega_partner_pending_claim',JSON.stringify({
      token:invite,fullName:form.fullName,phone:form.phone,pixKey:form.pixKey,
      payoutMode:form.payoutMode,monthlyPayoutDay:form.monthlyPayoutDay
    }));
  };

  const claimPending=async()=>{
    const raw=localStorage.getItem('adega_partner_pending_claim');
    if(!raw)return false;
    const pending=JSON.parse(raw);
    await partnerDb.claimInvite(pending);
    localStorage.removeItem('adega_partner_pending_claim');
    localStorage.removeItem('adega_partner_invite');
    await load();
    return true;
  };

  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const {error:authError}=await partnerSupabase.auth.signInWithPassword({email:email.trim(),password});
      if(authError)throw authError;
      try{await claimPending();}catch(err:any){
        if(String(err?.message||'').includes('convite'))throw err;
      }
      setMessage('Acesso realizado com sucesso.');
    }catch(err:any){setError(err?.message||'Não foi possível entrar.');}
    finally{setBusy(false);}
  };

  const register=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(!invite)throw new Error('Use o link de convite enviado pela ATR Studio.');
      if(!form.fullName.trim())throw new Error('Informe seu nome completo.');
      if(form.phone.replace(/\D/g,'').length<10)throw new Error('Informe um telefone válido.');
      if(password.length<8)throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      if(password!==confirmPassword)throw new Error('As senhas não conferem.');
      persistPending();
      const {data:authData,error:authError}=await partnerSupabase.auth.signUp({
        email:email.trim(),password,
        options:{
          data:{full_name:form.fullName.trim(),account_type:'ADEGA_PRO_PARTNER'},
          emailRedirectTo:window.location.origin+'/vendedor/cadastro'
        }
      });
      if(authError)throw authError;
      if(authData.session){
        await claimPending();
        setMessage('Cadastro concluído. Seu painel de vendedor está ativo.');
      }else{
        setMessage('Cadastro criado. Confirme seu e-mail e depois entre para concluir o vínculo do convite.');
        setMode('LOGIN');
      }
    }catch(err:any){setError(err?.message||'Não foi possível concluir o cadastro.');}
    finally{setBusy(false);}
  };

  const logout=async()=>{
    await partnerSupabase.auth.signOut();
    setData(null);setSession(null);setMode('LOGIN');
    window.history.pushState({},'', '/vendedor');
  };

  const copy=async(value:string,label:string)=>{
    await navigator.clipboard?.writeText(value);
    setMessage(label+' copiado.');
  };

  const saveReferral=async()=>{
    setBusy(true);setError('');setMessage('');
    try{
      await partnerDb.saveReferral(lead);
      setLead({referral_type:'ASSINATURA',lead_name:'',lead_email:'',lead_phone:'',notes:''});
      setMessage('Indicação registrada e vinculada ao seu usuário.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível registrar a indicação.');}
    finally{setBusy(false);}
  };

  const saveProfile=async()=>{
    setBusy(true);setError('');setMessage('');
    try{
      await partnerDb.updateProfile({
        phone:form.phone||data?.partner?.phone,
        pix_key:form.pixKey||data?.partner?.pix_key,
        payout_mode:form.payoutMode||data?.partner?.payout_mode,
        monthly_payout_day:form.monthlyPayoutDay||data?.partner?.monthly_payout_day
      });
      setMessage('Dados de repasse atualizados.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível atualizar os dados.');}
    finally{setBusy(false);}
  };

  const acceptPolicy=async()=>{
    setBusy(true);setError('');
    try{await partnerDb.acceptPolicy(data?.policy?.version);setMessage('Política comercial aceita.');await load();}
    catch(e:any){setError(e?.message||'Não foi possível registrar o aceite.');}
    finally{setBusy(false);}
  };

  if(!ready)return <div className="min-h-dvh bg-[#06090c] text-white grid place-items-center text-sm text-neutral-500">Preparando portal do vendedor...</div>;

  if(!session){
    return <div className="min-h-dvh bg-[#06090c] text-white grid place-items-center p-4">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,.12),transparent_35%)]"/>
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-[#0b1014] shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6"><img src="/adega-pro-mark.svg" className="w-12 h-12 rounded-xl border border-amber-500/30"/><div><div className="text-[10px] uppercase tracking-[.2em] text-amber-400 font-black">Programa de vendedores</div><h1 className="text-2xl font-black">ADEGA <span className="text-amber-400">PRO</span></h1></div></div>
        <div className="flex gap-2 p-1 rounded-xl bg-neutral-950 border border-neutral-800 mb-6">
          <button onClick={()=>setMode('LOGIN')} className={`flex-1 py-2 rounded-lg text-xs font-black ${mode==='LOGIN'?'bg-amber-400 text-neutral-950':'text-neutral-400'}`}>Entrar</button>
          <button onClick={()=>setMode('REGISTER')} className={`flex-1 py-2 rounded-lg text-xs font-black ${mode==='REGISTER'?'bg-amber-400 text-neutral-950':'text-neutral-400'}`}>Cadastrar com convite</button>
        </div>
        {error&&<div className="mb-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        {message&&<div className="mb-4 p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{message}</div>}

        {mode==='LOGIN'?<form onSubmit={login} className="space-y-4">
          <Field label="E-mail"><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3 [&>input]:w-full [&>input]:bg-transparent [&>input]:py-3 [&>input]:outline-none [&>input]:text-sm [&>svg]:text-neutral-500"><Mail size={15}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div></Field>
          <Field label="Senha"><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3 [&>input]:w-full [&>input]:bg-transparent [&>input]:py-3 [&>input]:outline-none [&>input]:text-sm [&>svg]:text-neutral-500"><LockKeyhole size={15}/><input required type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></Field>
          <button disabled={busy} className="w-full h-12 rounded-xl bg-amber-400 text-neutral-950 font-black">{busy?'Entrando...':'Acessar meu painel'}</button>
          <p className="text-[10px] text-neutral-600 text-center">O acesso de vendedor é separado do painel dos clientes e do ATR Control administrativo.</p>
        </form>:<form onSubmit={register} className="space-y-4">
          {!invite&&<div className="p-3 rounded-xl border border-amber-800 bg-amber-950/20 text-amber-300 text-xs">Você precisa abrir o link de cadastro enviado pela ATR Studio.</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome completo"><TextInput value={form.fullName} onChange={v=>setForm({...form,fullName:v})} icon={UserRound}/></Field>
            <Field label="Telefone / WhatsApp"><TextInput value={form.phone} onChange={v=>setForm({...form,phone:v})}/></Field>
            <Field label="E-mail"><TextInput value={email} onChange={setEmail} type="email" icon={Mail}/></Field>
            <Field label="Chave PIX"><TextInput value={form.pixKey} onChange={v=>setForm({...form,pixKey:v})}/></Field>
            <Field label="Senha"><TextInput value={password} onChange={setPassword} type="password" icon={LockKeyhole}/></Field>
            <Field label="Confirmar senha"><TextInput value={confirmPassword} onChange={setConfirmPassword} type="password" icon={LockKeyhole}/></Field>
          </div>
          <Field label="Recebimento da comissão"><select value={form.payoutMode} onChange={e=>setForm({...form,payoutMode:e.target.value as any})} className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-3 text-sm outline-none focus:border-amber-400"><option value="IMEDIATO">Imediato após pagamento confirmado</option><option value="FECHAMENTO_MENSAL">Fechamento mensal</option></select></Field>
          {form.payoutMode==='FECHAMENTO_MENSAL'&&<Field label="Dia do fechamento"><input className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-3 text-sm outline-none focus:border-amber-400" type="number" min="1" max="28" value={form.monthlyPayoutDay} onChange={e=>setForm({...form,monthlyPayoutDay:Number(e.target.value)})}/></Field>}
          <button disabled={busy||!invite} className="w-full h-12 rounded-xl bg-amber-400 text-neutral-950 font-black disabled:opacity-40">{busy?'Criando acesso...':'Concluir meu cadastro'}</button>
        </form>}
      </div>
    </div>;
  }

  if(!data){
    return <div className="min-h-dvh bg-[#06090c] text-white grid place-items-center p-5">
      <div className="max-w-md w-full p-6 rounded-3xl border border-neutral-800 bg-neutral-900 text-center">
        <h1 className="text-xl font-black">Vínculo de vendedor pendente</h1>
        <p className="text-xs text-neutral-500 mt-2">Sua autenticação está válida, mas este usuário ainda não está vinculado a um cadastro de vendedor.</p>
        {invite?<button onClick={()=>setMode('REGISTER')} className="mt-5 px-5 py-3 rounded-xl bg-amber-400 text-neutral-950 font-black text-sm">Concluir pelo convite</button>:<p className="mt-5 text-xs text-amber-300">Solicite um novo link de cadastro à ATR Studio.</p>}
        <button onClick={()=>void logout()} className="mt-4 text-xs text-neutral-500">Sair</button>
      </div>
    </div>;
  }

  const partner=data.partner||{};
  const metrics=data.metrics||{};
  const referralLink=`${window.location.origin}/?ref=${encodeURIComponent(partner.referral_code||'')}`;
  const referrals=data.referrals||[];
  const commissions=data.commissions||[];

  return <div className="min-h-dvh bg-[#06090c] text-white">
    <header className="sticky top-0 z-30 bg-black/85 border-b border-neutral-800 backdrop-blur px-4 sm:px-6 h-16 flex items-center gap-4">
      <img src="/adega-pro-brand.svg" alt="Adega Pro" className="h-10 w-auto"/>
      <div className="hidden sm:block h-7 w-px bg-neutral-800"/>
      <div className="hidden sm:block"><div className="text-[10px] text-neutral-500">Portal do vendedor</div><div className="text-xs font-black">{partner.full_name}</div></div>
      <nav className="ml-auto flex gap-1 overflow-x-auto">
        {([['OVERVIEW','Visão Geral',BarChart3],['REFERRALS','Indicações',Users],['COMMISSIONS','Comissões',WalletCards],['PROFILE','Perfil',UserRound]] as [PortalTab,string,any][]).map(([id,label,I])=><button key={id} onClick={()=>setTab(id)} className={`h-10 px-3 rounded-lg border flex items-center gap-2 text-[10px] font-black whitespace-nowrap ${tab===id?'bg-amber-400 border-amber-300 text-neutral-950':'bg-[#0d1217] border-neutral-800 text-neutral-400'}`}><I size={13}/>{label}</button>)}
        <button onClick={()=>void logout()} className="h-10 px-3 rounded-lg border border-neutral-800 bg-[#0d1217] text-neutral-500"><LogOut size={14}/></button>
      </nav>
    </header>

    <main className="max-w-[1500px] mx-auto p-4 sm:p-6 space-y-5">
      {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {message&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{message}</div>}

      {tab==='OVERVIEW'&&<>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <Metric label="Indicações" value={metrics.leads_total||0} icon={Users}/>
          <Metric label="Pendentes" value={metrics.pending||0} icon={Clock3} tone="amber"/>
          <Metric label="Vendas ativas" value={metrics.active_sales||0} icon={ShoppingCart} tone="emerald"/>
          <Metric label="Canceladas" value={metrics.cancelled||0} icon={XCircle} tone="rose"/>
          <Metric label="Aguard. pagamento" value={metrics.payments_waiting||0} icon={Clock3}/>
          <Metric label="Pagamentos" value={metrics.payments_confirmed||0} icon={CheckCircle2} tone="emerald"/>
          <Metric label="A receber" value={money(Number(metrics.commission_available||0)+Number(metrics.commission_scheduled||0))} icon={WalletCards} tone="amber"/>
          <Metric label="Já recebido" value={money(metrics.commission_paid||0)} icon={CreditCard} tone="emerald"/>
        </div>

        <section className="rounded-2xl border border-amber-500/30 bg-[#0b1014] p-4 sm:p-5">
          <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-center">
            <div><div className="text-[10px] uppercase tracking-[.18em] text-amber-400 font-black">Seu rastreamento individual</div><h2 className="text-lg font-black mt-1">Compartilhe seu link ou código com cada cliente</h2><p className="text-xs text-neutral-500 mt-1">Quando o cliente entra pelo seu link e conclui o cadastro, a origem fica vinculada ao seu vendedor.</p></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>void copy(referralLink,'Link')} className="h-10 px-3 rounded-xl border border-neutral-700 bg-neutral-950 text-xs font-black flex items-center gap-2 hover:border-amber-400/50"><Link2 size={14}/>Copiar link</button>
              <button onClick={()=>void copy(partner.referral_code,'Código')} className="h-10 px-3 rounded-xl border border-neutral-700 bg-neutral-950 text-xs font-black flex items-center gap-2 hover:border-amber-400/50"><Copy size={14}/>Código {partner.referral_code}</button>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-sky-400 break-all">{referralLink}</div>
        </section>

        {partner.accepted_policy_version!==data?.policy?.version&&<section className="p-4 rounded-2xl border border-amber-800 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div className="font-black text-sm">Política comercial pendente</div><div className="text-[10px] text-neutral-500 mt-1">Aceite a versão {data?.policy?.version} para manter seu cadastro atualizado.</div></div><button disabled={busy} onClick={()=>void acceptPolicy()} className="h-10 px-4 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black inline-flex items-center justify-center gap-2 disabled:opacity-50">Aceitar política</button></section>}

        <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-4">
          <section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014]"><div className="flex items-center justify-between"><div><h2 className="font-black">Últimas indicações</h2><p className="text-[10px] text-neutral-500">Ativas, pendentes e canceladas em um único mini dash.</p></div><button onClick={()=>setTab('REFERRALS')} className="text-[10px] text-amber-400 font-black">VER TODAS</button></div><ReferralTable rows={referrals.slice(0,8)}/></section>
          <section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014]"><h2 className="font-black">Resumo das comissões</h2><div className="mt-4 space-y-3"><Summary label="Liberadas" value={money(metrics.commission_available||0)} tone="emerald"/><Summary label="Agendadas" value={money(metrics.commission_scheduled||0)} tone="amber"/><Summary label="Pagas" value={money(metrics.commission_paid||0)} tone="sky"/></div></section>
        </div>
      </>}

      {tab==='REFERRALS'&&<div className="grid xl:grid-cols-[.7fr_1.3fr] gap-4">
        <section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014] space-y-3"><div><h2 className="font-black">Nova indicação</h2><p className="text-[10px] text-neutral-500 mt-1">Cadastre também clientes que chegaram por conversa direta, telefone ou WhatsApp.</p></div>
          <Field label="Tipo"><select className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-3 text-sm outline-none focus:border-amber-400" value={lead.referral_type} onChange={e=>setLead({...lead,referral_type:e.target.value})}><option value="ASSINATURA">Assinatura R$ 149/mês</option><option value="PERSONALIZADO">Personalizado R$ 990</option></select></Field>
          <Field label="Cliente / empresa"><TextInput value={lead.lead_name} onChange={v=>setLead({...lead,lead_name:v})}/></Field>
          <Field label="E-mail"><TextInput type="email" value={lead.lead_email} onChange={v=>setLead({...lead,lead_email:v})}/></Field>
          <Field label="Telefone"><TextInput value={lead.lead_phone} onChange={v=>setLead({...lead,lead_phone:v})}/></Field>
          <Field label="Observação"><textarea className="w-full min-h-20 rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-3 text-sm outline-none focus:border-amber-400" value={lead.notes} onChange={e=>setLead({...lead,notes:e.target.value})}/></Field>
          <button disabled={busy||!lead.lead_name.trim()} onClick={()=>void saveReferral()} className="w-full h-10 px-4 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={14}/>Registrar indicação</button>
        </section>
        <section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014]"><h2 className="font-black">Minhas indicações</h2><ReferralTable rows={referrals}/></section>
      </div>}

      {tab==='COMMISSIONS'&&<section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014]"><div><h2 className="font-black">Minhas comissões</h2><p className="text-[10px] text-neutral-500 mt-1">A comissão só é liberada depois que o pagamento do cliente é confirmado pela ATR Studio.</p></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead className="text-neutral-500"><tr><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Comissão</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Vencimento</th><th className="p-2 text-left">Pago em</th></tr></thead><tbody>{commissions.map((c:any)=><tr key={c.id} className="border-t border-neutral-800"><td className="p-2 font-bold">{c.commission_type}</td><td className="p-2 text-right">{money(c.base_amount)}</td><td className="p-2 text-right text-amber-400 font-black">{money(c.amount_due)}</td><td className="p-2"><Status value={c.status}/></td><td className="p-2">{dt(c.due_at)}</td><td className="p-2">{dt(c.paid_at)}</td></tr>)}</tbody></table></div></section>}

      {tab==='PROFILE'&&<section className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014] max-w-2xl"><h2 className="font-black">Perfil & repasse</h2><div className="grid sm:grid-cols-2 gap-3 mt-4"><Info l="Nome" v={partner.full_name}/><Info l="E-mail" v={partner.email}/><Field label="Telefone"><TextInput value={form.phone||partner.phone||''} onChange={v=>setForm({...form,phone:v})}/></Field><Field label="Chave PIX"><TextInput value={form.pixKey||partner.pix_key||''} onChange={v=>setForm({...form,pixKey:v})}/></Field></div><Field label="Modo de repasse"><select className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-3 text-sm outline-none focus:border-amber-400" value={form.payoutMode||partner.payout_mode} onChange={e=>setForm({...form,payoutMode:e.target.value as any})}><option value="IMEDIATO">Imediato</option><option value="FECHAMENTO_MENSAL">Fechamento mensal</option></select></Field><button onClick={()=>void saveProfile()} disabled={busy} className="mt-4 h-10 px-4 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black inline-flex items-center justify-center gap-2 disabled:opacity-50">Salvar dados</button></section>}
    </main>
  </div>;
};

const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="block text-[10px] text-neutral-500 mb-1">{label}</span>{children}</label>;
const TextInput=({value,onChange,type='text',icon:Icon}:{value:string;onChange:(v:string)=>void;type?:string;icon?:any})=><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3 [&>input]:w-full [&>input]:bg-transparent [&>input]:py-3 [&>input]:outline-none [&>input]:text-sm [&>svg]:text-neutral-500">{Icon&&<Icon size={14}/>}<input type={type} value={value} onChange={e=>onChange(e.target.value)}/></div>;
const Metric=({label,value,icon:Icon,tone='amber'}:{label:string;value:any;icon:any;tone?:string})=><div className="p-4 rounded-2xl border border-neutral-800 bg-[#0b1014]"><div className={`w-10 h-10 rounded-xl grid place-items-center ${tone==='emerald'?'bg-emerald-950 text-emerald-400':tone==='rose'?'bg-rose-950 text-rose-400':'bg-amber-950 text-amber-400'}`}><Icon size={18}/></div><div className="text-xl font-black mt-3">{value}</div><div className="text-[10px] text-neutral-500 mt-1">{label}</div></div>;
const Summary=({label,value,tone}:{label:string;value:string;tone:string})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between"><span className="text-xs text-neutral-400">{label}</span><b className={tone==='emerald'?'text-emerald-400':tone==='sky'?'text-sky-400':'text-amber-400'}>{value}</b></div>;
const Status=({value}:{value:string})=>{const tone=statusTone(String(value));return <span className={`px-2 py-1 rounded-full border text-[9px] font-black ${tone==='emerald'?'border-emerald-800 bg-emerald-950/30 text-emerald-300':tone==='rose'?'border-rose-800 bg-rose-950/30 text-rose-300':'border-amber-800 bg-amber-950/30 text-amber-300'}`}>{value}</span>};
const ReferralTable=({rows}:{rows:any[]})=><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead className="text-neutral-500"><tr><th className="p-2 text-left">Cliente</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-left">Origem</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Pagamento</th><th className="p-2 text-right">Venda</th><th className="p-2 text-left">Data</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id} className="border-t border-neutral-800"><td className="p-2"><b>{r.lead_name||'Lead sem nome'}</b><div className="text-[9px] text-neutral-600">{r.lead_email||r.lead_phone||'—'}</div></td><td className="p-2">{r.referral_type}</td><td className="p-2 text-neutral-400">{r.source||'—'}</td><td className="p-2"><Status value={r.status}/></td><td className="p-2"><Status value={r.customer_payment_status}/></td><td className="p-2 text-right">{money(r.converted_value||r.estimated_value)}</td><td className="p-2">{dt(r.created_at)}</td></tr>)}</tbody></table></div>;
const Info=({l,v}:{l:string;v:any})=><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">{l}</div><div className="text-sm font-bold mt-1">{v||'—'}</div></div>;
