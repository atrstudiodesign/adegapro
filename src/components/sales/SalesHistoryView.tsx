import React, { useState } from 'react';
import { db } from '../../services/db';
import { printService } from '../../services/printService';
import { fiscalService } from '../../services/fiscalService';
import { Sale, User } from '../../types';
import {
  Receipt,
  Search,
  Printer,
  Share2,
  Ban,
  FileCode,
  CheckCircle2,
  X,
  Eye,
  Calendar,
  Cloud,
  HardDrive
} from 'lucide-react';

interface SalesHistoryViewProps {
  currentUser: User;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ currentUser }) => {
  const [sales, setSales] = useState<Sale[]>(db.getSales());
  const store = db.getStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAGA' | 'CANCELADA'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [xmlModalSale, setXmlModalSale] = useState<Sale | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setSales(db.getSales());
  };

  const filteredSales = sales.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        String(s.saleNumber).includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.digitalReceiptId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReprint = (sale: Sale) => {
    // Generate text or invoke print
    printService.printReceipt();
    setFeedback(`Enviando cupom da venda #${sale.saleNumber} para a impressora térmica.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalSale) return;
    if (!cancelReason.trim()) {
      alert('Informe o motivo do cancelamento para fins de auditoria.');
      return;
    }

    db.cancelSale(cancelModalSale.id, cancelReason);
    refresh();
    setCancelModalSale(null);
    setCancelReason('');
    setFeedback(`Venda #${cancelModalSale.saleNumber} cancelada. O estoque dos itens foi estornado automaticamente.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt size={22} className="text-amber-400" />
            <span>Histórico de Vendas &amp; Cupons Emitidos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Consulta detalhada, reimpressão de cupons térmicos e cancelamento com estorno de estoque.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número da venda, cliente ou operador..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="ALL">Todas as Vendas</option>
          <option value="PAGA">Vendas Concluídas (Pagas)</option>
          <option value="CANCELADA">Vendas Canceladas (Estornadas)</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Venda #</th>
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3">Formas de Pagamento</th>
                <th className="py-3 px-3 text-right">Valor Total</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-500">
                    Nenhuma venda encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-neutral-850/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-sm">
                      #{sale.saleNumber}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-neutral-400">
                      <div>{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</div>
                      <div className="text-[10px] text-neutral-500">
                        {new Date(sale.createdAt).toLocaleTimeString('pt-BR')}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-neutral-300">
                      {sale.customerName || <span className="text-neutral-500 italic">Consumidor Balcão</span>}
                    </td>

                    <td className="py-3.5 px-3 text-neutral-400 font-mono text-[11px]">
                      {sale.cashierName.split(' ')[0]}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {sale.payments.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60"
                          >
                            {p.method}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white text-sm">
                      R$ {sale.total.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          sale.status === 'PAGA'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {sale.status}
                      </span>
                      {sale.isOfflineSyncPending ? (
                        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <HardDrive size={10} className="text-amber-400" />
                          <span>Local / Pendente</span>
                        </div>
                      ) : sale.syncedAt ? (
                        <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          <Cloud size={10} className="text-blue-400" />
                          <span>Sincronizado</span>
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          title="Ver Detalhes dos Itens"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          onClick={() => handleReprint(sale)}
                          title="Reimprimir Cupom Térmico"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Printer size={13} />
                        </button>

                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/#/comprovante/${sale.digitalReceiptId}`;
                            const zapMsg = `Olá! Segue o comprovante da compra #${sale.saleNumber} na ${store.tradeName}: ${url}`;
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(zapMsg)}`, '_blank');
                          }}
                          title="Compartilhar Comprovante Digital no WhatsApp"
                          className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 transition-colors cursor-pointer"
                        >
                          <Share2 size={13} />
                        </button>

                        <button
                          onClick={() => setXmlModalSale(sale)}
                          title="Visualizar XML Fiscal NFC-e"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition-colors cursor-pointer"
                        >
                          <FileCode size={13} />
                        </button>

                        {sale.status === 'PAGA' && (
                          <button
                            onClick={() => setCancelModalSale(sale)}
                            title="Cancelar Venda e Estornar Estoque"
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Sale Details */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                Detalhes da Venda #{selectedSale.saleNumber}
              </h3>
              <button onClick={() => setSelectedSale(null)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-500 block">Data e Hora:</span>
                  <span className="text-white font-mono">{new Date(selectedSale.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Operador de Caixa:</span>
                  <span className="text-white">{selectedSale.cashierName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Cliente:</span>
                  <span className="text-white">{selectedSale.customerName || 'Balcão (Anônimo)'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Código Comprovante:</span>
                  <span className="text-amber-400 font-mono text-[11px]">{selectedSale.digitalReceiptId}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 mb-2">Itens da Compra</h4>
                <div className="space-y-1.5">
                  {selectedSale.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{it.productName}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {it.quantity} un x R$ {it.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-white">
                        R$ {it.subtotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 mb-2">Formas de Pagamento</h4>
                <div className="space-y-1">
                  {selectedSale.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-neutral-800/60 last:border-0">
                      <span className="text-neutral-300">{p.method}</span>
                      <span className="font-mono font-bold text-emerald-400">R$ {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancellation Reason if cancelled */}
              {selectedSale.status === 'CANCELADA' && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  <div className="font-bold">Motivo do Cancelamento:</div>
                  <div>{selectedSale.cancelReason}</div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-mono">
                    Cancelado por {selectedSale.cancelledBy || 'Gerência'} em {new Date(selectedSale.cancelledAt || '').toLocaleString('pt-BR')}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Sale Confirmation */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ban size={18} className="text-rose-400" />
                <span>Cancelar Venda #{cancelModalSale.saleNumber}</span>
              </h3>
              <button onClick={() => setCancelModalSale(null)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4 py-4">
              <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800 text-xs text-rose-200">
                <strong>Atenção:</strong> Ao confirmar o cancelamento, todos os itens vendidos retornarão automaticamente ao estoque da loja, e a movimentação de estorno será registrada na auditoria.
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Motivo do Cancelamento *</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Ex: Desistência do cliente antes da retirada / Erro de lançamento no PDV"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalSale(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Confirmar Estorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NFC-e XML Preview */}
      {xmlModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94dvh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode size={18} className="text-amber-400" />
                <span>Estrutura NFC-e SEFAZ (Venda #{xmlModalSale.saleNumber})</span>
              </h3>
              <button onClick={() => setXmlModalSale(null)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              <div className="text-xs text-neutral-400 mb-2">
                Chave de Acesso Calculada: <span className="font-mono text-amber-400 font-bold">{fiscalService.generateAccessKey(xmlModalSale, store)}</span>
              </div>
              <pre className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto select-text leading-tight">
                {fiscalService.buildNFCeXml(xmlModalSale, store, fiscalService.generateAccessKey(xmlModalSale, store))}
              </pre>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setXmlModalSale(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
