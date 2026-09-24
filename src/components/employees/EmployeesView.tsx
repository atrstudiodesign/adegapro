import React, { useState } from 'react';
import { db } from '../../services/db';
import { User, UserRole, PermissionKey } from '../../types';
import { UserCog, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';

export const EmployeesView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [feedback] = useState<string | null>(null);

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCog size={22} className="text-amber-400" />
            <span>Funcionários, PINs &amp; Controle de Acesso</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Cadastre caixas, gerentes, configure PINs de 4 dígitos e permissões para cancelamentos e descontos.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-violet-950/60 border border-violet-800 text-violet-300 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={15} />
          <span>Somente leitura no Demo</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => (
          <div
            key={u.id}
            className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/50 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-white text-base">{u.name}</h3>
                  <div className="text-xs text-neutral-400 font-mono">{u.email}</div>
                </div>

                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    u.role === 'ADMINISTRADOR'
                      ? 'bg-amber-500 text-neutral-950'
                      : u.role === 'GERENTE'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {u.role}
                </span>
              </div>

              {/* PIN Display */}
              <div className="flex items-center gap-2 my-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                <KeyRound size={16} className="text-amber-400" />
                <span className="text-neutral-400">PIN de Autenticação Rápida:</span>
                <span className="font-mono font-bold text-white tracking-widest bg-neutral-800 px-2 py-0.5 rounded">
                  {'••••'}
                </span>
              </div>

              {/* Permissions count */}
              <div className="text-xs text-neutral-400">
                {u.role === 'ADMINISTRADOR' ? (
                  <span className="text-emerald-400 font-semibold">Acesso irrestrito a todos os módulos</span>
                ) : (
                  <span>{u.permissions.length} permissões ativas concedidas</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 mt-4 text-[11px] text-neutral-500">
              Perfil demonstrativo protegido. PIN e permissões não podem ser alterados neste ambiente.
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
