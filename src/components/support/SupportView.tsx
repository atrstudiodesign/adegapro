import React, { useState } from 'react';
import { Headphones, MessageCircle, Send, ExternalLink, AlertTriangle } from 'lucide-react';

export const SupportView: React.FC = () => {
  const [sent, setSent] = useState(false);
  const whatsapp = 'https://wa.me/5511939026928?text=Ol%C3%A1%20ATR%20Studio%2C%20preciso%20de%20suporte%20no%20Adega%20Pro.';

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="pb-4 border-b border-neutral-800">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Headphones size={22} className="text-amber-400"/> Suporte Técnico ATR Studio
          </h1>
          <p className="text-xs text-neutral-400 mt-1">Canal oficial para dúvidas operacionais, falhas e incidentes técnicos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <a href={whatsapp} target="_blank" rel="noreferrer"
            className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 hover:border-emerald-500 transition-colors">
            <MessageCircle className="text-emerald-400 mb-3" size={28}/>
            <h2 className="font-bold text-white">WhatsApp ATR Studio</h2>
            <p className="text-xs text-neutral-400 mt-1">Atendimento direto para suporte do Adega Pro.</p>
            <div className="mt-4 text-xs text-emerald-400 font-bold flex items-center gap-1">Abrir WhatsApp <ExternalLink size={12}/></div>
          </a>

          <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer"
            className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 transition-colors">
            <img src="https://atrstudio.com.br/favicon.ico" alt="ATR Studio" className="w-9 h-9 rounded-lg mb-3 bg-white" />
            <h2 className="font-bold text-white">ATR Studio</h2>
            <p className="text-xs text-neutral-400 mt-1">Desenvolvimento, manutenção e evolução do sistema.</p>
            <div className="mt-4 text-xs text-amber-400 font-bold flex items-center gap-1">atrstudio.com.br <ExternalLink size={12}/></div>
          </a>
        </div>

        <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div>
            <h2 className="font-bold text-white flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400"/> Relatar problema técnico</h2>
            <p className="text-[11px] text-neutral-500 mt-1">Descreva o problema com contexto suficiente para diagnóstico.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input required placeholder="Nome do solicitante" className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
            <select className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400">
              <option>PDV / Venda</option><option>Estoque</option><option>Financeiro</option><option>Usuários / Acesso</option><option>Integrações</option><option>Outro</option>
            </select>
          </div>
          <input required placeholder="Assunto" className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
          <textarea required rows={6} placeholder="Explique o que aconteceu, o que esperava e se apareceu alguma mensagem de erro."
            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400 resize-y"/>
          <div className="flex items-center justify-between gap-3">
            {sent ? <span className="text-xs text-emerald-400">Solicitação registrada localmente. Integração com backend será conectada na etapa de banco.</span> : <span className="text-[11px] text-neutral-500">Não envie senhas, PINs, tokens ou dados completos de cartão.</span>}
            <button className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs uppercase flex items-center gap-2"><Send size={14}/> Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
