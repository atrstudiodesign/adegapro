import React,{useEffect,useMemo,useState} from 'react';
import {
  BriefcaseBusiness,CalendarDays,CheckCircle2,Clock3,DollarSign,FileText,
  Plus,Printer,RefreshCw,ShieldCheck,Users,WalletCards,Share2,Pencil,BellRing,AlertTriangle,XCircle,Download
} from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { MetricCard,PageHeader,StatusBadge } from '../ui/ProUi';

type Tab='EMPLOYEES'|'PAYROLL'|'AGENDA'|'ATTENDANCE'|'WITHDRAWALS'|'POLICIES';
const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const date=(v:any)=>v?new Date(String(v)+'T12:00:00').toLocaleDateString('pt-BR'):'—';

const emptyEmployee={id:'',full_name:'',cpf:'',admission_date:'',role_title:'',employment_model:'OUTRO',payment_frequency:'MENSAL',base_amount:'',phone:'',address:'',active:true,notes:''};
const emptyPayroll={id:'',employee_id:'',period_start:'',period_end:'',payment_frequency:'MENSAL',base_amount:'',advances:'',overtime_amount:'',discounts:'',status:'PENDENTE',notes:''};
const emptyPolicy={id:'',title:'',description:'',active:true};
const emptyAgenda={id:'',employee_id:'',title:'',description:'',event_type:'LEMBRETE',priority:'NORMAL',due_at:'',alert_at:'',status:'PENDENTE'};

