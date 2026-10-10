'use strict';
const wa = message => 'https://wa.me/5511939026928?text=' + encodeURIComponent(message);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const format = value => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(value);
const scenarios = {
  standard: {label:'USO DO PLANO',title:'Comece pelo padrão.',description:'Se a operação usa os recursos disponíveis no plano, a referência é a assinatura regular de R$ 149 por mês.',next:'Conhecer os recursos do plano e confirmar se eles atendem à sua loja.',message:'Quero conhecer os recursos do Adega Pro padrão.'},
  configuration: {label:'CONFIGURAÇÃO EXISTENTE',title:'Confira o que já existe.',description:'Usar uma opção disponível é diferente de criar uma função. A configuração fica limitada aos recursos do plano contratado.',next:'Confirmar se o ajuste já existe e se eventual implantação ou configuração assistida está incluída no seu contrato.',message:'Quero confirmar se meu ajuste já existe no Adega Pro e se a configuração está incluída no meu contrato.'},
  integration: {label:'AVALIAÇÃO DE ESCOPO',title:'Integração tem escopo.',description:'Conectar um serviço específico depende de avaliação. Implantação, provedor, configuração ou homologação podem ter condições e cobranças próprias.',next:'Informar o serviço desejado e aprovar as entregas, o investimento e o prazo na proposta.',message:'Quero avaliar uma integração específica no Adega Pro e receber uma proposta com escopo, investimento e prazo.'},
  newflow: {label:'AVALIAÇÃO DE ESCOPO',title:'Seu fluxo precisa de proposta.',description:'Um recurso novo ou um processo feito para a sua operação muda o escopo comercial. O pedido precisa ser avaliado antes da contratação.',next:'Descrever a necessidade. A proposta deve definir entregas, investimento e prazo; adicionais recebem orçamento próprio.',message:'Quero avaliar um novo fluxo para meu negócio no Adega Pro e definir o escopo da personalização.'}
};
$$('[data-scenario]').forEach(button => button.addEventListener('click', () => {
  const state = scenarios[button.dataset.scenario];
  $$('[data-scenario]').forEach(item => {const selected = item === button;item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected));});
  $('#scenario-label').textContent=state.label;$('#scenario-title').textContent=state.title;$('#scenario-description').textContent=state.description;$('#scenario-next').textContent=state.next;$('#scenario-cta').href=wa(state.message);
}));
const referralStates={
  contact:['Ainda depende de conversão.','O contato inicia o processo. O benefício depende de contratação elegível e validação comercial.'],
  converted:['Consulte o benefício do seu contrato.','A conversão validada permite avaliar a concessão. A regra e o valor dependem da modalidade e da versão contratada; não são somados automaticamente à campanha.'],
  extra:['A cota deste mês já foi utilizada.','O limite é de 1 indicação elegível por mês-calendário. A indicação excedente não acumula benefício ou cota para o próximo mês.'],
  duplicate:['Essa indicação não é elegível.','Cliente já existente ou cadastro duplicado não conta como novo cliente elegível para o programa.']
};
$('#referral-stage').addEventListener('change',event=>{const state=referralStates[event.target.value];$('#referral-result-title').textContent=state[0];$('#referral-result-description').textContent=state[1];});
let campaignMode='custom';
const campaignEnd=Date.parse('2027-01-01T23:59:59.999-03:00');
function applyCampaignStatus(){if(Date.now()>campaignEnd){$('.campaign-tag').textContent='Campanha encerrada para novas contratações';$('#campaign-cta').textContent='Consultar condições atuais';$('#campaign-cta').href=wa('Quero consultar as condições atuais do Adega Pro.');$('.section-intro').textContent='O cronograma abaixo registra uma campanha encerrada. Para novas contratações, consulte as condições atuais. Contratos confirmados seguem as condições aceitas.';}}
function monthlyCost(mode,month){return mode==='custom'?(month<=2?0:month<=10?74.9:149):(month===1?74.9:149);}
function updateMonth(){const month=Number($('#month').value);$('#month-label').textContent='mês '+month;$('#month-value').textContent=format(monthlyCost(campaignMode,month));$('#month-note').textContent=campaignMode==='custom'?(month<=2?'Mensalidade gratuita. A implantação de R$ 495 é cobrada separadamente.':month<=10?'Mensalidade com preço promocional. A fidelidade contratada é de 12 meses.':'Mensalidade regular. O cronograma conclui a fidelidade no 12º mês.'):(month===1?'Primeira mensalidade promocional, após confirmação de elegibilidade.':'Mensalidade regular. A campanha mensal não impõe a fidelidade de 12 meses do personalizado.');}
function updateCampaign(mode){
  campaignMode=mode;const custom=mode==='custom';
  $$('[data-campaign]').forEach(item=>{const selected=item.dataset.campaign===mode;item.classList.toggle('active',selected);item.setAttribute('aria-pressed',String(selected));});
  $('#campaign-kicker').textContent=custom?'PERSONALIZADO · FIDELIDADE DE 12 MESES':'MENSAL PADRÃO · SEM FIDELIDADE PROMOCIONAL';
  $('#campaign-heading').textContent=custom?'Implantação + assinatura.':'Desconto na primeira mensalidade.';
  $('#campaign-description').textContent=custom?'Implantação de referência de R$ 990 por R$ 495. As entregas precisam constar do escopo aprovado.':'Primeira mensalidade por R$ 74,90. A segunda e as seguintes custam R$ 149 cada. O desconto é aplicado uma vez.';
  $('#total-label').textContent=custom?'Total nos 12 meses':'Exemplo de 12 mensalidades';
  $('#campaign-total').textContent=format(custom?1392.2:1713.9);
  $('#total-note').textContent=custom?'Implantação + assinatura, sem serviços extras.':'Exemplo de continuidade; não é compromisso de 12 meses.';
  const stages=custom?[['IMPLANTAÇÃO','R$ 495','Valor separado da assinatura.'],['MESES 1–2','R$ 0/mês','Dois meses sem mensalidade.'],['MESES 3–10','R$ 74,90/mês','Oito cobranças promocionais.'],['MESES 11–12','R$ 149/mês','Preço regular até concluir a fidelidade.']]:[['MÊS 1','R$ 74,90','Primeira mensalidade elegível.'],['DO MÊS 2 EM DIANTE','R$ 149/mês','Retorno ao preço regular.']];
  const timeline=$('#timeline');timeline.replaceChildren();
  stages.forEach(([stage,price,note])=>{const block=document.createElement('div');block.className='timeline-stage';const caption=document.createElement('span');caption.textContent=stage;const amount=document.createElement('strong');const parts=price.split('/');amount.textContent=parts[0];if(parts[1]){const unit=document.createElement('span');unit.textContent='/'+parts[1];amount.append(unit);}const body=document.createElement('p');body.textContent=note;block.append(caption,amount,body);timeline.append(block);});
  timeline.style.gridTemplateColumns=custom?'':'repeat(2,minmax(0,1fr))';
  $('#calculation').textContent=custom?'R$ 495 + (8 × R$ 74,90) + (2 × R$ 149) = R$ 1.392,20.':'Se você permanecer por 12 mensalidades: R$ 74,90 + (11 × R$ 149) = R$ 1.713,90.';
  $('#campaign-cta').href=wa(custom?'Quero consultar a disponibilidade da campanha personalizada do Adega Pro de R$ 495.':'Quero consultar a disponibilidade da campanha mensal do Adega Pro de R$ 74,90 na primeira mensalidade.');
  updateMonth();applyCampaignStatus();
}
$$('[data-campaign]').forEach(button=>button.addEventListener('click',()=>updateCampaign(button.dataset.campaign)));
$('#month').addEventListener('input',updateMonth);
const messages={standard:'Quero conhecer o plano padrão do Adega Pro de R$ 149/mês.',custom:'Quero avaliar um pedido de personalização do Adega Pro. Preciso definir escopo, investimento, pagamento e prazo.',referral:'Sou cliente ativo do Adega Pro e quero confirmar qual regra de indicação e benefício se aplica ao meu contrato.',campaign:'Quero consultar disponibilidade, condições e fidelidade da campanha do Adega Pro até 01/01/2027.'};
$('#contact-topic').addEventListener('change',event=>$('#contact-link').href=wa(messages[event.target.value]));
const menu=$('#menu-toggle');const nav=$('#navigation');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
$$('#navigation a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.header')&&menu.getAttribute('aria-expanded')==='true')closeMenu();});
applyCampaignStatus();
