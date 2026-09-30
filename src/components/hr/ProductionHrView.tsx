import React,{useEffect,useMemo,useState} from 'react';
import {
  BriefcaseBusiness,CalendarDays,CheckCircle2,Clock3,DollarSign,FileText,
  Plus,Printer,RefreshCw,ShieldCheck,Users,WalletCards
} from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import { MetricCard,PageHeader,StatusBadge } from '../ui/ProUi';

type Tab='EMPLOYEES'|'PAYROLL'|'POLICIES';
const money=(v:any)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const date=(v:any)=>v?new Date(String(v)+'T12:00:00').toLocaleDateString('pt-BR'):'—';

const emptyEmployee={id:'',full_name:'',cpf:'',admission_date:'',role_title:'',employment_model:'OUTRO',payment_frequency:'MENSAL',base_amount:'',phone:'',address:'',active:true,notes:''};
const emptyPayroll={id:'',employee_id:'',period_start:'',period_end:'',payment_frequency:'MENSAL',base_amount:'',advances:'',overtime_amount:'',discounts:'',status:'PENDENTE',notes:''};
const emptyPolicy={id:'',title:'',description:'',active:true};

export const ProductionHrView:React.FC=()=>{
  const[data,setData]=useState<any>({employees:[],payroll:[],policies:[],metrics:{}});
  const[tab,setTab]=useState<Tab>('EMPLOYEES');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[feedback,setFeedback]=useState('');
  const[employee,setEmployee]=useState<any>(emptyEmployee);
  const[payroll,setPayroll]=useState<any>(emptyPayroll);
  const[policy,setPolicy]=useState<any>(emptyPolicy);
  const[selectedPayroll,setSelectedPayroll]=useState<any>(null);

  const load=async()=>{
    setBusy(true);setError('');
    try{setData(await productionDb.getHrSnapshot());}
    catch(e:any){setError(e?.message||'Não foi possível carregar o RH interno.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void load();},[]);

  const employees=data?.employees||[];
  const payrollRows=data?.payroll||[];
  const policies=data?.policies||[];
  const metrics=data?.metrics||{};
  const employeeMap=useMemo(()=>new Map(employees.map((e:any)=>[e.id,e])),[employees]);

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
    setBusy(true);setError('');setFeedback('');
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

  const printPayroll=(row:any)=>{
    setSelectedPayroll(row);
    window.setTimeout(()=>window.print(),60);
  };

  return <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-950 text-white p-3 sm:p-4 lg:p-6 space-y-5">
    <PageHeader
      eyebrow="Acesso restrito · Administrador e Gerente"
      title="RH Interno"
      description="Contratações, frequência de pagamento, adiantamentos, horas extras, holerites internos e regras da equipe."
      actions={<button disabled={busy} onClick={()=>void load()} className="h-10 px-3 rounded-xl border border-neutral-700 text-xs font-black flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button>}
    />

    <div className="p-3 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex gap-3 items-start">
      <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5"/>
      <p className="text-[11px] leading-relaxed text-neutral-300">Área confidencial da loja. Somente operadores com perfil <b>ADMINISTRADOR</b> ou <b>GERENTE</b> podem consultar ou alterar estes registros. O módulo é um controle interno e não substitui folha contábil, obrigações trabalhistas, eSocial ou cálculo oficial de encargos.</p>
    </div>

    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 text-xs">{feedback}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <MetricCard label="Funcionários" value={metrics.employees_total||0} icon={Users}/>
      <MetricCard label="Ativos" value={metrics.employees_active||0} icon={CheckCircle2} tone="emerald"/>
      <MetricCard label="Pagamentos pendentes" value={metrics.pending_payroll||0} icon={Clock3} tone="amber"/>
      <MetricCard label="A pagar" value={money(metrics.pending_amount||0)} icon={WalletCards} tone="amber"/>
      <MetricCard label="Pago no mês" value={money(metrics.paid_amount||0)} icon={DollarSign} tone="emerald"/>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {([
        ['EMPLOYEES','Contratações & Funcionários',Users],
        ['PAYROLL','Pagamentos & Holerites',FileText],
        ['POLICIES','Regras Internas',ShieldCheck]
      ] as [Tab,string,any][]).map(([id,label,I])=><button key={id} onClick={()=>setTab(id)} className={`shrink-0 h-10 px-4 rounded-xl border flex items-center gap-2 text-xs font-black ${tab===id?'bg-amber-400 text-neutral-950 border-amber-300':'bg-neutral-900 text-neutral-300 border-neutral-800'}`}><I size={14}/>{label}</button>)}
    </div>

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
        <div><h2 className="font-black">Novo pagamento / holerite interno</h2><p className="text-[10px] text-neutral-500 mt-1">Valores são informados pela gestão. O sistema não calcula encargos legais automaticamente.</p></div>
        <Field label="Funcionário"><select className="input" value={payroll.employee_id} onChange={e=>{const emp:any=employeeMap.get(e.target.value);setPayroll({...payroll,employee_id:e.target.value,base_amount:emp?String(emp.base_amount):payroll.base_amount,payment_frequency:emp?.payment_frequency||payroll.payment_frequency})}}><option value="">Selecione...</option>{employees.filter((e:any)=>e.active).map((e:any)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Início do período"><Input type="date" value={payroll.period_start} onChange={v=>setPayroll({...payroll,period_start:v})}/></Field><Field label="Fim do período"><Input type="date" value={payroll.period_end} onChange={v=>setPayroll({...payroll,period_end:v})}/></Field></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor base"><Input inputMode="decimal" value={payroll.base_amount} onChange={v=>setPayroll({...payroll,base_amount:v})}/></Field>
          <Field label="Adiantamentos"><Input inputMode="decimal" value={payroll.advances} onChange={v=>setPayroll({...payroll,advances:v})}/></Field>
          <Field label="Horas extras / adicionais"><Input inputMode="decimal" value={payroll.overtime_amount} onChange={v=>setPayroll({...payroll,overtime_amount:v})}/></Field>
          <Field label="Descontos"><Input inputMode="decimal" value={payroll.discounts} onChange={v=>setPayroll({...payroll,discounts:v})}/></Field>
        </div>
        <Field label="Frequência"><select className="input" value={payroll.payment_frequency} onChange={e=>setPayroll({...payroll,payment_frequency:e.target.value})}><option value="DIARIO">Diário</option><option value="SEMANAL">Semanal</option><option value="QUINZENAL">Quinzenal</option><option value="MENSAL">Mensal</option><option value="OUTRO">Outro</option></select></Field>
        <Field label="Status"><select className="input" value={payroll.status} onChange={e=>setPayroll({...payroll,status:e.target.value})}><option value="PENDENTE">Pendente</option><option value="PAGO">Pago</option><option value="CANCELADO">Cancelado</option></select></Field>
        <Field label="Observações"><textarea className="input min-h-20" value={payroll.notes} onChange={e=>setPayroll({...payroll,notes:e.target.value})}/></Field>
        <button disabled={busy||!payroll.employee_id||!payroll.period_start||!payroll.period_end} onClick={()=>void savePayroll()} className="w-full h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black">Salvar lançamento</button>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800"><h2 className="font-black">Histórico de pagamentos</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><thead className="text-neutral-500"><tr><th className="p-3 text-left">Funcionário</th><th className="p-3 text-left">Período</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Adiant.</th><th className="p-3 text-right">Extras</th><th className="p-3 text-right">Líquido</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Ações</th></tr></thead><tbody>{payrollRows.map((p:any)=>{const emp:any=employeeMap.get(p.employee_id);return <tr key={p.id} className="border-t border-neutral-800"><td className="p-3 font-bold">{emp?.full_name||'—'}</td><td className="p-3">{date(p.period_start)}–{date(p.period_end)}</td><td className="p-3 text-right">{money(p.base_amount)}</td><td className="p-3 text-right">{money(p.advances)}</td><td className="p-3 text-right">{money(p.overtime_amount)}</td><td className="p-3 text-right text-amber-400 font-black">{money(p.net_amount)}</td><td className="p-3"><StatusBadge tone={p.status==='PAGO'?'success':p.status==='CANCELADO'?'danger':'warning'}>{p.status}</StatusBadge></td><td className="p-3"><button onClick={()=>printPayroll(p)} className="h-8 px-3 rounded-lg border border-neutral-700 flex items-center gap-2"><Printer size={12}/>Holerite</button></td></tr>})}</tbody></table></div>
      </section>
    </div>}

    {tab==='POLICIES'&&<div className="grid xl:grid-cols-[.72fr_1.28fr] gap-4">
      <section className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900 space-y-3"><h2 className="font-black">Nova regra interna</h2><Field label="Título"><Input value={policy.title} onChange={v=>setPolicy({...policy,title:v})}/></Field><Field label="Regra / descrição"><textarea className="input min-h-36" value={policy.description} onChange={e=>setPolicy({...policy,description:e.target.value})}/></Field><label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={!!policy.active} onChange={e=>setPolicy({...policy,active:e.target.checked})}/> Regra ativa</label><button disabled={busy||!policy.title.trim()||!policy.description.trim()} onClick={()=>void savePolicy()} className="w-full h-10 rounded-xl bg-amber-400 text-neutral-950 text-xs font-black">Salvar regra</button></section>
      <section className="space-y-3">{policies.map((r:any)=><article key={r.id} className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{r.title}</h3><p className="mt-2 text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap">{r.description}</p></div><StatusBadge tone={r.active?'success':'danger'}>{r.active?'ATIVA':'INATIVA'}</StatusBadge></div><button onClick={()=>setPolicy({...r})} className="mt-3 text-[10px] text-amber-400 font-black">EDITAR REGRA</button></article>)}{!policies.length&&<div className="p-8 rounded-2xl border border-dashed border-neutral-800 text-center text-xs text-neutral-600">Nenhuma regra interna cadastrada.</div>}</section>
    </div>}

    {selectedPayroll&&<div className="hidden print:block fixed inset-0 bg-white text-black p-8">
      <div className="max-w-2xl mx-auto border border-black p-6">
        <div className="flex justify-between"><div><b className="text-xl">ADEGA PRO</b><div className="text-sm">Comprovante interno de pagamento</div></div><div className="text-right text-sm"><div>Período</div><b>{date(selectedPayroll.period_start)} a {date(selectedPayroll.period_end)}</b></div></div>
        <hr className="my-5"/>
        <div className="grid grid-cols-2 gap-4 text-sm"><div><b>Funcionário</b><div>{(employeeMap.get(selectedPayroll.employee_id) as any)?.full_name||'—'}</div></div><div><b>Frequência</b><div>{selectedPayroll.payment_frequency}</div></div></div>
        <div className="mt-5 space-y-2 text-sm"><Line label="Valor base" value={selectedPayroll.base_amount}/><Line label="Adiantamentos" value={-Number(selectedPayroll.advances||0)}/><Line label="Horas extras / adicionais" value={selectedPayroll.overtime_amount}/><Line label="Descontos" value={-Number(selectedPayroll.discounts||0)}/><div className="flex justify-between border-t border-black pt-3 text-lg font-black"><span>Valor líquido</span><span>{money(selectedPayroll.net_amount)}</span></div></div>
        <div className="mt-8 text-xs">Documento de controle interno. Não substitui recibos legais, folha oficial ou obrigações trabalhistas.</div>
      </div>
    </div>}
  </div>;
};

const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="block text-[10px] text-neutral-500 mb-1">{label}</span>{children}</label>;
const Input=({value,onChange,type='text',inputMode}:{value:any;onChange:(v:string)=>void;type?:string;inputMode?:any})=><input className="input" type={type} inputMode={inputMode} value={value??''} onChange={e=>onChange(e.target.value)}/>;
const Line=({label,value}:{label:string;value:number})=><div className="flex justify-between"><span>{label}</span><span>{money(value)}</span></div>;
