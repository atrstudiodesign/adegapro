import React, { useState } from 'react';
import { db } from '../../services/db';
import { FinancialTransaction, Sale, SaleItem } from '../../types';
import { BarChart3, Download, TrendingUp, Layers, Calendar, DollarSign, Package } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<'VENDAS_PERIODO' | 'PRODUTOS_LUCRO' | 'ESTOQUE_POSICAO' | 'DRE_SIMPLIFICADO'>('VENDAS_PERIODO');

  const products = db.getProducts();
  const sales = db.getSales();
  const entries = db.getFinancialEntries();
  const store = db.getStore();

  // Export generic CSV
  const handleExport = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'VENDAS_PERIODO') {
      headers = ['Numero_Venda', 'Data', 'Operador', 'Cliente', 'Subtotal', 'Desconto', 'Total', 'Formas_Pagamento'];
      rows = sales.map(s => [
        String(s.saleNumber),
        new Date(s.createdAt).toLocaleDateString('pt-BR'),
        s.cashierName,
        s.customerName || 'Balcao',
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.total.toFixed(2),
        s.payments.map(p => p.method).join(' + ')
      ]);
    } else if (reportType === 'PRODUTOS_LUCRO') {
      headers = ['Produto', 'Marca', 'Custo', 'Venda', 'Lucro_Unitario', 'Margem_Pct', 'Estoque_Atual'];
      rows = products.map(p => [
        `"${p.name}"`,
        p.brand,
        p.costPrice.toFixed(2),
        p.salePrice.toFixed(2),
        (p.salePrice - p.costPrice).toFixed(2),
        p.margin.toFixed(2),
        String(p.currentStock)
      ]);
    } else if (reportType === 'ESTOQUE_POSICAO') {
      headers = ['Produto', 'EAN', 'Estoque_Atual', 'Estoque_Minimo', 'Custo_Unitario', 'Valor_Total_Estoque'];
      rows = products.map(p => [
        `"${p.name}"`,
        p.barcode,
        String(p.currentStock),
        String(p.minStock),
        p.costPrice.toFixed(2),
        (p.currentStock * p.costPrice).toFixed(2)
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `relatorio_${reportType.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for DRE
  const receitaBruta = sales.filter(s => s.status === 'PAGA').reduce((acc: number, s: Sale) => acc + s.total, 0);
  const cmvTotal = sales.filter(s => s.status === 'PAGA').reduce((acc: number, s: Sale) => {
    return acc + s.items.reduce((sum: number, it: SaleItem) => sum + (it.costPrice * it.quantity), 0);
  }, 0);
  const lucroBruto = receitaBruta - cmvTotal;
  const despesasOperacionais = entries
    .filter((e: FinancialTransaction) => e.type === 'DESPESA')
    .reduce((acc: number, e: FinancialTransaction) => acc + e.amount, 0);
  const lucroLiquido = lucroBruto - despesasOperacionais;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 size={22} className="text-amber-400" />
            <span>Centro de Relatórios &amp; DRE Gerencial</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Análises analíticas de vendas, lucratividade de rótulos, avaliação patrimonial de estoque e DRE.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Download size={16} />
          <span>Exportar Relatório (CSV)</span>
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { id: 'VENDAS_PERIODO', label: 'Vendas & Cupons', icon: Calendar },
          { id: 'PRODUTOS_LUCRO', label: 'Margem & Lucro Rótulos', icon: TrendingUp },
          { id: 'ESTOQUE_POSICAO', label: 'Posição & Valor Estoque', icon: Package },
          { id: 'DRE_SIMPLIFICADO', label: 'DRE Simplificado', icon: DollarSign }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = reportType === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setReportType(item.id as any)}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Render Area */}
      {reportType === 'DRE_SIMPLIFICADO' ? (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-white pb-3 border-b border-neutral-800">
            Demonstrativo de Resultado do Exercício (DRE Simplificado)
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-300 font-semibold">(+) RECEITA BRUTA DE VENDAS</span>
              <span className="text-emerald-400 font-bold text-sm">R$ {receitaBruta.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-800 text-neutral-400">
              <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
              <span className="text-rose-400">-R$ {cmvTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-800 bg-neutral-950/60 px-3 rounded-lg">
              <span className="text-white font-bold">(=) LUCRO BRUTO DA ADEGA</span>
              <span className="text-amber-400 font-bold text-sm">R$ {lucroBruto.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-neutral-800 text-neutral-400">
              <span>(-) Despesas Fixas e Operacionais (Aluguel, Luz, etc.)</span>
              <span className="text-rose-400">-R$ {despesasOperacionais.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-3 bg-amber-500/10 border border-amber-500/30 px-3 rounded-xl">
              <span className="text-amber-300 font-black text-sm">(=) LUCRO LÍQUIDO FINAL DO PERÍODO</span>
              <span className={`font-black text-base ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {lucroLiquido.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : reportType === 'PRODUTOS_LUCRO' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Produto &amp; Marca</th>
                <th className="py-3 px-3 text-right">Custo Unitário</th>
                <th className="py-3 px-3 text-right">Preço Venda</th>
                <th className="py-3 px-3 text-right">Lucro Bruto Unitário</th>
                <th className="py-3 px-3 text-right">Margem %</th>
                <th className="py-3 px-4 text-center">Estoque Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {products.map(p => {
                const profit = p.salePrice - p.costPrice;
                return (
                  <tr key={p.id} className="hover:bg-neutral-850/60">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {p.name} <span className="text-neutral-400 font-normal">({p.brand})</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-neutral-400">
                      R$ {p.costPrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-white font-bold">
                      R$ {p.salePrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400">
                      +R$ {profit.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-400">
                      +{p.margin.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-neutral-300">
                      {p.currentStock} {p.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : reportType === 'ESTOQUE_POSICAO' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-3">EAN</th>
                <th className="py-3 px-3 text-center">Estoque Atual</th>
                <th className="py-3 px-3 text-center">Estoque Mínimo</th>
                <th className="py-3 px-3 text-right">Custo Un</th>
                <th className="py-3 px-4 text-right">Valor em Estoque (Patrimonial)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-neutral-850/60">
                  <td className="py-3.5 px-4 font-bold text-white">{p.name}</td>
                  <td className="py-3.5 px-3 font-mono text-neutral-400">{p.barcode}</td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                    {p.currentStock} {p.unit}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-neutral-500">{p.minStock}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-neutral-400">R$ {p.costPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                    R$ {(p.currentStock * p.costPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* VENDAS_PERIODO */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
              <tr>
                <th className="py-3 px-4">Venda #</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">Desconto</th>
                <th className="py-3 px-4 text-right">Total Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-neutral-850/60">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">#{s.saleNumber}</td>
                  <td className="py-3.5 px-3 font-mono text-neutral-400">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3.5 px-3 text-neutral-300">{s.cashierName}</td>
                  <td className="py-3.5 px-3 text-neutral-400">{s.customerName || 'Balcão'}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-neutral-400">R$ {s.subtotal.toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400">-R$ {s.discount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">R$ {s.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
