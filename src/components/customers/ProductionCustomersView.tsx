import React, { useEffect, useState } from 'react';
import { Users, Plus, CheckCircle2, MessageSquare, RefreshCw } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { CashSession, Customer } from '../../types';

interface Props { currentSession?: CashSession; }

export const ProductionCustomersView: React.FC<Props> = ({ currentSession }) => {
  const [customers,setCustomers]=useState<Customer[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [feedback,setFeedback]=useState('');
  const load=async()=>{setBusy(true);setError('');try{setCustomers(await productionDb.getCustomers());}catch(e:any){setError(e?.message||'Falha ao carregar clientes.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const create=async()=>{
    const name=window.prompt('Nome completo do cliente:')?.trim(); if(!name)return;
    const phone=window.prompt('WhatsApp / telefone:')?.trim(); if(!phone)return;
    const cpf=window.prompt('CPF (opcional):')?.trim()||''; const limitRaw=window.prompt('Limite de fiado (R$):','300')||'0'; const creditLimit=Number(limitRaw.replace(',','.'))||0;
    setBusy(true);setError('');try{await productionDb.saveCustomer({name,phone,cpf,creditLimit,status:'LIBERADO'});setFeedback('Cliente salvo em produção.');await load();}catch(e:any){setError(e?.message||'Não foi possível salvar cliente.');}finally{setBusy(false);}
  };
  const settle=async(c:Customer)=>{
    if(c.creditBalance<=0)return; const raw=window.prompt('Valor recebido de '+c.name+' (R$):',c.creditBalance.toFixed(2)); if(!raw)return;
    const amount=Number(raw.replace(',','.')); if(!Number.isFinite(amount)||amount<=0)return;
    const method=(window.prompt('Forma: DINHEIRO, PIX, DEBITO ou CREDITO','DINHEIRO')||'DINHEIRO').toUpperCase();
    if(!['DINHEIRO','PIX','DEBITO','CREDITO'].includes(method)){setError('Forma de pagamento inválida.');return;}
    setBusy(true);setError('');try{await productionDb.settleCustomerCredit(c.id,amount,method as any,currentSession?.id);setFeedback('Recebimento registrado com auditoria.');await load();}catch(e:any){setError(e?.message||'Não foi possível registrar o recebimento.');}finally{setBusy(false);}
  };
  const whatsapp=(c:Customer)=>{const phone=c.phone.replace(/\D/g,'');const text=encodeURIComponent('Olá, '+c.name+'! Lembrete de saldo em aberto no valor de R$ '+c.creditBalance.toFixed(2)+'.');window.open('https://api.whatsapp.com/send?phone=55'+phone+'&text='+text,'_blank');};

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-5 bg-neutral-950">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800"><div><h1 className="text-xl font-black text-white flex items-center gap-2"><Users size={22} className="text-amber-400"/>Clientes & Fiado</h1><p className="text-xs text-neutral-400 mt-1">Cadastro e recebimentos persistidos no ambiente de produção.</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>void load()} className="px-3 py-2 rounded-xl border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2"><RefreshCw size={14}/>Atualizar</button><button disabled={busy} onClick={()=>void create()} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-2"><Plus size={15}/>Cadastrar cliente</button></div></div>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}{feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 size={14}/>{feedback}</div>}
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-neutral-950/70 text-neutral-400 uppercase"><tr><th className="p-3">Cliente</th><th className="p-3">Contato</th><th className="p-3 text-right">Limite</th><th className="p-3 text-right">Saldo</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-neutral-800">
      {customers.map(c=><tr key={c.id}><td className="p-3 font-bold text-white">{c.name}<div className="text-[10px] text-neutral-500 font-mono">{c.cpf||'CPF não informado'}</div></td><td className="p-3 text-neutral-300">{c.phone}</td><td className="p-3 text-right font-mono">R$ {c.creditLimit.toFixed(2)}</td><td className="p-3 text-right font-mono font-bold"><span className={c.creditBalance>0?'text-rose-400':'text-emerald-400'}>R$ {c.creditBalance.toFixed(2)}</span></td><td className="p-3"><span className={c.status==='BLOQUEADO'?'text-rose-400':'text-emerald-400'}>{c.status||'LIBERADO'}</span></td><td className="p-3"><div className="flex justify-end gap-2">{c.creditBalance>0&&<><button onClick={()=>whatsapp(c)} className="p-2 rounded-lg bg-emerald-950 text-emerald-300" title="Cobrar via WhatsApp"><MessageSquare size={14}/></button><button disabled={busy} onClick={()=>void settle(c)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-bold">Receber</button></>}</div></td></tr>)}
      {customers.length===0&&<tr><td colSpan={6} className="p-8 text-center text-neutral-500">Nenhum cliente cadastrado em produção.</td></tr>}
    </tbody></table></div></div>
  </div>;
};