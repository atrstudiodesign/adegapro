import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const ProductionModuleGuard: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <div className="flex-1 grid place-items-center p-5 bg-neutral-950 text-white">
    <div className="w-full max-w-xl p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400 mb-4">
        <ShieldAlert size={23}/>
      </div>
      <h1 className="text-xl font-black">{title}</h1>
      <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
        {detail || 'Este módulo ainda não foi liberado para gravação no ambiente real. A versão demonstração continua disponível, mas a produção permanece bloqueada até concluir a migração transacional para o Supabase.'}
      </p>
      <div className="mt-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-500">
        Proteção ativa: nenhum dado real será desviado para o armazenamento local do navegador.
      </div>
    </div>
  </div>
);
