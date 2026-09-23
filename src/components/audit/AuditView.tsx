import React, { useState } from 'react';
import { db } from '../../services/db';
import { AuditLog } from '../../types';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(db.getAuditLogs());
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(l => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-amber-400" />
            <span>Trilha de Auditoria &amp; Logs Imutáveis</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registro detalhado de operações críticas (cancelamentos de venda, sangrias, ajustes de estoque e logins).
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrar por ação, usuário, produto ou detalhes..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-3">Ação Realizada</th>
                <th className="py-3 px-3">Entidade</th>
                <th className="py-3 px-4">Detalhes da Operação</th>
                <th className="py-3 px-4 text-right">Usuário Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-neutral-850/60">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                    {new Date(l.createdAt).toLocaleString('pt-BR')}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700/80">
                      {l.action}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-neutral-400 font-mono text-[11px]">
                    {l.entity}
                  </td>

                  <td className="py-3.5 px-4 text-white">
                    {l.details}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-neutral-300 text-xs">
                    {l.userName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
