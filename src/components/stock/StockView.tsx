import React, { useState } from 'react';
import { db } from '../../services/db';
import { StockMovement, Product, MovementType } from '../../types';
import { Boxes, Plus, AlertCircle, ArrowDownRight, ArrowUpRight, Filter, Search, X } from 'lucide-react';

export const StockView: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>(db.getStockMovements());
  const products = db.getProducts().filter(p => !p.isCombo);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Manual Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Ajuste de inventário / contagem');
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setMovements(db.getStockMovements());
  };

  const filteredMovements = movements.filter(m => {
    if (selectedType !== 'ALL' && m.type !== selectedType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        m.productName.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        m.userName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdjust = (prodId?: string) => {
    const targetId = prodId || products[0]?.id || '';
    const p = products.find(prod => prod.id === targetId);
    setSelectedProductId(targetId);
    setNewStockInput(p?.currentStock || 0);
    setAdjustReason('Contagem física / Ajuste gerencial');
    setIsModalOpen(true);
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const p = products.find(prod => prod.id === selectedProductId);
    if (!p) return;

    db.adjustStockManually(p.id, Number(newStockInput), adjustReason);
    refresh();
    setIsModalOpen(false);
    setFeedback(`Estoque de "${p.name}" ajustado para ${newStockInput} unidades.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes size={22} className="text-amber-400" />
            <span>Kardex &amp; Movimentações de Estoque</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Registro auditável de todas as baixas por venda, entradas por compras, perdas e quebras.
          </p>
        </div>

        <button
          onClick={() => handleOpenAdjust()}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Lançar Ajuste Manual</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs">
          {feedback}
        </div>
      )}

      {/* Filter and Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por produto, operador ou motivo..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="ALL">Todas as Movimentações</option>
          <option value="VENDA">Vendas no PDV</option>
          <option value="COMPRA">Entradas por Compra</option>
          <option value="ENTRADA">Entradas Manuais</option>
          <option value="AJUSTE">Ajustes de Estoque</option>
          <option value="PERDA">Perdas / Avarias / Quebras</option>
          <option value="CONSUMO_INTERNO">Consumo Interno</option>
        </select>
      </div>

      {/* Movements Table */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data &amp; Hora</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Produto</th>
                <th className="py-3 px-3 text-center">Qtd Movimentada</th>
                <th className="py-3 px-3 text-center">Antes &rarr; Depois</th>
                <th className="py-3 px-4">Motivo / Documento</th>
                <th className="py-3 px-4 text-right">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    Nenhuma movimentação de estoque registrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isPositive = m.type === 'ENTRADA' || m.type === 'COMPRA';
                  return (
                    <tr key={m.id} className="hover:bg-neutral-850/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400">
                        {new Date(m.createdAt).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isPositive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              : m.type === 'VENDA'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-white">
                        {m.productName}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-sm">
                        <span className={isPositive ? 'text-emerald-400' : 'text-neutral-200'}>
                          {isPositive ? '+' : '-'}{m.quantity} un
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-[11px] text-neutral-400">
                        {m.previousStock} &rarr; <strong className="text-white">{m.nextStock}</strong>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-300 text-xs">
                        <div>{m.reason}</div>
                        {m.documentRef && (
                          <div className="text-[10px] text-neutral-500 font-mono">Ref: {m.documentRef}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right text-neutral-400 text-xs font-mono">
                        {m.userName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Adjust Stock */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes size={18} className="text-amber-400" />
                <span>Lançar Ajuste Manual de Estoque</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Produto *</label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    const p = products.find(prod => prod.id === e.target.value);
                    setNewStockInput(p?.currentStock || 0);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Atual: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nova Quantidade em Estoque *</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={newStockInput}
                  onChange={e => setNewStockInput(parseInt(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-base focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Motivo do Ajuste *</label>
                <input
                  required
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Ex: Quebra de garrafa no depósito / Contagem física"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
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
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
