import React,{useRef,useState} from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, ExternalLink, FileJson, Headphones, MessageCircle, Send, Upload } from 'lucide-react';
import { PageHeader,StatusBadge } from '../ui/ProUi';
import type { AppMode } from '../../services/appMode';
import { productionDb } from '../../services/productionDb';
import { db } from '../../services/db';

export const SupportView:React.FC<{appMode?:AppMode}>=({appMode='DEMO'})=>{
  const[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState('');
  const[requester,setRequester]=useState(''),[category,setCategory]=useState('PDV / Venda'),[subject,setSubject]=useState(''),[description,setDescription]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const whatsapp='https://wa.me/5511939026928?text=Ol%C3%A1%20ATR%20Studio%2C%20preciso%20de%20suporte%20no%20Adega%20Pro.';

  const download=(name:string,raw:string)=>{const blob=new Blob([raw],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);};
  const exportBackup=async()=>{setBusy(true);setError('');try{const raw=appMode==='DEMO'?db.exportAllData():JSON.stringify(await productionDb.exportTenantBackup(),null,2);download(`adega-pro-backup-${new Date().toISOString().slice(0,10)}.json`,raw);setFeedback('Backup gerado e enviado para download.');}catch(e:any){setError(e?.message||'Falha ao gerar backup.');}finally{setBusy(false);}};
  const importBackup=async(file?:File)=>{if(!file)return;setBusy(true);setError('');try{const raw=await file.text();const payload=JSON.parse(raw);if(appMode==='DEMO'){db.importAllData(raw);setFeedback('Backup restaurado no modo demonstração.');}else{const id=await productionDb.validateTenantBackup(file.name,payload);setFeedback('Arquivo validado e armazenado com segurança para restauração. Protocolo: '+id+'. A aplicação definitiva requer confirmação administrativa para evitar sobrescrever dados por engano.');}}catch(e:any){setError(e?.message||'Arquivo de backup inválido.');}finally{setBusy(false);fileRef.current&&(fileRef.current.value='');}};

  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(appMode==='PRODUCTION')await productionDb.createSupportTicket(subject,category,`Solicitante: ${requester}\n\n${description}`);setSent(true);setSubject('');setDescription('');}catch(e:any){setError(e?.message||'Não foi possível registrar o chamado.');}finally{setBusy(false);}};

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto"><div className="max-w-6xl mx-auto space-y-5">
    <PageHeader eyebrow="Atendimento & segurança" title="Suporte, Backup & Recuperação" description="Suporte ATR Studio e proteção dos dados do Adega Pro." actions={<StatusBadge tone={appMode==='PRODUCTION'?'success':'info'}>{appMode==='PRODUCTION'?'PRODUÇÃO':'DEMO'}</StatusBadge>}/>
    {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
    {(feedback||sent)&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/>{feedback||(appMode==='PRODUCTION'?'Chamado registrado.':'Solicitação simulada.')}</div>}

    <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
      <div className="flex items-center gap-2"><DatabaseBackup size={19} className="text-amber-400"/><h2 className="font-black text-white">Backup geral do sistema</h2></div>
      <p className="text-xs text-neutral-400 mt-2">Formato oficial: <b className="text-white">JSON</b>. Inclui cadastro, lojas, produtos, estoque, vendas, caixas, clientes, compras, financeiro e inventários do tenant. Senhas, PINs, tokens e segredos não são exportados.</p>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <button disabled={busy} onClick={()=>void exportBackup()} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 text-left"><Download size={18} className="text-amber-400"/><div className="font-bold text-white text-sm mt-2">Baixar backup</div><div className="text-[10px] text-neutral-500 mt-1">Arquivo .json completo</div></button>
        <button disabled={busy} onClick={()=>fileRef.current?.click()} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 text-left"><Upload size={18} className="text-amber-400"/><div className="font-bold text-white text-sm mt-2">Importar backup</div><div className="text-[10px] text-neutral-500 mt-1">{appMode==='PRODUCTION'?'Valida antes de restaurar':'Restaura o DEMO local'}</div></button>
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800"><FileJson size={18} className="text-sky-400"/><div className="font-bold text-white text-sm mt-2">Compatibilidade</div><div className="text-[10px] text-neutral-500 mt-1">ADEGA_PRO_BACKUP_JSON · schema 1</div></div>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e=>void importBackup(e.target.files?.[0])}/>
      {appMode==='PRODUCTION'&&<div className="mt-4 p-3 rounded-xl border border-amber-800/60 bg-amber-950/20 text-[11px] text-amber-200">Por segurança, importar na produção primeiro <b>valida e guarda o arquivo</b>. A restauração definitiva não sobrescreve automaticamente o banco; isso evita perda de vendas e estoque por arquivo errado.</div>}
    </section>

    <div className="grid md:grid-cols-2 gap-4">
      <a href={whatsapp} target="_blank" rel="noreferrer" className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60"><MessageCircle className="text-emerald-400 mb-3" size={28}/><h2 className="font-bold text-white">WhatsApp ATR Studio</h2><p className="text-xs text-neutral-400 mt-1">Atendimento direto para suporte.</p><div className="mt-4 text-xs text-emerald-400 font-bold flex items-center gap-1">Abrir WhatsApp <ExternalLink size={12}/></div></a>
      <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="w-9 h-9 rounded-lg mb-3 bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400 font-black">ATR</div><h2 className="font-bold text-white">ATR Studio</h2><p className="text-xs text-neutral-400 mt-1">Desenvolvimento, manutenção e evolução.</p></a>
    </div>

    <form onSubmit={submit} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
      <div><h2 className="font-bold text-white flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400"/> Relatar problema técnico</h2></div>
      <div className="grid md:grid-cols-2 gap-3"><input required value={requester} onChange={e=>setRequester(e.target.value)} placeholder="Nome do solicitante" className="input"/><select value={category} onChange={e=>setCategory(e.target.value)} className="input"><option>PDV / Venda</option><option>Estoque</option><option>Financeiro</option><option>Usuários / Acesso</option><option>Impressão</option><option>Backup</option><option>Outro</option></select></div>
      <input required value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto" className="input"/>
      <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={5} placeholder="Explique o problema..." className="input resize-y"/>
      <div className="flex justify-end"><button disabled={busy} className="btn-primary"><Send size={14} className="mr-2"/>{busy?'Processando...':'Registrar chamado'}</button></div>
    </form>
  </div></div>;
};
