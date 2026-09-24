import React, { useEffect, useState } from 'react';
import { UserCog, Plus, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState, MetricCard, PageHeader, StatusBadge } from '../ui/ProUi';

type Operator={id:string;name:string;role:string;active:boolean;last_authenticated_at?:string|null};

const FEATURES=[['sales.create','Vender'],['sales.discount','Aplicar desconto'],['sales.cancel','Cancelar venda'],['cash.open','Abrir caixa'],['cash.close','Fechar caixa'],['cash.movement','Sangria / suprimento'],['inventory.adjust','Ajustar estoque'],['products.edit','Editar produtos'],['finance.view','Ver financeiro'],['reports.view','Ver relatórios']] as const;
const ROLE_DEFAULTS:Record<string,string[]>={
  ADMINISTRADOR:FEATURES.map(([k])=>k),
  GERENTE:['sales.create','sales.discount','sales.cancel','cash.open','cash.close','cash.movement','inventory.adjust','products.edit','finance.view','reports.view'],
  CAIXA:['sales.create','cash.movement'],
  ESTOQUISTA:['inventory.adjust','products.edit'],
  FINANCEIRO:['finance.view','reports.view']
};

export const ProductionEmployeesView:React.FC=()=>{
  const [rows,setRows]=useState<Operator[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [feedback,setFeedback]=useState(''); const [featureMap,setFeatureMap]=useState<Record<string,Record<string,boolean>>>({});
  const load=async()=>{setBusy(true);setError('');try{const list=await productionDb.getOperators() as Operator[];setRows(list);const pairs=await Promise.all(list.map(async o=>[o.id,await productionDb.getOperatorFeatures(o.id)] as const));const next:Record<string,Record<string,boolean>>={};for(const[id,features]of pairs){next[id]=Object.fromEntries((features as any[]).map(f=>[f.feature_key,Boolean(f.enabled)]));}setFeatureMap(next);}catch(e:any){setError(e?.message||'Falha ao carregar operadores.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const save=async(existing?:Operator)=>{
    const name=window.prompt('Nome do operador:',existing?.name||'')?.trim(); if(!name)return;
    const role=(window.prompt('Perfil: ADMINISTRADOR, GERENTE, CAIXA, ESTOQUISTA ou FINANCEIRO',existing?.role||'CAIXA')||'CAIXA').toUpperCase();
    if(!['ADMINISTRADOR','GERENTE','CAIXA','ESTOQUISTA','FINANCEIRO'].includes(role)){setError('Perfil inválido.');return;}
    const pin=window.prompt(existing?'Defina um NOVO PIN de 4 a 8 dígitos para confirmar a alteração:':'PIN de 4 a 8 dígitos:')||'';
    if(!/^\d{4,8}$/.test(pin)){setError('O PIN deve conter de 4 a 8 dígitos.');return;}
    setBusy(true);setError('');try{await productionDb.saveOperator({id:existing?.id,name,role,pin,active:existing?.active??true});setFeedback('Operador salvo. O PIN foi enviado somente para hash no servidor.');await load();}catch(e:any){setError(e?.message||'Não foi possível salvar operador.');}finally{setBusy(false);}
  };
  const toggle=async(operatorId:string,key:string,current:boolean)=>{setBusy(true);setError('');try{await productionDb.setOperatorFeature(operatorId,key,!current);setFeedback('Permissão atualizada com auditoria.');await load();}catch(e:any){setError(e?.message||'Não foi possível alterar a permissão.');}finally{setBusy(false);}};
  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
    <PageHeader eyebrow="Administração" title="Operadores & PINs" description="PINs são protegidos no servidor e permissões podem ser ajustadas por operador." actions={<div className="flex gap-2"><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button><button disabled={busy} onClick={()=>void save()} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-2"><Plus size={15}/>Novo operador</button></div>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}{feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{feedback}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><MetricCard label="Operadores" value={rows.length} icon={UserCog}/><MetricCard label="Ativos" value={rows.filter(o=>o.active).length} icon={ShieldCheck} tone="emerald"/><MetricCard label="Caixas" value={rows.filter(o=>o.role==='CAIXA').length} icon={KeyRound}/><MetricCard label="Administradores" value={rows.filter(o=>o.role==='ADMINISTRADOR').length} icon={ShieldCheck} tone="amber"/></div>
    <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start gap-3"><ShieldCheck size={18} className="text-emerald-400 shrink-0"/><p className="text-xs text-neutral-300">Após cinco tentativas inválidas o operador é bloqueado temporariamente. A sessão interna usa token aleatório de curta duração e somente o hash do token é persistido.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{rows.map(o=><article key={o.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{o.name}</h3><p className="text-xs text-neutral-500 mt-1">{o.role}</p></div><StatusBadge tone={o.active?'success':'danger'}>{o.active?'ATIVO':'INATIVO'}</StatusBadge></div><div className="mt-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2 text-xs text-neutral-400"><KeyRound size={15} className="text-amber-400"/>PIN protegido · ••••••</div><div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">{FEATURES.map(([key,label])=>{const explicit=featureMap[o.id]?.[key];const roleDefault=(ROLE_DEFAULTS[o.role]||[]).includes(key);const enabled=explicit===undefined?roleDefault:explicit;return <button key={key} disabled={busy} onClick={()=>void toggle(o.id,key,enabled)} className={"px-3 py-2 rounded-lg border text-left text-[11px] "+(enabled?"border-emerald-800 bg-emerald-950/30 text-emerald-300":"border-neutral-800 bg-neutral-950 text-neutral-500")}>{label}: {enabled?"ATIVO":"BLOQUEADO"}{explicit===undefined?" · perfil":""}</button>})}</div><div className="mt-4 flex justify-end"><button disabled={busy} onClick={()=>void save(o)} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 text-xs font-bold">Editar / redefinir PIN</button></div></article>)}{rows.length===0&&<div className="md:col-span-2"><EmptyState title="Nenhum operador cadastrado" description="Cadastre o primeiro operador para liberar o uso seguro do PDV."/></div>}</div>
  </div>;
};