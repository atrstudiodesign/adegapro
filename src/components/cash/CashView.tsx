import React, { useState } from 'react';
import { db } from '../../services/db';
import { CashSession, CashMovement, User } from '../../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  X
} from 'lucide-react';

interface CashViewProps {
  currentUser: User;
  onSessionUpdated: () => void;
}

export const CashView: React.FC<CashViewProps> = ({ currentUser, onSessionUpdated }) => {
  const currentSession = db.getCurrentSession();
  const allSessions = db.getCashSessions();
  const movements = currentSession ? db.getCashMovements(currentSession.id) : [];

  // Modals
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSangriaModal, setIsSangriaModal] = useState(false);
  const [isSuprimentoModal, setIsSuprimentoModal] = useState(false);
  const [isCloseModal, setIsCloseModal] = useState(false);

  // Form states
  const [initialCash, setInitialCash] = useState<number>(100);
  const [registerNumber, setRegisterNumber] = useState<string>('reg-01');
  const [operationAmount, setOperationAmount] = useState<number>(0);
  const [operationReason, setOperationReason] = useState<string>('');
  const [countedCash, setCountedCash] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    db.openCashSession(registerNumber, initialCash);
    onSessionUpdated();
    setIsOpenModal(false);
    setFeedback(`Sessão de caixa aberta com sucesso com suprimento de R$ ${initialCash.toFixed(2)}.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAddSangria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || operationAmount <= 0) return;
    if (operationAmount > currentSession.expectedCashInRegister) {
      alert('A sangria não pode ser maior do que o dinheiro disponível em gaveta.');
      return;
    }

    db.addCashMovement('SANGRIA', operationAmount, operationReason || 'Sangria de segurança para cofre');

    onSessionUpdated();
    setIsSangriaModal(false);
    setOperationAmount(0);
    setOperationReason('');
    setFeedback(`Sangria de R$ ${operationAmount.toFixed(2)} registrada.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAddSuprimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || operationAmount <= 0) return;

    db.addCashMovement('SUPRIMENTO', operationAmount, operationReason || 'Suprimento de troco para gaveta');

    onSessionUpdated();
    setIsSuprimentoModal(false);
    setOperationAmount(0);
    setOperationReason('');
    setFeedback(`Suprimento de R$ ${operationAmount.toFixed(2)} adicionado.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const closed = db.closeCashSession(currentSession.id, countedCash);
    onSessionUpdated();
    setIsCloseModal(false);
    const diff = closed.cashDifference || 0;
    const diffMsg = diff === 0 ? 'Conferência exata!' : diff > 0 ? `Sobra de R$ ${diff.toFixed(2)}` : `Falta de R$ ${Math.abs(diff).toFixed(2)}`;
    setFeedback(`Caixa fechado com sucesso! Resultado da conferência cega: ${diffMsg}`);
    setTimeout(() => setFeedback(null), 4500);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet size={22} className="text-amber-400" />
            <span>Gestão de Caixa &amp; Fechamento Cego</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Abertura, sangrias de segurança, suprimento de troco e fechamento com conferência física cega.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentSession ? (
            <>
              <button
                onClick={() => setIsSangriaModal(true)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowUpRight size={15} />
                <span>Sangria (Retirada)</span>
              </button>

              <button
                onClick={() => setIsSuprimentoModal(true)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ArrowDownLeft size={15} />
                <span>Suprimento (Entrada)</span>
              </button>

              <button
                onClick={() => {
                  setCountedCash(0);
                  setIsCloseModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Lock size={15} />
                <span>Fechar Caixa (Conferência Cega)</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setInitialCash(100);
                setIsOpenModal(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer transition-colors"
            >
              <Unlock size={16} />
              <span>Abrir Sessão de Caixa</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Current Active Session Overview */}
      {currentSession ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-bold text-white text-base">{currentSession.cashRegisterNumber} - EM OPERAÇÃO</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  SESSÃO ABERTA
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Aberta em {new Date(currentSession.openedAt).toLocaleString('pt-BR')} por {currentSession.operatorName}
              </p>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                Total em Dinheiro na Gaveta (Calculado)
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                R$ {currentSession.expectedCashInRegister.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick Metrics of this Session */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div className="text-[10px] text-neutral-500 font-bold uppercase">Fundo Inicial</div>
              <div className="text-base font-mono font-bold text-white">
                R$ {currentSession.initialBalance.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div className="text-[10px] text-neutral-500 font-bold uppercase">Vendas Dinheiro</div>
              <div className="text-base font-mono font-bold text-emerald-400">
                R$ {currentSession.totalCashSales.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div className="text-[10px] text-neutral-500 font-bold uppercase">Vendas PIX</div>
              <div className="text-base font-mono font-bold text-teal-400">
                R$ {currentSession.totalPixSales.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div className="text-[10px] text-neutral-500 font-bold uppercase">Vendas Cartão</div>
              <div className="text-base font-mono font-bold text-blue-400">
                R$ {(currentSession.totalCardDebitSales + currentSession.totalCardCreditSales).toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div className="text-[10px] text-neutral-500 font-bold uppercase">Total Sangrias</div>
              <div className="text-base font-mono font-bold text-rose-400">
                -R$ {currentSession.totalSangrias.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Session Operations List */}
          <div className="mt-5 pt-4 border-t border-neutral-800/80">
            <h4 className="text-xs font-bold text-neutral-300 mb-2">Movimentações Avulsas desta Sessão</h4>
            {movements.length === 0 ? (
              <div className="text-neutral-500 text-xs py-2">Nenhuma sangria ou suprimento lançado ainda.</div>
            ) : (
              <div className="space-y-1.5">
                {movements.map(op => (
                  <div
                    key={op.id}
                    className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          op.type === 'SUPRIMENTO'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {op.type}
                      </span>
                      <span className="text-white font-medium">{op.reason}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500 text-[10px] font-mono">
                        {new Date(op.createdAt).toLocaleTimeString('pt-BR')}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          op.type === 'SUPRIMENTO' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {op.type === 'SUPRIMENTO' ? '+' : '-'}R$ {op.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Lock size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum Caixa Aberto no Momento</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
              Para registrar vendas no PDV, emitir cupons e receber pagamentos em dinheiro ou PIX, é necessário abrir um caixa informando o valor de suprimento inicial (troco).
            </p>
          </div>
          <button
            onClick={() => {
              setInitialCash(100);
              setIsOpenModal(true);
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Unlock size={16} />
            <span>Abrir Caixa Agora</span>
          </button>
        </div>
      )}

      {/* Sessions History Table */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-3">Histórico de Fechamento de Sessões</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/60 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-2.5 px-4">Caixa / Operador</th>
                <th className="py-2.5 px-3">Abertura / Fechamento</th>
                <th className="py-2.5 px-3 text-right">Fundo Inicial</th>
                <th className="py-2.5 px-3 text-right">Total Vendas</th>
                <th className="py-2.5 px-3 text-right">Dinheiro Esperado</th>
                <th className="py-2.5 px-3 text-right">Dinheiro Contado</th>
                <th className="py-2.5 px-3 text-center">Divergência</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {allSessions.map(s => {
                const isDiff = s.cashDifference !== undefined && s.cashDifference !== 0;
                return (
                  <tr key={s.id} className="hover:bg-neutral-850/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{s.cashRegisterNumber}</div>
                      <div className="text-[10px] text-neutral-400">Op: {s.operatorName}</div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-400">
                      <div>{new Date(s.openedAt).toLocaleString('pt-BR')}</div>
                      {s.closedAt && (
                        <div className="text-neutral-500">
                          {new Date(s.closedAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-neutral-300">
                      R$ {s.initialBalance.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                      R$ {s.totalSales.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-neutral-300">
                      R$ {s.expectedCashInRegister.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-white">
                      {s.countedCash !== undefined ? `R$ ${s.countedCash.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {s.cashDifference !== undefined ? (
                        <span
                          className={
                            s.cashDifference === 0
                              ? 'text-emerald-400'
                              : s.cashDifference > 0
                              ? 'text-blue-400'
                              : 'text-rose-400'
                          }
                        >
                          {s.cashDifference > 0 ? `+R$ ${s.cashDifference.toFixed(2)}` : `R$ ${s.cashDifference.toFixed(2)}`}
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          s.status === 'ABERTO'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700/60'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Open Cash Session */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Unlock size={18} className="text-amber-400" />
                <span>Abrir Sessão de Caixa</span>
              </h3>
              <button onClick={() => setIsOpenModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Terminal de Caixa</label>
                <select
                  value={registerNumber}
                  onChange={e => setRegisterNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  <option value="reg-01">Caixa 01 (Frente de Loja Principal)</option>
                  <option value="reg-02">Caixa 02 (Balcão de Atendimento)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Fundo de Troco Inicial (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialCash}
                  onChange={e => setInitialCash(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-base font-bold focus:border-amber-400 focus:outline-none"
                />
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Valor em cédulas e moedas físicas colocado na gaveta ao iniciar o turno.
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sangria */}
      {isSangriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpRight size={18} className="text-rose-400" />
                <span>Sangria de Caixa (Retirada)</span>
              </h3>
              <button onClick={() => setIsSangriaModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSangria} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor da Retirada (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentSession?.expectedCashInRegister}
                  value={operationAmount || ''}
                  onChange={e => setOperationAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-base font-bold focus:border-rose-400 focus:outline-none"
                />
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Disponível em gaveta: R$ {currentSession?.expectedCashInRegister.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Motivo / Destino *</label>
                <input
                  required
                  type="text"
                  value={operationReason}
                  onChange={e => setOperationReason(e.target.value)}
                  placeholder="Ex: Sangria para cofre, Pagamento de frete"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSangriaModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Confirmar Sangria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Suprimento */}
      {isSuprimentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowDownLeft size={18} className="text-emerald-400" />
                <span>Suprimento de Troco (Entrada)</span>
              </h3>
              <button onClick={() => setIsSuprimentoModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSuprimento} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor do Aporte (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={operationAmount || ''}
                  onChange={e => setOperationAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-base font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Origem / Motivo *</label>
                <input
                  required
                  type="text"
                  value={operationReason}
                  onChange={e => setOperationReason(e.target.value)}
                  placeholder="Ex: Troca de moedas, Reforço de troco"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSuprimentoModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Confirmar Suprimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Blind Cash Closing */}
      {isCloseModal && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock size={18} className="text-rose-400" />
                <span>Fechamento Cego de Caixa</span>
              </h3>
              <button onClick={() => setIsCloseModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-4 py-4">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  <span>Procedimento de Auditoria Cega</span>
                </div>
                O operador deve contar todas as cédulas e moedas físicas presentes na gaveta sem visualizar o total apurado pelo sistema. O sistema fará o batimento automático e registrará eventuais sobras ou quebras de caixa.
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Total em Dinheiro Contado na Gaveta (R$) *
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedCash}
                  onChange={e => setCountedCash(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono text-xl font-black focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Finalizar Fechamento Cego
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
