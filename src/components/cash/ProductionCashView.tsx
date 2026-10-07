import React, { useEffect, useState } from 'react';
import { Wallet, Unlock, Lock, ArrowUpRight, ArrowDownLeft, RefreshCw, X, Receipt, TrendingUp, UserRound, Printer, Download, Share2, Pencil, Ban, StickyNote, Bell, Calculator } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { saveCashClosingReport } from '../../services/cashClosing';
import type { CashRegister, CashSession, CashMovement, User } from '../../types';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';
import { adegaPrompt } from '../ui/AdegaDialog';

interface Props { currentUser: User; currentSession?: CashSession; onSessionUpdated: () => void | Promise<void>; }

export const ProductionCashView: React.FC<Props> = ({ currentUser, currentSession, onSessionUpdated }) => {
  const [registers,setRegisters]=useState<CashRegister[]>([]);
  const [sessions,setSessions]=useState<CashSession[]>([]);
  const [movements,setMovements]=useState<CashMovement[]>([]);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [feedback,setFeedback]=useState('');
  const [selected,setSelected]=useState<any>(null); const [detailBusy,setDetailBusy]=useState(false); const [auditResult,setAuditResult]=useState<any>(null); const [closing,setClosing]=useState<any>(null);

  const load=async()=>{
    try {
      const [r,s,m]=await Promise.all([productionDb.getCashRegisters(),productionDb.getCashSessions(),currentSession?productionDb.getCashMovements(currentSession.id):Promise.resolve([])]);
      setRegisters(r); setSessions(s); setMovements(m);
    } catch(e:any){ setError(e?.message||'Falha ao carregar caixa.'); }
  };
  useEffect(()=>{ void load(); },[currentSession?.id]);

  const openSessionDetails=async(session:CashSession)=>{setDetailBusy(true);setError('');setAuditResult(null);try{setSelected(await productionDb.getCashSessionDetails(session.id));}catch(e:any){setError(e?.message||'Não foi possível abrir o histórico deste caixa.');}finally{setDetailBusy(false);}};
  const money=(v:any)=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const sessionReportHtml=(d:any)=>{
    const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,(ch)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' } as Record<string,string>)[ch]||ch);
    const opened=new Date(d.session.openedAt);
    const closed=d.session.closedAt?new Date(d.session.closedAt):null;
    const payments=d.metrics.paymentTotals||{};
    const pix=Number(payments.PIX||0);
    const debit=Number(payments.DEBITO||0);
    const credit=Number(payments.CREDITO||0);
    const sangria=Number(d.metrics.sangrias||0);
    const expenses=Number(d.session.totalExpenses||0);
    const totalMov=Number((sangria+pix+debit+credit+expenses).toFixed(2));
    const storeName=String(d.store?.trade_name||d.store?.legal_name||'ADEGA PRO').toUpperCase();
    const turno=`${d.session.cashRegisterNumber} · ${opened.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}${closed?' - '+closed.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''}`;
    const observations=d.session.closureNotes||'';
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Folha de fechamento - ${esc(d.session.operatorName)}</title>
<style>
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:16mm 16mm 14mm;position:relative;background:#fff}
.header{text-align:center}
.header h1{margin:0;font-size:20pt;line-height:1.05;font-weight:800;letter-spacing:.1px}
.header h2{margin:5mm 0 9mm;font-size:14pt;line-height:1;font-weight:800}
.meta{display:grid;grid-template-columns:1fr 1fr;column-gap:14mm;row-gap:5mm;margin-bottom:13mm;font-size:12pt}
.meta .name{grid-column:1 / -1}
.field{display:flex;align-items:flex-end;gap:4mm}
.label{font-weight:700;white-space:nowrap}
.line{flex:1;min-height:7mm;border-bottom:1px solid #111;padding:0 1mm 1.2mm;font-size:11pt}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #111;height:15mm;padding:3mm 2mm;font-size:11.5pt}
th{background:#d0d0d0;font-weight:800;text-align:left}
th:last-child{text-align:center}
td:first-child{width:60%}
td:last-child{width:40%;text-align:center;font-weight:600}
.total-row td{font-weight:800;background:#f4f4f4}
.obs{margin-top:10mm;border:1px solid #111;height:78mm}
.obs-title{height:12mm;background:#d0d0d0;border-bottom:1px solid #111;padding:3mm 2mm;font-size:11.5pt;font-weight:800}
.obs-body{padding:4mm;font-size:11pt;white-space:pre-wrap;line-height:1.45}
.responsible-page{display:flex;align-items:flex-start;padding-top:18mm;font-size:11.5pt}
.responsible{width:100%;display:flex;align-items:flex-end;gap:3mm}
.responsible .line{min-height:6mm}
.small-note{position:absolute;left:16mm;right:16mm;bottom:8mm;font-size:7.5pt;color:#666;text-align:center}
@media print{.page{margin:0;page-break-after:always}.page:last-child{page-break-after:auto}}
</style>
</head>
<body>
<section class="page">
  <div class="header">
    <h1>${esc(storeName)}</h1>
    <h2>FOLHA DE FECHAMENTO DE CAIXA</h2>
  </div>

  <div class="meta">
    <div class="field name"><span class="label">Nome:</span><span class="line">${esc(d.session.operatorName)}</span></div>
    <div class="field"><span class="label">Data:</span><span class="line">${esc(opened.toLocaleDateString('pt-BR'))}</span></div>
    <div class="field"><span class="label">Turno:</span><span class="line">${esc(turno)}</span></div>
  </div>

  <table>
    <thead><tr><th>MOVIMENTAÇÃO DO CAIXA</th><th>VALOR (R$)</th></tr></thead>
    <tbody>
      <tr><td>Vendas</td><td>${money(d.metrics.total)}</td></tr>
      <tr><td>Sangria</td><td>${money(sangria)}</td></tr>
      <tr><td>Pix</td><td>${money(pix)}</td></tr>
      <tr><td>Débito</td><td>${money(debit)}</td></tr>
      <tr><td>Crédito</td><td>${money(credit)}</td></tr>
      <tr><td>Despesas</td><td>${money(expenses)}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td>${money(totalMov)}</td></tr>
      <tr class="total-row"><td>DIFERENÇA</td><td>${money(d.session.cashDifference||0)}</td></tr>
    </tbody>
  </table>

  <div class="obs">
    <div class="obs-title">OBSERVAÇÕES</div>
    <div class="obs-body">${esc(observations)}</div>
  </div>
  <div class="small-note">Gerado pelo Adega Pro a partir do turno registrado no sistema.</div>
</section>

<section class="page responsible-page">
  <div class="responsible">
    <span class="label">Responsável pelo fechamento:</span>
    <span class="line">${esc(d.session.operatorName)}</span>
  </div>
</section>
</body>
</html>`;
  };
  const printSession=()=>{if(!selected)return;const w=window.open('','_blank','width=900,height=900');if(!w)return setError('Permita pop-ups para imprimir.');w.document.write(sessionReportHtml(selected));w.document.close();w.print();};
  const downloadSession=()=>{if(!selected)return;const blob=new Blob([sessionReportHtml(selected)],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`folha-fechamento-${selected.session.operatorName}-${selected.session.id}.html`;a.click();URL.revokeObjectURL(url);setFeedback('Relatório baixado. Abra e use Imprimir > Salvar como PDF.');};
  const shareSession=async()=>{if(!selected)return;const text=`Turno ${selected.session.operatorName} · ${selected.metrics.salesCount} vendas · ${money(selected.metrics.total)} · ${new Date(selected.session.openedAt).toLocaleString('pt-BR')}`;try{if(navigator.share)await navigator.share({title:'Histórico do turno',text});else await navigator.clipboard.writeText(text);setFeedback('Resumo do turno compartilhado.');}catch(e:any){if(e?.name!=='AbortError')setError('Não foi possível compartilhar.');}};
  const auditSession=async()=>{if(!selected)return;setDetailBusy(true);setError('');try{const r=await productionDb.auditCashSession(selected.session.id);setAuditResult(r);setFeedback('Auditoria administrativa concluída: '+r.status+'.');}catch(e:any){setError(e?.message||'Não foi possível auditar o turno.');}finally{setDetailBusy(false);}};
  const operatorVoucher=async()=>{if(!selected)return;const raw=await adegaPrompt({title:'Vale Operador',message:'Registro administrativo no RH. Não altera nem reabre o caixa.',label:'Valor do vale (R$)',inputMode:'decimal',confirmLabel:'Continuar'});if(raw===null)return;const amount=Number(raw.replace(',','.'));if(!Number.isFinite(amount)||amount<=0)return setError('Valor do vale inválido.');const reason=(await adegaPrompt({title:'Vale Operador',label:'Motivo obrigatório',confirmLabel:'Registrar vale'}))?.trim();if(!reason)return;await run(async()=>{await productionDb.registerHrOperatorVoucher(selected.session.operatorId,selected.session.id,amount,reason);setFeedback('Vale Operador registrado no RH sem alterar o caixa.');});};
  const noteSession=async()=>{if(!selected)return;const note=(await adegaPrompt({title:'Anotação do turno',label:'Anotação',confirmLabel:'Salvar anotação'}))?.trim();if(!note)return;const alert=confirm('Deseja marcar esta anotação também como alerta administrativo?');await run(async()=>{await productionDb.addCashSessionAdminNote(selected.session.id,note,alert);setFeedback(alert?'Anotação e alerta registrados.':'Anotação registrada.');});};
  const amendSession=async()=>{if(!selected)return;const notes=(await adegaPrompt({title:'Alterar observação administrativa',label:'Observação do turno',defaultValue:selected.session.closureNotes||'',confirmLabel:'Continuar'}))??null;if(notes===null)return;const reason=(await adegaPrompt({title:'Auditoria',label:'Motivo obrigatório da alteração',confirmLabel:'Alterar'}))?.trim();if(!reason)return;await run(async()=>{await productionDb.adminAmendCashSession(selected.session.id,'ALTERAR',notes,reason);setSelected(await productionDb.getCashSessionDetails(selected.session.id));setFeedback('Observação alterada com auditoria.');});};
  const cancelSessionRecord=async()=>{if(!selected)return;const reason=(await adegaPrompt({title:'Cancelar registro administrativo',message:'As vendas e movimentos financeiros NÃO serão apagados.',label:'Motivo obrigatório',confirmLabel:'Cancelar registro'}))?.trim();if(!reason)return;await run(async()=>{await productionDb.adminAmendCashSession(selected.session.id,'CANCELAR','',reason);setSelected(await productionDb.getCashSessionDetails(selected.session.id));setFeedback('Registro administrativo cancelado; financeiro preservado.');});};
  const correctExpense=async()=>{if(!selected)return;const current=Number(selected.session.totalExpenses||0);const raw=await adegaPrompt({title:'Corrigir despesa do turno',message:'Somente ADM/Gerente. A correção não apaga o valor anterior e fica registrada na auditoria.',label:'Valor correto da despesa (R$)',defaultValue:current.toFixed(2),inputMode:'decimal',confirmLabel:'Continuar'});if(raw===null)return;const amount=Number(raw.replace(',','.'));if(!Number.isFinite(amount)||amount<0)return setError('Valor de despesa inválido.');const reason=(await adegaPrompt({title:'Justificativa da correção',message:`Valor anterior: ${money(current)} · Novo valor: ${money(amount)}`,label:'Motivo obrigatório',confirmLabel:'Aplicar correção'}))?.trim();if(!reason)return;await run(async()=>{const r:any=await productionDb.adminCorrectCashExpense(selected.session.id,amount,reason);setSelected(await productionDb.getCashSessionDetails(selected.session.id));setFeedback(`Despesa corrigida de ${money(r.old_expense)} para ${money(r.expense)}. Novo saldo: ${money(r.balance)}.`);});};


  const run=async(fn:()=>Promise<void>)=>{ setBusy(true);setError('');setFeedback('');try{await fn();await onSessionUpdated();await load();}catch(e:any){setError(e?.message||'Operação não concluída.');}finally{setBusy(false);} };

  const open=()=>void run(async()=>{
    // Never trust the cached cash_registers.status alone: another operator may have opened
    // the register moments ago. Cross-check live sessions already loaded for this store.
    const occupiedIds=new Set(sessions.filter(s=>s.status==='ABERTO').map(s=>s.cashRegisterId));
    const freeRegisters=registers.filter(r=>r.status==='FECHADO'&&!occupiedIds.has(r.id));
    if(!freeRegisters.length){
      const occupied=sessions.filter(s=>s.status==='ABERTO').map(s=>`${s.cashRegisterNumber} · ${s.operatorName||'Operador'}`).join(' | ');
      throw new Error(occupied?`Todos os caixas estão em uso: ${occupied}. Revise o turno antes de abrir outro caixa.`:'Nenhum caixa fechado disponível.');
    }
    const reg=freeRegisters[0];
    const raw=await adegaPrompt({title:'Abrir caixa',message:reg.number+' · disponível',label:'Saldo inicial (R$)',defaultValue:'100',inputMode:'decimal',confirmLabel:'Abrir caixa'}); if(raw===null)return;
    const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<0) throw new Error('Saldo inicial inválido.');
    try{
      await productionDb.openCashSession(reg.id,currentUser.id,amount);
    }catch(e:any){
      if(String(e?.message||'').toLowerCase().includes('cash register already open')){
        await load();
        throw new Error('Este caixa acabou de ser aberto por outro operador. A lista foi atualizada; escolha um caixa disponível.');
      }
      throw e;
    }
    setFeedback('Caixa aberto no servidor.');
  });

  const movement=(type:'SANGRIA'|'SUPRIMENTO')=>void run(async()=>{
    if(!currentSession) throw new Error('Abra o caixa primeiro.');
    const raw=await adegaPrompt({title:type==='SANGRIA'?'Registrar sangria':'Registrar suprimento',label:'Valor (R$)',inputMode:'decimal',confirmLabel:'Continuar'}); if(!raw)return;
    const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<=0) throw new Error('Valor inválido.');
    const reason=(await adegaPrompt({title:type==='SANGRIA'?'Registrar sangria':'Registrar suprimento',label:'Motivo da movimentação',confirmLabel:'Registrar'}))?.trim()||'';
    await productionDb.registerCashMovement(currentSession.id,type,amount,reason||'Movimentação operacional');
    setFeedback(type==='SANGRIA'?'Sangria registrada.':'Suprimento registrado.');
  });

  const reverseMovement=(m:CashMovement)=>void run(async()=>{const reason=(await adegaPrompt({title:'Estornar '+m.type,label:'Motivo obrigatório do estorno',confirmLabel:'Confirmar estorno'}))?.trim();if(!reason)return;await productionDb.reverseCashMovement(m.id,reason);setFeedback(m.type+' estornada com trilha de auditoria.');});

  const askAmount=async(title:string,label:string,def='0')=>{const raw=await adegaPrompt({title,label,defaultValue:def,inputMode:'decimal',confirmLabel:'Continuar'});if(raw===null)return null;const n=Number(raw.replace(',','.'));if(!Number.isFinite(n)||n<0)throw new Error('Valor inválido em '+label+'.');return n;};
  const reconcile=()=>void run(async()=>{if(!currentSession)return;const pix=await askAmount('1/2 · Conciliação das vendas','PIX recebido nas vendas','0');if(pix===null)return;const debit=await askAmount('1/2 · Conciliação das vendas','Débito recebido nas vendas','0');if(debit===null)return;const credit=await askAmount('1/2 · Conciliação das vendas','Crédito recebido nas vendas','0');if(credit===null)return;const cash=await askAmount('1/2 · Conciliação das vendas','Dinheiro recebido nas vendas','0');if(cash===null)return;const r=await saveCashClosingReport(currentSession.id,pix,debit,credit,cash);setClosing(r);setFeedback(`Conciliação validada: vendas ${money(r.sales)} = recebimentos ${money(r.receipts)}. Agora faça a contagem física do dinheiro em caixa.`);});
  const close=()=>void run(async()=>{if(!currentSession)return;if(!closing)throw new Error('Faça primeiro a conciliação das vendas.');if(Math.abs(Number(closing.reconciliation_difference||0))>.01)throw new Error('A conciliação não está zerada. Revise os recebimentos antes de fechar.');const countedCash=await askAmount('2/2 · Contagem física','Dinheiro contado fisicamente no caixa',Number(closing.expected_physical_cash||0).toFixed(2));if(countedCash===null)return;const physicalDifference=Number((countedCash-Number(closing.expected_physical_cash||0)).toFixed(2));const notes=physicalDifference===0?'':((await adegaPrompt({title:'Diferença física do caixa',message:`Esperado: ${money(closing.expected_physical_cash)} · Contado: ${money(countedCash)} · Diferença: ${money(physicalDifference)}`,label:'Observação da diferença',confirmLabel:'Fechar com diferença'}))?.trim()||'Diferença física registrada no fechamento');const result:any=await productionDb.closeCashSession(currentSession.id,countedCash,notes);setFeedback(`Caixa fechado. Esperado físico: ${money(result?.expected_physical_cash)} · Contado: ${money(result?.counted_cash)} · Diferença física: ${money(result?.physical_cash_difference)}.`);setClosing(null);});

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
    <PageHeader eyebrow="Frente de loja" title="Caixa & sessões" description="Abertura, fechamento, sangria, suprimento e histórico com trilha auditada." actions={<button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{feedback}</div>}
    {!currentSession ? <EmptyState title={"Nenhuma sessão aberta para "+currentUser.name} description="Abra um caixa para começar a registrar vendas e movimentações financeiras." action={<button disabled={busy} onClick={open} className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs flex items-center gap-2"><Unlock size={15}/>Abrir caixa</button>}/> :
    <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black text-white">{currentSession.cashRegisterNumber} · ABERTO</div><div className="text-xs text-neutral-500">Operador: {currentSession.operatorName}</div></div><div className="text-right"><div className="text-[10px] text-neutral-500 uppercase">Vendas do turno</div><div className="text-2xl font-black text-amber-400">{money(currentSession.totalSales)}</div></div></div>
      <div className="grid grid-cols-2 gap-3"><MetricCard label="Vendas" value={money(currentSession.totalSales)} icon={Receipt} tone="emerald"/><MetricCard label="Sangria" value={money(currentSession.totalSangrias)} icon={ArrowUpRight} tone="violet"/></div>
      {closing&&<div className="p-4 rounded-2xl border border-amber-700/50 bg-amber-950/20"><div className="text-xs font-black text-amber-300 flex gap-2 items-center"><Calculator size={15}/>1/2 · CONCILIAÇÃO VALIDADA</div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs"><div>Vendas <b>{money(closing.sales)}</b></div><div>Recebimentos <b>{money(closing.receipts)}</b></div><div>PIX <b>{money(closing.pix)}</b></div><div>Débito <b>{money(closing.debit)}</b></div><div>Crédito <b>{money(closing.credit)}</b></div><div>Dinheiro/vendas <b>{money(closing.cash_reported)}</b></div><div>Despesas caixa <b>{money(closing.expenses)}</b></div><div className={Math.abs(Number(closing.reconciliation_difference||0))<=.01?'text-emerald-300':'text-rose-300'}>Dif. conciliação <b>{money(closing.reconciliation_difference)}</b></div><div>Saldo inicial <b>{money(currentSession.initialBalance)}</b></div><div>Suprimentos <b>{money(closing.supplies)}</b></div><div>Sangrias <b>{money(closing.withdrawals)}</b></div><div className="text-sky-300">Esperado físico <b>{money(closing.expected_physical_cash)}</b></div></div><p className="mt-3 text-[10px] text-neutral-400">Etapa 2: conte somente o dinheiro físico existente no caixa. A diferença física não altera a conciliação das vendas.</p></div>}
      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-neutral-800"><button disabled={busy} onClick={()=>movement('SANGRIA')} className="px-4 py-2.5 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2"><ArrowUpRight size={15}/>Sangria</button><button disabled={busy} onClick={()=>movement('SUPRIMENTO')} className="px-4 py-2.5 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2"><ArrowDownLeft size={15}/>Suprimento</button><button disabled={busy} onClick={reconcile} className="px-4 py-2.5 rounded-xl border border-amber-700 text-amber-300 text-xs font-black flex items-center justify-center gap-2"><Calculator size={15}/>1/2 Conciliar vendas</button><button disabled={busy||!closing} onClick={close} className="sm:ml-auto px-4 py-2.5 rounded-xl bg-rose-600 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-2"><Lock size={15}/>2/2 Contar e fechar</button></div>
    </div>}
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="text-sm font-bold text-white mb-3">Movimentações</h2><div className="space-y-2">{movements.length===0?<p className="text-xs text-neutral-500">Nenhuma movimentação.</p>:movements.map(m=><div key={m.id} className="flex items-center justify-between gap-3 text-xs border-b border-neutral-800 pb-2"><span className={m.type==='SANGRIA'?'text-rose-300':'text-emerald-300'}>{m.type} · {m.reason}</span><div className="flex items-center gap-2"><strong>R$ {m.amount.toFixed(2)}</strong>{!String(m.reason||'').startsWith('ESTORNO:')&&currentSession?.status==='ABERTO'&&<button disabled={busy} onClick={()=>reverseMovement(m)} className="px-2 py-1 rounded-lg border border-amber-800 text-amber-300 text-[10px] font-black">ESTORNAR</button>}</div></div>)}</div></section>
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="text-sm font-bold text-white mb-1">Últimas sessões</h2><p className="text-[10px] text-neutral-500 mb-3">Administrador e gerente podem tocar em um turno para consultar vendas, meios de pagamento, sangrias, suprimentos e fechamento daquele operador.</p><div className="space-y-2">{sessions.slice(0,12).map(s=><button type="button" disabled={detailBusy} onClick={()=>void openSessionDetails(s)} key={s.id} className="w-full flex justify-between items-center gap-3 text-xs border-b border-neutral-800 pb-2 text-left hover:bg-neutral-800/40 rounded-lg px-1 py-2"><span><strong className="text-white">{s.cashRegisterNumber}</strong> · <span className="text-amber-300 font-bold">{s.operatorName||'Operador'}</span> · {new Date(s.openedAt).toLocaleString('pt-BR')}</span><StatusBadge tone={s.status==='ABERTO'?'success':'neutral'}>{s.status}</StatusBadge></button>)}</div></section>
    </div>
    {selected&&<div className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"><div className="max-w-5xl mx-auto rounded-3xl border border-neutral-700 bg-neutral-950 shadow-2xl overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-neutral-800"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-amber-400 font-black">Histórico do turno</div><h2 className="text-xl font-black text-white mt-1">{selected.session.cashRegisterNumber} · {selected.session.operatorName}</h2><div className="text-xs text-neutral-500 mt-1">{new Date(selected.session.openedAt).toLocaleString('pt-BR')} {selected.session.closedAt?'→ '+new Date(selected.session.closedAt).toLocaleString('pt-BR'):'· em andamento'}</div></div><button type="button" onClick={()=>setSelected(null)} className="w-10 h-10 rounded-xl border border-neutral-700 grid place-items-center text-neutral-300"><X size={18}/></button></div><div className="flex flex-wrap gap-2 mt-4"><button disabled={detailBusy} onClick={()=>void auditSession()} className="px-3 py-2 rounded-xl border border-sky-800 bg-sky-950/30 text-sky-300 text-xs font-black flex gap-2 items-center"><Bell size={14}/>Auditar turno</button><button disabled={detailBusy} onClick={()=>void operatorVoucher()} className="px-3 py-2 rounded-xl border border-amber-700 bg-amber-950/30 text-amber-300 text-xs font-black flex gap-2 items-center"><Wallet size={14}/>Vale Operador</button><button onClick={printSession} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex gap-2 items-center"><Printer size={14}/>Imprimir / PDF</button><button onClick={downloadSession} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex gap-2 items-center"><Download size={14}/>Download</button><button onClick={()=>void shareSession()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex gap-2 items-center"><Share2 size={14}/>Compartilhar</button><button onClick={()=>void noteSession()} className="px-3 py-2 rounded-xl border border-amber-800 text-amber-300 text-xs flex gap-2 items-center"><StickyNote size={14}/>Anotação / alerta</button><button onClick={()=>void correctExpense()} className="px-3 py-2 rounded-xl border border-emerald-800 text-emerald-300 text-xs flex gap-2 items-center"><Calculator size={14}/>Corrigir despesa</button><button onClick={()=>void amendSession()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs flex gap-2 items-center"><Pencil size={14}/>Alterar</button><button onClick={()=>void cancelSessionRecord()} className="px-3 py-2 rounded-xl border border-rose-800 text-rose-300 text-xs flex gap-2 items-center"><Ban size={14}/>Cancelar</button></div></div>
      <div className="p-4 sm:p-5 space-y-5">
        {auditResult&&<section className="p-4 rounded-2xl border border-sky-800 bg-sky-950/20"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-white">Auditoria administrativa</h3><StatusBadge tone={auditResult.status==='OK'?'success':auditResult.status==='ATENCAO'?'warning':'danger'}>{auditResult.status}</StatusBadge></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs"><div>Vendas: <b>{money(auditResult.sales_total)}</b></div><div>Recebimentos: <b>{money(auditResult.receipts_total)}</b></div><div className={Math.abs(Number(auditResult.reconciliation_difference||0))<=.01?'text-emerald-300':'text-rose-300'}>Dif. conciliação: <b>{money(auditResult.reconciliation_difference)}</b></div><div>Esperado físico: <b>{money(auditResult.expected_physical_cash)}</b></div><div>Contado: <b>{money(auditResult.counted_cash)}</b></div><div className={Math.abs(Number(auditResult.physical_cash_difference||0))<=.01?'text-emerald-300':'text-rose-300'}>Dif. física: <b>{money(auditResult.physical_cash_difference)}</b></div></div><div className="mt-3 space-y-2">{[...(auditResult.issues||[]),...(auditResult.warnings||[])].length===0?<p className="text-xs text-emerald-300">Nenhuma inconsistência detectada pelos controles automáticos.</p>:[...(auditResult.issues||[]),...(auditResult.warnings||[])].map((x:any,i:number)=><div key={x.code+'-'+i} className="text-xs p-2 rounded-lg border border-neutral-800 bg-neutral-950"><b>{x.code}</b> · {x.message}{x.count!=null?' · '+x.count:''}{x.amount!=null?' · '+money(x.amount):''}</div>)}</div></section>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><MetricCard label="Vendas" value={selected.metrics.salesCount} icon={Receipt}/><MetricCard label="Faturamento" value={money(selected.metrics.total)} icon={TrendingUp} tone="emerald"/><MetricCard label="Ticket médio" value={money(selected.metrics.averageTicket)} icon={Wallet} tone="amber"/><MetricCard label="Diferença caixa" value={money(selected.session.cashDifference||0)} icon={UserRound} tone={Math.abs(Number(selected.session.cashDifference||0))>.01?'rose':'emerald'}/></div>
        <div className="grid md:grid-cols-2 gap-4"><section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"><h3 className="text-sm font-black">Recebimentos</h3><div className="grid grid-cols-2 gap-2 mt-3">{Object.entries(selected.metrics.paymentTotals||{}).map(([method,value]:any)=><div key={method} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">{method}</div><div className="text-sm font-black mt-1">{money(value)}</div></div>)}</div></section><section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"><h3 className="text-sm font-black">Movimentações do caixa</h3><div className="mt-3 space-y-2">{selected.movements.length===0?<p className="text-xs text-neutral-500">Nenhuma sangria ou suprimento neste turno.</p>:selected.movements.map((m:any)=><div key={m.id} className="flex justify-between gap-3 text-xs border-b border-neutral-800 pb-2"><span>{m.movement_type} · {m.reason||'Sem observação'}</span><b>{money(m.amount)}</b></div>)}</div></section></div>
        <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"><h3 className="text-sm font-black">Vendas do operador neste turno</h3><div className="mt-3 space-y-2 max-h-72 overflow-y-auto">{selected.sales.length===0?<p className="text-xs text-neutral-500">Nenhuma venda registrada nesta sessão.</p>:selected.sales.map((sale:any)=><div key={sale.id} className="grid grid-cols-[1fr_auto] gap-3 text-xs border-b border-neutral-800 pb-2"><span>Venda #{sale.sale_number} · {new Date(sale.created_at).toLocaleString('pt-BR')}</span><b>{money(sale.total)}</b></div>)}</div></section>
        {selected.session.status==='FECHADO'&&<div className="p-3 rounded-xl border border-neutral-800 bg-black text-xs text-neutral-400">Fechamento: esperado {money(selected.session.expectedCashInRegister)} · contado {money(selected.session.countedCash||0)} · diferença <b className="text-white">{money(selected.session.cashDifference||0)}</b>{selected.session.closureNotes?' · '+selected.session.closureNotes:''}</div>}
      </div>
    </div></div>}
  </div>;
};

