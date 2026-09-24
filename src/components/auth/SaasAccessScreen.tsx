import React, { useState } from 'react';
import {
  ArrowRight, BarChart3, Boxes, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, Phone, ShieldCheck, ShoppingCart, Sparkles, Store, UserRound, WalletCards
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { LegalCenter } from '../legal/LegalCenter';
import { LEGAL_DOCS, LegalDocKey } from '../../legal/legalDocuments';

type View = 'LANDING' | 'LOGIN' | 'REGISTER';

interface SaasAccessScreenProps {
  onDemo: () => void;
  onAuthenticated: () => void;
  initialView?: View;
}

type RegisterForm = {
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  whatsapp: string;
  city: string;
  state: string;
  accepted: boolean;
};

const emptyRegister: RegisterForm = {
  ownerName: '', email: '', phone: '', password: '', confirmPassword: '',
  legalName: '', tradeName: '', cnpj: '', whatsapp: '', city: '', state: '', accepted: false
};

export const SaasAccessScreen: React.FC<SaasAccessScreenProps> = ({ onDemo, onAuthenticated, initialView = 'LANDING' }) => {
  const [view, setView] = useState<View>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState<RegisterForm>(emptyRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{type:'error'|'success'; text:string}|null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);

  const checkRateLimit = async (action: 'login'|'signup'|'recovery', identifier: string) => {
    const { data, error } = await supabase.functions.invoke('auth-rate-limit', {
      body: { action, identifier: identifier.trim().toLowerCase() }
    });
    if (error) throw new Error('Proteção de acesso temporariamente indisponível. Tente novamente em instantes.');
    if (data && data.allowed === false) {
      const minutes = Math.max(1, Math.ceil((data.retry_after_seconds || 60) / 60));
      throw new Error(`Muitas tentativas. Aguarde aproximadamente ${minutes} minuto(s) antes de tentar novamente.`);
    }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await checkRateLimit('login', email);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      const pendingRaw = localStorage.getItem('adega_pro_pending_onboarding');
      if (pendingRaw) {
        try {
          const storeData = JSON.parse(pendingRaw);
          const { error: bootstrapError } = await supabase.rpc('bootstrap_adega', { store_data: storeData });
          if (bootstrapError && !String(bootstrapError.message).includes('already linked')) throw bootstrapError;
          localStorage.removeItem('adega_pro_pending_onboarding');
        } catch (bootstrapErr) {
          console.error('Falha ao concluir onboarding:', bootstrapErr);
          throw bootstrapErr;
        }
      }

      onAuthenticated();
    } catch (err:any) {
      setMessage({ type:'error', text: err?.message || 'Não foi possível entrar. Confira seus dados.' });
    } finally { setBusy(false); }
  };

  const registerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!register.ownerName.trim() || !register.email.trim() || !register.tradeName.trim() || !register.legalName.trim()) {
      setMessage({type:'error', text:'Preencha os campos obrigatórios do responsável e da adega.'}); return;
    }
    if (register.password.length < 8) {
      setMessage({type:'error', text:'Use uma senha com pelo menos 8 caracteres.'}); return;
    }
    if (register.password !== register.confirmPassword) {
      setMessage({type:'error', text:'As senhas não conferem.'}); return;
    }
    if (!register.accepted) {
      setMessage({type:'error', text:'É necessário aceitar os termos para criar a conta.'}); return;
    }

    setBusy(true);
    try {
      await checkRateLimit('signup', register.email);
      const { data, error } = await supabase.auth.signUp({
        email: register.email.trim(),
        password: register.password,
        options: {
          data: {
            full_name: register.ownerName.trim(),
            phone: register.phone.trim(),
            product: 'ADEGA PRO'
          }
        }
      });
      if (error) throw error;

      const onboarding = {
        legal_name: register.legalName.trim(),
        trade_name: register.tradeName.trim(),
        cnpj: register.cnpj.trim(),
        phone: register.phone.trim(),
        whatsapp: register.whatsapp.trim(),
        email: register.email.trim(),
        city: register.city.trim(),
        state: register.state.trim()
      };
      localStorage.setItem('adega_pro_pending_onboarding', JSON.stringify(onboarding));

      if (data.session) {
        const { error: bootstrapError } = await supabase.rpc('bootstrap_adega', { store_data: onboarding });
        if (bootstrapError && !String(bootstrapError.message).includes('already linked')) throw bootstrapError;
        localStorage.removeItem('adega_pro_pending_onboarding');
        onAuthenticated();
      } else {
        setMessage({
          type:'success',
          text:'Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre para concluir o cadastro da adega.'
        });
        setView('LOGIN');
        setEmail(register.email);
      }
    } catch (err:any) {
      setMessage({type:'error', text: err?.message || 'Não foi possível criar sua conta.'});
    } finally { setBusy(false); }
  };

  const recover = async () => {
    if (!email.trim()) {
      setMessage({type:'error', text:'Informe seu e-mail para recuperar a senha.'}); return;
    }
    setBusy(true); setMessage(null);
    try {
      await checkRateLimit('recovery', email);
    } catch (err:any) {
      setBusy(false);
      setMessage({type:'error', text:err?.message || 'Muitas solicitações. Tente novamente mais tarde.'});
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin
    });
    setBusy(false);
    setMessage(error
      ? {type:'error', text:error.message}
      : {type:'success', text:'Enviamos o link de recuperação para seu e-mail.'});
  };

  if (legalDoc) {
    return <LegalCenter active={legalDoc} onSelect={setLegalDoc} onBack={() => setLegalDoc(null)} />;
  }

  const Feature = ({icon:Icon,title,desc}:{icon:any;title:string;desc:string}) => (
    <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800/80">
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400 mb-3"><Icon size={18}/></div>
      <div className="text-sm font-black text-white">{title}</div>
      <div className="text-xs text-neutral-400 mt-1 leading-relaxed">{desc}</div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-neutral-950 text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(120,53,15,0.16),transparent_30%)]"/>
      <header className="relative z-10 px-5 sm:px-8 py-5 max-w-7xl mx-auto flex items-center justify-between gap-4">
        <button onClick={() => setView('LANDING')} className="flex items-center gap-3 text-left">
          <img src="/adega-pro-icon.jpg" alt="Adega Pro" className="w-11 h-11 rounded-xl object-cover border border-amber-500/30"/>
          <div>
            <div className="font-black tracking-tight">ADEGA <span className="text-amber-400">PRO</span></div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-[.18em]">Gestão para adegas e conveniências</div>
          </div>
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <button onClick={() => setView('LOGIN')} className="px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white">Entrar</button>
          <button onClick={() => setView('REGISTER')} className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black">Criar minha conta</button>
        </div>
      </header>

      {view === 'LANDING' && (
        <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-14">
          <section className="grid lg:grid-cols-[1.12fr_.88fr] gap-10 items-center min-h-[68vh]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-6">
                <Sparkles size={13}/> Plataforma completa para operação de loja
              </div>
              <h1 className="text-3xl min-[420px]:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02] max-w-3xl">
                Controle sua adega com <span className="text-amber-400">PDV, estoque e financeiro</span> no mesmo lugar.
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mt-6 leading-relaxed">
                Adega Pro organiza vendas, caixas, produtos, compras, fornecedores, clientes, permissões e relatórios em uma operação única, segura e preparada para crescer.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button onClick={() => setView('REGISTER')} className="px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-950/30">
                  Cadastrar minha adega <ArrowRight size={17}/>
                </button>
                <button onClick={() => setView('LOGIN')} className="px-5 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 font-bold text-sm">
                  Já tenho conta
                </button>
                <button onClick={onDemo} className="px-5 py-3.5 rounded-xl bg-violet-950/50 hover:bg-violet-900/60 border border-violet-700/60 text-violet-200 font-black text-sm">
                  Ver demonstração
                </button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400"/> Dados isolados por empresa</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400"/> Controle de permissões</span>
                <span className="flex items-center gap-1.5"><LockKeyhole size={13} className="text-emerald-400"/> Operadores com bloqueio interno</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-10 bg-amber-500/10 blur-3xl rounded-full"/>
              <div className="relative p-5 sm:p-6 rounded-[28px] bg-neutral-900/85 border border-neutral-800 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div><div className="text-xs text-neutral-500">Visão geral</div><div className="text-lg font-black">Operação em tempo real</div></div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-300 bg-emerald-950 border border-emerald-800">ONLINE</span>
                </div>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                  <Feature icon={ShoppingCart} title="PDV rápido" desc="Venda, desconto, múltiplos pagamentos e comprovante."/>
                  <Feature icon={Boxes} title="Estoque" desc="Kardex, inventário, mínimos, perdas e compras."/>
                  <Feature icon={WalletCards} title="Financeiro" desc="Contas, caixa, fiado, fluxo e indicadores."/>
                  <Feature icon={BarChart3} title="Gestão" desc="DRE, relatórios, auditoria e permissões."/>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === 'LOGIN' && (
        <main className="relative z-10 max-w-md mx-auto px-5 pt-12 pb-20">
          <div className="p-4 sm:p-7 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
            <div className="mb-6"><h1 className="text-2xl font-black">Entrar no Adega Pro</h1><p className="text-sm text-neutral-400 mt-1">Acesse a conta principal da sua empresa.</p></div>
            {message && <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type==='error'?'bg-rose-950/40 border-rose-800 text-rose-300':'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>{message.text}</div>}
            <form onSubmit={login} className="space-y-4">
              <label className="block"><span className="text-xs font-bold text-neutral-300">E-mail</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><Mail size={16} className="text-neutral-500"/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="email" className="w-full bg-transparent py-3 outline-none text-sm" placeholder="voce@empresa.com.br"/></div></label>
              <label className="block"><span className="text-xs font-bold text-neutral-300">Senha</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><LockKeyhole size={16} className="text-neutral-500"/><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} required autoComplete="current-password" className="w-full bg-transparent py-3 outline-none text-sm"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-neutral-500">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
              <div className="flex items-center justify-between text-xs"><button type="button" onClick={recover} className="text-amber-400 hover:text-amber-300">Esqueci minha senha</button><button type="button" onClick={()=>setView('REGISTER')} className="text-neutral-400 hover:text-white">Criar conta</button></div>
              <button disabled={busy} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm">{busy?'Entrando...':'Entrar com segurança'}</button>
            </form>
          </div>
        </main>
      )}

      {view === 'REGISTER' && (
        <main className="relative z-10 max-w-4xl mx-auto px-5 pt-5 pb-16">
          <div className="p-5 sm:p-7 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
            <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-black">Cadastre sua adega</h1><p className="text-sm text-neutral-400 mt-1">Crie a conta principal e separe a identidade da sua loja da marca Adega Pro.</p></div>
            {message && <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type==='error'?'bg-rose-950/40 border-rose-800 text-rose-300':'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>{message.text}</div>}
            <form onSubmit={registerAccount} className="space-y-6">
              <section><h2 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">Responsável pela conta</h2><div className="grid sm:grid-cols-2 gap-3">
                <Field icon={UserRound} label="Nome completo *" value={register.ownerName} onChange={v=>setRegister({...register,ownerName:v})}/>
                <Field icon={Mail} label="E-mail *" type="email" value={register.email} onChange={v=>setRegister({...register,email:v})}/>
                <Field icon={Phone} label="Telefone" value={register.phone} onChange={v=>setRegister({...register,phone:v})}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Field icon={LockKeyhole} label="Senha *" type="password" value={register.password} onChange={v=>setRegister({...register,password:v})}/><Field icon={LockKeyhole} label="Confirmar *" type="password" value={register.confirmPassword} onChange={v=>setRegister({...register,confirmPassword:v})}/></div>
              </div></section>
              <section><h2 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">Dados da adega</h2><div className="grid sm:grid-cols-2 gap-3">
                <Field icon={Store} label="Razão social *" value={register.legalName} onChange={v=>setRegister({...register,legalName:v})}/>
                <Field icon={Store} label="Nome fantasia *" value={register.tradeName} onChange={v=>setRegister({...register,tradeName:v})}/>
                <Field label="CNPJ" value={register.cnpj} onChange={v=>setRegister({...register,cnpj:v})}/>
                <Field icon={Phone} label="WhatsApp da loja" value={register.whatsapp} onChange={v=>setRegister({...register,whatsapp:v})}/>
                <Field label="Cidade" value={register.city} onChange={v=>setRegister({...register,city:v})}/>
                <Field label="UF" value={register.state} onChange={v=>setRegister({...register,state:v.toUpperCase().slice(0,2)})}/>
              </div></section>
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 space-y-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={register.accepted} onChange={e=>setRegister({...register,accepted:e.target.checked})} className="mt-0.5"/>
                  <span>
                    Declaro que os dados são verdadeiros e que li e concordo com os documentos contratuais vigentes do ADEGA PRO. O aceite definitivo será registrado de forma versionada após a autenticação.
                  </span>
                </label>
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px]">
                  {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => (
                    <button key={key} type="button" onClick={() => setLegalDoc(key)} className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      {LEGAL_DOCS[key].shortTitle}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3"><button disabled={busy} className="sm:flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black">{busy?'Criando conta...':'Criar conta e cadastrar adega'}</button><button type="button" onClick={()=>setView('LOGIN')} className="px-5 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-sm font-bold">Já tenho conta</button></div>
            </form>
          </div>
        </main>
      )}

      <footer className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-5 border-t border-neutral-900 text-[11px] text-neutral-500 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between w-full">
          <span>© {new Date().getFullYear()} ADEGA PRO · Software de gestão.</span>
          <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="hover:text-amber-400">ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME · CNPJ 57.514.866/0001-38 · atrstudio.com.br</a>
        </div>
        <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1">
          {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => (
            <button key={key} type="button" onClick={() => setLegalDoc(key)} className="hover:text-amber-400">
              {LEGAL_DOCS[key].shortTitle}
            </button>
          ))}
          <span>· atrstudiodesign@gmail.com · +55 11 93902-6928</span>
        </div>
      </footer>
    </div>
  );
};

const Field = ({label,value,onChange,type='text',icon:Icon}:{label:string;value:string;onChange:(v:string)=>void;type?:string;icon?:any}) => (
  <label className="block"><span className="text-xs font-bold text-neutral-300">{label}</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3">{Icon && <Icon size={15} className="text-neutral-500"/>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" /></div></label>
);