export const ProductionHrView:React.FC=()=>{
  const[data,setData]=useState<any>({employees:[],payroll:[],policies:[],metrics:{}});
  const[tab,setTab]=useState<Tab>('EMPLOYEES');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[feedback,setFeedback]=useState('');
  const[employee,setEmployee]=useState<any>(emptyEmployee);
  const[payroll,setPayroll]=useState<any>(emptyPayroll);
  const[policy,setPolicy]=useState<any>(emptyPolicy);
  const[agenda,setAgenda]=useState<any>(emptyAgenda);
  const[selectedPayroll,setSelectedPayroll]=useState<any>(null);
  const[store,setStore]=useState<any>(null);
  const[attendance,setAttendance]=useState<any[]>([]);
  const[operators,setOperators]=useState<any[]>([]);
  const[absence,setAbsence]=useState({operator_id:'',event_at:new Date().toISOString().slice(0,16),notes:''});
  const[attendanceFilter,setAttendanceFilter]=useState('');
  const[withdrawals,setWithdrawals]=useState<any[]>([]);

  const load=async()=>{
    setBusy(true);setError('');
    try{const [snapshot,currentStore,attendanceRows,operatorRows,withdrawalRows]=await Promise.all([productionDb.getHrSnapshot(),productionDb.getStore(),productionDb.getHrAttendance(),productionDb.getStoreOperators(),productionDb.getHrCashWithdrawals()]);setData(snapshot);setStore(currentStore);setAttendance(attendanceRows);setOperators(operatorRows);setWithdrawals(withdrawalRows);}
    catch(e:any){setError(e?.message||'Não foi possível carregar o RH interno.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);

  const employees=data?.employees||[];
  const payrollRows=data?.payroll||[];
  const policies=data?.policies||[];
  const agendaRows=data?.agenda||[];
  const metrics=data?.metrics||{};
  const employeeMap=useMemo(()=>new Map(employees.map((e:any)=>[e.id,e])),[employees]);
  const liveBase=Number(String(payroll.base_amount||0).replace(',','.'))||0;
  const liveAdvances=Number(String(payroll.advances||0).replace(',','.'))||0;
  const liveOvertime=Number(String(payroll.overtime_amount||0).replace(',','.'))||0;
  const liveDiscounts=Number(String(payroll.discounts||0).replace(',','.'))||0;
  const liveGross=liveBase+liveOvertime;
  const liveNet=liveGross-liveAdvances-liveDiscounts;

  const visibleAttendance=useMemo(()=>attendanceFilter?attendance.filter((r:any)=>r.operator_id===attendanceFilter):attendance,[attendance,attendanceFilter]);
  const attendanceText=(r:any)=>[`REGISTRO DE TURNO / PRESENÇA`,store?.name||'Empresa',`Operador: ${r.operator_name}`,`Data/hora: ${new Date(r.event_at).toLocaleString('pt-BR')}`,`Registro: ${r.event_type}`,`Origem: ${r.access_origin==='NA_LOJA'?'Na loja':r.access_origin==='EXTERNO'?'Externo':'Não informado'}`,`Status: ${r.record_status||'ATIVO'}`,r.notes?`Observações: ${r.notes}`:''].filter(Boolean).join('\n');
  const shareAttendance=async(r:any)=>{try{const text=attendanceText(r);if(navigator.share)await navigator.share({title:'Turno - '+r.operator_name,text});else await navigator.clipboard.writeText(text);setFeedback('Registro de turno compartilhado.');}catch(e:any){if(e?.name!=='AbortError')setError('Não foi possível compartilhar.');}};
  const printAttendance=(r:any)=>{const w=window.open('','_blank','width=760,height=900');if(!w)return setError('Permita pop-ups para imprimir o registro.');w.document.write(`<html><head><title>Turno - ${r.operator_name}</title><style>body{font-family:Arial;padding:40px;color:#111}h1{font-size:20px}pre{white-space:pre-wrap;font:14px Arial;line-height:1.7}</style></head><body><h1>Registro de turno / presença</h1><pre>${attendanceText(r).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre></body></html>`);w.document.close();w.print();};
  const editAttendance=async(r:any)=>{const eventAt=window.prompt('Data/hora ISO do registro:',new Date(r.event_at).toISOString());if(!eventAt)return;const notes=window.prompt('Observações:',r.notes||'')??r.notes;const origin=window.prompt('Origem: NA_LOJA, EXTERNO ou NAO_INFORMADO',r.access_origin||'NAO_INFORMADO');if(!origin)return;const reason=window.prompt('Motivo obrigatório da alteração:')?.trim();if(!reason)return;setBusy(true);try{await productionDb.adminUpdateHrAttendance(r.id,'ALTERAR',{event_at:new Date(eventAt).toISOString(),notes,access_origin:origin as any,reason});setFeedback('Registro alterado com trilha de auditoria.');await load();}catch(e:any){setError(e?.message||'Não foi possível alterar.');}finally{setBusy(false);}};
  const cancelAttendance=async(r:any)=>{const reason=window.prompt('Motivo obrigatório do cancelamento:')?.trim();if(!reason)return;setBusy(true);try{await productionDb.adminUpdateHrAttendance(r.id,'CANCELAR',{reason});setFeedback('Registro cancelado sem apagar o histórico.');await load();}catch(e:any){setError(e?.message||'Não foi possível cancelar.');}finally{setBusy(false);}};

  const saveAbsence=async()=>{setError('');setFeedback('');if(!absence.operator_id){setError('Selecione o usuário ausente.');return;}if(!absence.notes.trim()){setError('Informe a observação/motivo da falta.');return;}setBusy(true);try{await productionDb.registerHrAbsence(absence.operator_id,new Date(absence.event_at).toISOString(),absence.notes.trim());setAbsence({operator_id:'',event_at:new Date().toISOString().slice(0,16),notes:''});setFeedback('Falta registrada no RH com data, hora e observação.');await load();}catch(e:any){setError(e?.message||'Não foi possível registrar a falta.');}finally{setBusy(false);}};

  const saveEmployee=async()=>{
    setBusy(true);setError('');setFeedback('');
    try{
      await productionDb.saveHrEmployee({
        ...employee,
        base_amount:Number(String(employee.base_amount||0).replace(',','.'))||0
      });
      setEmployee(emptyEmployee);
      setFeedback('Cadastro do funcionário salvo com segurança.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível salvar o funcionário.');}
    finally{setBusy(false);}
  };

  const savePayroll=async()=>{
    setError('');setFeedback('');
    if(!payroll.employee_id){setError('Selecione um funcionário.');return;}
    if(!payroll.period_start||!payroll.period_end){setError('Informe o período do pagamento.');return;}
    if(new Date(payroll.period_end)<new Date(payroll.period_start)){setError('A data final não pode ser anterior à inicial.');return;}
    setBusy(true);
    try{
      await productionDb.saveHrPayrollEntry({
        ...payroll,
        base_amount:Number(String(payroll.base_amount||0).replace(',','.'))||0,
        advances:Number(String(payroll.advances||0).replace(',','.'))||0,
        overtime_amount:Number(String(payroll.overtime_amount||0).replace(',','.'))||0,
        discounts:Number(String(payroll.discounts||0).replace(',','.'))||0
      });
      setPayroll(emptyPayroll);
      setFeedback('Lançamento de pagamento/holerite salvo.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível salvar o lançamento.');}
    finally{setBusy(false);}
  };

  const savePolicy=async()=>{
    setBusy(true);setError('');setFeedback('');
    try{
      await productionDb.saveHrPolicy({...policy,applies_to:['TODOS']});
      setPolicy(emptyPolicy);
      setFeedback('Regra interna salva.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível salvar a regra.');}
    finally{setBusy(false);}
  };

  const saveAgenda=async()=>{
    setError('');setFeedback('');
    if(!agenda.title.trim()){setError('Informe o título do compromisso/alerta.');return;}
    if(!agenda.due_at){setError('Informe a data e hora do compromisso.');return;}
    setBusy(true);
    try{
      await productionDb.saveHrAgendaEvent({
        ...agenda,
        due_at:new Date(agenda.due_at).toISOString(),
        alert_at:agenda.alert_at?new Date(agenda.alert_at).toISOString():null
      });
      setAgenda(emptyAgenda);
      setFeedback('Compromisso/alerta salvo na agenda do RH.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível salvar o compromisso.');}
    finally{setBusy(false);}
  };

  const setAgendaStatus=async(id:string,status:'PENDENTE'|'CONCLUIDO'|'CANCELADO')=>{
    setBusy(true);setError('');setFeedback('');
    try{
      await productionDb.setHrAgendaStatus(id,status);
      setFeedback(status==='CONCLUIDO'?'Pendência concluída.':'Pendência atualizada.');
      await load();
    }catch(e:any){setError(e?.message||'Não foi possível atualizar a pendência.');}
    finally{setBusy(false);}
  };

  const editAgenda=(row:any)=>{
    const local=(v:any)=>v?new Date(v).toISOString().slice(0,16):'';
    setAgenda({...row,due_at:local(row.due_at),alert_at:local(row.alert_at)});
    setTab('AGENDA');
  };

  const printPayroll=(row:any)=>{
    setSelectedPayroll(row);
    window.setTimeout(()=>window.print(),60);
  };

  const editPayroll=(row:any)=>{
    setPayroll({
      ...row,
      base_amount:String(row.base_amount??''),
      advances:String(row.advances??''),
      overtime_amount:String(row.overtime_amount??''),
      discounts:String(row.discounts??'')
    });
    setTab('PAYROLL');
    setFeedback('Holerite carregado para alteração.');
  };

  const sharePayroll=async(row:any)=>{
    const emp:any=employeeMap.get(row.employee_id);
    const text=[
      'HOLERITE / COMPROVANTE DE PAGAMENTO',
      store?.name||'Empresa',
      store?.cnpj?'CNPJ: '+store.cnpj:'',
      '',
      'Funcionário: '+(emp?.full_name||'—'),
      emp?.cpf?'CPF: '+emp.cpf:'',
      'Período: '+date(row.period_start)+' a '+date(row.period_end),
      'Valor base: '+money(row.base_amount),
      'Adiantamentos: '+money(row.advances),
      'Horas extras / adicionais: '+money(row.overtime_amount),
      'Descontos: '+money(row.discounts),
      'Valor líquido: '+money(row.net_amount),
      'Status: '+row.status
    ].filter(Boolean).join('\n');

    try{
      if(navigator.share){
        await navigator.share({title:'Holerite - '+(emp?.full_name||'Funcionário'),text});
        setFeedback('Holerite compartilhado.');
      }else{
        await navigator.clipboard.writeText(text);
        setFeedback('Resumo do holerite copiado para compartilhar.');
      }
    }catch(e:any){
      if(e?.name!=='AbortError') setError('Não foi possível compartilhar o holerite.');
    }
  };

  return <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-950 text-white p-3 sm:p-4 lg:p-6 space-y-5">
    <PageHeader
      eyebrow="Acesso restrito · Administrador e Gerente"
      title="RH Interno"
      description="Contratações, pagamentos, agenda, alertas, holerites internos e regras da equipe."
      actions={<button disabled={busy} onClick={()=>void load()} className="h-10 px-3 rounded-xl border border-neutral-700 text-xs font-black flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button>}
    />

    <div className="p-3 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex gap-3 items-start">
      <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5"/>
      <p className="text-[11px] leading-relaxed text-neutral-300">Área confidencial da loja. Somente operadores com perfil <b>ADMINISTRADOR</b> ou <b>GERENTE</b> podem consultar ou alterar estes registros. O módulo é um controle interno e não substitui folha contábil, obrigações trabalhistas, eSocial ou cálculo oficial de encargos.</p>
    </div>

    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{feedback}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      <MetricCard label="Funcionários" value={metrics.employees_total||0} icon={Users}/>
      <MetricCard label="Ativos" value={metrics.employees_active||0} icon={CheckCircle2} tone="emerald"/>
      <MetricCard label="Pagamentos pendentes" value={metrics.pending_payroll||0} icon={Clock3} tone="amber"/>
      <MetricCard label="A pagar" value={money(metrics.pending_amount||0)} icon={WalletCards} tone="amber"/>
      <MetricCard label="Pago no mês" value={money(metrics.paid_amount||0)} icon={DollarSign} tone="emerald"/>
      <MetricCard label="Agenda pendente" value={metrics.agenda_pending||0} icon={CalendarDays} tone="amber"/>
      <MetricCard label="Atrasados" value={metrics.agenda_overdue||0} icon={AlertTriangle} tone="rose"/>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {([
        ['EMPLOYEES','Contratações & Funcionários',Users],
        ['PAYROLL','Pagamentos & Holerites',FileText],
        ['AGENDA','Agenda & Alertas',BellRing],
        ['ATTENDANCE','Turnos & Presença',Clock3],
        ['POLICIES','Regras Internas',ShieldCheck]
      ] as [Tab,string,any][]).map(([id,label,I])=><button key={id} onClick={()=>setTab(id)} className={`shrink-0 h-10 px-4 rounded-xl border flex items-center gap-2 text-xs font-black ${tab===id?'bg-amber-400 text-neutral-950 border-amber-300':'bg-neutral-900 text-neutral-300 border-neutral-800'}`}><I size={14}/>{label}</button>)}
    </div>

    {tab==='ATTENDANCE'&&<section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"><div className="p-4 border-b border-neutral-800"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><h2 className="font-black">Registro de turnos & presença</h2><p className="text-[10px] text-neutral-500 mt-1">Administrador/Gerente pode consultar remotamente todos os registros da loja. A origem Na loja/Externo é declarada no PIN e fica auditada.</p></div><select value={attendanceFilter} onChange={e=>setAttendanceFilter(e.target.value)} className="input lg:max-w-xs"><option value="">Todos os operadores</option>{operators.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div className="grid md:grid-cols-[1fr_1fr_2fr_auto] gap-2 mt-4"><select value={absence.operator_id} onChange={e=>setAbsence({...absence,operator_id:e.target.value})} className="input"><option value="">Usuário ausente</option>{operators.map((o:any)=><option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}</select><input type="datetime-local" value={absence.event_at} onChange={e=>setAbsence({...absence,event_at:e.target.value})} className="input"/><input placeholder="Observação/motivo obrigatório" value={absence.notes} onChange={e=>setAbsence({...absence,notes:e.target.value})} className="input"/><button disabled={busy} onClick={()=>void saveAbsence()} className="h-10 px-4 rounded-xl bg-rose-600 text-white text-xs font-black">Registrar falta</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-xs"><thead className="bg-neutral-950/70 text-neutral-500 uppercase"><tr><th className="p-3 text-left">Data / hora</th><th className="p-3 text-left">Usuário</th><th className="p-3 text-left">Registro</th><th className="p-3 text-left">Origem</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Observações</th><th className="p-3 text-left">Ações</th></tr></thead><tbody className="divide-y divide-neutral-800">{visibleAttendance.map((r:any)=><tr key={r.id} className={r.record_status==='CANCELADO'?'opacity-50':''}><td className="p-3 text-neutral-400">{new Date(r.event_at).toLocaleString('pt-BR')}</td><td className="p-3 font-black">{r.operator_name}</td><td className="p-3"><StatusBadge tone={r.event_type==='FALTA'?'danger':r.event_type==='ENTRADA_PIN'?'success':'neutral'}>{r.event_type==='ENTRADA_PIN'?'ENTRADA PIN':r.event_type==='SAIDA_TURNO'?'SAÍDA TURNO':'FALTA'}</StatusBadge></td><td className="p-3"><StatusBadge tone={r.access_origin==='NA_LOJA'?'success':r.access_origin==='EXTERNO'?'info':'neutral'}>{r.access_origin==='NA_LOJA'?'NA LOJA':r.access_origin==='EXTERNO'?'EXTERNO':'NÃO INFORMADO'}</StatusBadge></td><td className="p-3"><StatusBadge tone={r.record_status==='CANCELADO'?'danger':'success'}>{r.record_status||'ATIVO'}</StatusBadge></td><td className="p-3 text-neutral-400">{r.notes||'—'}{r.amendment_reason&&<div className="text-[9px] text-amber-400 mt-1">Auditoria: {r.amendment_reason}</div>}</td><td className="p-3"><div className="flex flex-wrap gap-1"><button onClick={()=>void shareAttendance(r)} className="h-8 px-2 rounded-lg border border-neutral-700 flex items-center gap-1"><Share2 size={11}/>Compartilhar</button><button onClick={()=>printAttendance(r)} className="h-8 px-2 rounded-lg border border-neutral-700 flex items-center gap-1"><Printer size={11}/>PDF/Imprimir</button><button disabled={busy||r.record_status==='CANCELADO'} onClick={()=>void editAttendance(r)} className="h-8 px-2 rounded-lg border border-neutral-700 flex items-center gap-1"><Pencil size={11}/>Alterar</button><button disabled={busy||r.record_status==='CANCELADO'} onClick={()=>void cancelAttendance(r)} className="h-8 px-2 rounded-lg border border-rose-800 text-rose-300 flex items-center gap-1"><XCircle size={11}/>Cancelar</button></div></td></tr>)}</tbody></table></div></section>}

    {tab==='EMPLOYEES'&&<div className="grid xl:grid-cols-[.72fr_1.28fr] gap-4">
      <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-3">
        <div><h2 className="font-black">{employee.id?'Editar funcionário':'Nova contratação / funcionário'}</h2><p className="text-[10px] text-neutral-500 mt-1">Registre a modalidade real informada pela empresa sem presumir vínculo trabalhista.</p></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome completo"><Input value={employee.full_name} onChange={v=>setEmployee({...employee,full_name:v})}/></Field>
          <Field label="CPF"><Input value={employee.cpf} onChange={v=>setEmployee({...employee,cpf:v})}/></Field>
          <Field label="Data de admissão / início"><Input type="date" value={employee.admission_date} onChange={v=>setEmployee({...employee,admission_date:v})}/></Field>
          <Field label="Função / cargo"><Input value={employee.role_title} onChange={v=>setEmployee({...employee,role_title:v})}/></Field>
          <Field label="Modalidade"><select className="input" value={employee.employment_model} onChange={e=>setEmployee({...employee,employment_model:e.target.value})}><option value="CLT">CLT</option><option value="AUTONOMO">Autônomo</option><option value="DIARISTA">Diarista</option><option value="TEMPORARIO">Temporário</option><option value="SEM_CONTRATO_FORMAL">Sem contrato formal informado</option><option value="OUTRO">Outro</option></select></Field>
          <Field label="Frequência do pagamento"><select className="input" value={employee.payment_frequency} onChange={e=>setEmployee({...employee,payment_frequency:e.target.value})}><option value="DIARIO">Diário</option><option value="SEMANAL">Semanal</option><option value="QUINZENAL">Quinzenal</option><option value="MENSAL">Mensal</option><option value="OUTRO">Outro</option></select></Field>
          <Field label="Valor base"><Input inputMode="decimal" value={employee.base_amount} onChange={v=>setEmployee({...employee,base_amount:v})}/></Field>
          <Field label="Telefone"><Input value={employee.phone} onChange={v=>setEmployee({...employee,phone:v})}/></Field>
          <div className="sm:col-span-2"><Field label="Endereço"><Input value={employee.address} onChange={v=>setEmployee({...employee,address:v})}/></Field></div>
          <div className="sm:col-span-2"><Field label="Observações"><textarea className="input min-h-20" value={employee.notes||''} onChange={e=>setEmployee({...employee,notes:e.target.value})}/></Field></div>
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={!!employee.active} onChange={e=>setEmployee({...employee,active:e.target.checked})}/> Funcionário ativo</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>setEmployee(emptyEmployee)} className="h-10 rounded-xl border border-neutral-700 text-xs font-black">Limpar</button>
          <button disabled={busy||!employee.full_name.trim()} onClick={()=>void saveEmployee()} className="h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black">Salvar cadastro</button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800"><h2 className="font-black">Equipe cadastrada</h2><p className="text-[10px] text-neutral-500 mt-1">Dados confidenciais por loja/tenant.</p></div>
        <div className="divide-y divide-neutral-800">
          {employees.map((e:any)=><button key={e.id} onClick={()=>setEmployee({...e,base_amount:String(e.base_amount??'')})} className="w-full p-4 text-left hover:bg-neutral-800/40">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div><div className="font-black">{e.full_name}</div><div className="text-[10px] text-neutral-500 mt-1">{e.role_title||'Função não informada'} · {e.employment_model}</div><div className="text-[10px] text-neutral-500 mt-1">Admissão/início: {date(e.admission_date)} · CPF: {e.cpf||'—'}</div></div>
              <div className="sm:text-right"><StatusBadge tone={e.active?'success':'danger'}>{e.active?'ATIVO':'INATIVO'}</StatusBadge><div className="text-sm font-black text-amber-400 mt-2">{money(e.base_amount)} <span className="text-[9px] text-neutral-500">{e.payment_frequency}</span></div></div>
            </div>
          </button>)}
          {!employees.length&&<div className="p-8 text-center text-xs text-neutral-600">Nenhum funcionário cadastrado.</div>}
        </div>
      </section>
    </div>}

    {tab==='PAYROLL'&&<div className="grid xl:grid-cols-[.72fr_1.28fr] gap-4">
      <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-3">
        <div><h2 className="font-black">{payroll.id?'Alterar pagamento / holerite':'Novo pagamento / holerite interno'}</h2><p className="text-[10px] text-neutral-500 mt-1">Valores são informados pela gestão. O sistema não calcula encargos legais automaticamente.</p></div>
        <Field label="Funcionário"><select className="input" value={payroll.employee_id} onChange={e=>{
          const emp:any=employeeMap.get(e.target.value);
          const now=new Date();
          const first=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
          const last=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);
          setPayroll({
            ...payroll,
            employee_id:e.target.value,
            base_amount:emp?String(emp.base_amount):payroll.base_amount,
            payment_frequency:emp?.payment_frequency||payroll.payment_frequency,
            period_start:payroll.period_start||first,
            period_end:payroll.period_end||last
          });
        }}><option value="">Selecione...</option>{employees.filter((e:any)=>e.active).map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Início do período"><Input type="date" value={payroll.period_start} onChange={v=>setPayroll({...payroll,period_start:v})}/></Field><Field label="Fim do período"><Input type="date" value={payroll.period_end} onChange={v=>setPayroll({...payroll,period_end:v})}/></Field></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor base"><Input inputMode="decimal" value={payroll.base_amount} onChange={v=>setPayroll({...payroll,base_amount:v})}/></Field>
          <Field label="Adiantamentos"><Input inputMode="decimal" value={payroll.advances} onChange={v=>setPayroll({...payroll,advances:v})}/></Field>
          <Field label="Horas extras / adicionais"><Input inputMode="decimal" value={payroll.overtime_amount} onChange={v=>setPayroll({...payroll,overtime_amount:v})}/></Field>
          <Field label="Descontos"><Input inputMode="decimal" value={payroll.discounts} onChange={v=>setPayroll({...payroll,discounts:v})}/></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="text-[10px] text-neutral-500">Valor bruto</div>
            <div className="text-lg font-black text-white mt-1">{money(liveGross)}</div>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <div className="text-[10px] text-neutral-500">Valor líquido</div>
            <div className="text-lg font-black text-amber-400 mt-1">{money(liveNet)}</div>
          </div>
        </div>
        <Field label="Frequência"><select className="input" value={payroll.payment_frequency} onChange={e=>setPayroll({...payroll,payment_frequency:e.target.value})}><option value="DIARIO">Diário</option><option value="SEMANAL">Semanal</option><option value="QUINZENAL">Quinzenal</option><option value="MENSAL">Mensal</option><option value="OUTRO">Outro</option></select></Field>
        <Field label="Status"><select className="input" value={payroll.status} onChange={e=>setPayroll({...payroll,status:e.target.value})}><option value="PENDENTE">Pendente</option><option value="PAGO">Pago</option><option value="CANCELADO">Cancelado</option></select></Field>
        <Field label="Observações"><textarea className="input min-h-20" value={payroll.notes} onChange={e=>setPayroll({...payroll,notes:e.target.value})}/></Field>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>setPayroll(emptyPayroll)} className="h-10 rounded-xl border border-neutral-700 text-xs font-black">Limpar</button>
          <button disabled={busy} onClick={()=>void savePayroll()} className="h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black disabled:opacity-50">{busy?'Salvando...':payroll.id?'Salvar alterações':'Salvar lançamento'}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800"><h2 className="font-black">Histórico de pagamentos</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><thead className="text-neutral-500"><tr><th className="p-3 text-left">Funcionário</th><th className="p-3 text-left">Período</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Adiant.</th><th className="p-3 text-right">Extras</th><th className="p-3 text-right">Bruto</th><th className="p-3 text-right">Líquido</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Ações</th></tr></thead><tbody>{payrollRows.map((p:any)=>{const emp:any=employeeMap.get(p.employee_id);return <tr key={p.id} className="border-t border-neutral-800"><td className="p-3 font-bold">{emp?.full_name||'—'}</td><td className="p-3">{date(p.period_start)}–{date(p.period_end)}</td><td className="p-3 text-right">{money(p.base_amount)}</td><td className="p-3 text-right">{money(p.advances)}</td><td className="p-3 text-right">{money(p.overtime_amount)}</td><td className="p-3 text-right font-black">{money(p.gross_amount)}</td><td className="p-3 text-right text-amber-400 font-black">{money(p.net_amount)}</td><td className="p-3"><StatusBadge tone={p.status==='PAGO'?'success':p.status==='CANCELADO'?'danger':'warning'}>{p.status}</StatusBadge></td><td className="p-3"><div className="flex gap-1.5">
  <button onClick={()=>printPayroll(p)} className="h-8 px-2.5 rounded-lg border border-neutral-700 flex items-center gap-1.5"><Printer size={12}/>Imprimir</button>
  <button onClick={()=>editPayroll(p)} className="h-8 px-2.5 rounded-lg border border-neutral-700 flex items-center gap-1.5"><Pencil size={12}/>Alterar</button>
  <button onClick={()=>void sharePayroll(p)} className="h-8 px-2.5 rounded-lg border border-neutral-700 flex items-center gap-1.5"><Share2 size={12}/>Compartilhar</button>
</div></td></tr>})}</tbody></table></div>
      </section>
    </div>}

    {tab==='AGENDA'&&<div className="grid xl:grid-cols-[.72fr_1.28fr] gap-4">
      <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-3">
        <div><h2 className="font-black">{agenda.id?'Alterar compromisso':'Novo compromisso / alerta'}</h2><p className="text-[10px] text-neutral-500 mt-1">Cadastre pagamentos, documentos, férias, reuniões, contratações e lembretes. Os avisos relevantes aparecem também no topo do PDV para Administrador e Gerente.</p></div>
        <Field label="Funcionário (opcional)"><select className="input" value={agenda.employee_id||''} onChange={e=>setAgenda({...agenda,employee_id:e.target.value})}><option value="">Geral / sem funcionário</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
        <Field label="Título"><Input value={agenda.title} onChange={v=>setAgenda({...agenda,title:v})}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><select className="input" value={agenda.event_type} onChange={e=>setAgenda({...agenda,event_type:e.target.value})}><option value="LEMBRETE">Lembrete</option><option value="PAGAMENTO">Pagamento</option><option value="DOCUMENTO">Documento</option><option value="CONTRATACAO">Contratação</option><option value="FERIAS">Férias</option><option value="REUNIAO">Reunião</option><option value="OUTRO">Outro</option></select></Field>
          <Field label="Prioridade"><select className="input" value={agenda.priority} onChange={e=>setAgenda({...agenda,priority:e.target.value})}><option value="BAIXA">Baixa</option><option value="NORMAL">Normal</option><option value="ALTA">Alta</option><option value="URGENTE">Urgente</option></select></Field>
          <Field label="Data e hora"><Input type="datetime-local" value={agenda.due_at} onChange={v=>setAgenda({...agenda,due_at:v})}/></Field>
          <Field label="Avisar a partir de"><Input type="datetime-local" value={agenda.alert_at} onChange={v=>setAgenda({...agenda,alert_at:v})}/></Field>
        </div>
        <Field label="Descrição / observação"><textarea className="input min-h-24" value={agenda.description||''} onChange={e=>setAgenda({...agenda,description:e.target.value})}/></Field>
        <div className="grid grid-cols-2 gap-2"><button onClick={()=>setAgenda(emptyAgenda)} className="h-10 rounded-xl border border-neutral-700 text-xs font-black">Limpar</button><button disabled={busy} onClick={()=>void saveAgenda()} className="h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black">{agenda.id?'Salvar alteração':'Salvar na agenda'}</button></div>
      </section>
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800"><h2 className="font-black">Agenda e pendências</h2><p className="text-[10px] text-neutral-500 mt-1">Pendências abertas primeiro; concluídas permanecem no histórico.</p></div>
        <div className="divide-y divide-neutral-800">
          {agendaRows.map((a:any)=>{const emp:any=employeeMap.get(a.employee_id);const overdue=a.status==='PENDENTE'&&new Date(a.due_at)<new Date();return <article key={a.id} className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap gap-2 items-center"><b>{a.title}</b><StatusBadge tone={a.status==='CONCLUIDO'?'success':overdue?'danger':'warning'}>{overdue?'ATRASADO':a.status}</StatusBadge><StatusBadge tone={a.priority==='URGENTE'?'danger':a.priority==='ALTA'?'warning':'info'}>{a.priority}</StatusBadge></div><div className="text-[10px] text-neutral-500 mt-1">{a.event_type} · {new Date(a.due_at).toLocaleString('pt-BR')}{emp?' · '+emp.full_name:''}</div>{a.description&&<p className="text-xs text-neutral-300 mt-2 whitespace-pre-wrap">{a.description}</p>}</div>
              <div className="flex flex-wrap gap-1.5 shrink-0"><button onClick={()=>editAgenda(a)} className="h-8 px-3 rounded-lg border border-neutral-700 text-[10px] font-black">Alterar</button>{a.status==='PENDENTE'&&<button disabled={busy} onClick={()=>void setAgendaStatus(a.id,'CONCLUIDO')} className="h-8 px-3 rounded-lg bg-emerald-700 text-white text-[10px] font-black">Concluir</button>}{a.status==='PENDENTE'&&<button disabled={busy} onClick={()=>void setAgendaStatus(a.id,'CANCELADO')} className="h-8 px-3 rounded-lg border border-rose-800 text-rose-300 text-[10px] font-black">Cancelar</button>}</div>
            </div>
          </article>})}
          {!agendaRows.length&&<div className="p-8 text-center text-xs text-neutral-600">Nenhum compromisso cadastrado.</div>}
        </div>
      </section>
    </div>}

    {tab==='WITHDRAWALS'&&<section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden"><div className="p-4 border-b border-neutral-800"><h2 className="font-black">Retiradas de caixa</h2><p className="text-[10px] text-neutral-500 mt-1">Toda sangria feita por operador gera uma pendência aqui. O desconto no holerite só ocorre após confirmação administrativa.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-xs"><thead className="bg-neutral-950/70 text-neutral-500 uppercase"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Operador</th><th className="p-3 text-left">Valor</th><th className="p-3 text-left">Motivo</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Ações RH</th></tr></thead><tbody className="divide-y divide-neutral-800">{withdrawals.map((r:any)=>{const op=operators.find((o:any)=>o.id===r.operator_id);const employee=employees.find((e:any)=>e.id===r.employee_id);const pendingPayroll=payrollRows.filter((p:any)=>p.employee_id===r.employee_id&&p.status==='PENDENTE');return <tr key={r.id}><td className="p-3 text-neutral-400">{new Date(r.created_at).toLocaleString('pt-BR')}</td><td className="p-3 font-black">{op?.name||'Operador'}{employee?<div className="text-[9px] text-neutral-500">RH: {employee.full_name}</div>:<div className="text-[9px] text-amber-400">Sem vínculo com funcionário</div>}</td><td className="p-3 font-black text-rose-300">{money(r.amount)}</td><td className="p-3 text-neutral-400">{r.reason}</td><td className="p-3"><StatusBadge tone={r.status==='PENDENTE'?'warning':r.status==='APLICADO_FOLHA'?'success':'neutral'}>{r.status}</StatusBadge></td><td className="p-3">{r.status==='PENDENTE'?<div className="flex flex-wrap gap-1">{pendingPayroll.map((p:any)=><button key={p.id} disabled={busy} onClick={async()=>{if(!confirm('Aplicar '+money(r.amount)+' como adiantamento/desconto neste holerite?'))return;setBusy(true);try{await productionDb.resolveHrCashWithdrawal(r.id,'APLICADO_FOLHA',p.id,'Confirmado no RH');setFeedback('Retirada aplicada ao holerite.');await load();}catch(e:any){setError(e?.message||'Falha ao aplicar.');}finally{setBusy(false);}}} className="h-8 px-2 rounded-lg border border-emerald-800 text-emerald-300">Aplicar na folha {date(p.period_end)}</button>)}<button disabled={busy} onClick={async()=>{const n=prompt('Justificativa para não descontar:')?.trim();if(!n)return;setBusy(true);try{await productionDb.resolveHrCashWithdrawal(r.id,'NAO_DESCONTAR',undefined,n);await load();}catch(e:any){setError(e?.message||'Falha ao resolver.');}finally{setBusy(false);}}} className="h-8 px-2 rounded-lg border border-neutral-700">Não descontar</button></div>:<span className="text-neutral-500">{r.resolution_notes||'Resolvido'}</span>}</td></tr>})}{withdrawals.length===0&&<tr><td colSpan={6} className="p-6 text-center text-neutral-500">Nenhuma retirada de caixa registrada.</td></tr>}</tbody></table></div></section>}

    {tab==='POLICIES'&&<div className="grid xl:grid-cols-[.72fr_1.28fr] gap-4">
      <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-3"><h2 className="font-black">Nova regra interna</h2><Field label="Título"><Input value={policy.title} onChange={v=>setPolicy({...policy,title:v})}/></Field><Field label="Regra / descrição"><textarea className="input min-h-36" value={policy.description} onChange={e=>setPolicy({...policy,description:e.target.value})}/></Field><label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={!!policy.active} onChange={e=>setPolicy({...policy,active:e.target.checked})}/> Regra ativa</label><button disabled={busy||!policy.title.trim()||!policy.description.trim()} onClick={()=>void savePolicy()} className="w-full h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black">Salvar regra</button></section>
      <section className="space-y-3">{policies.map((r:any)=><article key={r.id} className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{r.title}</h3><p className="mt-2 text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">{r.description}</p></div><StatusBadge tone={r.active?'success':'danger'}>{r.active?'ATIVA':'INATIVA'}</StatusBadge></div><button onClick={()=>setPolicy({...r})} className="mt-3 text-[10px] text-amber-400 font-black">EDITAR REGRA</button></article>)}{!policies.length&&<div className="p-8 rounded-2xl border border-dashed border-neutral-800 text-center text-xs text-neutral-600">Nenhuma regra interna cadastrada.</div>}</section>
    </div>}

    {selectedPayroll&&<div className="hidden print:block fixed inset-0 bg-white text-black p-5">
      <div className="max-w-4xl mx-auto">
        <PayslipCopy payroll={selectedPayroll} employee={employeeMap.get(selectedPayroll.employee_id) as any} store={store}/>
        <div className="my-5 border-t border-dashed border-neutral-500 relative"><span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-[9px] text-neutral-500">RECORTE / 2ª VIA</span></div>
        <PayslipCopy payroll={selectedPayroll} employee={employeeMap.get(selectedPayroll.employee_id) as any} store={store}/>
      </div>
    </div>}
  </div>;
};

