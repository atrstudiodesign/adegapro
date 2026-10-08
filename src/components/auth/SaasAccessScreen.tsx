import { startPublicVisitTracking } from '../../services/publicVisitTracking';
import { TestimonialsSection, Testimonial } from './TestimonialsSection';
import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  ArrowRight, BarChart3, Boxes, CheckCircle2, Eye, EyeOff, LockKeyhole,
  Mail, Phone, ShieldCheck, ShoppingCart, Sparkles, Store, UserRound, WalletCards, PlayCircle,
  PackageCheck, TrendingUp, Truck, CreditCard, Smartphone, Zap, BadgeCheck, Gift, UserPlus, Handshake, Banknote, FileCheck2, Database, KeyRound
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { platformDb } from '../../services/platformDb';
import { LegalCenter } from '../legal/LegalCenter';
import { LEGAL_DOCS, LegalDocKey } from '../../legal/legalDocuments';
import { LoyaltyReferralPolicyPage } from './LoyaltyReferralPolicyPage';
import { AcquisitionCampaign, CampaignLandingCTA, CampaignPopup, ACQUISITION_CAMPAIGN, CampaignChoice, campaignIsOpen } from './AcquisitionCampaign';
import { PWAInstallButton } from '../common/PWAInstallButton';

type View = 'LANDING' | 'LOGIN' | 'REGISTER' | 'POLICY' | 'PROMOTION' | 'RESET_PASSWORD';

