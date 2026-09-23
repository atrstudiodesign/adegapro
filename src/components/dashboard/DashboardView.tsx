import React, { useState, useMemo } from 'react';
import { db } from '../../services/db';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  PackageX,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Sparkles,
  MonitorPlay,
  Database,
  RotateCcw
} from 'lucide-react';
import { AppMode } from '../../services/appMode';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  appMode?: AppMode;
  onChangeMode?: (mode: AppMode) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, appMode = 'DEMO', onChangeMode }) => {
  const [filterPeriod, setFilterPeriod] = useState<'HOJE' | '7DIAS' | 'MES_ATUAL'>('HOJE');

  const products = db.getProducts();
  const sales = db.getSales();
  const accountsPayable = db.getAccountsPayable();
  const accountsReceivable = db.getAccountsReceivable();
  const currentSession = db.getCurrentSession();
  const stockMovements = db.getStockMovements();

  // Metrics Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filter sales based on period
    const filteredSales = sales.filter(s => {
      if (s.status === 'CANCELADA') return false;
      const sDate = s.createdAt.split('T')[0];
      if (filterPeriod === 'HOJE') return sDate === todayStr;
      if (filterPeriod === '7DIAS') {
        const diff = (now.getTime() - new Date(s.createdAt).getTime()) / 86400000;
        return diff <= 7;
      }
      // Month
      return s.createdAt.startsWith(now.toISOString().substring(0, 7));
    });

    const faturamentoPeriodo = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const vendasCount = filteredSales.length;
    const ticketMedio = vendasCount > 0 ? faturamentoPeriodo / vendasCount : 0;
    const produtosVendidosCount = filteredSales.reduce((acc, s) => {
      return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);

    // Month Total
    const mesSales = sales.filter(s => s.status === 'PAGA' && s.createdAt.startsWith(now.toISOString().substring(0, 7)));
    const faturamentoMes = mesSales.reduce((acc, s) => acc + s.total, 0);

    // Stock stats
    const estoqueBaixo = products.filter(p => !p.isCombo && p.currentStock > 0 && p.currentStock <= p.minStock);
    const semEstoque = products.filter(p => !p.isCombo && p.currentStock <= 0);

    // Finance stats
    const totalPagar = accountsPayable
      .filter(p => p.status === 'PENDENTE')
      .reduce((acc, p) => acc + p.amount, 0);
    const totalReceber = accountsReceivable
      .filter(r => r.status === 'PENDENTE')
      .reduce((acc, r) => acc + r.amount, 0);

    const saldoCaixaAtual = currentSession ? currentSession.expectedCashInRegister : 0;

    // Payment methods breakdown
    const paymentMethods: Record<string, number> = {
      DINHEIRO: 0,
      PIX: 0,
      DEBITO: 0,
      CREDITO: 0,
      OUTROS: 0
    };
    filteredSales.forEach(s => {
      s.payments.forEach(p => {
        if (paymentMethods[p.method] !== undefined) {
          paymentMethods[p.method] += p.amount;
        } else {
          paymentMethods.OUTROS += p.amount;
        }
      });
    });

    // Top selling products count
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.productName, quantity: 0, revenue: 0 };
        }
        productSalesMap[it.productId].quantity += it.quantity;
        productSalesMap[it.productId].revenue += it.subtotal;
      });
    });
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      faturamentoPeriodo,
      faturamentoMes,
      vendasCount,
      ticketMedio,
      produtosVendidosCount,
      estoqueBaixo,
      semEstoque,
      totalPagar,
      totalReceber,
      saldoCaixaAtual,
      paymentMethods,
      topProducts
    };
  }, [sales, products, accountsPayable, accountsReceivable, currentSession, filterPeriod]);

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Painel Gerencial da Adega</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Métricas em tempo real de vendas, caixas, estoque de bebidas e financeiro.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {[
            { id: 'HOJE', label: 'Hoje' },
            { id: '7DIAS', label: 'Últimos 7 Dias' },
            { id: 'MES_ATUAL', label: 'Mês Atual' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPeriod(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterPeriod === p.id
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo / Production Environment Control */}
      <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
        appMode === 'DEMO'
          ? 'bg-violet-950/30 border-violet-700/50'
          : 'bg-emerald-950/20 border-emerald-800/50'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl grid place-items-center border ${
            appMode === 'DEMO'
              ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            {appMode === 'DEMO' ? <MonitorPlay size={20}/> : <Database size={20}/>}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-white">
                {appMode === 'DEMO' ? 'Modo Demonstração Ativo' : 'Modo Produção'}
              </h2>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                appMode === 'DEMO'
                  ? 'text-violet-300 border-violet-700 bg-violet-950/60'
                  : 'text-emerald-300 border-emerald-800 bg-emerald-950/60'
              }`}>
                {appMode === 'DEMO' ? 'DADOS FICTÍCIOS' : 'SUPABASE'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              {appMode === 'DEMO'
                ? 'Use este ambiente para apresentar o sistema ao cliente sem alterar dados reais. Vendas, produtos e movimentações ficam isolados no modo demonstração.'
                : 'Ambiente destinado aos dados reais da adega. Os módulos estão sendo conectados gradualmente ao banco Supabase com RLS e auditoria.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {appMode !== 'DEMO' && (
            <button
              onClick={() => onChangeMode?.('DEMO')}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2"
            >
              <MonitorPlay size={15}/>
              Abrir Demo para Cliente
            </button>
          )}

          {appMode === 'DEMO' && (
            <>
              <button
                onClick={() => {
                  const ok = window.confirm('Reiniciar os dados fictícios da demonstração? Isso não afeta o banco real.');
                  if (!ok) return;
                  Object.keys(localStorage)
                    .filter(k => k.startsWith('toba_saas_v1_'))
                    .forEach(k => localStorage.removeItem(k));
                  window.location.reload();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-2"
              >
                <RotateCcw size={14}/> Reiniciar Demo
              </button>

              <button
                onClick={() => onChangeMode?.('PRODUCTION')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2"
              >
                <Database size={15}/>
                Ir para Produção
              </button>
            </>
          )}
        </div>
      </div>

      {/* Critical Stock Alert Banner if any items low */}
      {metrics.estoqueBaixo.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>
              <strong>Atenção ao Estoque:</strong> Há {metrics.estoqueBaixo.length} produto(s) com estoque abaixo do mínimo recomendado (ex: {metrics.estoqueBaixo[0].name}).
            </span>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Ver Produtos
          </button>
        </div>
      )}

      {/* 10 Operational KPI Metric Cards */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-3.5">
        {/* Card 1: Faturamento Período */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Faturamento ({filterPeriod === 'HOJE' ? 'Hoje' : filterPeriod === '7DIAS' ? '7 Dias' : 'Mês'})
          </div>
          <div className="text-xl font-black font-mono text-white">
            R$ {metrics.faturamentoPeriodo.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <ArrowUpRight size={12} />
            <span>Total líquido em vendas</span>
          </div>
        </div>

        {/* Card 2: Faturamento Mês */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Faturamento do Mês
          </div>
          <div className="text-xl font-black font-mono text-amber-400">
            R$ {metrics.faturamentoMes.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Acumulado mensal</div>
        </div>

        {/* Card 3: Vendas Realizadas */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Vendas Concluídas
          </div>
          <div className="text-xl font-black font-mono text-white">
            {metrics.vendasCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {metrics.produtosVendidosCount} unidades comercializadas
          </div>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Ticket Médio
          </div>
          <div className="text-xl font-black font-mono text-white">
            R$ {metrics.ticketMedio.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Gasto médio por cliente</div>
        </div>

        {/* Card 5: Saldo de Caixa Aberto */}
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Dinheiro em Caixa
          </div>
          <div className="text-xl font-black font-mono text-emerald-400">
            R$ {metrics.saldoCaixaAtual.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {currentSession ? currentSession.cashRegisterNumber : 'Caixa fechado'}
          </div>
        </div>

        {/* Card 6: Estoque Baixo */}
        <div
          onClick={() => onNavigate('products')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Estoque Baixo
          </div>
          <div className="text-xl font-black font-mono text-amber-400">
            {metrics.estoqueBaixo.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Itens atingindo alerta mínimo</div>
        </div>

        {/* Card 7: Sem Estoque (Zero) */}
        <div
          onClick={() => onNavigate('products')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:border-rose-500/50 transition-colors"
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Sem Estoque
          </div>
          <div className="text-xl font-black font-mono text-rose-400">
            {metrics.semEstoque.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Itens esgotados</div>
        </div>

        {/* Card 8: Contas a Pagar */}
        <div
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Contas a Pagar
          </div>
          <div className="text-xl font-black font-mono text-rose-400">
            R$ {metrics.totalPagar.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Fornecedores e fixas</div>
        </div>

        {/* Card 9: Contas a Receber */}
        <div
          onClick={() => onNavigate('finance')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Contas a Receber (Fiado)
          </div>
          <div className="text-xl font-black font-mono text-blue-400">
            R$ {metrics.totalReceber.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Crediário de clientes</div>
        </div>

        {/* Card 10: Combos Ativos */}
        <div
          onClick={() => onNavigate('combos')}
          className="p-4 rounded-xl bg-neutral-900 border border-neutral-800/80 cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Kits &amp; Combos
          </div>
          <div className="text-xl font-black font-mono text-white">
            {db.getCombos().filter(c => c.active).length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">Promoções ativas na loja</div>
        </div>
      </div>

      {/* Two Column Section: Payment Methods Distribution & Top Selling Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h3 className="text-sm font-bold text-white">Faturamento por Forma de Pagamento</h3>
            <span className="text-xs text-neutral-500">Período selecionado</span>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {[
              { label: 'PIX (Banco Central)', amount: metrics.paymentMethods.PIX, color: 'bg-teal-500', bar: 'bg-teal-500' },
              { label: 'Cartão de Débito', amount: metrics.paymentMethods.DEBITO, color: 'bg-blue-500', bar: 'bg-blue-500' },
              { label: 'Cartão de Crédito', amount: metrics.paymentMethods.CREDITO, color: 'bg-indigo-500', bar: 'bg-indigo-500' },
              { label: 'Dinheiro em Espécie', amount: metrics.paymentMethods.DINHEIRO, color: 'bg-emerald-500', bar: 'bg-emerald-500' },
              { label: 'Outros / Fiado', amount: metrics.paymentMethods.OUTROS, color: 'bg-amber-500', bar: 'bg-amber-500' }
            ].map((method, idx) => {
              const totalSum = Object.values(metrics.paymentMethods).reduce((a, b) => a + b, 0) || 1;
              const percent = ((method.amount / totalSum) * 100).toFixed(1);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300 font-medium">{method.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">R$ {method.amount.toFixed(2)}</span>
                      <span className="text-neutral-500 font-mono text-[11px]">({percent}%)</span>
                    </div>
                  </div>
                  {/* Progress track */}
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${method.bar} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best Selling Drinks & Combos */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h3 className="text-sm font-bold text-white">Produtos &amp; Bebidas Mais Vendidos</h3>
            <span className="text-xs text-neutral-500">Ranking por volume</span>
          </div>

          <div className="space-y-3 flex-1">
            {metrics.topProducts.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-xs">
                Nenhuma venda registrada no período selecionado.
              </div>
            ) : (
              metrics.topProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-neutral-800 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">{prod.name}</div>
                      <div className="text-[10px] text-neutral-400">
                        {prod.quantity} unidades saídas
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      R$ {prod.revenue.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-neutral-500">receita</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Stock Movements Stream */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800/80">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <h3 className="text-sm font-bold text-white">Últimas Movimentações de Estoque</h3>
          <button
            onClick={() => onNavigate('stock')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
          >
            Ver Histórico Completo
          </button>
        </div>

        <div className="space-y-2">
          {stockMovements.slice(0, 5).map(m => (
            <div
              key={m.id}
              className="p-2.5 rounded-lg bg-neutral-950/50 border border-neutral-800/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    m.type === 'ENTRADA' || m.type === 'COMPRA'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      : m.type === 'VENDA'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                      : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                  }`}
                >
                  {m.type}
                </span>
                <div>
                  <span className="font-semibold text-white">{m.productName}</span>
                  <span className="text-neutral-500 ml-2">· {m.reason}</span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className={m.type === 'ENTRADA' || m.type === 'COMPRA' ? 'text-emerald-400' : 'text-neutral-300'}>
                  {m.type === 'ENTRADA' || m.type === 'COMPRA' ? '+' : '-'}{m.quantity} un
                </span>
                <span className="text-neutral-600 text-[10px] block">
                  {new Date(m.createdAt).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
