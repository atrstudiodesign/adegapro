import React, { useState } from 'react';
import {
  ArrowRight, BarChart3, Boxes, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, Phone, ShieldCheck, ShoppingCart, Sparkles, Store, UserRound, WalletCards,
  PackageCheck, TrendingUp, Truck, CreditCard, Smartphone, Zap, BadgeCheck
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
      <header className="relative z-20 border-b border-white/5 bg-black/65 backdrop-blur-xl sticky top-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          <button onClick={() => setView('LANDING')} className="flex items-center gap-3 text-left">
            <img src="/adega-pro-logo.jpg" alt="ADEGA PRO" className="h-11 w-auto max-w-[190px] object-contain rounded-lg"/>
          </button>
          <nav className="hidden lg:flex items-center gap-7 text-[12px] font-bold text-neutral-400">
            <a href="#recursos" className="hover:text-amber-400 transition-colors">Recursos</a>
            <a href="#produtos" className="hover:text-amber-400 transition-colors">Produtos</a>
            <a href="#integracoes" className="hover:text-amber-400 transition-colors">Integrações</a>
            <a href="#planos" className="hover:text-amber-400 transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('LOGIN')} className="hidden sm:block px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white">Entrar</button>
            <button onClick={() => setView('REGISTER')} className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-neutral-950 text-xs font-black shadow-lg shadow-amber-950/30">Comece agora</button>
          </div>
        </div>
      </header>

      {view === 'LANDING' && (
        <main className="relative z-10">
          <section className="relative overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,.12),transparent_28%),radial-gradient(circle_at_82%_35%,rgba(127,29,29,.12),transparent_30%)]"/>
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid xl:grid-cols-[.92fr_1.08fr] gap-10 items-center relative">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-[.15em] mb-5">
                  <Sparkles size={13}/> Plataforma completa para operação de loja
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-[-.04em] leading-[.98]">
                  Sua adega mais organizada, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500">lucrativa e no controle.</span>
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base mt-6 leading-relaxed max-w-xl">
                  PDV, estoque, compras, clientes, financeiro, relatórios, vendas online e integrações em uma experiência única para sua operação.
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <button onClick={() => setView('REGISTER')} className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-950/30">
                    Cadastrar minha adega <ArrowRight size={17}/>
                  </button>
                  <button onClick={onDemo} className="px-5 py-3.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-700/50 text-violet-200 font-black text-sm">
                    Ver demonstração
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-6 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400"/> Dados isolados</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400"/> Permissões por operador</span>
                  <span className="flex items-center gap-1.5"><LockKeyhole size={13} className="text-emerald-400"/> Operação segura</span>
                </div>
              </div>

              <div className="relative min-h-[520px] lg:min-h-[600px]">
                <div className="absolute inset-8 bg-amber-500/10 blur-[90px] rounded-full"/>
                <div className="absolute right-0 top-0 w-[92%] rounded-[28px] border border-white/10 bg-[#111]/95 shadow-2xl shadow-black/80 overflow-hidden">
                  <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="font-black text-white">ADEGA <span className="text-amber-400">PRO</span></span>
                    <span className="px-2 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">ONLINE</span>
                  </div>
                  <div className="p-4 grid grid-cols-[110px_1fr] gap-4">
                    <div className="space-y-2 text-[10px] text-neutral-500 border-r border-white/5 pr-3">
                      {['Dashboard','PDV','Estoque','Compras','Clientes','Financeiro','Produtos','Relatórios','Integrações'].map((x,i)=><div key={x} className={`px-2 py-2 rounded-lg ${i===0?'bg-amber-500/10 text-amber-300 border border-amber-500/20':''}`}>{x}</div>)}
                    </div>
                    <div>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                        {[['Vendas hoje','R$ 2.845,30','+12%'],['Pedidos','48','+8%'],['Clientes','892','+6%'],['Ticket médio','R$ 59,28','+5%']].map(([l,v,p])=><div key={l} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[9px] text-neutral-500">{l}</div><div className="font-black text-sm mt-1">{v}</div><div className="text-[9px] text-emerald-400 mt-1">{p}</div></div>)}
                      </div>
                      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-3 mt-3">
                        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 h-48">
                          <div className="text-[10px] text-neutral-400 mb-5">Vendas dos últimos 7 dias</div>
                          <div className="h-28 flex items-end gap-2">
                            {[34,55,42,68,73,88,100].map((h,i)=><div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-700 to-amber-300" style={{height:`${h}%`}}/>)}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                          <div className="text-[10px] text-neutral-400 mb-3">Canais de venda</div>
                          {[['PDV / Balcão','62%','bg-amber-500'],['iFood / Delivery','26%','bg-red-500'],['Site próprio','8%','bg-violet-500'],['Outros','4%','bg-neutral-600']].map(([l,v,b])=><div key={l} className="mb-3"><div className="flex justify-between text-[9px]"><span>{l}</span><span>{v}</span></div><div className="h-1.5 mt-1 rounded-full bg-neutral-800 overflow-hidden"><div className={`h-full ${b}`} style={{width:v}}/></div></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute left-0 bottom-0 w-[78%] rounded-[24px] border border-white/10 bg-[#0d0d0d]/98 shadow-2xl overflow-hidden rotate-[-1deg]">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between"><span className="text-xs font-black">PDV · Venda rápida</span><span className="text-[9px] text-neutral-500">Produtos estilo e-commerce</span></div>
                  <div className="p-3 grid grid-cols-[1fr_150px] gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['Cerveja Premium','R$ 6,90','from-emerald-900 to-emerald-500'],
                        ['Whisky Gold','R$ 129,90','from-amber-950 to-amber-500'],
                        ['Vodka Ice','R$ 59,90','from-sky-950 to-sky-400'],
                        ['Gin London','R$ 74,90','from-cyan-950 to-cyan-400'],
                        ['Energético','R$ 12,00','from-blue-950 to-blue-500'],
                        ['Combo Festa','R$ 49,90','from-rose-950 to-rose-500']
                      ].map(([name,price,grad])=><div key={name} className="rounded-xl bg-neutral-950 border border-neutral-800 p-2">
                        <div className={`h-16 rounded-lg bg-gradient-to-br ${grad} relative overflow-hidden`}><div className="absolute inset-x-[38%] top-2 bottom-2 rounded-t-md rounded-b-xl bg-white/70 shadow-lg"/><div className="absolute inset-x-[42%] top-0 h-3 rounded-sm bg-white/90"/></div>
                        <div className="text-[9px] font-bold mt-2 truncate">{name}</div><div className="text-[10px] font-black text-amber-400">{price}</div>
                      </div>)}
                    </div>
                    <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3 flex flex-col">
                      <div className="text-[9px] text-neutral-500">Carrinho</div>
                      <div className="mt-2 space-y-2 text-[9px]"><div className="flex justify-between"><span>Whisky Gold</span><span>1×</span></div><div className="flex justify-between"><span>Energético</span><span>2×</span></div></div>
                      <div className="mt-auto pt-3 border-t border-neutral-800"><div className="flex justify-between text-xs font-black"><span>Total</span><span>R$ 153,90</span></div><div className="mt-2 py-2 text-center rounded-lg bg-emerald-600 text-[9px] font-black">Finalizar venda</div></div>
                    </div>
                  </div>
                </div>

                <div className="absolute right-0 bottom-16 w-44 p-4 rounded-2xl bg-gradient-to-br from-red-950/95 to-red-700/90 border border-red-500/30 shadow-xl rotate-[2deg]">
                  <div className="text-2xl font-black italic">iFood</div>
                  <div className="text-[10px] font-bold mt-2">Integração preparada</div>
                  <div className="text-[9px] text-red-100/70 mt-1">Pedidos, cardápio e catálogo em um fluxo centralizado após homologação.</div>
                </div>
              </div>
            </div>
          </section>

          <section id="recursos" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center max-w-2xl mx-auto"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Operação completa</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Do balcão ao financeiro.</h2><p className="text-sm text-neutral-500 mt-3">Um único painel para vender, comprar, controlar estoque, acompanhar clientes e decidir com dados.</p></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-9">
              <Feature icon={ShoppingCart} title="PDV rápido" desc="Venda, desconto, múltiplos pagamentos e comprovante."/>
              <Feature icon={Boxes} title="Estoque em tempo real" desc="Kardex, inventário, mínimos, lotes, validade e compras."/>
              <Feature icon={Truck} title="Compras inteligentes" desc="Entrada por nota, fornecedores, custos e histórico de preços."/>
              <Feature icon={WalletCards} title="Financeiro completo" desc="Caixa, contas, fiado, fluxo e indicadores gerenciais."/>
              <Feature icon={PackageCheck} title="Produtos & combos" desc="Catálogo visual, preços, combos e margem de venda."/>
              <Feature icon={UserRound} title="Clientes & fiado" desc="Cadastro, limite, histórico e cobrança organizada."/>
              <Feature icon={BarChart3} title="Relatórios" desc="Vendas, desempenho, auditoria e visão da operação."/>
              <Feature icon={ShieldCheck} title="Segurança" desc="Multiempresa, operadores, permissões e trilha de auditoria."/>
            </div>
          </section>

          <section id="produtos" className="border-y border-white/5 bg-neutral-950/60">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[.85fr_1.15fr] gap-10 items-center">
              <div><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Catálogo visual</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Produtos com experiência de e-commerce.</h2><p className="text-sm text-neutral-400 mt-4 leading-relaxed">Visualize itens com imagem, preço, estoque, categoria e disponibilidade. O mesmo catálogo pode alimentar PDV, vendas online e futuras integrações de delivery.</p><div className="mt-6 space-y-3 text-sm text-neutral-300"><div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> Busca rápida por nome, SKU ou código de barras</div><div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> Preço e estoque sincronizados com a operação</div><div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> Combos, promoções e controle de validade</div></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Cerveja Long Neck','R$ 7,50','Estoque 124','from-emerald-950 to-emerald-500'],
                  ['Whisky Reserve','R$ 129,90','Estoque 38','from-amber-950 to-amber-500'],
                  ['Vodka Premium','R$ 89,90','Estoque 56','from-sky-950 to-sky-400'],
                  ['Gin London Dry','R$ 74,90','Estoque 41','from-cyan-950 to-cyan-400'],
                  ['Energético 250ml','R$ 12,00','Estoque 98','from-blue-950 to-blue-500'],
                  ['Combo Happy Hour','R$ 49,90','Disponível','from-rose-950 to-rose-500']
                ].map(([name,price,stock,grad])=><div key={name} className="group p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 transition-all"><div className={`h-32 sm:h-40 rounded-xl bg-gradient-to-br ${grad} relative overflow-hidden`}><div className="absolute inset-x-[40%] top-6 bottom-5 rounded-t-lg rounded-b-2xl bg-white/75 group-hover:scale-105 transition-transform"/><div className="absolute inset-x-[44%] top-3 h-5 rounded bg-white/90"/></div><div className="mt-3 text-xs font-black">{name}</div><div className="flex items-end justify-between gap-2 mt-1"><span className="text-amber-400 font-black">{price}</span><span className="text-[9px] text-neutral-500">{stock}</span></div></div>)}
              </div>
            </div>
          </section>

          <section id="integracoes" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-10 items-center">
              <div><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Ecossistema conectado</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Pagamentos, delivery e automações preparados para integração.</h2><p className="text-sm text-neutral-400 mt-4 leading-relaxed">O ADEGA PRO possui base de webhooks e conectores para integrar provedores reais. Cada integração é ativada somente após configuração e homologação do estabelecimento.</p></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[['iFood','Delivery e catálogo','bg-red-600',Smartphone],['Asaas','PIX, cobrança e recorrência','bg-blue-700',CreditCard],['PagSeguro','Cartão e pagamentos','bg-emerald-700',CreditCard],['Mercado Pago','PIX e pagamentos digitais','bg-sky-700',Zap]].map(([name,desc,bg,I]:any)=><div key={name} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-4"><div className={`w-11 h-11 rounded-xl ${bg} grid place-items-center text-white font-black`}><I size={19}/></div><div><div className="font-black">{name}</div><div className="text-[10px] text-neutral-500 mt-1">{desc}</div><div className="text-[9px] text-amber-400 mt-2 uppercase font-bold">Integração sob configuração</div></div></div>)}
              </div>
            </div>
          </section>

          <section id="planos" className="border-t border-white/5 bg-gradient-to-b from-neutral-950 to-black">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Planos</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Comece com uma operação profissional.</h2></div>
              <div className="grid md:grid-cols-2 gap-4 mt-9">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-red-950/70 to-neutral-900 border border-red-800/50"><div className="text-xs font-black uppercase tracking-[.2em] text-red-200">Assinatura mensal</div><div className="mt-4 text-5xl font-black">R$ 149<span className="text-2xl">,90</span><span className="text-sm text-neutral-400">/mês</span></div><div className="mt-5 text-xs text-neutral-300 space-y-2">{['PDV completo','Estoque e compras','Clientes e fiado','Financeiro e relatórios','Atualizações constantes','Suporte especializado'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400"/>{x}</div>)}</div><button onClick={()=>setView('REGISTER')} className="mt-6 w-full py-3.5 rounded-xl bg-white text-neutral-950 font-black text-sm">Começar agora</button></div>
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/50 to-neutral-900 border border-amber-700/40"><div className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Implantação personalizada</div><div className="mt-4 text-sm text-neutral-400">a partir de</div><div className="text-5xl font-black text-amber-300">R$ 990</div><div className="mt-5 text-xs text-neutral-300 space-y-2">{['Configuração da operação','Identidade da adega','Ajustes específicos','Treinamento e implantação','Integrações orçadas separadamente'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 size={14} className="text-amber-400"/>{x}</div>)}</div><a href="https://wa.me/5511939026928?text=Olá%2C%20quero%20saber%20mais%20sobre%20a%20implantação%20do%20ADEGA%20PRO." target="_blank" rel="noreferrer" className="mt-6 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2">Falar no WhatsApp <ArrowRight size={16}/></a></div>
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
          <span>CNPJ 57.514.866/0001-38 · <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="hover:text-amber-400">atrstudio.com.br</a></span>
        </div>
        <div className="flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1">
          {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => (
            <button key={key} type="button" onClick={() => setLegalDoc(key)} className="hover:text-amber-400">
              {LEGAL_DOCS[key].shortTitle}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};

const Field = ({label,value,onChange,type='text',icon:Icon}:{label:string;value:string;onChange:(v:string)=>void;type?:string;icon?:any}) => (
  <label className="block"><span className="text-xs font-bold text-neutral-300">{label}</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3">{Icon && <Icon size={15} className="text-neutral-500"/>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" /></div></label>
);
