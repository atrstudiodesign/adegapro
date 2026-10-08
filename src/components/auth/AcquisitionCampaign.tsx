import React, { useEffect, useState } from 'react';

export const ACQUISITION_CAMPAIGN = {
  id: 'adega-pro-15-clientes-2026-10-12',
  version: '2026.10.08-v1',
  endsAt: '2026-10-12T23:59:59.999-03:00',
  limit: 15,
} as const;
export type CampaignChoice = 'TRIAL' | 'MONTHLY' | 'PERSONALIZED';
export const campaignIsOpen = (now = Date.now()) => now <= Date.parse(ACQUISITION_CAMPAIGN.endsAt);

export function AcquisitionCampaign({ onChoose }: { onChoose?: (choice: CampaignChoice) => void }) {
  const [open, setOpen] = useState(campaignIsOpen);
  useEffect(() => {
    const timer = window.setInterval(() => setOpen(campaignIsOpen()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return <section id="oferta-novos-clientes" className="max-w-6xl mx-auto px-4 sm:px-6 py-10" aria-label="Campanha para novos clientes">
    <div className="p-5 sm:p-8 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-neutral-900">
      <p className="text-sm font-bold text-amber-300">{open ? 'Até 12/10/2026 · 15 novas assinaturas' : 'Campanha encerrada em 12/10/2026'}</p>
      <h2 className="text-3xl sm:text-4xl font-black mt-3">Seu negócio vende. Você precisa saber o que sobra.</h2>
      <p className="text-base text-neutral-300 mt-4">Organize vendas, caixa, estoque, fiado e financeiro em um só sistema. Escolha como começar no ADEGA PRO.</p>
      <p className="text-base text-neutral-300 mt-3">Para adegas, distribuidoras, bombonieres, mercadinhos, bares, bazares e barbearias. No plano personalizado, funcionalidades adicionais podem ser implantadas conforme as necessidades do segmento, após avaliação e definição do escopo. Consulte a ATR Studio.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <article className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
          <h3 className="font-black text-lg">Experimente primeiro</h3><p className="text-3xl font-black text-amber-300 mt-3">30 dias grátis</p>
          <p className="text-sm text-neutral-300 mt-3">Uso gratuito a partir da ativação pela ATR Studio. Após o teste, assinatura padrão de R$ 149/mês mediante contratação.</p>
          {onChoose && <button type="button" onClick={() => onChoose('TRIAL')} className="mt-5 w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-black">Cadastrar e solicitar teste</button>}
        </article>
        <article className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
          <h3 className="font-black text-lg">Assinatura mensal</h3><p className="text-3xl font-black text-amber-300 mt-3">{open ? 'R$ 74,50' : 'R$ 149/mês'}</p>
          <p className="text-sm text-neutral-300 mt-3">{open ? '50% OFF na primeira mensalidade de R$ 149. Da segunda em diante: R$ 149/mês. Sem fidelidade promocional.' : 'Consulte as condições vigentes da assinatura mensal.'}</p>
          {onChoose && open && <button type="button" onClick={() => onChoose('MONTHLY')} className="mt-5 w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-black">{open ? 'Solicitar oferta mensal' : 'Cadastrar minha adega'}</button>}
        </article>
        <article className="p-5 rounded-2xl bg-neutral-950 border border-amber-700/50">
          <h3 className="font-black text-lg">Personalizado com fidelidade</h3>
          {open ? <><p className="text-sm text-neutral-400 mt-3">Implantação: de R$ 990 por</p><p className="text-3xl font-black text-amber-300">R$ 495</p><p className="text-sm text-neutral-300 mt-3">2 meses sem mensalidade + 8 meses por R$ 74,50/mês. Meses 11 e 12: R$ 149/mês. Fidelidade de 12 meses.</p></> : <p className="text-sm text-neutral-300 mt-3">A condição desta campanha expirou. Consulte uma proposta atual para personalização.</p>}
          {onChoose && open && <button type="button" onClick={() => onChoose('PERSONALIZED')} className="mt-5 w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-black">{open ? 'Solicitar personalizado' : 'Consultar personalizado'}</button>}
        </article>
      </div>
      <p className="text-sm text-neutral-300 mt-5">{open ? 'Descontos exclusivos para as 15 primeiras novas contratações confirmadas até segunda-feira, 12/10/2026, às 23h59 (Brasília), ou até atingir o limite, o que ocorrer primeiro. Cadastro sozinho não reserva a oferta. Disponibilidade validada pela ATR Studio.' : 'Os descontos desta campanha não estão mais disponíveis para novas contratações.'}</p>
      <details className="mt-5 rounded-xl bg-black/30 border border-neutral-700 p-4 text-sm text-neutral-300">
        <summary className="cursor-pointer font-bold text-amber-300">Ler regras da campanha e política de fidelidade</summary>
        <div className="mt-4 space-y-3 leading-relaxed">
          <p>Versão {ACQUISITION_CAMPAIGN.version}. Campanha {ACQUISITION_CAMPAIGN.id}. Válida exclusivamente para novos clientes; clientes ativos, seus contratos, cobranças, descontos e aceites anteriores permanecem nas condições já contratadas.</p>
          <p>O limite de 15 clientes é único para a campanha, somando as modalidades mensal e personalizado. A ordem considera a confirmação da contratação e do pagamento elegível pela ATR Studio dentro do prazo. Duplicidades e clientes já ativos não ocupam vaga elegível. A disponibilidade é conferida administrativamente; esta página não mostra um contador de vagas em tempo real.</p>
          <p>O teste gratuito de 30 dias é alternativa à ativação imediata dos planos promocionais e começa na ativação do acesso pela ATR Studio. Não exige adesão à fidelidade do personalizado. O cadastro de teste não reserva desconto nem vaga. Para receber a promoção, a contratação deve ser confirmada dentro do prazo e do limite; os 30 dias de teste não se somam aos meses gratuitos do personalizado.</p>
          <p>Mensal: preço regular de R$ 149/mês; primeira mensalidade por R$ 74,50; seguintes por R$ 149/mês. O desconto da primeira mensalidade não se renova automaticamente.</p>
          <p>Personalizado: implantação regular de R$ 990 por R$ 495, referente ao escopo acordado. O desconto não se acumula com outra oferta de implantação. Integrações, novos módulos e serviços fora do escopo dependem de orçamento próprio.</p>
          <p>Fidelidade do personalizado: 12 meses contados da ativação contratada. Meses 1 e 2: R$ 0 de assinatura; meses 3 a 10: R$ 74,50/mês (50% de R$ 149); meses 11 e 12: R$ 149/mês. Depois, a continuidade segue as condições regulares contratadas. A implantação de R$ 495 é separada das mensalidades.</p>
          <p>Leia as políticas de assinatura, fidelidade, privacidade e uso disponíveis no cadastro. O personalizado exige aceite específico, desmarcado por padrão, e confirmação formal das condições pela ATR Studio antes da ativação. Esta campanha prevalece sobre a oferta pública anterior somente para novas contratações elegíveis que a aceitem; não substitui condições de clientes ativos.</p>
          <p>Cancelamento: seguem as condições contratuais e direitos legais aplicáveis. Eventual compensação por encerramento antecipado da fidelidade precisa estar informada na contratação e ser proporcional aos benefícios concedidos e ao prazo restante; esta página não cria multa ou cobrança automática. Solicitações pelos canais oficiais da ATR Studio.</p>
        </div>
      </details>
    </div>
  </section>;
}
