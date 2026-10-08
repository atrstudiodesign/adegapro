import React, { useState } from 'react';
export const PARTNER_POLICY_VERSION = '2026.10.08-r7';
export const COMMISSION_PLANS = [
  {id:'MONTHLY149',label:'Mensal regular',price:149,commission:49,type:'ASSINATURA'},
  {id:'MONTHLY7490',label:'Mensal promocional',price:74.9,commission:30,type:'ASSINATURA'},
  {id:'CUSTOM990',label:'Personalizado R$ 990',price:990,commission:250,type:'PERSONALIZADO'},
  {id:'CUSTOM495',label:'Personalizado promocional à vista',price:495,commission:150,type:'PERSONALIZADO'},
  {id:'CUSTOM800',label:'Personalizado 2 × R$ 400',price:800,commission:200,type:'PERSONALIZADO'},
] as const;
export function calculatePartnerCommission(plan:string,received:number) {
 const rule=COMMISSION_PLANS.find(p=>p.id===plan);
 if(!rule||!Number.isFinite(received)||received<0) return 0;
 return Math.round(received*100)===Math.round(rule.price*100)?rule.commission:0;
}
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function PartnerCommissionPolicy(){
 const [regular,setRegular]=useState(0),[promo,setPromo]=useState(0);
 return <section className="p-5 rounded-2xl border border-amber-500/30 bg-neutral-950 my-5">
 <h2 className="font-black text-lg text-amber-300">Comissões e regras comerciais</h2><p className="text-xs text-neutral-400 mt-2">Versão {PARTNER_POLICY_VERSION}. Valores fixos sobre pagamentos efetivamente confirmados. Histórico anterior preservado.</p>
 <div className="overflow-x-auto mt-4"><table className="w-full text-sm min-w-[540px] text-left"><thead><tr><th className="p-2">Plano / pagamento do cliente</th><th className="p-2">Comissão</th><th className="p-2">Saldo bruto ATR</th></tr></thead><tbody>{COMMISSION_PLANS.map(p=><tr key={p.id} className="border-t border-neutral-800"><td className="p-2">{p.label}: {money(p.price)}</td><td className="p-2 text-amber-300 font-bold">{money(p.commission)} {p.type==='ASSINATURA'?'por mês pago':'uma vez por cliente'}</td><td className="p-2">{money(p.price-p.commission)}</td></tr>)}</tbody></table></div>
 <p className="text-xs text-neutral-500 mt-2">Saldo bruto = recebimento − comissão, antes de taxas, impostos e custos. Não representa lucro líquido.</p>
 <ol className="list-decimal pl-5 space-y-2 text-sm text-neutral-300 mt-5">
 <li>Assinaturas geram comissão mensal enquanto o cliente indicado mantém a assinatura e paga a competência. R$ 149 gera R$ 49; R$ 74,90 gera R$ 30. Ao voltar ao preço regular, vale R$ 49. Meses gratuitos, teste, inadimplência e cobranças não pagas geram R$ 0.</li>
 <li>Implantação é comissão única, sem repetição por parcelas ou troca de plano: R$ 990 quitados gera R$ 250; R$ 495 à vista gera R$ 150; R$ 800 em duas parcelas de R$ 400 gera R$ 200 após quitação das duas. A primeira parcela fica registrada, sem comissão liberada.</li>
 <li>Implantação e mensalidade são eventos distintos. O personalizado pode gerar comissão mensal sobre a assinatura paga depois dos meses gratuitos. Cada recebimento exige comprovante/referência própria e cada mensalidade exige competência identificada.</li>
 <li>As condições promocionais exigem contratação elegível confirmada de 08/10 até 12/10/2026 às 23h59 (Brasília), no limite conjunto de 15 novos clientes, e validação comercial da ATR. Cadastro não reserva vaga. Benefícios confirmados seguem o cronograma contratado.</li>
 <li>A indicação precisa estar vinculada ao vendedor antes da contratação. Duplicidade de cliente, competência, comprovante ou implantação não gera nova comissão. A ATR valida identidade do cliente, vínculo, pagamento, disponibilidade promocional e dados do vendedor.</li>
 <li>Repasse imediato ou fechamento mensal segue o cadastro aprovado. Cadastro, orçamento ou promessa de pagamento não geram saldo disponível. Não há salário, exclusividade ou garantia de renda.</li>
 <li>Cancelamento interrompe comissões futuras sem apagar o histórico. Estornos, fraude e divergências exigem ajuste administrativo documentado; comissões pagas não são recalculadas ou reabertas automaticamente. Esta versão rege novos recebimentos, sem pagamentos retroativos automáticos.</li>
 <li>O vendedor consulta apenas seus próprios registros. A confirmação do recebimento e a liberação financeira são feitas pela ATR no ATR Control. A nova versão deve ser lida antes do aceite específico.</li>
 </ol>
 <div className="mt-5 p-4 rounded-xl border border-neutral-800"><h3 className="font-bold text-sm">Simulador de comissão mensal</h3><div className="grid sm:grid-cols-2 gap-3 mt-3"><label className="text-xs">Mensalidades de R$ 149 pagas<input type="number" min="0" step="1" value={regular} onChange={e=>setRegular(Math.max(0,Math.floor(Number(e.target.value)||0)))} className="block mt-1 w-full bg-neutral-900 rounded p-2"/></label><label className="text-xs">Mensalidades de R$ 74,90 pagas<input type="number" min="0" step="1" value={promo} onChange={e=>setPromo(Math.max(0,Math.floor(Number(e.target.value)||0)))} className="block mt-1 w-full bg-neutral-900 rounded p-2"/></label></div><p className="text-amber-300 font-bold mt-3">{regular} × R$ 49 + {promo} × R$ 30 = {money(regular*49+promo*30)}</p><p className="text-xs text-neutral-500 mt-2">Simulação informativa. O saldo real do dashboard vem dos recebimentos validados.</p></div>
 </section>;
}

export function PartnerReceiptLedger({rows}:{rows:any[]}){return <section className="p-4 my-4 border border-neutral-800 rounded-xl"><h2 className="font-bold">Recebimentos confirmados e parcelas</h2><p className="text-xs text-neutral-400 mt-1">Até 1.000 registros recentes. A primeira parcela de R$ 400 aparece aqui; a comissão de R$ 200 é liberada quando o total chega a R$ 800.</p><div className="overflow-x-auto mt-3"><table className="w-full min-w-[600px] text-xs text-left"><thead><tr><th className="p-2">Modalidade</th><th className="p-2">Competência</th><th className="p-2">Recebido</th><th className="p-2">Total da contratação</th><th className="p-2">Comissão</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-neutral-800"><td className="p-2">{COMMISSION_PLANS.find(p=>p.id===r.plan)?.label||r.plan}</td><td className="p-2">{r.period}</td><td className="p-2">{money(Number(r.amount))}</td><td className="p-2">{money(Number(r.received_total))}</td><td className="p-2">{r.commission_id?`${money(Number(r.amount_due))} · ${r.commission_status}`:'Aguardando quitação'}</td></tr>)}</tbody></table>{rows.length===0&&<p className="text-xs text-neutral-500 py-3">Nenhum recebimento desta política confirmado.</p>}</div></section>;}
