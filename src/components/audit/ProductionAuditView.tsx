import React,{useEffect,useMemo,useState} from 'react';
import { Activity, AlertTriangle, CalendarDays, RefreshCw, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

export const ProductionAuditView:React.FC=()=>{
  const[rows,setRows]=useState<any[]>([]);
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  const load=async()=>{
    setBusy(true);setError('');
    try{setRows(await productionDb.getAuditLogs());}
    catch(e:any){setError(e?.message||'Falha ao carregar auditoria.');}
    finally{setBusy(false);}
  };

  useEffect(()=>{void load();},[]);

  const diagnostics=useMemo(()=>{
    const riskTerms=/error|erro|fail|falha|denied|negado|invalid|inválid|exception|blocked|bloquead/i;
    const flagged=rows.filter(r=>riskTerms.test(String(r.action||''))||riskTerms.test(typeof r.details==='string'?r.details:JSON.stringify(r.details||{})));
    const byAction=new Map<string,number>();rows.forEach(r=>byAction.set(String(r.action||'AÇÃO'),(byAction.get(String(r.action||'AÇÃO'))||0)+1));
    const repeated=[...byAction.entries()].filter(([,n])=>n>=5).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const insights:string[]=[];
    if(flagged.length) insights.push(flagged.length+' evento(s) com sinais de erro, bloqueio ou validação recusada.');
    if(repeated.length) insights.push('Ações mais recorrentes: '+repeated.map(([a,n])=>a+' ('+n+')').join(', ')+'.');
    if(!flagged.length) insights.push('Nenhum padrão explícito de erro foi detectado nos eventos carregados.');
    insights.push('Este diagnóstico é automático e local; a camada de IA generativa poderá aprofundar causas e recomendações quando o provedor seguro estiver conectado.');
    return {flagged:flagged.length,insights};
  },[rows]);

  const stats=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    return {
      total:rows.length,
      today:rows.filter(r=>String(r.created_at||'').slice(0,10)===today).length,
      actions:new Set(rows.map(r=>r.action).filter(Boolean)).size,
      users:new Set(rows.map(r=>r.user_id||r.operator_ref).filter(Boolean)).size
    };
  },[rows]);

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
    <PageHeader eyebrow="Segurança & conformidade" title="Auditoria" description="Trilha append-only das ações registradas no ambiente real da empresa atual." actions={
      <button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2">
        <RefreshCw size={14}/>{busy?'Atualizando...':'Atualizar'}
      </button>
    }/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}

    <section className="p-4 rounded-2xl border border-sky-800/50 bg-sky-950/20">
      <div className="flex items-center gap-2 text-sky-300 font-black text-sm"><Sparkles size={16}/>Diagnóstico automático</div>
      <div className="grid sm:grid-cols-[120px_1fr] gap-4 mt-3"><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-[10px] text-neutral-500">Sinais de atenção</div><div className={'text-2xl font-black mt-1 '+(diagnostics.flagged?'text-amber-400':'text-emerald-400')}>{diagnostics.flagged}</div></div><div className="space-y-2">{diagnostics.insights.map((x,i)=><div key={i} className="text-xs text-neutral-300 flex gap-2"><AlertTriangle size={13} className="text-sky-400 shrink-0 mt-0.5"/><span>{x}</span></div>)}</div></div>
    </section>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard label="Eventos" value={stats.total} icon={ShieldCheck}/>
      <MetricCard label="Hoje" value={stats.today} icon={CalendarDays} tone="emerald"/>
      <MetricCard label="Tipos de ação" value={stats.actions} icon={Activity} tone="amber"/>
      <MetricCard label="Usuários/operadores" value={stats.users} icon={UserRound} tone="violet"/>
    </div>

    {rows.length===0?<EmptyState title="Nenhum evento de auditoria" description="Os eventos aparecerão aqui conforme ações auditáveis forem executadas no sistema."/>:
    <section className="ap-panel overflow-hidden">
      <div className="p-4 border-b border-neutral-800"><h2 className="font-black text-white">Eventos recentes</h2><p className="text-[10px] text-neutral-500 mt-1">Registros do tenant autenticado, ordenados do mais recente.</p></div>
      <div className="divide-y divide-neutral-800">
        {rows.map(r=><div key={r.id} className="p-3 sm:p-4 grid md:grid-cols-[170px_170px_1fr_auto] gap-2 md:items-center hover:bg-neutral-800/20">
          <span className="text-[10px] text-neutral-500">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
          <span className="font-mono text-[10px] text-amber-400">{r.action||'AÇÃO'}</span>
          <div className="min-w-0"><div className="text-xs text-neutral-200 truncate">{r.entity||'Sistema'} · {r.entity_id||'—'}</div>{r.details&&<div className="text-[10px] text-neutral-500 mt-1 line-clamp-2">{typeof r.details==='string'?r.details:JSON.stringify(r.details)}</div>}</div>
          <StatusBadge tone="info">auditado</StatusBadge>
        </div>)}
      </div>
    </section>}
  </div>;
};