const isPasswordRecoveryUrl = () => {
  const queryType = new URLSearchParams(window.location.search).get('type');
  const hashType = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');
  return queryType === 'recovery' || hashType === 'recovery';
};

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
  const [testimonials,setTestimonials]=useState<Testimonial[]>([]);
  useEffect(()=>{void platformDb.getLandingTestimonials().then(setTestimonials).catch(()=>setTestimonials([]));},[]);
  const [landingCms, setLandingCms] = useState<any>(null);
  useEffect(() => { void platformDb.getLandingPageContent().then(setLandingCms).catch(() => setLandingCms(null)); }, []);
  const heroImage = landingCms?.hero?.image_url || '/adega-pro-hero.webp';
  const [view, setView] = useState<View>(() => {
    if (initialView === 'RESET_PASSWORD' || isPasswordRecoveryUrl()) return 'RESET_PASSWORD';
    if (window.location.pathname === '/entrar') return 'LOGIN';
    if (window.location.pathname === '/cadastro') return 'REGISTER';
    if (window.location.pathname === '/promocao') return 'PROMOTION';
    if (window.location.pathname === '/politica-fidelidade-indicacoes') return 'POLICY';
    return initialView;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [register, setRegister] = useState<RegisterForm>(emptyRegister);
  const [campaignChoice, setCampaignChoice] = useState<CampaignChoice>('STANDARD');
  const [campaignAccepted, setCampaignAccepted] = useState(false);
  const [showCampaignPopup, setShowCampaignPopup] = useState(false);
  const dismissCampaignPopup = () => {
    setShowCampaignPopup(false);
    try { sessionStorage.setItem(`adega_pro_campaign_seen:${ACQUISITION_CAMPAIGN.id}`, '1'); } catch {}
  };
  const navigatePromotion = () => {
    dismissCampaignPopup();
    setView('PROMOTION');
    window.history.pushState({}, '', '/promocao');
    window.scrollTo({ top: 0 });
  };
  const chooseCampaign = (choice: CampaignChoice) => {
    navigateView('REGISTER', choice);
    window.scrollTo({ top: 0 });
  };
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{type:'error'|'success'; text:string}|null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);
  const [referralCode] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || localStorage.getItem('adega_pro_referral_code') || '';
    if (code) localStorage.setItem('adega_pro_referral_code', code);
    return code;
  });

  const navigateMarketing = (path: '/recursos'|'/produtos'|'/integracoes'|'/planos') => {
    setView('LANDING');
    window.history.pushState({}, '', path);
    const id = path.slice(1);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ));
  };

  const navigateView = (next: View, selection: CampaignChoice = 'STANDARD') => {
    if (next === 'REGISTER') {
      setCampaignChoice(selection);
      setCampaignAccepted(false);
    }
    setView(next);
    dismissCampaignPopup();
    const path = next === 'LOGIN' ? '/entrar' : next === 'REGISTER' ? '/cadastro' : next === 'PROMOTION' ? '/promocao' : '/';
    window.history.pushState({}, '', path);
    if (next === 'LANDING') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncFromPath = () => {
      if (initialView === 'RESET_PASSWORD' || isPasswordRecoveryUrl()) {
        setView('RESET_PASSWORD');
        return;
      }
      const path = window.location.pathname;
      if (path === '/entrar') { setView('LOGIN'); return; }
      if (path === '/cadastro') { setView('REGISTER'); return; }
      if (path === '/promocao') { setView('PROMOTION'); return; }
      if (path === '/politica-fidelidade-indicacoes') { setView('POLICY'); return; }
      if (initialView === 'LOGIN' && path === '/') { setView('LOGIN'); return; }
      setView('LANDING');
      const section = ['recursos','produtos','integracoes','planos'].find(x => path === '/' + x);
      if (section) requestAnimationFrame(() => requestAnimationFrame(() =>
        document.getElementById(section)?.scrollIntoView({ block: 'start' })
      ));
    };
    syncFromPath();
    window.addEventListener('popstate', syncFromPath);
    return () => window.removeEventListener('popstate', syncFromPath);
  }, [initialView]);

  useEffect(() => {
    if (view !== 'LANDING' || !['/', '/inicio'].includes(window.location.pathname) || !campaignIsOpen()) return;
    try { if (sessionStorage.getItem(`adega_pro_campaign_seen:${ACQUISITION_CAMPAIGN.id}`)) return; } catch {}
    const timer = window.setTimeout(() => {
      if (!campaignIsOpen()) return;
      setShowCampaignPopup(true);
      try { sessionStorage.setItem(`adega_pro_campaign_seen:${ACQUISITION_CAMPAIGN.id}`, '1'); } catch {}
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    if (view !== 'PROMOTION') return;
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'Promoção ADEGA PRO — 15 novos clientes até 01/01/2027';
    if (description) description.content = 'Conheça a campanha ADEGA PRO: descontos para 15 novos clientes até 01/01/2027. Confira preços, cronograma, teste e política detalhada.';
    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
    };
  }, [view]);

  useEffect(() => {
    if (view !== 'LANDING' && view !== 'PROMOTION') return;
    return startPublicVisitTracking(window.location.pathname);
  }, [view]);

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

    if ((campaignChoice === 'MONTHLY' || campaignChoice === 'PERSONALIZED') && campaignIsOpen() && !campaignAccepted) {
      setMessage({type:'error', text:'Leia e aceite as condições da campanha selecionada.'}); return;
    }
    if ((campaignChoice === 'MONTHLY' || campaignChoice === 'PERSONALIZED') && !campaignIsOpen()) {
      setMessage({type:'error', text:'O prazo desta campanha terminou. Escolha o teste ou consulte as condições atuais.'}); return;
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
            product: 'ADEGA PRO',
            ...(campaignChoice === 'STANDARD' ? {} : { acquisition_request: {
              campaign_id: ACQUISITION_CAMPAIGN.id,
              version: ACQUISITION_CAMPAIGN.version,
              choice: campaignChoice,
              conditions_accepted: (campaignChoice === 'MONTHLY' || campaignChoice === 'PERSONALIZED') && campaignAccepted,
              requested_at: new Date().toISOString(),
              status: 'PENDING_COMMERCIAL_VALIDATION'
            } })
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
        state: register.state.trim(),
        referral_code: referralCode || undefined
      };
      localStorage.setItem('adega_pro_pending_onboarding', JSON.stringify(onboarding));

      if (data.session) {
        const { error: bootstrapError } = await supabase.rpc('bootstrap_adega', { store_data: onboarding });
        if (bootstrapError && !String(bootstrapError.message).includes('already linked')) throw bootstrapError;
        localStorage.removeItem('adega_pro_pending_onboarding');
        localStorage.removeItem('adega_pro_referral_code');
        onAuthenticated();
      } else {
        setMessage({
          type:'success',
          text:'Conta criada. Confirme o e-mail enviado pelo Supabase e depois entre para concluir o cadastro da adega.'
        });
        navigateView('LOGIN');
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
      redirectTo: `${window.location.origin}/entrar`
    });
    setBusy(false);
    setMessage(error
      ? {type:'error', text:error.message}
      : {type:'success', text:'Enviamos o link de recuperação para seu e-mail.'});
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Use uma senha com pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'As senhas não conferem.' });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      window.history.replaceState({}, '', '/entrar');
      onAuthenticated();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'O link expirou ou não foi possível atualizar a senha. Solicite um novo link.'
      });
    } finally {
      setBusy(false);
    }
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
      <Analytics />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(120,53,15,0.16),transparent_30%)]"/>
      <header className="relative z-20 border-b border-white/5 bg-black/65 backdrop-blur-xl sticky top-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          <button onClick={() => navigateView('LANDING')} className="flex items-center gap-3 text-left">
            <img src="/adega-pro-brand.svg" alt="ADEGA PRO" className="h-11 w-auto max-w-[190px] object-contain rounded-lg"/>
          </button>
          <nav className="hidden lg:flex items-center gap-7 text-[12px] font-bold text-neutral-400">
            <button type="button" onClick={() => navigateMarketing('/recursos')} className="hover:text-amber-400 transition-colors">Recursos</button>
            <button type="button" onClick={() => navigateMarketing('/produtos')} className="hover:text-amber-400 transition-colors">Produtos</button>
            <button type="button" onClick={() => navigateMarketing('/integracoes')} className="hover:text-amber-400 transition-colors">Integrações</button>
            <button type="button" onClick={() => navigateMarketing('/planos')} className="hover:text-amber-400 transition-colors">Planos</button>
            <button type="button" onClick={navigatePromotion} className="text-amber-300 hover:text-amber-200 transition-colors">Promoção</button>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden xl:block"><PWAInstallButton /></div>
            <button onClick={onDemo} className="hidden md:flex px-4 py-2.5 rounded-xl border border-amber-500/40 text-xs font-black text-amber-300 hover:bg-amber-500/10 items-center gap-2"><PlayCircle size={15}/>Demonstração</button>
            <button onClick={() => navigateView('LOGIN')} className="hidden sm:block px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white">Entrar</button>
            <button onClick={() => navigateView('REGISTER')} className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-neutral-950 text-xs font-black shadow-lg shadow-amber-950/30">Comece agora</button>
          </div>
        </div>
      </header>

      {view === 'PROMOTION' && <AcquisitionCampaign onChoose={chooseCampaign} onBack={() => navigateView('LANDING')} onReadPolicies={() => {setView('POLICY');window.history.pushState({}, '', '/politica-fidelidade-indicacoes');window.scrollTo({top:0});}}/>}

      {view === 'LANDING' && showCampaignPopup && <CampaignPopup onOpen={navigatePromotion} onClose={dismissCampaignPopup}/>}

      {view === 'POLICY' && (
        <LoyaltyReferralPolicyPage
          onBack={() => navigateView('LANDING')}
          onRegister={() => navigateView('REGISTER')}
        />
      )}

      {view === 'LANDING' && (
        <main className="relative z-10">
          <section className="relative border-b border-white/5 bg-black" aria-label="Apresentação ADEGA PRO">
            <div className="relative w-full mx-auto overflow-hidden">
              <picture className="block w-full">
                <source srcSet={heroImage} type="image/webp" />
                <img
                  src={heroImage}
                  alt="ADEGA PRO — sua adega mais organizada, lucrativa e no controle. PDV completo, estoque inteligente, financeiro em tempo real, clientes e fidelização."
                  className="block w-full h-auto select-none bg-neutral-950"
                  width="1400"
                  height="573"
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.parentElement?.parentElement?.classList.add('min-h-[420px]');
                  }}
                />
              </picture>
              <a
                href="https://wa.me/5511939026928?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20ADEGA%20PRO."
                target="_blank"
                rel="noreferrer"
                aria-label="Falar com a assessoria do ADEGA PRO pelo WhatsApp"
                className="hidden md:block absolute left-[3.7%] bottom-[2.2%] w-[24.7%] h-[11.7%] rounded-full focus:outline-none focus:ring-4 focus:ring-emerald-400/80"
              />
              <a
                href="https://atrstudio.com.br"
                target="_blank"
                rel="noreferrer"
                aria-label="Conhecer a ATR Studio"
                className="hidden md:block absolute left-[29.2%] bottom-[2.2%] w-[20.2%] h-[11.7%] rounded-full focus:outline-none focus:ring-4 focus:ring-amber-400/80"
              />
            </div>

            <div className="md:hidden px-4 py-4 grid gap-3 bg-neutral-950">
              <a
                href="https://wa.me/5511939026928?text=Ol%C3%A1%2C%20quero%20conhecer%20o%20ADEGA%20PRO."
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2"
              >
                <Phone size={17}/> Falar no WhatsApp
              </a>
              <button type="button" onClick={onDemo} className="w-full min-h-12 rounded-xl border border-amber-500/50 text-amber-300 font-black text-sm flex items-center justify-center gap-2"><PlayCircle size={17}/> Ver demonstração</button>
              <button
                type="button"
                onClick={() => navigateView('REGISTER')}
                className="w-full min-h-12 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2"
              >
                Começar agora <ArrowRight size={17}/>
              </button>
            </div>
          </section>

          <CampaignLandingCTA onOpen={navigatePromotion}/>

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

          <section className="border-y border-white/5 bg-gradient-to-br from-sky-950/20 via-neutral-950 to-violet-950/20">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px] font-black uppercase tracking-[.16em]">
                    <Sparkles size={13}/> IA & automação inteligente
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black mt-4">Venda melhor, promova no momento certo e reduza falhas operacionais.</h2>
                  <p className="text-sm text-neutral-400 mt-4 leading-relaxed">
                    O ADEGA PRO combina recomendações automáticas, ações comerciais sobre clientes e auditoria assistida para apoiar decisões no balcão e na gestão. A camada de IA generativa pode ser conectada de forma segura no backend, sem expor credenciais no navegador.
                  </p>
                  <button onClick={() => navigateView('REGISTER')} className="mt-6 px-5 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 text-white font-black text-sm flex items-center gap-2">
                    Quero usar recursos inteligentes <ArrowRight size={17}/>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <ShoppingCart size={20} className="text-amber-400"/>
                    <div className="font-black text-white mt-3">Sugestão na hora da venda</div>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Ajuda o operador a oferecer produtos complementares, combos e itens disponíveis em estoque para aumentar o ticket médio.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <TrendingUp size={20} className="text-emerald-400"/>
                    <div className="font-black text-white mt-3">Marketing sobre clientes e leads</div>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Crie promoções, reative clientes e envie recomendações personalizadas por WhatsApp usando os dados comerciais já cadastrados.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <ShieldCheck size={20} className="text-sky-400"/>
                    <div className="font-black text-white mt-3">Auditoria inteligente</div>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Destaca eventos com sinais de erro, bloqueio ou comportamento recorrente para facilitar a revisão antes que um problema operacional cresça.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <Sparkles size={20} className="text-violet-400"/>
                    <div className="font-black text-white mt-3">Assistência comercial com IA</div>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Estrutura preparada para integrar modelos de IA no backend e gerar campanhas, textos, análises e sugestões sem expor chaves ou dados sensíveis no frontend.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl border border-white/5 bg-black/20 text-[11px] text-neutral-500">
                Recursos inteligentes apoiam a operação e não substituem a conferência do operador em vendas, preços, estoque, promoções ou auditoria.
              </div>
            </div>
          </section>

          <section id="produtos" className="border-y border-white/5 bg-neutral-950/60">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[.78fr_1.22fr] gap-10 items-center">
              <div>
                <div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Sistema real</div>
                <h2 className="text-3xl sm:text-4xl font-black mt-2">Veja o ADEGA PRO funcionando de verdade.</h2>
                <p className="text-sm text-neutral-400 mt-4 leading-relaxed">Interface real do sistema: PDV, caixa, estoque, financeiro, clientes e operação centralizados. Sem mockups de produtos inventados nesta seção.</p>
                <div className="mt-6 space-y-3 text-sm text-neutral-300">
                  <div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> PDV completo e abertura de caixa</div>
                  <div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> Estoque e operação integrados</div>
                  <div className="flex gap-2"><BadgeCheck size={17} className="text-amber-400"/> Financeiro e indicadores em tempo real</div>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={onDemo} className="px-5 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-sm flex items-center gap-2"><PlayCircle size={17}/>Acessar demonstração</button>
                  <button onClick={() => navigateView('REGISTER')} className="px-5 py-3.5 rounded-xl border border-neutral-700 hover:border-amber-500/50 text-white font-black text-sm flex items-center gap-2">Começar agora <ArrowRight size={17}/></button>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-black shadow-2xl shadow-amber-950/20">
                <img
                  src={heroImage}
                  alt="Tela real do sistema ADEGA PRO com PDV, caixa e recursos de gestão"
                  className="block w-full h-auto"
                  loading="lazy"
                  decoding="async"
                />
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

          <section className="border-y border-white/5 bg-gradient-to-br from-amber-950/30 via-neutral-950 to-neutral-950">
            <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="grid lg:grid-cols-[.85fr_1.15fr] gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-[.16em]">
                    <Gift size={13}/> Programa de indicação
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black mt-4">Indicou. Ganhou.</h2>
                  <p className="text-sm text-neutral-400 mt-4 leading-relaxed">
                    Cliente ativo do ADEGA PRO pode registrar até 1 indicação elegível por mês e escolher um dos benefícios abaixo. Indicações não acumulam para meses seguintes.
                  </p>
                  <a
                    href="https://wa.me/5511939026928?text=Ol%C3%A1%2C%20sou%20cliente%20ativo%20do%20ADEGA%20PRO%20e%20quero%20participar%20do%20programa%20de%20indica%C3%A7%C3%A3o."
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-950/30"
                  >
                    <UserPlus size={17}/> Quero indicar um cliente
                  </a>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-[.18em] font-black">Opção 1</div>
                    <div className="mt-3 text-4xl font-black text-amber-400">30% OFF</div>
                    <div className="text-sm font-bold text-white mt-1">por 3 meses</div>
                    <p className="text-xs text-neutral-400 mt-4 leading-relaxed">
                      Desconto de 30% na assinatura do ADEGA PRO durante 3 meses.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/60 to-neutral-900 border border-amber-700/40">
                    <div className="text-[10px] text-amber-300 uppercase tracking-[.18em] font-black">Opção 2 · Personalizado</div>
                    <div className="mt-3 text-4xl font-black text-amber-300">40% OFF</div>
                    <div className="text-sm font-bold text-white mt-1">4 meses FREE + 6 meses com 50% OFF</div>
                    <p className="text-xs text-neutral-300 mt-4 leading-relaxed">
                      40% de desconto na implantação personalizada, 4 meses de assinatura FREE e depois 50% OFF na assinatura por mais 6 meses. Oferta vinculada à fidelidade de 12 meses e ao aceite específico das condições.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-black/30 border border-white/5 text-[11px] text-neutral-500">
                Benefício válido para cliente ativo mediante 1 indicação elegível por mês. Não cumulativo e separado do programa de vendedores autônomos.
              </div>
            </div>
          </section>

          <section className="border-y border-white/5 bg-neutral-900/30">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center">
              <div>
                <div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Programa de vendedores autônomos</div>
                <h2 className="text-3xl sm:text-4xl font-black mt-2">Indique o ADEGA PRO e receba por vendas elegíveis.</h2>
                <p className="text-sm text-neutral-400 mt-4 leading-relaxed">Programa independente de indicação comercial, com painel próprio, código individual, acompanhamento de leads e comissões. Não há vínculo empregatício, salário ou exclusividade; o pagamento depende das regras comerciais vigentes e da confirmação do primeiro pagamento do cliente.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <a href="/vendedor" className="px-5 py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2"><Handshake size={17}/> Área do vendedor</a>
                  <a href="https://wa.me/5511939026928?text=Ol%C3%A1%2C%20quero%20ser%20vendedor%20aut%C3%B4nomo%20do%20ADEGA%20PRO." target="_blank" rel="noreferrer" className="px-5 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 font-black text-sm flex items-center justify-center gap-2"><UserPlus size={17}/> Quero participar</a>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Feature icon={Banknote} title="Assinatura" desc="R$ 49 por mensalidade de R$ 149 paga; R$ 30 por mensalidade promocional de R$ 74,90 paga."/>
                <Feature icon={TrendingUp} title="Personalizado" desc="Comissão única: R$ 250 sobre R$ 990; R$ 150 sobre R$ 495 à vista; R$ 200 sobre R$ 800 em 2x, após quitação."/>
                <Feature icon={WalletCards} title="Repasse" desc="Modalidade imediata ou fechamento mensal, conforme cadastro e política vigente."/>
                <Feature icon={FileCheck2} title="Rastreabilidade" desc="Lead, conversão, pagamento do cliente e comissão ficam registrados no painel do vendedor."/>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-emerald-950/25 via-neutral-950 to-sky-950/20 border-b border-white/5">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center max-w-3xl mx-auto"><div className="text-emerald-400 text-[10px] font-black uppercase tracking-[.2em]">Segurança do cliente</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Sua operação protegida desde o acesso até a auditoria.</h2><p className="text-sm text-neutral-400 mt-4">O ADEGA PRO combina isolamento lógico por empresa, autenticação, permissões, trilhas de auditoria e controles administrativos. Segurança é tratada em camadas; nenhuma plataforma pode prometer risco zero.</p></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-9">
                <Feature icon={LockKeyhole} title="Acesso protegido" desc="Autenticação e controle de sessão para reduzir acessos indevidos."/>
                <Feature icon={KeyRound} title="Permissões" desc="Perfis e módulos controlam o que cada operador pode acessar."/>
                <Feature icon={Database} title="Dados separados" desc="Controles multitenant mantêm cada empresa dentro do seu próprio escopo operacional."/>
                <Feature icon={ShieldCheck} title="Auditoria" desc="Ações administrativas e eventos relevantes podem ser rastreados para conferência."/>
              </div>
              <div className="mt-6 p-4 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 text-xs text-neutral-300 leading-relaxed"><b className="text-emerald-300">Compromisso de segurança:</b> atualizações, correções e controles técnicos são mantidos para reduzir riscos. O cliente também é responsável por senhas, usuários, dispositivos e permissões de sua equipe, conforme os Termos e a Política de Privacidade.</div>
            </div>
          </section>

          <section id="novidades" className="border-y border-white/5 bg-neutral-900/30">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center max-w-3xl mx-auto"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Novidades & updates</div><h2 className="text-3xl sm:text-4xl font-black mt-2">O sistema evolui junto com a operação.</h2><p className="text-sm text-neutral-400 mt-3">Atualizações recentes priorizam rastreabilidade, estoque, caixa, RH, segurança multi-loja e produtividade no PDV.</p></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
                {[
                  ['Caixa por turno','Histórico de sessões com operador, vendas, recebimentos, sangrias, suprimentos e conferência do fechamento.'],
                  ['Estoque inteligente','Validade por lote, FEFO, giro, itens estacionados, estoque mínimo e sugestão de reposição por loja.'],
                  ['Operação multi-loja','Estoque, caixa, vendas e financeiro separados por unidade, com visão administrativa identificando a origem.'],
                  ['RH operacional','Entrada por PIN, fechamento de turno, faltas, agenda, alertas e registros internos da equipe.'],
                  ['Vendas auditáveis','Correção administrativa de pagamento, desconto e cancelamento com sincronização dos registros relacionados.'],
                  ['Atualizações contínuas','Avisos de versão aparecem no sistema logado e registram as principais melhorias liberadas.']
                ].map(([title,desc])=><div key={title} className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800"><div className="font-black text-white">{title}</div><p className="text-xs text-neutral-400 mt-2 leading-relaxed">{desc}</p></div>)}
              </div>
            </div>
          </section>

          <section id="faq" className="border-b border-white/5">
            <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Perguntas frequentes</div><h2 className="text-3xl sm:text-4xl font-black mt-2">FAQ Adega Pro</h2></div>
              <div className="mt-8 space-y-2">
                {[
                  ['O estoque de duas lojas se mistura?','Não. O saldo operacional é separado por loja. A administração pode consultar unidades autorizadas, mas venda ou inventário de uma unidade não altera o saldo da outra.'],
                  ['O administrador consegue conferir caixas fechados?','Sim. Caixas & Sessões mantém o histórico por operador e turno. O gestor pode abrir uma sessão para conferir vendas, faturamento, meios de pagamento, sangrias, suprimentos e diferença do fechamento.'],
                  ['O vendedor vê todos os dados administrativos?','Não necessariamente. O acesso depende do perfil e das permissões atribuídas. Administradores e gerentes têm recursos de gestão que não precisam ser expostos ao operador de caixa.'],
                  ['Como funciona a baixa de estoque?','A venda confirmada baixa o estoque da loja ativa. O saldo permanece persistido após o fechamento do turno e é carregado novamente no próximo turno.'],
                  ['Posso usar PIX e cartão?','O sistema registra os meios de pagamento disponíveis. Integrações automáticas com adquirentes ou provedores dependem de configuração e homologação específicas.'],
                  ['O que acontece ao fechar o caixa?','O operador informa o valor contado. O sistema mantém totais do turno, valor esperado, sangrias, suprimentos e diferença para conferência posterior.'],
                  ['Existe controle de validade?','Sim. O estoque possui recursos de validade por lote, alertas e apoio à saída FEFO para priorizar itens que vencem primeiro.'],
                  ['Há backup?','Clientes em produção possuem ferramenta de exportação e validação de backup. Restaurações não devem sobrescrever a produção automaticamente sem conferência.'],
                  ['Como funcionam atualizações?','Novas versões podem exibir um aviso não bloqueante após o login com as principais mudanças. Recursos podem ser liberados conforme plano, configuração e estágio de homologação.'],
                  ['Onde encontro ajuda para usar o sistema?','Após entrar, acesse Suporte ATR Studio. A seção Como usar o Adega Pro apresenta o fluxo básico de venda, caixa, estoque, clientes, gestão e segurança.'],
                  ['Os dados ficam separados entre empresas?','O sistema usa contexto de tenant, loja, autenticação e políticas de acesso para restringir os dados ao escopo autorizado.'],
                  ['Posso cadastrar mais de uma loja?','Sim, conforme o ambiente e plano habilitados. Cada unidade mantém sua operação separada e o administrador autorizado pode alternar entre elas.']
                ].map(([q,a])=><details key={q} className="group rounded-2xl bg-neutral-900 border border-neutral-800 p-4"><summary className="cursor-pointer list-none font-black text-sm flex justify-between gap-3">{q}<span className="text-amber-400">+</span></summary><p className="text-xs text-neutral-400 leading-relaxed mt-3 pr-6">{a}</p></details>)}
              </div>
            </div>
          </section>

          <TestimonialsSection items={testimonials} onStart={()=>navigateView('REGISTER')}/>

          <section id="planos" className="border-t border-white/5 bg-gradient-to-b from-neutral-950 to-black">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Planos</div><h2 className="text-3xl sm:text-4xl font-black mt-2">Comece com uma operação profissional.</h2><p className="text-sm text-neutral-400 mt-3">Preços regulares abaixo. Os descontos temporários ficam na página exclusiva da promoção.</p></div>
              <div className="grid md:grid-cols-2 gap-4 mt-9">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-red-950/70 to-neutral-900 border border-red-800/50"><div className="text-xs font-black uppercase tracking-[.2em] text-red-200">Assinatura mensal</div><div className="mt-4 text-5xl font-black">R$ 149<span className="text-2xl">,00</span><span className="text-sm text-neutral-400">/mês</span></div><div className="mt-5 text-xs text-neutral-300 space-y-2">{['PDV completo','Estoque e compras','Clientes e fiado','Financeiro e relatórios','Atualizações constantes','Suporte especializado'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-400"/>{x}</div>)}</div><button onClick={()=>navigateView('REGISTER')} className="mt-6 w-full py-3.5 rounded-xl bg-white text-neutral-950 font-black text-sm">Começar agora</button></div>
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/50 to-neutral-900 border border-amber-700/40"><div className="text-xs font-black uppercase tracking-[.2em] text-amber-300">Fidelização + Personalização</div><div className="mt-4 text-sm text-neutral-400">R$ 990 ou R$ 800 em 2x de R$ 400</div><div className="text-5xl font-black text-amber-300">R$ 800 <span className="text-sm text-neutral-400">em 2x</span></div><div className="mt-5 text-xs text-neutral-300 space-y-2">{['Configuração da operação','Identidade da adega','Ajustes específicos','Treinamento e implantação','Integrações orçadas separadamente'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 size={14} className="text-amber-400"/>{x}</div>)}</div><button type="button" onClick={()=>{setView('POLICY');window.history.pushState({}, '', '/politica-fidelidade-indicacoes');window.scrollTo({top:0});}} className="mt-4 w-full py-3 rounded-xl border border-amber-700/50 text-amber-300 font-black text-xs">Ver política de fidelidade e indicações</button><a href="https://wa.me/5511939026928?text=Olá%2C%20quero%20saber%20mais%20sobre%20a%20implantação%20do%20ADEGA%20PRO." target="_blank" rel="noreferrer" className="mt-6 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2">Falar no WhatsApp <ArrowRight size={16}/></a></div>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === 'LOGIN' && (
        <main className="relative z-10 max-w-md mx-auto px-5 pt-12 pb-20">
          <div className="p-4 sm:p-7 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
            <div className="mb-6 text-center">
              <img src="/adega-pro-brand.svg" alt="ADEGA PRO — Sistema para Adegas" className="h-16 sm:h-20 w-auto max-w-full object-contain mx-auto"/>
              <h1 className="text-2xl font-black mt-5">Acesse sua empresa</h1>
              <p className="text-sm text-neutral-400 mt-1">Entre com a conta principal antes de liberar o PIN do operador.</p>
              <div className="grid grid-cols-2 gap-2 mt-5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
                <button type="button" className="py-2.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-black">Entrar</button>
                <button type="button" onClick={()=>navigateView('REGISTER')} className="py-2.5 rounded-lg text-neutral-400 hover:text-white text-xs font-black">Criar cadastro</button>
              </div>
            </div>
            {message && <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type==='error'?'bg-rose-950/40 border-rose-800 text-rose-300':'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>{message.text}</div>}
            <form onSubmit={login} className="space-y-4">
              <label className="block"><span className="text-xs font-bold text-neutral-300">E-mail</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><Mail size={16} className="text-neutral-500"/><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required autoComplete="email" className="w-full bg-transparent py-3 outline-none text-sm" placeholder="voce@empresa.com.br"/></div></label>
              <label className="block"><span className="text-xs font-bold text-neutral-300">Senha</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><LockKeyhole size={16} className="text-neutral-500"/><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} required autoComplete="current-password" className="w-full bg-transparent py-3 outline-none text-sm"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-neutral-500">{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
              <div className="flex items-center justify-between text-xs"><button type="button" onClick={recover} className="text-amber-400 hover:text-amber-300">Esqueci minha senha</button><button type="button" onClick={()=>navigateView('REGISTER')} className="text-neutral-400 hover:text-white">Criar conta</button></div>
              <button disabled={busy} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm">{busy?'Entrando...':'Entrar com segurança'}</button>
            </form>
          </div>
        </main>
      )}

      {view === 'RESET_PASSWORD' && (
        <main className="relative z-10 max-w-md mx-auto px-5 pt-12 pb-20">
          <div className="p-4 sm:p-7 rounded-3xl bg-neutral-900/95 border border-neutral-800 shadow-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-black">Crie uma nova senha</h1>
              <p className="text-sm text-neutral-400 mt-1">Digite e confirme a nova senha da conta principal.</p>
            </div>
            {message && <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type==='error'?'bg-rose-950/40 border-rose-800 text-rose-300':'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>{message.text}</div>}
            <form onSubmit={updatePassword} className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-neutral-300">Nova senha</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3">
                  <KeyRound size={16} className="text-neutral-500"/>
                  <input value={newPassword} onChange={event=>setNewPassword(event.target.value)} type={showPassword?'text':'password'} required minLength={8} autoComplete="new-password" className="w-full bg-transparent py-3 outline-none text-sm"/>
                  <button type="button" onClick={()=>setShowPassword(value=>!value)} className="text-neutral-500" aria-label={showPassword?'Ocultar senha':'Mostrar senha'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-300">Confirmar nova senha</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3">
                  <KeyRound size={16} className="text-neutral-500"/>
                  <input value={confirmNewPassword} onChange={event=>setConfirmNewPassword(event.target.value)} type={showPassword?'text':'password'} required minLength={8} autoComplete="new-password" className="w-full bg-transparent py-3 outline-none text-sm"/>
                </div>
              </label>
              <button disabled={busy} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm">{busy?'Atualizando...':'Salvar nova senha'}</button>
            </form>
          </div>
        </main>
      )}

      {view === 'REGISTER' && (
        <main className="relative z-10 max-w-4xl mx-auto px-5 pt-5 pb-16">
          <div className="p-5 sm:p-7 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl">
            <div className="mb-6 text-center">
              <img src="/adega-pro-brand.svg" alt="ADEGA PRO — Sistema para Adegas" className="h-16 sm:h-20 w-auto max-w-full object-contain mx-auto"/>
              <h1 className="text-2xl sm:text-3xl font-black mt-5">Cadastre sua adega</h1>
              <p className="text-sm text-neutral-400 mt-1">Crie a conta principal e separe a identidade da sua loja da marca Adega Pro.</p>
              <div className="grid grid-cols-2 gap-2 mt-5 max-w-md mx-auto p-1 rounded-xl bg-neutral-950 border border-neutral-800">
                <button type="button" onClick={()=>navigateView('LOGIN')} className="py-2.5 rounded-lg text-neutral-400 hover:text-white text-xs font-black">Entrar</button>
                <button type="button" className="py-2.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-black">Criar cadastro</button>
              </div>
            </div>
            {message && <div className={`mb-4 p-3 rounded-xl text-xs border ${message.type==='error'?'bg-rose-950/40 border-rose-800 text-rose-300':'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>{message.text}</div>}

            <form onSubmit={registerAccount} className="space-y-6">
              <section className="p-4 rounded-xl bg-neutral-950 border border-neutral-700 space-y-3">
                <button type="button" onClick={navigatePromotion} className="text-sm text-amber-300 underline underline-offset-4">Ler a política detalhada da promoção</button>
                <label className="block text-sm font-bold">Como deseja começar?
                  <select value={campaignChoice} onChange={e=>{setCampaignChoice(e.target.value as CampaignChoice);setCampaignAccepted(false);}} className="block w-full mt-2 p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-sm">
                    <option value="STANDARD">Plano padrão: R$ 149/mês (preço regular)</option>
                    <option value="TRIAL">Solicitar 30 dias gratuitos</option>
                    {campaignIsOpen() && <option value="MONTHLY">Mensal: R$ 74,90 na primeira; depois R$ 149/mês</option>}
                    {campaignIsOpen() && <option value="PERSONALIZED">Personalizado: R$ 495 + fidelidade de 12 meses</option>}
                  </select>
                </label>
                {(campaignChoice === 'MONTHLY' || campaignChoice === 'PERSONALIZED') && <label className="flex items-start gap-3 text-sm text-neutral-300">
                  <input type="checkbox" required checked={campaignAccepted} onChange={e=>setCampaignAccepted(e.target.checked)} className="mt-1"/>
                  <span>{campaignChoice === 'PERSONALIZED' ? 'Li as regras e aceito especificamente a fidelidade de 12 meses: implantação R$ 495; meses 1–2 grátis; meses 3–10 R$ 74,90/mês; meses 11–12 R$ 149/mês.' : 'Li as regras e aceito a primeira mensalidade por R$ 74,90 e as seguintes por R$ 149/mês.'} Entendo o limite de 15 novas contratações até 01/01/2027, às 23h59 (Brasília), e que minha solicitação depende da confirmação comercial da ATR Studio.</span>
                </label>}
                <p className="text-sm text-neutral-400">Teste, vaga promocional e condições de cobrança são confirmados pela ATR Studio antes da ativação. Os preços promocionais são separados do plano padrão.</p>
              </section>
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
                  {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).filter(key => key !== 'sales_partner_policy').map(key => (
                    <button key={key} type="button" onClick={() => setLegalDoc(key)} className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      {LEGAL_DOCS[key].shortTitle}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3"><button disabled={busy} className="sm:flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black">{busy?'Criando conta...':'Criar conta e cadastrar adega'}</button><button type="button" onClick={()=>navigateView('LOGIN')} className="px-5 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-sm font-bold">Já tenho conta</button></div>
            </form>
          </div>
        </main>
      )}

      <footer className="relative z-10 border-t border-neutral-800 bg-black">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
          <section aria-label="Plataformas disponíveis" className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 pb-8 mb-8 border-b border-white/10 text-xs text-neutral-300">
              <span className="flex items-center gap-2"><img src="/platform-icons/chrome.svg" alt="" width="22" height="22"/>Versão navegador</span>
              <span className="flex items-center gap-2"><img src="/platform-icons/windows11.svg" alt="" width="22" height="22"/>Windows</span>
              <span className="flex items-center gap-2"><img src="/platform-icons/apple.svg" alt="" width="22" height="22" className="brightness-0 invert"/>Em breve: iOS</span>
              <span className="flex items-center gap-2"><img src="/platform-icons/android.svg" alt="" width="22" height="22"/>Em breve: Android</span>
            </section>
            <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1"><img src="/adega-pro-brand.svg" alt="ADEGA PRO" className="h-12 w-auto"/><p className="text-xs text-neutral-500 mt-3 leading-relaxed">Gestão profissional para adegas, conveniências e operações de bebidas.</p></div>
            <div><div className="text-xs font-black text-white mb-3">ADEGA PRO</div><div className="space-y-2 text-xs text-neutral-500"><button onClick={()=>navigateMarketing('/recursos')} className="block hover:text-amber-400">Recursos</button><button onClick={()=>navigateMarketing('/integracoes')} className="block hover:text-amber-400">Integrações</button><button onClick={()=>navigateMarketing('/planos')} className="block hover:text-amber-400">Planos</button><button onClick={navigatePromotion} className="block text-amber-300 hover:text-amber-200">Promoção e descontos</button><button onClick={()=>{setView('POLICY');window.history.pushState({}, '', '/politica-fidelidade-indicacoes');window.scrollTo({top:0});}} className="block hover:text-amber-400">Fidelidade & indicações</button><button onClick={()=>navigateView('LOGIN')} className="block hover:text-amber-400">Entrar</button></div></div>
            <div><div className="text-xs font-black text-white mb-3">PARCEIROS</div><div className="space-y-2 text-xs text-neutral-500"><a href="/vendedor" className="block hover:text-amber-400">Área do vendedor</a><a href="https://wa.me/5511939026928?text=Quero%20participar%20do%20programa%20de%20vendedores%20ADEGA%20PRO" target="_blank" rel="noreferrer" className="block hover:text-amber-400">Quero ser vendedor</a><span className="block">Comissões sujeitas à política vigente</span></div></div>
            <div><div className="text-xs font-black text-white mb-3">LEGAL & SEGURANÇA</div><div className="space-y-2 text-xs text-neutral-500">{(Object.keys(LEGAL_DOCS) as LegalDocKey[]).filter(key => key !== 'sales_partner_policy').map(key=><button key={key} type="button" onClick={()=>setLegalDoc(key)} className="block hover:text-amber-400">{LEGAL_DOCS[key].shortTitle}</button>)}</div></div>
          </div>
          <div className="mt-8 pt-5 border-t border-neutral-900 flex flex-col lg:flex-row gap-3 lg:items-center justify-between text-[11px] text-neutral-600"><span>© {new Date().getFullYear()} ADEGA PRO · Software de gestão · CNPJ 57.514.866/0001-38</span><span>Produto desenvolvido e mantido por <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-amber-400">ATR Studio</a> · São Paulo/SP · Brasil</span></div>
        </div>
      </footer>
    </div>
  );
};

const Field = ({label,value,onChange,type='text',icon:Icon}:{label:string;value:string;onChange:(v:string)=>void;type?:string;icon?:any}) => (
  <label className="block"><span className="text-xs font-bold text-neutral-300">{label}</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3">{Icon && <Icon size={15} className="text-neutral-500"/>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm" /></div></label>
);
