import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';

export const ACQUISITION_CAMPAIGN = {
  id: 'adega-pro-15-clientes-2026-10-12',
  version: '2026.10.08-v3',
  startsAt: '2026-10-08T00:00:00-03:00',
  endsAt: '2026-10-12T23:59:59.999-03:00',
  limit: 15,
} as const;
export type CampaignChoice = 'STANDARD' | 'TRIAL' | 'MONTHLY' | 'PERSONALIZED';
export const campaignIsOpen = (now = Date.now()) => now >= Date.parse(ACQUISITION_CAMPAIGN.startsAt) && now <= Date.parse(ACQUISITION_CAMPAIGN.endsAt);

function useCampaignOpen() {
  const [open, setOpen] = useState(campaignIsOpen);
  useEffect(() => {
    const timer = window.setInterval(() => setOpen(campaignIsOpen()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return open;
}

export function CampaignLandingCTA({ onOpen }: { onOpen: () => void }) {
  const open = useCampaignOpen();
  if (!open) return null;
  return <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8" aria-label="Promoção para novos clientes">
    <div className="p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-neutral-900 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex-1"><p className="text-sm font-bold text-amber-300">15 novas contratações · até 12/10/2026</p><h2 className="text-2xl sm:text-3xl font-black mt-2">Seu negócio no controle. Comece pagando menos.</h2><p className="text-base text-neutral-300 mt-3">Veja os descontos, o teste de 30 dias e todas as condições na página exclusiva da promoção.</p></div>
      <button type="button" onClick={onOpen} className="px-7 py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-base shrink-0">Quero aproveitar a promoção</button>
    </div>
  </section>;
}

export function CampaignPopup({ onOpen, onClose }: { onOpen: () => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useCampaignOpen();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => { if (!open) onClose(); }, [open, onClose]);
  return <dialog ref={dialogRef} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="campaign-popup-title" aria-describedby="campaign-popup-description" className="m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-neutral-950 text-white border border-amber-500/40 p-0 backdrop:bg-black/80">
    <div className="relative grid md:grid-cols-[.85fr_1.15fr]">
      <div className="bg-black p-4 md:p-5 flex items-center justify-center">
        <img src="/adega-pro-promocao-outubro.webp" alt="ADEGA PRO: gestão completa para seu negócio" width="941" height="1672" className="w-full max-w-[220px] md:max-w-none aspect-square object-cover object-top rounded-xl"/>
      </div>
      <div className="p-6 sm:p-8 md:self-center">
      <button type="button" onClick={onClose} aria-label="Fechar promoção" className="absolute z-10 right-3 top-3 w-11 h-11 grid place-items-center rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200"><X size={20}/></button>
      <img src="/adega-pro-brand.svg" alt="ADEGA PRO" className="h-12 w-auto max-w-[70%] mb-6"/>
      <p className="text-sm font-black text-amber-300">Até 12/10/2026 · 15 novos clientes</p>
      <h2 id="campaign-popup-title" className="text-3xl sm:text-4xl font-black mt-3">Mais controle. Menos custo para começar.</h2>
      <div id="campaign-popup-description" className="space-y-3 mt-5 text-base text-neutral-300">
        <p><strong className="text-white">Mensal:</strong> primeira mensalidade de R$ 149 por <strong className="text-amber-300">R$ 74,90</strong>. Depois, R$ 149/mês.</p>
        <p><strong className="text-white">Personalizado:</strong> implantação de R$ 990 por <strong className="text-amber-300">R$ 495</strong>, 2 meses grátis + 8 meses por R$ 74,90/mês. Meses 11 e 12: R$ 149/mês. Fidelidade de 12 meses.</p>
        <p className="text-amber-200">Ou solicite 30 dias de uso gratuito.</p>
      </div>
      <button type="button" onClick={onOpen} className="mt-6 w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-base">Quero ver a promoção e me cadastrar</button>
      <p className="text-sm text-neutral-400 mt-4 leading-relaxed">Até 23h59 (Brasília) de 12/10/2026 ou até 15 novas contratações confirmadas. Cadastro não reserva vaga. Teste e promoção não cumulativos. Confira a política completa antes do aceite.</p>
      <button type="button" onClick={onClose} className="mt-4 w-full py-3 text-sm text-neutral-400 hover:text-white">Continuar no site</button>
      </div>
    </div>
  </dialog>;
}

const policySections = [
  ['1. Quem pode participar', 'Oferta exclusiva para novos clientes do ADEGA PRO. Adegas, distribuidoras, bombonieres, mercadinhos, bares, bazares e barbearias podem solicitar avaliação. O plano padrão entrega os recursos nele disponíveis; funcionalidades específicas de cada segmento dependem de análise e escopo no personalizado. Clientes ativos e contratos anteriores não são alterados por esta campanha.'],
  ['2. Prazo e limite conjunto de 15 clientes', 'Campanha de 08/10/2026 até segunda-feira, 12/10/2026, às 23h59, horário de Brasília (UTC−3). Encerra antes se atingir 15 novas contratações elegíveis, somando mensal e personalizado. Não são 15 vagas para cada plano. A ATR Studio confere a disponibilidade administrativamente; esta página não apresenta contador de vagas em tempo real.'],
  ['3. O que confirma a participação', 'O cadastro registra interesse e a modalidade solicitada; não reserva vaga, não comprova pagamento e não ativa o desconto sozinho. A ordem considera a confirmação da contratação e do pagamento elegível pela ATR Studio dentro do prazo. Antes da ativação, o cliente recebe confirmação de elegibilidade, valor, escopo e data de início. Cadastros duplicados para o mesmo estabelecimento, autoindicação, fraude, contratação já existente e pagamento estornado não constituem nova contratação elegível.'],
  ['4. Desconto do plano mensal', 'Preço regular: R$ 149 por mês. A primeira mensalidade elegível recebe preço promocional e fica em R$ 74,90. A segunda mensalidade e as seguintes custam R$ 149 cada. O desconto é aplicado uma única vez, não é permanente e não impõe a fidelidade promocional de 12 meses do personalizado. As demais condições de assinatura e cancelamento seguem o contrato aceito.'],
  ['5. Desconto da implantação personalizada', 'Preço de referência da implantação: R$ 990. Com 50% de desconto, a implantação custa R$ 495, separadamente da assinatura. Personalização, configuração, treinamento e outros serviços precisam constar do escopo aprovado. A oferta não inclui automaticamente todo recurso solicitado, integração de terceiros, novo módulo ou desenvolvimento ilimitado. Pedidos fora do escopo dependem de orçamento próprio e aceite prévio. Forma de pagamento e entrega são confirmadas na proposta; esta campanha não promete parcelamento específico.'],
  ['6. Mensalidades e fidelidade do personalizado', 'Prazo de fidelidade: 12 meses a partir da ativação definida na contratação. Meses 1 e 2: assinatura de R$ 0. Meses 3 a 10: oito mensalidades de R$ 74,90, com preço promocional sobre R$ 149. Meses 11 e 12: duas mensalidades de R$ 149. Implantação + assinatura desse período somam R$ 1.392,20, sem serviços extras: R$ 495 + R$ 599,20 + R$ 298. Depois, a continuidade segue as condições regulares contratadas; o preço promocional não permanece indefinidamente.'],
  ['7. Alternativa de 30 dias de teste', 'O teste gratuito começa na ativação do acesso pela ATR Studio, e não simplesmente no preenchimento do cadastro. Não exige a adesão à fidelidade do personalizado. Ao final do teste, a continuidade depende da contratação de um plano e das condições confirmadas. Solicitar teste não reserva vaga promocional nem estende o prazo de 12/10. Os 30 dias de teste não se somam aos dois meses gratuitos do personalizado. Para receber a campanha, a contratação elegível precisa ser confirmada no prazo e no limite da oferta.'],
  ['8. Não acumulação de benefícios', 'As modalidades promocionais mensal e personalizado são alternativas para a mesma contratação. O desconto de implantação não se soma à condição anterior de pagamento à vista ou a outra promoção. Os benefícios do personalizado já incluem os dois meses gratuitos e os oito meses com preço promocional descritos nesta página. Cashback e indicação continuam sujeitos às suas políticas próprias; esta oferta não cria comissão, saldo sacável ou benefício adicional automático.'],
  ['9. Aceite no cadastro e confirmação comercial', 'As regras ficam disponíveis antes do cadastro e da contratação. A opção de participação e o aceite específico começam desmarcados. Quem solicita o personalizado precisa aceitar separadamente os valores, as etapas e a fidelidade de 12 meses. O cadastro guarda a versão da campanha e a solicitação como pendente de validação comercial. Esse registro não autoriza cobrança nem comprova elegibilidade sozinho. As condições efetivamente contratadas devem ser confirmadas pela ATR Studio antes da ativação.'],
  ['10. Cancelamento e direitos do cliente', 'Solicitações de cancelamento são feitas pelos canais oficiais e seguem o contrato e os direitos legais aplicáveis. Eventual compensação por encerramento antecipado da fidelidade deve ser informada previamente na contratação, proporcional aos benefícios efetivamente concedidos e ao período restante, quando cabível. Não se presume cobrança de todas as mensalidades restantes. Esta página não cria multa automática e não limita direitos legais de arrependimento ou rescisão. A implantação e serviços executados seguem o escopo e as condições aceitas.'],
  ['11. Encerramento da oferta e contratos anteriores', 'Após o prazo, novas solicitações não recebem automaticamente os valores desta campanha. Condições de uma contratação já confirmada e aceita continuam conforme seu cronograma, mesmo que a campanha pública tenha encerrado. A campanha vale somente para novas contratações elegíveis que a aceitem e não altera planos, descontos, cobranças, dados ou aceites de clientes ativos. A documentação geral do ADEGA PRO continua aplicável; esta página detalha exclusivamente a oferta identificada abaixo.'],
];

export function AcquisitionCampaign({ onChoose, onBack, onReadPolicies }: { onChoose: (choice: CampaignChoice) => void; onBack: () => void; onReadPolicies: () => void }) {
  const open = useCampaignOpen();
  return <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 py-2 text-sm font-bold text-neutral-300 hover:text-amber-300"><ArrowLeft size={16}/> Voltar ao site e aos preços regulares</button>
    <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center mt-7">
      <div><p className="text-sm font-black text-amber-300">{open ? 'Campanha exclusiva · 15 novos clientes' : 'Campanha encerrada para novas contratações'}</p><h1 className="text-4xl sm:text-5xl font-black mt-4 leading-tight">Mais controle. Menos custo para começar.</h1><p className="text-base text-neutral-300 mt-5">Vendas, caixa, estoque, clientes e financeiro em um só sistema. Para adegas, distribuidoras, bombonieres, mercadinhos, bares, bazares e barbearias.</p><p className="text-base text-neutral-300 mt-4">Funcionalidades adicionais por segmento podem ser implantadas no plano personalizado após avaliação e definição do escopo. Consulte.</p><p className="text-base text-amber-200 mt-5">Até segunda-feira, 12/10/2026, às 23h59 (Brasília), ou até 15 novas contratações confirmadas, o que ocorrer primeiro.</p><a href="#politica-descontos" className="inline-block mt-5 text-base font-bold text-amber-300 underline underline-offset-4">Leia a política completa dos descontos</a></div>
      <img src="/adega-pro-promocao-outubro.webp" alt="Campanha ADEGA PRO: primeira mensalidade R$ 74,90 ou implantação personalizada R$ 495, com condições de fidelidade, até 12 de outubro de 2026" className="w-full max-w-md mx-auto aspect-square object-cover object-top rounded-2xl border border-amber-500/20" width="941" height="1672" loading="eager"/>
    </div>
    {!open && <p className="mt-8 p-5 rounded-xl bg-neutral-900 border border-neutral-700 text-base">Os valores abaixo são o registro desta campanha encerrada. Consulte os preços regulares para novas contratações.</p>}
    <section className="grid md:grid-cols-2 gap-5 mt-10" aria-label="Planos promocionais">
      <article className="p-6 rounded-3xl bg-neutral-900 border border-amber-500/30"><h2 className="text-xl font-black">Plano mensal</h2><p className="text-sm text-neutral-400 mt-4">Primeira mensalidade: de R$ 149 por</p><p className="text-5xl font-black text-amber-300 mt-2">R$ 74,90</p><p className="text-base text-neutral-300 mt-4">Depois, R$ 149/mês. Preço promocional somente na primeira mensalidade. Sem fidelidade promocional.</p>{open && <button type="button" onClick={()=>onChoose('MONTHLY')} className="mt-6 w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black">Cadastrar e solicitar oferta mensal</button>}</article>
      <article className="p-6 rounded-3xl bg-neutral-900 border border-amber-500/30"><h2 className="text-xl font-black">Personalizado</h2><p className="text-sm text-neutral-400 mt-4">Implantação: de R$ 990 por</p><p className="text-5xl font-black text-amber-300 mt-2">R$ 495</p><p className="text-base text-neutral-300 mt-4">2 meses sem mensalidade + 8 meses por R$ 74,90/mês. Meses 11 e 12: R$ 149/mês. Fidelidade de 12 meses.</p>{open && <button type="button" onClick={()=>onChoose('PERSONALIZED')} className="mt-6 w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black">Cadastrar e solicitar personalizado</button>}</article>
    </section>
    <section className="p-6 rounded-2xl border border-neutral-700 bg-neutral-900/60 mt-5 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between"><div><h2 className="text-xl font-black">Prefere experimentar primeiro?</h2><p className="text-base text-neutral-300 mt-2">Solicite 30 dias de uso gratuito. Teste e promoção são alternativas.</p></div><button type="button" onClick={()=>onChoose('TRIAL')} className="px-6 py-3 rounded-xl border border-amber-500/50 text-amber-300 font-black shrink-0">Solicitar 30 dias grátis</button></section>
    <section id="politica-descontos" className="mt-12 scroll-mt-24" aria-labelledby="discount-policy-title">
      <h2 id="discount-policy-title" className="text-3xl font-black">Política detalhada dos descontos</h2><p className="text-sm text-neutral-400 mt-3">Versão {ACQUISITION_CAMPAIGN.version} · Campanha {ACQUISITION_CAMPAIGN.id}</p>
      <div className="overflow-x-auto mt-6 rounded-2xl border border-neutral-700"><table className="w-full text-sm text-left"><caption className="text-left p-4 text-base font-bold bg-neutral-900">Cronograma do personalizado · preço regular de R$ 149/mês</caption><thead className="bg-neutral-900 text-neutral-300"><tr><th scope="col" className="p-4">Etapa</th><th scope="col" className="p-4">Valor</th><th scope="col" className="p-4">Condição</th></tr></thead><tbody>{[['Implantação','R$ 495','50% de desconto sobre R$ 990'],['Meses 1 e 2','R$ 0/mês','2 meses de assinatura gratuitos'],['Meses 3 a 10','R$ 74,90/mês','8 mensalidades com preço promocional'],['Meses 11 e 12','R$ 149/mês','Preço regular até concluir a fidelidade'],['Após 12 meses','Conforme contrato vigente','Continuidade pelas condições regulares']].map(([stage,price,condition])=><tr key={stage} className="border-t border-neutral-800"><th scope="row" className="p-4 font-bold">{stage}</th><td className="p-4 text-amber-200 whitespace-nowrap">{price}</td><td className="p-4 text-neutral-300">{condition}</td></tr>)}</tbody></table></div>
      <div className="space-y-5 mt-7">{policySections.map(([title,body])=><article key={title} className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800"><h3 className="text-lg font-black">{title}</h3><p className="text-base text-neutral-300 mt-3 leading-relaxed">{body}</p></article>)}</div>
      <div className="p-6 rounded-2xl border border-neutral-700 mt-5"><h3 className="text-lg font-black">12. Atendimento e demais políticas</h3><p className="text-base text-neutral-300 mt-3">Fornecedor: ATR Studio. Atendimento pelo WhatsApp +55 11 93902-6928 e e-mail atrstudiodesign@gmail.com. Consulte as demais políticas antes de contratar.</p><div className="flex flex-wrap gap-4 mt-4"><a href="https://wa.me/5511939026928?text=Quero%20consultar%20a%20promo%C3%A7%C3%A3o%20do%20ADEGA%20PRO" target="_blank" rel="noreferrer" className="text-amber-300 font-bold underline">Consultar a ATR Studio</a><button type="button" onClick={onReadPolicies} className="text-amber-300 font-bold underline">Consultar fidelidade e indicações</button></div></div>
    </section>
    <div className="mt-10 text-sm text-neutral-400 flex items-center gap-2"><ShieldCheck size={18}/> Solicitação comercial separada dos contratos de clientes ativos.</div>
  </main>;
}
