import React, { useState } from 'react';
import { db } from '../../services/db';
import { AccountPayable, AccountReceivable, FinancialEntry } from '../../types';
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  CreditCard
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const [tab, setTab] = useState<'PAGAR' | 'RECEBER' | 'FLUXO'>('PAGAR');
  const [payables, setPayables] = useState<AccountPayable[]>(db.getAccountsPayable());
  const [receivables, setReceivables] = useState<AccountReceivable[]>(db.getAccountsReceivable());
  const [entries, setEntries] = useState<FinancialEntry[]>(db.getFinancialEntries());

  const [isNewPayableModal, setIsNewPayableModal] = useState(false);
  const [payableDesc, setPayableDesc] = useState('');
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [payableDue, setPayableDue] = useState(new Date().toISOString().split('T')[0]);
  const [payableCategory, setPayableCategory] = useState<'FORNECEDOR' | 'ALUGUEL' | 'ENERGIA' | 'AGUA' | 'INTERNET' | 'SALARIOS' | 'OUTROS'>('OUTROS');
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setPayables(db.getAccountsPayable());
    setReceivables(db.getAccountsReceivable());
    setEntries(db.getFinancialEntries());
  };

  const handlePayAccount = (item: AccountPayable) => {
    if (window.confirm(`Confirmar o pagamento de "R$ ${item.amount.toFixed(2)}" referente a "${item.description}"?`)) {
      db.settleAccountPayable(item.id);
      refresh();
      setFeedback(`Conta "${item.description}" marcada como PAGA! Saída lançada no fluxo de caixa.`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleReceiveAccount = (item: AccountReceivable) => {
    if (window.confirm(`Confirmar o recebimento de "R$ ${item.amount.toFixed(2)}" do cliente "${item.customerName}"?`)) {
      db.settleAccountReceivable(item.id);
      refresh();
      setFeedback(`Recebimento de "${item.customerName}" concluído! Saldo do cliente atualizado.`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payableDesc || payableAmount <= 0) return;

    db.addAccountPayable({
      description: payableDesc,
      amount: payableAmount,
      dueDate: payableDue,
      category: payableCategory
    });

    refresh();
    setIsNewPayableModal(false);
    setPayableDesc('');
    setPayableAmount(0);
    setFeedback('Conta a pagar cadastrada com sucesso!');
    setTimeout(() => setFeedback(null), 3500);
  };

  const totalPagarPendente = payables.filter(p => p.status === 'PENDENTE').reduce((acc, p) => acc + p.amount, 0);
  const totalReceberPendente = receivables.filter(r => r.status === 'PENDENTE').reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign size={22} className="text-amber-400" />
            <span>Gestão Financeira &amp; Fluxo de Caixa</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Contas a pagar de fornecedores e despesas fixas, contas a receber (fiado) e livro caixa.
          </p>
        </div>

        <button
          onClick={() => setIsNewPayableModal(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Cadastrar Conta a Pagar</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[10px] font-bold text-neutral-500 uppercase">Total a Pagar (Pendente)</div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-1">
            R$ {totalPagarPendente.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Fornecedores, aluguéis e boletos</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[10px] font-bold text-neutral-500 uppercase">Total a Receber (Fiado)</div>
          <div className="text-2xl font-black font-mono text-blue-400 mt-1">
            R$ {totalReceberPendente.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Crédito concedido a clientes</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[10px] font-bold text-neutral-500 uppercase">Saldo Líquido Projetado</div>
          <div className={`text-2xl font-black font-mono mt-1 ${totalReceberPendente - totalPagarPendente >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            R$ {(totalReceberPendente - totalPagarPendente).toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Receber pendente - Pagar pendente</div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setTab('PAGAR')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            tab === 'PAGAR' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Contas a Pagar ({payables.filter(p => p.status === 'PENDENTE').length})
        </button>

        <button
          onClick={() => setTab('RECEBER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            tab === 'RECEBER' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Contas a Receber (Fiado) ({receivables.filter(r => r.status === 'PENDENTE').length})
        </button>

        <button
          onClick={() => setTab('FLUXO')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            tab === 'FLUXO' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Livro Caixa &amp; Movimentações ({entries.length})
        </button>
      </div>

      {/* Tab: Contas a Pagar */}
      {tab === 'PAGAR' && (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {payables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    Nenhuma conta a pagar cadastrada.
                  </td>
                </tr>
              ) : (
                payables.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-850/60">
                    <td className="py-3 px-4 font-bold text-white">
                      {p.description}
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-300 text-[11px]">
                      {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400 text-sm">
                      R$ {p.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.status === 'PAGO'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {p.status === 'PENDENTE' && (
                        <button
                          onClick={() => handlePayAccount(p)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Dar Baixa (Pagar)
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Contas a Receber */}
      {tab === 'RECEBER' && (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-3">Descrição / Venda</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3 text-right">Valor Fiado</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {receivables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-500">
                    Nenhuma conta a receber pendente.
                  </td>
                </tr>
              ) : (
                receivables.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-850/60">
                    <td className="py-3 px-4 font-bold text-white">
                      {r.customerName}
                    </td>

                    <td className="py-3 px-3 text-neutral-300">
                      {r.description}
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-300 text-[11px]">
                      {new Date(r.dueDate).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-400 text-sm">
                      R$ {r.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          r.status === 'PAGO'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {r.status === 'PENDENTE' && (
                        <button
                          onClick={() => handleReceiveAccount(r)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-neutral-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Receber Fiado
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Livro Caixa */}
      {tab === 'FLUXO' && (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Descrição</th>
                <th className="py-3 px-3 text-right">Valor</th>
                <th className="py-3 px-4">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-neutral-850/60">
                  <td className="py-3 px-4 font-mono text-[11px] text-neutral-400">
                    {new Date(e.createdAt).toLocaleString('pt-BR')}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        e.type === 'RECEITA'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-neutral-300">
                    {e.category}
                  </td>

                  <td className="py-3 px-3 text-white font-medium">
                    {e.description}
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                    <span className={e.type === 'RECEITA' ? 'text-emerald-400' : 'text-rose-400'}>
                      {e.type === 'RECEITA' ? '+' : '-'}R$ {e.amount.toFixed(2)}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-neutral-400 font-mono text-xs">
                    {e.source || 'SISTEMA'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: New Payable */}
      {isNewPayableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Cadastrar Conta a Pagar</h3>
              <button onClick={() => setIsNewPayableModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Descrição da Despesa *</label>
                <input
                  required
                  type="text"
                  value={payableDesc}
                  onChange={e => setPayableDesc(e.target.value)}
                  placeholder="Ex: Aluguel do ponto comercial / Conta de Energia"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Valor (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={payableAmount || ''}
                    onChange={e => setPayableAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Vencimento *</label>
                  <input
                    required
                    type="date"
                    value={payableDue}
                    onChange={e => setPayableDue(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Categoria</label>
                <select
                  value={payableCategory}
                  onChange={e => setPayableCategory(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  <option value="FORNECEDOR">Fornecedor</option>
                  <option value="ALUGUEL">Aluguel do Imóvel</option>
                  <option value="ENERGIA">Energia Elétrica</option>
                  <option value="AGUA">Água e Esgoto</option>
                  <option value="INTERNET">Internet e Telefonia</option>
                  <option value="SALARIOS">Salários e Pró-labore</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPayableModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
