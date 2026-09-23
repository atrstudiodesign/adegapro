import React, { useState } from 'react';
import { db } from '../../services/db';
import { Combo, Product, ComboItem } from '../../types';
import { Layers, Plus, Trash2, Edit2, CheckCircle2, ArrowRight, X } from 'lucide-react';

export const CombosView: React.FC = () => {
  const [combos, setCombos] = useState<Combo[]>(db.getCombos());
  const products = db.getProducts().filter(p => !p.isCombo && p.status === 'ACTIVE');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState<number>(0);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setCombos(db.getCombos());
  };

  const handleOpenNew = () => {
    setComboName('');
    setComboPrice(0);
    setComboItems([{ productId: products[0]?.id || '', quantity: 1 }]);
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    if (products.length > 0) {
      setComboItems(prev => [...prev, { productId: products[0].id, quantity: 1 }]);
    }
  };

  const removeItemRow = (idx: number) => {
    setComboItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItemProduct = (idx: number, productId: string) => {
    setComboItems(prev => {
      const copy = [...prev];
      copy[idx].productId = productId;
      return copy;
    });
  };

  const updateItemQty = (idx: number, qty: number) => {
    setComboItems(prev => {
      const copy = [...prev];
      copy[idx].quantity = Math.max(1, qty);
      return copy;
    });
  };

  // Calculate sum of individual items in real time
  const calculatedSum = comboItems.reduce((acc, it) => {
    const p = products.find(prod => prod.id === it.productId);
    return acc + (p ? p.salePrice * it.quantity : 0);
  }, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboName || comboPrice <= 0 || comboItems.length === 0) {
      alert('Informe o nome do combo, o preço promocional e ao menos 1 produto componente.');
      return;
    }

    db.saveCombo({
      name: comboName,
      price: comboPrice,
      items: comboItems
    });

    refresh();
    setIsModalOpen(false);
    setFeedback(`Combo "${comboName}" criado com sucesso! Já disponível no PDV com baixa automática de componentes.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-amber-400" />
            <span>Kits, Combos &amp; Composição Real</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ao vender um combo no PDV, o estoque de cada bebida ou componente é baixado individualmente.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Criar Novo Combo</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Combos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {combos.map(combo => {
          const discount = Math.max(0, combo.originalPrice - combo.price);
          const discountPercent = combo.originalPrice > 0 ? ((discount / combo.originalPrice) * 100).toFixed(0) : 0;

          return (
            <div
              key={combo.id}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/50 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-white text-base leading-snug">{combo.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono border border-amber-500/30 shrink-0">
                    COMBO
                  </span>
                </div>

                {/* Items composition list */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 my-3 space-y-1.5">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Composição do Kit (Baixa Estoque)
                  </div>
                  {combo.items.map((item, idx) => {
                    const comp = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-neutral-300 font-medium">
                          {item.quantity}x {comp ? comp.name : 'Produto'}
                        </span>
                        <span className="font-mono text-neutral-500 text-[11px]">
                          Estoque atual: {comp ? comp.currentStock : 0} {comp?.unit || 'UN'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price comparison */}
              <div className="pt-3 border-t border-neutral-800 flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 line-through font-mono">
                    Avulso: R$ {combo.originalPrice.toFixed(2)}
                  </div>
                  <div className="text-xl font-black font-mono text-amber-400">
                    R$ {combo.price.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    Economia de R$ {discount.toFixed(2)} ({discountPercent}%)
                  </span>
                  <div className="text-[10px] text-neutral-500">Pronto no PDV</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: New Combo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-amber-400" />
                <span>Montar Novo Combo / Kit de Bebidas</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nome do Combo *</label>
                <input
                  required
                  type="text"
                  value={comboName}
                  onChange={e => setComboName(e.target.value)}
                  placeholder="Ex: Combo Rolê Gin + 4 Tônicas + Gelo Especial"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Component products builder */}
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">Produtos que Compõem o Combo:</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Adicionar Componente</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {comboItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={e => updateItemProduct(idx, e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (R$ {p.salePrice.toFixed(2)})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-400">Qtd:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItemQty(idx, parseInt(e.target.value) || 1)}
                          className="w-16 bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {comboItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-2 text-neutral-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price setting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">Preço Individual Somado</div>
                  <div className="font-mono text-sm text-neutral-300">
                    R$ {calculatedSum.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Preço Promocional do Combo (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={comboPrice || ''}
                    onChange={e => setComboPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-amber-400 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

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
                  Salvar Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
