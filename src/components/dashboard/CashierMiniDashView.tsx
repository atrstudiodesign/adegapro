import React, { useState, useMemo } from 'react';
import { db } from '../../services/db';
import { User, CashSession, Sale, CashMovement } from '../../types';
import {
  TrendingUp,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Receipt,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote
} from 'lucide-react';

interface CashierMiniDashViewProps {
  currentUser: User;
  currentSession?: CashSession;
  onNavigate: (tab: string) => void;
  onOpenQuickSale?: () => void;
}

export const CashierMiniDashView: React.FC<CashierMiniDashViewProps> = ({
  currentUser,
  currentSession,
  onNavigate,
  onOpenQuickSale
}) => {
  const [activeModal, setActiveModal] = useState<'SANGRIA' | 'SUPRIMENTO' | null>(null);
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const sales = db.getSales();
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter sales for today
  const todaySales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'CANCELADA') return false;
      return s.createdAt.startsWith(todayStr);
    });
  }, [sales, todayStr]);

  // Movements (Sangrias e Suprimentos) of today or current session
  const movements = useMemo(() => {
    const all = db.getCashMovements(currentSession?.id);
    return all.filter(m => m.createdAt.startsWith(todayStr));
  }, [currentSession, todayStr]);

  // Today Sales Metrics
  const totalVendasDia = useMemo(() => {
    return todaySales.reduce((acc, s) => acc + s.total, 0);
  }, [todaySales]);

  const qtdVendasDia = todaySales.length;
  const ticketMedio = qtdVendasDia > 0 ? totalVendasDia / qtdVendasDia : 0;

  // Total Saídas (Sangrias de hoje)
  const totalSaidasDia = useMemo(() => {
    return movements
      .filter(m => m.type === 'SANGRIA')
      .reduce((acc, m) => acc + m.amount, 0);
  }, [movements]);

  const totalSuprimentosDia = useMemo(() => {
    return movements
      .filter(m => m.type === 'SUPRIMENTO')
      .reduce((acc, m) => acc + m.amount, 0);
  }, [movements]);

  // Dinheiro vivo em gaveta
  const saldoDinheiroGaveta = currentSession ? currentSession.expectedCashInRegister : 0;

  // Breakdown by payment method today
  const paymentBreakdown = useMemo(() => {
    const totals: Record<string, number> = {
      DINHEIRO: 0,
      PIX: 0,
      DEBITO: 0,
      CREDITO: 0,
      FIADO: 0
    };

    todaySales.forEach(s => {
      s.payments.forEach(p => {
        if (totals[p.method] !== undefined) {
          totals[p.method] += p.amount;
        } else {
          totals[p.method] = (totals[p.method] || 0) + p.amount;
        }
      });
    });

    return totals;
  }, [todaySales]);

  const handleExecuteOperation = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(modalAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    if (!modalReason.trim()) {
      alert('Informe a justificativa/motivo.');
      return;
    }

    try {
      db.addCashMovement(activeModal!, amount, modalReason.trim());
      setFeedback(`${activeModal === 'SANGRIA' ? 'Sangria' : 'Suprimento'} de R$ ${amount.toFixed(2)} registrado com sucesso!`);
      setActiveModal(null);
      setModalAmount('');
      setModalReason('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar operação.');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-neutral-950 text-neutral-100">
      {/* Top Banner / Cashier Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white uppercase tracking-tight">
                Mini Dash · Frente de Caixa
              </h1>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                OPERADOR
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Operador: <strong className="text-white">{currentUser.name}</strong> · Terminal:{' '}
              <span className="text-amber-400 font-mono">
                {currentSession ? `${currentSession.cashRegisterNumber} (ABERTO)` : 'CAIXA FECHADO'}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ShoppingCart size={16} />
            <span>Abrir PDV (Frente de Loja)</span>
          </button>

          <button
            onClick={() => setActiveModal('SANGRIA')}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-rose-900/50 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownRight size={15} className="text-rose-400" />
            <span>Sangria</span>
          </button>

          <button
            onClick={() => setActiveModal('SUPRIMENTO')}
            className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-900/50 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight size={15} className="text-emerald-400" />
            <span>Suprimento</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="font-semibold">{feedback}</span>
        </div>
      )}

      {/* 4 CORE CASHIER CARDS: Vendas do Dia, Total de Saídas, Dinheiro em Gaveta, Qtd Atendimentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas do Dia */}
        <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 hover:border-amber-500/30 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Vendas do Dia</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            R$ {totalVendasDia.toFixed(2)}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Ticket Médio: <strong className="text-amber-400 font-mono">R$ {ticketMedio.toFixed(2)}</strong></span>
            <span className="text-emerald-400 font-bold">Hoje</span>
          </div>
        </div>

        {/* Total de Saídas (Sangrias) */}
        <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 hover:border-rose-500/30 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Saídas (Hoje)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 tracking-tight">
            R$ {totalSaidasDia.toFixed(2)}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Sangrias de segurança / cofre</span>
            <span className="text-rose-400 font-mono text-[10px]">
              {movements.filter(m => m.type === 'SANGRIA').length} ret.
            </span>
          </div>
        </div>

        {/* Dinheiro Líquido em Gaveta */}
        <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 hover:border-amber-500/30 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dinheiro em Gaveta</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400 tracking-tight">
            R$ {saldoDinheiroGaveta.toFixed(2)}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Fundo inicial + Entradas - Sangrias</span>
            <span className="text-amber-400 font-bold font-mono">Esperado</span>
          </div>
        </div>

        {/* Atendimentos / Cupons */}
        <div className="p-5 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 hover:border-blue-500/30 transition-all shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Atendimentos Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Receipt size={18} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {qtdVendasDia} <span className="text-xs font-normal text-neutral-400 font-sans">cupons</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
            <button
              onClick={() => onNavigate('sales')}
              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Ver vendas do dia</span>
              <ArrowRight size={12} />
            </button>
            <span className="text-blue-400 font-bold">100% Finalizadas</span>
          </div>
        </div>
      </div>

      {/* MID ROW: Breakdown por Forma de Pagamento + Atalhos do Caixa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Entradas por Forma de Pagamento */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Banknote size={17} className="text-amber-400" />
                <span>Recebimentos por Forma de Pagamento (Hoje)</span>
              </h2>
              <p className="text-xs text-neutral-400">Total apurado nos fechamentos e transações de hoje.</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              R$ {totalVendasDia.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {/* Dinheiro */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Dinheiro</span>
                <Banknote size={14} className="text-emerald-400" />
              </div>
              <div className="mt-2 font-mono text-base font-black text-white">
                R$ {paymentBreakdown.DINHEIRO.toFixed(2)}
              </div>
            </div>

            {/* PIX */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>PIX QR Code</span>
                <QrCode size={14} className="text-cyan-400" />
              </div>
              <div className="mt-2 font-mono text-base font-black text-white">
                R$ {paymentBreakdown.PIX.toFixed(2)}
              </div>
            </div>

            {/* Cartão Débito */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Débito</span>
                <CreditCard size={14} className="text-blue-400" />
              </div>
              <div className="mt-2 font-mono text-base font-black text-white">
                R$ {paymentBreakdown.DEBITO.toFixed(2)}
              </div>
            </div>

            {/* Cartão Crédito */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Crédito</span>
                <CreditCard size={14} className="text-indigo-400" />
              </div>
              <div className="mt-2 font-mono text-base font-black text-white">
                R$ {paymentBreakdown.CREDITO.toFixed(2)}
              </div>
            </div>

            {/* Fiado / A Prazo */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Fiado / Prazo</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <div className="mt-2 font-mono text-base font-black text-amber-400">
                R$ {paymentBreakdown.FIADO.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick shortcuts row */}
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('products')}
              className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Package size={15} className="text-amber-400" />
              <span>Consultar / Cadastrar Produto</span>
            </button>

            <button
              onClick={() => onNavigate('sales')}
              className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Receipt size={15} className="text-amber-400" />
              <span>Ver Vendas do Dia ({todaySales.length})</span>
            </button>

            <button
              onClick={() => onNavigate('cash')}
              className="px-4 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Wallet size={15} className="text-amber-400" />
              <span>Fechar Sessão de Caixa</span>
            </button>
          </div>
        </div>

        {/* Right: Histórico de Saídas / Sangrias de Hoje */}
        <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowDownRight size={17} className="text-rose-400" />
                <span>Saídas &amp; Sangrias</span>
              </h2>
              <p className="text-[11px] text-neutral-400">Retiradas efetuadas neste turno.</p>
            </div>
            <button
              onClick={() => setActiveModal('SANGRIA')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              + Sangria
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
            {movements.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs">
                Nenhuma sangria ou saída realizada hoje.
              </div>
            ) : (
              movements.map(m => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          m.type === 'SANGRIA'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {m.type}
                      </span>
                      <span className="font-semibold text-neutral-200 truncate max-w-[140px]">
                        {m.reason}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-black text-sm ${
                        m.type === 'SANGRIA' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {m.type === 'SANGRIA' ? '-' : '+'} R$ {m.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RECENT SALES OF TODAY */}
      <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800/80 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt size={17} className="text-amber-400" />
              <span>Últimas Vendas Realizadas Hoje ({todaySales.length})</span>
            </h2>
            <p className="text-xs text-neutral-400">Atendimentos emitidos na frente de loja.</p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todas as vendas</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="space-y-2">
          {todaySales.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">
              Nenhuma venda realizada hoje ainda. Abra o PDV para iniciar as vendas!
            </div>
          ) : (
            todaySales.slice(0, 5).map(sale => (
              <div
                key={sale.id}
                className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold shrink-0">
                    #{sale.saleNumber}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{sale.customerName || 'Cliente Balcão'}</span>
                      <span className="text-[10px] text-neutral-500 font-normal">
                        ({sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'})
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>{new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>Pagamento: {sale.payments.map(p => p.method).join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-emerald-400">
                      R$ {sale.total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-500 font-semibold uppercase">PAGA</div>
                  </div>

                  <button
                    onClick={() => onNavigate('sales')}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cupom
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Sangria / Suprimento */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    activeModal === 'SANGRIA'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {activeModal === 'SANGRIA' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {activeModal === 'SANGRIA' ? 'Registrar Sangria (Saída)' : 'Registrar Suprimento (Entrada)'}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Terminal: {currentSession?.cashRegisterNumber || 'Caixa'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteOperation} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Valor (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 rounded-xl px-4 py-3 font-mono text-xl font-bold text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Justificativa / Motivo
                </label>
                <input
                  type="text"
                  placeholder={activeModal === 'SANGRIA' ? 'Ex: Sangria de segurança para o cofre' : 'Ex: Troco de moedas'}
                  value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-neutral-950 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-lg ${
                    activeModal === 'SANGRIA'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400'
                  }`}
                >
                  Confirmar {activeModal === 'SANGRIA' ? 'Sangria' : 'Suprimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
