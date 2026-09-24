import React, { useEffect, useState } from 'react';
import { Wallet, Unlock, Lock, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { CashRegister, CashSession, CashMovement, User } from '../../types';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

interface Props { currentUser: User; currentSession?: CashSession; onSessionUpdated: () => void | Promise<void>; }

export const ProductionCashView: React.FC<Props> = ({ currentUser, currentSession, onSessionUpdated }) => {
  const [registers,setRegisters]=useState<CashRegister[]>([]);
  const [sessions,setSessions]=useState<CashSession[]>([]);
  const [movements,setMovements]=useState<CashMovement[]>([]);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [feedback,setFeedback]=useState('');

  const load=async()=>{
    try {
      const [r,s,m]=await Promise.all([productionDb.getCashRegisters(),productionDb.getCashSessions(),currentSession?productionDb.getCashMovements(currentSession.id):Promise.resolve([])]);
      setRegisters(r); setSessions(s); setMovements(m);
    } catch(e:any){ setError(e?.message||'Falha ao carregar caixa.'); }
  };
  useEffect(()=>{ void load(); },[currentSession?.id]);

  const run=async(fn:()=>Promise<void>)=>{ setBusy(true);setError('');setFeedback('');try{await fn();await onSessionUpdated();await load();}catch(e:any){setError(e?.message||'Operação não concluída.');}finally{setBusy(false);} };

  const open=()=>void run(async()=>{
    const reg=registers.find(r=>r.status==='FECHADO'); if(!reg) throw new Error('Nenhum caixa fechado disponível.');
    const raw=window.prompt('Saldo inicial para '+reg.number+' (R$):','100'); if(raw===null)return;
    const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<0) throw new Error('Saldo inicial inválido.');
    await productionDb.openCashSession(reg.id,currentUser.id,amount); setFeedback('Caixa aberto no servidor.');
  });

  const movement=(type:'SANGRIA'|'SUPRIMENTO')=>void run(async()=>{
    if(!currentSession) throw new Error('Abra o caixa primeiro.');
    const raw=window.prompt((type==='SANGRIA'?'Valor da sangria':'Valor do suprimento')+' (R$):'); if(!raw)return;
    const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<=0) throw new Error('Valor inválido.');
    const reason=window.prompt('Motivo da movimentação:')?.trim()||'';
    await productionDb.registerCashMovement(currentSession.id,type,amount,reason||'Movimentação operacional');
    setFeedback(type==='SANGRIA'?'Sangria registrada.':'Suprimento registrado.');
  });

  const close=()=>void run(async()=>{
    if(!currentSession)return; const raw=window.prompt('Valor contado fisicamente na gaveta (R$):'); if(raw===null)return;
    const counted=Number(raw.replace(',','.')); if(!Number.isFinite(counted)||counted<0) throw new Error('Valor contado inválido.');
    const result:any=await productionDb.closeCashSession(currentSession.id,counted);
    setFeedback('Caixa fechado. Diferença: R$ '+Number(result?.difference||0).toFixed(2));
  });

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
    <PageHeader eyebrow="Frente de loja" title="Caixa & sessões" description="Abertura, fechamento, sangria, suprimento e histórico com trilha auditada." actions={<button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{feedback}</div>}
    {!currentSession ? <EmptyState title={"Nenhuma sessão aberta para "+currentUser.name} description="Abra um caixa para começar a registrar vendas e movimentações financeiras." action={<button disabled={busy} onClick={open} className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs flex items-center gap-2"><Unlock size={15}/>Abrir caixa</button>}/> :
    <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-black text-white">{currentSession.cashRegisterNumber} · ABERTO</div><div className="text-xs text-neutral-500">Operador: {currentSession.operatorName}</div></div><div className="text-right"><div className="text-[10px] text-neutral-500 uppercase">Dinheiro esperado</div><div className="text-2xl font-black text-amber-400">R$ {currentSession.expectedCashInRegister.toFixed(2)}</div></div></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><MetricCard label="Saldo inicial" value={'R$ '+currentSession.initialBalance.toFixed(2)} icon={Wallet}/><MetricCard label="Vendas dinheiro" value={'R$ '+currentSession.totalCashSales.toFixed(2)} icon={ArrowDownLeft} tone="emerald"/><MetricCard label="PIX" value={'R$ '+currentSession.totalPixSales.toFixed(2)} icon={ArrowDownLeft} tone="sky"/><MetricCard label="Cartões" value={'R$ '+(currentSession.totalCardDebitSales+currentSession.totalCardCreditSales).toFixed(2)} icon={Wallet} tone="violet"/></div>
      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-neutral-800"><button disabled={busy} onClick={()=>movement('SANGRIA')} className="px-4 py-2.5 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2"><ArrowUpRight size={15}/>Sangria</button><button disabled={busy} onClick={()=>movement('SUPRIMENTO')} className="px-4 py-2.5 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2"><ArrowDownLeft size={15}/>Suprimento</button><button disabled={busy} onClick={close} className="sm:ml-auto px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black flex items-center justify-center gap-2"><Lock size={15}/>Fechar caixa</button></div>
    </div>}
    <div className="grid lg:grid-cols-2 gap-4">
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="text-sm font-bold text-white mb-3">Movimentações</h2><div className="space-y-2">{movements.length===0?<p className="text-xs text-neutral-500">Nenhuma movimentação.</p>:movements.map(m=><div key={m.id} className="flex justify-between gap-3 text-xs border-b border-neutral-800 pb-2"><span className={m.type==='SANGRIA'?'text-rose-300':'text-emerald-300'}>{m.type} · {m.reason}</span><strong>R$ {m.amount.toFixed(2)}</strong></div>)}</div></section>
      <section className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"><h2 className="text-sm font-bold text-white mb-3">Últimas sessões</h2><div className="space-y-2">{sessions.slice(0,8).map(s=><div key={s.id} className="flex justify-between gap-3 text-xs border-b border-neutral-800 pb-2"><span>{s.cashRegisterNumber} · {new Date(s.openedAt).toLocaleString('pt-BR')}</span><StatusBadge tone={s.status==='ABERTO'?'success':'neutral'}>{s.status}</StatusBadge></div>)}</div></section>
    </div>
  </div>;
};

