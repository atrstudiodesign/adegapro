import React from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Gift, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';

interface Props { onBack: () => void; onRegister: () => void; }

export const LoyaltyReferralPolicyPage: React.FC<Props> = ({ onBack, onRegister }) => (
  <main className="relative z-10">
    <section className="border-b border-white/5 bg-gradient-to-b from-amber-950/20 to-neutral-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-amber-400"><ArrowLeft size={15}/> Voltar ao ADEGA PRO</button>
        <div className="mt-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-black uppercase tracking-[.16em]"><Gift size={13}/> Programa de clientes</div>
          <h1 className="text-4xl sm:text-5xl font-black mt-4 tracking-tight">Política de Fidelidade e Indicações</h1>
          <p className="text-sm sm:text-base text-neutral-400 mt-4 leading-relaxed">Benefícios para clientes ativos do ADEGA PRO. Este programa é independente das regras de vendedores, representantes, parceiros e comissionados.</p>
        </div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-2 gap-5">
        <article className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800">
          <div className="text-xs font-black uppercase tracking-[.18em] text-neutral-300">Plano mensal padrão</div>
          <div className="mt-4 text-5xl font-black">R$ 149<span className="text-sm text-neutral-500">/mês</span></div>
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed">Uso do ADEGA PRO na configuração padrão e com os recursos disponibilizados no plano. Personalizações, novos módulos, integrações e fluxos específicos podem ser orçados separadamente.</p>
          <div className="mt-6 p-4 rounded-2xl bg-emerald-950/25 border border-emerald-800/40">
            <div className="font-black text-emerald-300 flex items-center gap-2"><UserPlus size={17}/> Indicação do cliente mensal</div>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Uma indicação válida convertida pode gerar cashback/desconto na assinatura do cliente indicador, conforme as regras vigentes. O benefício não é comissão em dinheiro.</p>
          </div>
        </article>

        <article className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/45 to-neutral-900 border border-amber-700/50 shadow-xl shadow-amber-950/10">
          <div className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Fidelização + personalização</div>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2"><span className="text-5xl font-black text-amber-300">R$ 990</span><span className="text-sm text-neutral-400 pb-2">em até 3x</span></div>
          <div className="mt-2 text-lg font-black">ou R$ 800 à vista</div>
          <div className="mt-5 space-y-3 text-sm text-neutral-300">
            {['4 meses sem mensalidade a partir do primeiro pagamento','Mensalidade de R$ 149 a partir do 5º mês','Personalizações conforme o escopo contratado','Pedidos fora do escopo podem receber orçamento próprio'].map(x=><div key={x} className="flex gap-2"><CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5"/><span>{x}</span></div>)}
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="font-black text-amber-300">1 indicação válida convertida no mês</div>
            <div className="text-2xl font-black mt-1">Mensalidade seguinte por R$ 75</div>
            <p className="text-xs text-neutral-400 mt-2">Máximo de 1 benefício por mês-calendário. A cota não acumula para meses futuros.</p>
          </div>
        </article>
      </div>
    </section>

    <section className="border-y border-white/5 bg-black/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto"><div className="text-amber-400 text-[10px] font-black uppercase tracking-[.2em]">Como funciona</div><h2 className="text-3xl font-black mt-2">Indicação simples, validada e transparente.</h2></div>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[['1','Indique','O cliente ativo indica um novo estabelecimento para conhecer o ADEGA PRO.'],['2','Converta','A indicação precisa resultar em novo cliente real, elegível, contratado e ativo.'],['3','Receba o benefício','Após a validação, o benefício aplicável ao plano do indicador é registrado.']].map(([n,t,d])=><div key={n} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 font-black grid place-items-center">{n}</div><div className="font-black mt-4">{t}</div><p className="text-xs text-neutral-400 mt-2 leading-relaxed">{d}</p></div>)}
        </div>
      </div>
    </section>

    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <article className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
          <h2 className="text-xl font-black flex items-center gap-2"><BadgeCheck className="text-emerald-400"/> O que é uma indicação válida?</h2>
          <p className="text-sm text-neutral-400 mt-3 leading-relaxed">É a indicação que resulta em um novo cliente real e elegível, com contratação confirmada e ativa conforme as condições comerciais aplicáveis.</p>
          <div className="mt-5 text-xs text-neutral-400 leading-7">Não são elegíveis: autoindicação, cadastro duplicado, cliente já existente, dados diferentes para o mesmo estabelecimento, cadastro artificial, fraude, manipulação, contratação cancelada, inadimplência que invalide a contratação, chargeback ou pagamento estornado.</div>
        </article>
        <article className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
          <h2 className="text-xl font-black flex items-center gap-2"><ShieldCheck className="text-sky-400"/> Limites e auditoria</h2>
          <p className="text-sm text-neutral-400 mt-3 leading-relaxed">Benefícios podem ser validados, recusados ou estornados quando houver cancelamento, fraude, duplicidade, autoindicação, chargeback, erro operacional ou descumprimento das regras.</p>
          <p className="text-sm text-neutral-400 mt-3 leading-relaxed">Os registros podem ser mantidos para auditoria e segurança. Benefícios não são sacáveis, transferíveis ou convertíveis em comissão.</p>
        </article>
      </div>

      <article className="p-6 rounded-3xl bg-violet-950/20 border border-violet-800/30">
        <h2 className="text-xl font-black flex items-center gap-2"><Sparkles className="text-violet-300"/> Quatro meses gratuitos e indicações</h2>
        <p className="text-sm text-neutral-400 mt-3 leading-relaxed">Na Fidelização + Personalização, os quatro primeiros meses já têm mensalidade de R$ 0. Indicações feitas nesse período não acumulam desconto para meses futuros. O benefício de mensalidade por R$ 75 passa a produzir efeito quando houver mensalidade efetivamente devida, a partir do 5º mês.</p>
      </article>

      <article className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
        <h2 className="text-xl font-black">Fidelização não é compra do software</h2>
        <p className="text-sm text-neutral-400 mt-3 leading-relaxed">A contratação de Fidelização + Personalização não transfere propriedade do software, código-fonte, marca, infraestrutura ou direitos sobre o ADEGA PRO. O cliente recebe direito de uso do serviço conforme o plano e as condições contratuais aplicáveis.</p>
      </article>

      <article className="p-6 rounded-3xl bg-rose-950/15 border border-rose-900/30">
        <h2 className="text-xl font-black">Clientes e vendedores são programas separados</h2>
        <p className="text-sm text-neutral-400 mt-3 leading-relaxed">Esta política trata exclusivamente de fidelidade e indicações feitas por clientes. Comissão de vendedores, representantes, parceiros ou afiliados segue política comercial própria e não se mistura com cashback ou desconto de cliente.</p>
      </article>
    </section>

    <section className="border-t border-white/5 bg-gradient-to-b from-neutral-950 to-black">
      <div className="max-w-3xl mx-auto px-4 py-14 text-center">
        <h2 className="text-3xl font-black">Escolha a modalidade ideal para sua adega.</h2>
        <p className="text-sm text-neutral-400 mt-3">Use o sistema padrão por assinatura ou fale com a ATR Studio sobre fidelização e personalização.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={onRegister} className="px-6 py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2">Começar agora <ArrowRight size={16}/></button>
          <a href="https://wa.me/5511939026928?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20Fideliza%C3%A7%C3%A3o%20e%20Personaliza%C3%A7%C3%A3o%20do%20ADEGA%20PRO." target="_blank" rel="noreferrer" className="px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-black text-sm">Falar no WhatsApp</a>
        </div>
      </div>
    </section>
  </main>
);
