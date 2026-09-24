import React,{useEffect,useMemo,useState} from 'react';
import { Activity, CalendarDays, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
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