import React,{useEffect,useMemo,useState} from 'react';
import {
  ArrowDownCircle,ArrowUpCircle,CalendarClock,DollarSign,RefreshCw,WalletCards,
  Users,ShieldCheck,Plus,AlertTriangle
} from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { EmptyState,MetricCard,PageHeader,StatusBadge } from '../ui/ProUi';

const money=(v:any)=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const isHrRow=(r:any)=>r?.category==='RH'||r?.source==='RH'||r?.source==='RH_MANUAL';

export const ProductionFinanceView:React.FC=()=>{
  const[rows,setRows]=useState<any[]>([]);
  const[payables,setPayables]=useState<any[]>([]);
  const[receivables,setReceivables]=useState<any[]>([]);
  const[hrSnapshot,setHrSnapshot]=useState<any>(null);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[feedback,setFeedback]=useState('');
  const[period,setPeriod]=useState('today');
  const[typeFilter,setTypeFilter]=useState('TODOS');
  const[search,setSearch]=useState('');
  const[expandedGroups,setExpandedGroups]=useState<string[]>([]);
  const[page,setPage]=useState(1);
  const[pageSize]=useState(20);
  const[showIndividual,setShowIndividual]=useState(false);
  const[showAllHr,setShowAllHr]=useState(false);
  const[showHrForm,setShowHrForm]=useState(false);
  const[hrForm,setHrForm]=useState({transaction_type:'DESPESA',employee_id:'',amount:'',description:''});

  const operator=productionDb.getOperatorProfile();
  const canSeeHr=['ADMINISTRADOR','GERENTE'].includes(operator?.role||'');

  const load=async()=>{
    setBusy(true);setError('');
    try{
      const base=await Promise.all([
        productionDb.getFinancialTransactions(),
        productionDb.getAccountsPayable(),
        productionDb.getAccountsReceivable()
      ]);
      setRows(base[0]);setPayables(base[1]);setReceivables(base[2]);
      if(canSeeHr){
        try{setHrSnapshot(await productionDb.getHrSnapshot());}
        catch{setHrSnapshot(null);}
      }else setHrSnapshot(null);
    }catch(e:any){setError(e?.message||'Falha ao carregar financeiro.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);

  const totals=useMemo(()=>rows.reduce((a,r)=>{const v=Number(r.amount||0);if(r.transaction_type==='RECEITA')a.receita+=v;else a.despesa+=v;return a;},{receita:0,despesa:0}),[rows]);
  const hrRows=useMemo(()=>rows.filter(isHrRow),[rows]);
  const normalRows=useMemo(()=>rows.filter(r=>!isHrRow(r)),[rows]);
  const filteredRows=useMemo(()=>{
    const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const start=period==='today'?today:period==='yesterday'?today-86400000:period==='7d'?today-6*86400000:period==='30d'?today-29*86400000:0;
    const end=period==='yesterday'?today:Infinity;
    const q=search.trim().toLocaleLowerCase('pt-BR');
    return normalRows.filter(r=>{
      const ts=new Date(r.created_at).getTime();
      if(!Number.isFinite(ts)||ts<start||ts>=end)return false;
      if(typeFilter==='RECEITA'&&r.transaction_type!=='RECEITA')return false;
      if(typeFilter==='DESPESA'&&r.transaction_type!=='DESPESA')return false;
      if(typeFilter==='VENDA'&&r.source!=='VENDA')return false;
      if(q&&!([r.description,r.operator_name,r.source,r.amount,r.id].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(q))))return false;
      return true;
    });
  },[normalRows,period,typeFilter,search]);
  const filteredTotals=useMemo(()=>filteredRows.reduce((a,r)=>{const v=Number(r.amount||0);if(r.transaction_type==='RECEITA')a.receita+=v;else a.despesa+=v;return a;},{receita:0,despesa:0}),[filteredRows]);
  const groups=useMemo(()=>{
    const grouped=new Map<string,{key:string;date:string;operator:string;source:string;type:string;amount:number;rows:any[]}>();
    for(const r of filteredRows){
      const date=String(r.created_at||'').slice(0,10);
      const operator=String(r.operator_name||'Sistema');
      const source=String(r.source||'OUTROS');
      const type=String(r.transaction_type||'');
      const key=JSON.stringify([date,operator,source,type]);
      let g=grouped.get(key);
      if(!g){g={key,date,operator,source,type,amount:0,rows:[]};grouped.set(key,g);}
      g.amount+=Number(r.amount||0);g.rows.push(r);
    }
    return [...grouped.values()].sort((a,b)=>b.date.localeCompare(a.date)||String(b.rows[0]?.created_at||'').localeCompare(String(a.rows[0]?.created_at||'')));
  },[filteredRows]);
  const items=showIndividual?filteredRows:groups;
  const totalPages=Math.max(1,Math.ceil(items.length/pageSize));
  const visibleItems=items.slice((Math.min(page,totalPages)-1)*pageSize,Math.min(page,totalPages)*pageSize);
  const changeFilters=()=>{setPage(1);setExpandedGroups([]);};
  const toggleGroup=(key:string)=>setExpandedGroups(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]);
  const exportCsv=()=>{
    const cells=[['Data','Usuario','Descricao','Origem','Tipo','Valor'],...filteredRows.map(r=>[new Date(r.created_at).toLocaleString('pt-BR'),r.operator_name||'Sistema',r.description||'',r.source||'',r.transaction_type||'',Number(r.amount||0).toFixed(2).replace('.',',')])];
    const csv='\uFEFF'+cells.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\\r\\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='adega-extrato-financeiro.csv';link.click();URL.revokeObjectURL(url);
  };
  const hrTotals=useMemo(()=>hrRows.reduce((a,r)=>{const v=Number(r.amount||0);if(r.transaction_type==='RECEITA')a.entrada+=v;else a.saida+=v;return a;},{entrada:0,saida:0}),[hrRows]);

  const employees=hrSnapshot?.employees||[];
  const payroll=hrSnapshot?.payroll||[];
  const employeeMap=useMemo(()=>new Map(employees.map((e:any)=>[e.id,e])),[employees]);
  const payrollMap=useMemo(()=>new Map(payroll.map((p:any)=>[p.id,p])),[payroll]);
  const pendingHr=payroll.filter((p:any)=>p.status==='PENDENTE');
  const pendingHrAmount=pendingHr.reduce((s:number,p:any)=>s+Number(p.net_amount||0),0);

  const ap=payables.filter(x=>['PENDENTE','ATRASADO'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);
  const ar=receivables.filter(x=>['PENDENTE','ATRASADO'].includes(x.status)).reduce((s,x)=>s+Number(x.amount||0),0);
  const overdue=[...payables.map(x=>({...x,kind:'PAGAR'})),...receivables.map(x=>({...x,kind:'RECEBER'}))]
    .filter(x=>['PENDENTE','ATRASADO'].includes(x.status)&&new Date(String(x.due_date)+'T00:00:00')<new Date(new Date().toDateString()))
    .sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date))).slice(0,8);

  const hrEmployeeName=(r:any)=>{
    if(r.source==='RH'){
      const p:any=payrollMap.get(r.reference_id);
      return p?((employeeMap.get(p.employee_id) as any)?.full_name||'Funcionário'):'Folha interna';
    }
    if(r.source==='RH_MANUAL'&&r.reference_id) return (employeeMap.get(r.reference_id) as any)?.full_name||'Movimento geral';
    return 'RH';
  };

  const saveHrMovement=async()=>{
    setError('');setFeedback('');
    const amount=Number(String(hrForm.amount||'').replace(',','.'));
    if(!amount||amount<=0){setError('Informe um valor válido para a movimentação de RH.');return;}
    setBusy(true);
    try{
      await productionDb.saveHrFinancialMovement({
        transaction_type:hrForm.transaction_type,
        employee_id:hrForm.employee_id||null,
        amount,
        description:hrForm.description.trim()||'Movimentação interna de RH'
      });
      setHrForm({transaction_type:'DESPESA',employee_id:'',amount:'',description:''});
      setShowHrForm(false);
      setFeedback('Movimentação de RH registrada no financeiro.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível registrar a movimentação de RH.');}
    finally{setBusy(false);}
  };

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5">
    <PageHeader
      eyebrow="Gestão financeira"
      title="Financeiro & fluxo"
      description="Receitas, despesas, contas a pagar e receber da loja atual."
      actions={<button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>{busy?'Atualizando...':'Atualizar'}</button>}
    />
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{feedback}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <MetricCard label="Receitas" value={money(totals.receita)} icon={ArrowUpCircle} tone="emerald"/>
      <MetricCard label="Despesas" value={money(totals.despesa)} icon={ArrowDownCircle} tone="rose"/>
      <MetricCard label="Saldo" value={money(totals.receita-totals.despesa)} icon={DollarSign} tone={(totals.receita-totals.despesa)>=0?'amber':'rose'}/>
      <MetricCard label="A pagar" value={money(ap)} icon={CalendarClock} tone={ap?'rose':'emerald'}/>
      <MetricCard label="A receber" value={money(ar)} icon={WalletCards} tone="violet"/>
    </div>

    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="p-4 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 grid place-items-center shrink-0"><Users size={18}/></div>
          <div><div className="flex items-center gap-2"><h2 className="font-black">Movimentações de RH</h2><span className="text-[9px] px-2 py-1 rounded-full border border-amber-700 text-amber-300 font-black">QUADRO SEPARADO</span></div><p className="text-[10px] text-neutral-400 mt-1">Entradas e saídas do RH ficam separadas das demais movimentações. Os valores continuam compondo o saldo financeiro geral.</p></div>
        </div>
        {canSeeHr&&<button onClick={()=>setShowHrForm(v=>!v)} className="h-10 px-4 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black flex items-center justify-center gap-2"><Plus size={14}/>Lançamento RH</button>}
      </div>

      {!canSeeHr?<div className="p-5 flex gap-3 items-start"><ShieldCheck size={18} className="text-amber-400 shrink-0"/><div><div className="font-black text-sm">Detalhes de RH protegidos</div><p className="text-xs text-neutral-400 mt-1">Os valores de RH entram nos totais financeiros, mas funcionário, holerite e detalhes do lançamento são visíveis apenas para Administrador e Gerente.</p></div></div>:<>
        <div className="grid sm:grid-cols-3 gap-3 p-4">
          <MetricCard label="Entradas RH" value={money(hrTotals.entrada)} icon={ArrowUpCircle} tone="emerald"/>
          <MetricCard label="Saídas RH" value={money(hrTotals.saida)} icon={ArrowDownCircle} tone="rose"/>
          <MetricCard label="Holerites pendentes" value={money(pendingHrAmount)} detail={pendingHr.length+' lançamento(s) aguardando baixa'} icon={AlertTriangle} tone={pendingHr.length?'amber':'emerald'}/>
        </div>

        {pendingHr.length>0&&<div className="mx-4 mb-4 p-3 rounded-xl border border-amber-700/50 bg-amber-950/20 text-xs text-amber-200 flex gap-2 items-start"><AlertTriangle size={15} className="shrink-0 mt-0.5"/><span><b>Aviso de RH:</b> existem {pendingHr.length} holerite(s) pendente(s), totalizando {money(pendingHrAmount)}. Ao marcar um holerite como PAGO no RH, a saída é registrada automaticamente neste quadro financeiro.</span></div>}

        {showHrForm&&<div className="mx-4 mb-4 p-4 rounded-xl border border-neutral-700 bg-neutral-950">
          <div className="font-black text-sm mb-3">Novo lançamento financeiro de RH</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block"><span className="block text-[10px] text-neutral-500 mb-1">Tipo</span><select className="input" value={hrForm.transaction_type} onChange={e=>setHrForm({...hrForm,transaction_type:e.target.value})}><option value="DESPESA">Saída / despesa</option><option value="RECEITA">Entrada / receita</option></select></label>
            <label className="block"><span className="block text-[10px] text-neutral-500 mb-1">Funcionário (opcional)</span><select className="input" value={hrForm.employee_id} onChange={e=>setHrForm({...hrForm,employee_id:e.target.value})}><option value="">Geral</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label>
            <label className="block"><span className="block text-[10px] text-neutral-500 mb-1">Valor</span><input className="input" inputMode="decimal" value={hrForm.amount} onChange={e=>setHrForm({...hrForm,amount:e.target.value})} placeholder="0,00"/></label>
            <label className="block"><span className="block text-[10px] text-neutral-500 mb-1">Descrição</span><input className="input" value={hrForm.description} onChange={e=>setHrForm({...hrForm,description:e.target.value})} placeholder="Ex.: reembolso, ajuste, benefício"/></label>
          </div>
          <div className="mt-3 flex justify-end gap-2"><button onClick={()=>setShowHrForm(false)} className="h-9 px-4 rounded-lg border border-neutral-700 text-xs font-bold">Cancelar</button><button disabled={busy} onClick={()=>void saveHrMovement()} className="h-9 px-4 rounded-lg bg-amber-400 text-neutral-950 text-xs font-black">Salvar lançamento</button></div>
        </div>}

        {hrRows.length===0?<div className="p-4 pt-0"><EmptyState title="Sem movimentações de RH" description="Pagamentos marcados como PAGO no RH e lançamentos manuais aparecerão aqui."/></div>:<div className="overflow-x-auto border-t border-amber-500/20"><table className="w-full min-w-[850px] text-xs"><thead className="bg-neutral-950/70 text-neutral-500 uppercase"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Funcionário</th><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-neutral-800">{hrRows.map(r=><tr key={r.id} className="hover:bg-neutral-900/50"><td className="p-3 text-neutral-500">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3 font-bold">{hrEmployeeName(r)}</td><td className="p-3 text-neutral-300">{r.description}</td><td className="p-3"><StatusBadge tone={r.transaction_type==='RECEITA'?'success':'danger'}>{r.transaction_type==='RECEITA'?'ENTRADA':'SAÍDA'}</StatusBadge></td><td className={'p-3 text-right font-mono font-black '+(r.transaction_type==='RECEITA'?'text-emerald-400':'text-rose-400')}>{r.transaction_type==='DESPESA'?'- ':'+ '}{money(r.amount)}</td></tr>)}</tbody></table></div>}
      </>}
    </section>

    <div className="grid xl:grid-cols-[1fr_.8fr] gap-4">
      <section className="ap-panel overflow-hidden">
        <div className="p-4 border-b border-neutral-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black">Extrato financeiro inteligente</h2><p className="text-[10px] text-neutral-500 mt-1">Vendas agrupadas por dia, operador e origem. RH permanece no quadro separado.</p></div><button onClick={exportCsv} disabled={!filteredRows.length} className="px-3 py-2 rounded-lg border border-neutral-700 text-xs font-bold disabled:opacity-40">Exportar CSV / Excel</button></div>
          <div className="grid grid-cols-3 gap-2 text-xs"><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-neutral-500 text-[10px]">Receitas filtradas</div><div className="text-emerald-400 font-black mt-1">{money(filteredTotals.receita)}</div></div><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-neutral-500 text-[10px]">Despesas filtradas</div><div className="text-rose-400 font-black mt-1">{money(filteredTotals.despesa)}</div></div><div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800"><div className="text-neutral-500 text-[10px]">Saldo filtrado</div><div className="text-amber-400 font-black mt-1">{money(filteredTotals.receita-filteredTotals.despesa)}</div></div></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <select aria-label="Período do extrato" className="input" value={period} onChange={e=>{setPeriod(e.target.value);changeFilters();}}><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="all">Todo o histórico carregado</option></select>
            <select aria-label="Tipo de movimentação" className="input" value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);changeFilters();}}><option value="TODOS">Todas as movimentações</option><option value="VENDA">Vendas PDV</option><option value="RECEITA">Receitas</option><option value="DESPESA">Despesas</option></select>
            <input aria-label="Pesquisar movimentações" className="input" value={search} onChange={e=>{setSearch(e.target.value);changeFilters();}} placeholder="Buscar usuário, descrição, valor..."/>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs"><span className="text-neutral-500">{filteredRows.length} lançamento(s) · {groups.length} grupo(s)</span><button onClick={()=>{setShowIndividual(v=>!v);setPage(1);}} className="px-3 py-2 rounded-lg border border-amber-700/50 text-amber-300 font-bold">{showIndividual?'Agrupar movimentações':'Ver lançamentos individuais'}</button></div>
        </div>
        {!visibleItems.length?<div className="p-4"><EmptyState title="Nenhuma movimentação no filtro" description="Altere o período ou os filtros para consultar outros registros."/></div>:<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-xs"><thead className="bg-neutral-950 text-neutral-500 uppercase"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Operador</th><th className="p-3 text-left">Descrição / origem</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-neutral-800">{visibleItems.map((item:any)=>{
          const isGroup=!showIndividual;
          const g:any=item;const records:any[]=isGroup?g.rows:[item];
          const isExpanded=isGroup&&expandedGroups.includes(g.key);
          const total=isGroup?g.amount:Number(item.amount||0);
          const type=isGroup?g.type:item.transaction_type;
          return <React.Fragment key={isGroup?g.key:item.id}><tr onClick={isGroup?()=>toggleGroup(g.key):undefined} className={isGroup?'hover:bg-neutral-800/50 cursor-pointer':'hover:bg-neutral-800/30'}><td className="p-3 text-neutral-500">{isGroup?g.date.split('-').reverse().join('/'):new Date(item.created_at).toLocaleString('pt-BR')}</td><td className="p-3 font-bold text-white">{isGroup?g.operator:item.operator_name||'Sistema'}</td><td className="p-3 text-white">{isGroup?`${g.source==='VENDA'?'Vendas PDV':g.source} · ${records.length} lançamento(s)`:item.description}<div className="text-[10px] text-neutral-500">{isGroup?(isExpanded?'Ocultar detalhes ▲':'Ver detalhes ▼'):item.source}</div></td><td className="p-3"><StatusBadge tone={type==='RECEITA'?'success':'danger'}>{type}</StatusBadge></td><td className={'p-3 text-right font-mono font-black '+(type==='RECEITA'?'text-emerald-400':'text-rose-400')}>{type==='DESPESA'?'- ':''}{money(total)}</td></tr>
          {isExpanded&&records.map((r:any)=><tr key={r.id} className="bg-neutral-950/70"><td className="p-3 pl-6 text-neutral-500">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3">{r.operator_name||'Sistema'}</td><td className="p-3">{r.description}<div className="text-[10px] text-neutral-500">{r.source}</div></td><td className="p-3">{r.transaction_type}</td><td className="p-3 text-right font-mono">{money(r.amount)}</td></tr>)}</React.Fragment>;
        })}</tbody></table></div>}
        {items.length>pageSize&&<div className="p-3 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs"><span className="text-neutral-500">Página {Math.min(page,totalPages)} de {totalPages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 rounded-lg border border-neutral-700 disabled:opacity-30">Anterior</button><button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-2 rounded-lg border border-neutral-700 disabled:opacity-30">Próxima</button></div></div>}
      </section>

      <section className="ap-panel p-4"><h2 className="font-black">Vencimentos e pendências</h2><p className="text-[10px] text-neutral-500 mt-1">Prioridade por data de vencimento.</p><div className="mt-4 space-y-2">{overdue.length?overdue.map(x=><div key={x.kind+x.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold truncate">{x.description||x.category||x.kind}</div><div className="text-[10px] text-neutral-500">Venc. {new Date(String(x.due_date)+'T00:00:00').toLocaleDateString('pt-BR')} · {x.kind}</div></div><div className="text-right"><StatusBadge tone="danger">{x.status==='ATRASADO'?'ATRASADO':'VENCIDO'}</StatusBadge><div className="font-mono text-xs text-rose-400 mt-1">{money(x.amount)}</div></div></div>):<div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">Nenhuma conta vencida encontrada.</div>}</div></section>
    </div>
  </div>;
};
