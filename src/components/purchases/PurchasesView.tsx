import React, { useState } from 'react';
import { db } from '../../services/db';
import { Purchase, Product, Supplier, PurchaseItem } from '../../types';
import { ShoppingBag, Plus, CheckCircle2, X, Trash2 } from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>(db.getPurchases());
  const suppliers = db.getSuppliers();
  const products = db.getProducts().filter(p => !p.isCombo);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [paymentTerm, setPaymentTerm] = useState<'A_VISTA' | '30_DIAS' | 'PARCELADO'>('30_DIAS');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setPurchases(db.getPurchases());
  };

  const handleOpenNew = () => {
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber('NF-' + Math.floor(10000 + Math.random() * 90000));
    setPaymentTerm('30_DIAS');
    if (products.length > 0) {
      const p = products[0];
      setItems([
        {
          productId: p.id,
          productName: p.name,
          quantity: 24,
          unitCost: p.costPrice,
          totalCost: 24 * p.costPrice
        }
      ]);
    } else {
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    if (products.length > 0) {
      const p = products[0];
      setItems(prev => [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          quantity: 12,
          unitCost: p.costPrice,
          totalCost: 12 * p.costPrice
        }
      ]);
    }
  };

  const removeItemRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PurchaseItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const it = { ...copy[idx] };

      if (field === 'productId') {
        const prod = products.find(p => p.id === val);
        it.productId = val;
        it.productName = prod ? prod.name : '';
        it.unitCost = prod ? prod.costPrice : it.unitCost;
      } else if (field === 'quantity') {
        it.quantity = Math.max(1, parseInt(val) || 1);
      } else if (field === 'unitCost') {
        it.unitCost = Math.max(0, parseFloat(val) || 0);
      }

      it.totalCost = it.quantity * it.unitCost;
      copy[idx] = it;
      return copy;
    });
  };

  const totalAmount = items.reduce((acc, it) => acc + it.totalCost, 0);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0 || totalAmount <= 0) {
      alert('Preencha os dados da compra e ao menos 1 item com valor.');
      return;
    }

    db.createPurchase({
      supplierId,
      invoiceNumber,
      items,
      subtotal: totalAmount,
      freight: 0,
      discount: 0,
      total: totalAmount,
      paymentMethod: 'Boleto Bancário',
      paymentTerm
    });

    refresh();
    setIsModalOpen(false);
    setFeedback(`Entrada da NF ${invoiceNumber} confirmada! Estoque atualizado e Conta a Pagar gerada.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShoppingBag size={22} className="text-amber-400" />
            <span>Compras &amp; Entrada de Mercadorias (NF-e)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Dá entrada no estoque, recalcula custo e gera automaticamente as contas a pagar.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Lançar Entrada de Mercadorias</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Purchases List */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">NF Entrada</th>
                <th className="py-3 px-3">Fornecedor</th>
                <th className="py-3 px-3">Data Emissão</th>
                <th className="py-3 px-3">Prazo Pagamento</th>
                <th className="py-3 px-3 text-center">Itens Recebidos</th>
                <th className="py-3 px-3 text-right">Valor Total NF</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    Nenhuma entrada de mercadorias registrada.
                  </td>
                </tr>
              ) : (
                purchases.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-850/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {p.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-white">
                      {p.supplierName}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-neutral-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-neutral-300 text-[11px]">
                      {p.paymentTerm === 'A_VISTA' ? 'À vista' : p.paymentTerm === '30_DIAS' ? 'Boleto 30 Dias' : 'Parcelado'}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono">
                      {p.items.reduce((acc, it) => acc + it.quantity, 0)} unidades
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white text-sm">
                      R$ {p.total.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: New Purchase */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94dvh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-400" />
                <span>Registrar Entrada de Mercadorias (NF-e)</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fornecedor *</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Número da Nota Fiscal *</label>
                  <input
                    required
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Condição de Pagamento</label>
                  <select
                    value={paymentTerm}
                    onChange={e => setPaymentTerm(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="A_VISTA">À Vista</option>
                    <option value="30_DIAS">Boleto 30 Dias</option>
                    <option value="PARCELADO">Parcelado</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">Produtos da Nota Fiscal:</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar Produto</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <select
                        value={it.productId}
                        onChange={e => updateItem(idx, 'productId', e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <div className="w-full sm:w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={it.quantity}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Custo un"
                          value={it.unitCost}
                          onChange={e => updateItem(idx, 'unitCost', e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-white font-mono text-right focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="w-full sm:w-24 text-left sm:text-right font-mono font-bold text-xs text-amber-400">
                        R$ {it.totalCost.toFixed(2)}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
                  <span className="text-xs text-neutral-400">Total da Nota Fiscal:</span>
                  <span className="text-lg font-mono font-bold text-white">
                    R$ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
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
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
