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
        <div className="p-4 border-b border-neutral-800"><h2 className="font-black">Movimentações financeiras gerais</h2><p className="text-[10px] text-neutral-500 mt-1">Movimentos de RH não são misturados nesta tabela; ficam no quadro acima.</p></div>
        {normalRows.length===0?<div className="p-4"><EmptyState title="Sem movimentações" description="As receitas e despesas aparecerão aqui conforme a operação registrar eventos financeiros."/></div>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead className="bg-neutral-950 text-neutral-500 uppercase"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Origem</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-neutral-800">{normalRows.map(r=><tr key={r.id} className="hover:bg-neutral-800/30"><td className="p-3 text-neutral-500">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3 text-white">{r.description}</td><td className="p-3 text-neutral-400">{r.source}</td><td className="p-3"><StatusBadge tone={r.transaction_type==='RECEITA'?'success':'danger'}>{r.transaction_type}</StatusBadge></td><td className={'p-3 text-right font-mono font-black '+(r.transaction_type==='RECEITA'?'text-emerald-400':'text-rose-400')}>{r.transaction_type==='DESPESA'?'- ':''}{money(r.amount)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="ap-panel p-4"><h2 className="font-black">Vencimentos e pendências</h2><p className="text-[10px] text-neutral-500 mt-1">Prioridade por data de vencimento.</p><div className="mt-4 space-y-2">{overdue.length?overdue.map(x=><div key={x.kind+x.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold truncate">{x.description||x.category||x.kind}</div><div className="text-[10px] text-neutral-500">Venc. {new Date(String(x.due_date)+'T00:00:00').toLocaleDateString('pt-BR')} · {x.kind}</div></div><div className="text-right"><StatusBadge tone="danger">{x.status==='ATRASADO'?'ATRASADO':'VENCIDO'}</StatusBadge><div className="font-mono text-xs text-rose-400 mt-1">{money(x.amount)}</div></div></div>):<div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">Nenhuma conta vencida encontrada.</div>}</div></section>
    </div>
  </div>;
};