const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="block text-[10px] text-neutral-500 mb-1">{label}</span>{children}</label>;
const Input=({value,onChange,type='text',inputMode}:{value:any;onChange:(v:string)=>void;type?:string;inputMode?:any})=><input className="input" type={type} inputMode={inputMode} value={value??''} onChange={e=>onChange(e.target.value)}/>;
const Line=({label,value}:{label:string;value:number})=><div className="flex justify-between"><span>{label}</span><span>{money(value)}</span></div>;
const PayrollRow=({code,label,credit=0,debit=0}:{code:string;label:string;credit?:number;debit?:number})=><div className="grid grid-cols-[64px_1fr_105px_105px] border-b border-black"><div className="p-1.5 border-r border-black">{code}</div><div className="p-1.5 border-r border-black">{label}</div><div className="p-1.5 border-r border-black text-right">{Number(credit||0)?money(credit):''}</div><div className="p-1.5 text-right">{Number(debit||0)?money(debit):''}</div></div>;

const PayslipCopy=({payroll,employee,store}:{payroll:any;employee:any;store:any})=>{
  const gross=Number(payroll.base_amount||0)+Number(payroll.overtime_amount||0);
  const deductions=Number(payroll.advances||0)+Number(payroll.discounts||0);
  return <section className="border border-black text-[9px] break-inside-avoid bg-white">
    <div className="grid grid-cols-[1fr_180px] border-b border-black">
      <div className="p-3">
        <div className="text-sm font-black uppercase">{store?.name||'Empresa'}</div>
        <div className="mt-0.5">Razão social: {store?.name||'—'}</div>
        <div>CNPJ: {store?.cnpj||'—'}</div>
        <div>Endereço: {store?.address||'—'}</div>
      </div>
      <div className="p-3 border-l border-black text-center">
        <div className="font-black text-[11px]">RECIBO DE PAGAMENTO</div>
        <div>Folha interna / holerite</div>
        <div className="mt-1 font-bold">{date(payroll.period_start)} a {date(payroll.period_end)}</div>
      </div>
    </div>

    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-black">
      <div className="p-2"><b>Funcionário</b><div>{employee?.full_name||'—'}</div></div>
      <div className="p-2 border-l border-black"><b>CPF</b><div>{employee?.cpf||'—'}</div></div>
      <div className="p-2 border-l border-black"><b>Admissão</b><div>{date(employee?.admission_date)}</div></div>
      <div className="p-2 border-l border-black"><b>Função</b><div>{employee?.role_title||'—'}</div></div>
    </div>

    <div className="grid grid-cols-[64px_1fr_105px_105px] border-b border-black font-black bg-neutral-100">
      <div className="p-1.5 border-r border-black">Cód.</div>
      <div className="p-1.5 border-r border-black">Descrição</div>
      <div className="p-1.5 border-r border-black text-right">Proventos</div>
      <div className="p-1.5 text-right">Descontos</div>
    </div>
    <PayrollRow code="001" label="Salário / valor base" credit={payroll.base_amount}/>
    <PayrollRow code="050" label="Horas extras / adicionais" credit={payroll.overtime_amount}/>
    <PayrollRow code="201" label="Adiantamentos" debit={payroll.advances}/>
    <PayrollRow code="299" label="Outros descontos" debit={payroll.discounts}/>

    <div className="grid grid-cols-[1fr_105px_105px] border-t border-black">
      <div className="p-2 text-right font-black">Totais</div>
      <div className="p-2 border-l border-black text-right font-black">{money(gross)}</div>
      <div className="p-2 border-l border-black text-right font-black">{money(deductions)}</div>
    </div>
    <div className="grid grid-cols-3 border-t border-black">
      <div className="p-2"><div className="text-neutral-600">Valor bruto</div><b>{money(gross)}</b></div>
      <div className="p-2 border-l border-black"><div className="text-neutral-600">Total descontos</div><b>{money(deductions)}</b></div>
      <div className="p-2 border-l border-black"><div className="text-neutral-600">Valor líquido</div><b className="text-[12px]">{money(payroll.net_amount)}</b></div>
    </div>
    <div className="grid grid-cols-[1fr_190px] border-t border-black">
      <div className="p-2"><b>Observações</b><div className="mt-1 whitespace-pre-wrap min-h-8">{payroll.notes||'—'}</div></div>
      <div className="p-2 border-l border-black"><b>Status do pagamento</b><div className="mt-1">{payroll.status}{payroll.paid_at?' · '+new Date(payroll.paid_at).toLocaleDateString('pt-BR'):''}</div></div>
    </div>
    <div className="grid grid-cols-2 gap-10 p-5 pt-7 border-t border-black">
      <div className="border-t border-black pt-1.5 text-center">Assinatura do responsável</div>
      <div className="border-t border-black pt-1.5 text-center">Assinatura do colaborador</div>
    </div>
    <div className="p-1.5 border-t border-black text-[7px] text-neutral-600 text-center">Documento de controle interno. Não substitui folha oficial, recibos exigidos por lei, eSocial ou obrigações trabalhistas/contábeis.</div>
  </section>;
};
