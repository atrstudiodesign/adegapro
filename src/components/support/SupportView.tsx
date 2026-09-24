import React, { useState } from 'react';
import { Headphones, MessageCircle, Send, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { AppMode } from '../../services/appMode';
import { productionDb } from '../../services/productionDb';

interface SupportViewProps { appMode?: AppMode; }

export const SupportView: React.FC<SupportViewProps> = ({ appMode = 'DEMO' }) => {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requester, setRequester] = useState('');
  const [category, setCategory] = useState('PDV / Venda');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const whatsapp = 'https://wa.me/5511939026928?text=Ol%C3%A1%20ATR%20Studio%2C%20preciso%20de%20suporte%20no%20Adega%20Pro.';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (appMode === 'PRODUCTION') {
        await productionDb.createSupportTicket(subject, category, `Solicitante: ${requester}\n\n${description}`);
      }
      setSent(true);
      setSubject('');
      setDescription('');
      setTimeout(() => setSent(false), 4000);
    } catch (err:any) {
      setError(err?.message || 'Não foi possível registrar o chamado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="pb-4 border-b border-neutral-800 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Headphones size={22} className="text-amber-400"/> Suporte Técnico ATR Studio
            </h1>
            <p className="text-xs text-neutral-400 mt-1">Canal oficial para dúvidas operacionais, falhas e incidentes técnicos.</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${appMode === 'PRODUCTION' ? 'text-emerald-300 border-emerald-800 bg-emerald-950/50' : 'text-violet-300 border-violet-800 bg-violet-950/50'}`}>
            {appMode === 'PRODUCTION' ? 'CHAMADO NO SUPABASE' : 'SIMULAÇÃO DEMO'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <a href={whatsapp} target="_blank" rel="noreferrer" className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 hover:border-emerald-500 transition-colors">
            <MessageCircle className="text-emerald-400 mb-3" size={28}/>
            <h2 className="font-bold text-white">WhatsApp ATR Studio</h2>
            <p className="text-xs text-neutral-400 mt-1">Atendimento direto para suporte do Adega Pro.</p>
            <div className="mt-4 text-xs text-emerald-400 font-bold flex items-center gap-1">Abrir WhatsApp <ExternalLink size={12}/></div>
          </a>

          <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 transition-colors">
            <div className="w-9 h-9 rounded-lg mb-3 bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400 font-black">ATR</div>
            <h2 className="font-bold text-white">ATR Studio</h2>
            <p className="text-xs text-neutral-400 mt-1">Desenvolvimento, manutenção e evolução do sistema.</p>
            <div className="mt-4 text-xs text-amber-400 font-bold flex items-center gap-1">atrstudio.com.br <ExternalLink size={12}/></div>
          </a>
        </div>

        {error && <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        {sent && <div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 size={15}/>{appMode === 'PRODUCTION' ? 'Chamado registrado no ambiente de produção.' : 'Solicitação simulada no modo demonstração.'}</div>}

        <form onSubmit={submit} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div>
            <h2 className="font-bold text-white flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400"/> Relatar problema técnico</h2>
            <p className="text-[11px] text-neutral-500 mt-1">Descreva o problema com contexto suficiente para diagnóstico.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input required value={requester} onChange={e=>setRequester(e.target.value)} placeholder="Nome do solicitante" className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400">
              <option>PDV / Venda</option><option>Estoque</option><option>Financeiro</option><option>Usuários / Acesso</option><option>Integrações</option><option>Outro</option>
            </select>
          </div>
          <input required value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto" className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
          <textarea required value={description} onChange={e=>setDescription(e.target.value)} rows={6} placeholder="Explique o que aconteceu, o que esperava e se apareceu alguma mensagem de erro." className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400 resize-y"/>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-500">Não envie senhas, PINs, tokens ou dados completos de cartão.</span>
            <button disabled={busy} className="px-4 py-2 rounded-xl bg-amber-500 disabled:opacity-50 text-neutral-950 font-black text-xs uppercase flex items-center justify-center gap-2"><Send size={14}/>{busy ? 'Registrando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
