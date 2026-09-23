import React, { useState } from 'react';
import { db } from '../../services/db';
import { User, UserRole, PermissionKey } from '../../types';
import { UserCog, Plus, Shield, KeyRound, CheckCircle2, X } from 'lucide-react';

export const EmployeesView: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setUsers(db.getUsers());
  };

  const handleOpenNew = () => {
    setEditingUser({
      name: '',
      email: '',
      role: 'CAIXA',
      pin: '0000',
      active: true,
      permissions: ['sales.create', 'sales.view', 'cash.operate']
    });
    setIsModalOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditingUser({ ...u });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.name || !editingUser?.pin || editingUser.pin.length !== 4) {
      alert('Preencha o nome e um PIN numérico exato de 4 dígitos.');
      return;
    }

    db.saveUser(editingUser as any);
    refresh();
    setIsModalOpen(false);
    setFeedback(`Funcionário "${editingUser.name}" salvo com sucesso!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const allAvailablePermissions: Array<{ id: PermissionKey; label: string }> = [
    { id: 'sales.create', label: 'Realizar Vendas no PDV' },
    { id: 'sales.discount', label: 'Conceder Desconto na Venda' },
    { id: 'sales.cancel', label: 'Cancelar Vendas e Itens' },
    { id: 'sales.view', label: 'Ver Histórico de Vendas' },
    { id: 'cash.operate', label: 'Realizar Sangria e Suprimento' },
    { id: 'cash.open', label: 'Abrir Sessão de Caixa' },
    { id: 'cash.close', label: 'Fechar Sessão de Caixa' },
    { id: 'cash.view', label: 'Ver Saldo e Relatório de Caixa' },
    { id: 'products.view', label: 'Visualizar Produtos e Catálogo' },
    { id: 'products.edit', label: 'Cadastrar e Alterar Preços de Produtos' },
    { id: 'inventory.view', label: 'Ver Níveis de Estoque' },
    { id: 'inventory.adjust', label: 'Lançar Ajustes e Quebras de Estoque' },
    { id: 'finance.view', label: 'Ver Contas a Pagar e Receber' },
    { id: 'finance.edit', label: 'Dar Baixa em Contas e Lançar Despesas' },
    { id: 'reports.view', label: 'Acessar Relatórios Gerenciais' },
    { id: 'settings.edit', label: 'Alterar Configurações e Integrações' },
    { id: 'employees.manage', label: 'Gerenciar Outros Funcionários' }
  ];

  const togglePermission = (perm: PermissionKey) => {
    if (!editingUser) return;
    const current = editingUser.permissions || [];
    const next = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];
    setEditingUser({ ...editingUser, permissions: next });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-neutral-950">
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

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Novo Funcionário</span>
        </button>
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

            <div className="pt-4 border-t border-neutral-800 flex justify-end gap-2 mt-4">
              <button
                onClick={() => handleEdit(u)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Editar Perfil &amp; Permissões
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Employee Form */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingUser.id ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    value={editingUser.name || ''}
                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Cargo / Perfil</label>
                  <select
                    value={editingUser.role || 'CAIXA'}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                    <option value="GERENTE">GERENTE</option>
                    <option value="CAIXA">CAIXA</option>
                    <option value="ESTOQUISTA">ESTOQUISTA</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">PIN Numérico (4 Dígitos) *</label>
                  <input
                    required
                    maxLength={4}
                    pattern="[0-9]{4}"
                    type="password"
                    value={editingUser.pin || ''}
                    onChange={e => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="1234"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-center text-sm font-bold tracking-widest focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Granular Permissions (if not ADMINISTRADOR) */}
              {editingUser.role !== 'ADMINISTRADOR' && (
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-2">Permissões de Acesso</label>
                  <div className="space-y-1.5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 max-h-48 overflow-y-auto">
                    {allAvailablePermissions.map(p => {
                      const isChecked = editingUser.permissions?.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 text-xs text-neutral-300 hover:text-white cursor-pointer py-1"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={() => togglePermission(p.id)}
                            className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
