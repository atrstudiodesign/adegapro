import React, { useState } from 'react';
import { db } from '../../services/db';
import { InventoryAudit, InventoryItem } from '../../types';
import { ClipboardList, Plus, CheckCircle2, X } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [audits, setAudits] = useState<InventoryAudit[]>(db.getInventoryAudits());
  const products = db.getProducts().filter(p => !p.isCombo);

  const [activeAudit, setActiveAudit] = useState<InventoryAudit | null>(
    audits.find(a => a.status === 'EM_ANDAMENTO') || null
  );

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    const list = db.getInventoryAudits();
    setAudits(list);
    if (activeAudit) {
      setActiveAudit(list.find(a => a.id === activeAudit.id) || null);
    }
  };

  const handleStartNewAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newAudit = db.createInventoryAudit(newTitle);

    setAudits(db.getInventoryAudits());
    setActiveAudit(newAudit);
    setIsNewModalOpen(false);
    setNewTitle('');
    setFeedback(`Inventário "${newTitle}" iniciado com sucesso. Realize as contagens.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateCount = (productId: string, val: number) => {
    if (!activeAudit) return;
    const updatedItems: InventoryItem[] = activeAudit.items.map(it => {
      if (it.productId === productId) {
        const counted = Math.max(0, val);
        const diff = counted - it.systemQty;
        return {
          ...it,
          countedQty: counted,
          diffQty: diff,
          totalDivergenceValue: diff * it.costPrice
        };
      }
      return it;
    });

    const updatedAudit: InventoryAudit = {
      ...activeAudit,
      items: updatedItems
    };

    setActiveAudit(updatedAudit);
    db.saveInventoryAudit(updatedAudit);
  };

  const handleFinishAudit = () => {
    if (!activeAudit) return;
    if (
      !window.confirm(
        'Deseja finalizar o inventário? As divergências contadas serão aplicadas AUTOMATICAMENTE ao estoque real dos produtos e registradas no Kardex.'
      )
    ) {
      return;
    }

    db.finalizeInventoryAudit(activeAudit.id, activeAudit.items, activeAudit.notes);
    refresh();
    setActiveAudit(null);
    setFeedback('Inventário finalizado! Estoque sincronizado com as contagens físicas.');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardList size={22} className="text-amber-400" />
            <span>Inventário Físico &amp; Auditoria de Depósito</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Contagem física de garrafas e engradados com apuração de quebras, furtos ou sobras.
          </p>
        </div>

        {!activeAudit && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <Plus size={16} />
            <span>Abrir Nova Contagem</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Active Audit Worksheet */}
      {activeAudit ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-bold text-white text-base">{activeAudit.notes || 'Auditoria em Andamento'}</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                  EM ANDAMENTO
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Aberta em {new Date(activeAudit.createdAt).toLocaleString('pt-BR')} por {activeAudit.openedBy}
              </p>
            </div>

            <button
              onClick={handleFinishAudit}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <CheckCircle2 size={16} />
              <span>Finalizar &amp; Ajustar Estoque</span>
            </button>
          </div>

          {/* Audit Count Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/60 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-center">Estoque Sistema</th>
                  <th className="py-2.5 px-3 text-center">Contagem Física</th>
                  <th className="py-2.5 px-3 text-center">Divergência</th>
                  <th className="py-2.5 px-3 text-right">Impacto Financeiro (Custo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {activeAudit.items.map(it => {
                  const diff = it.diffQty;
                  const diffCost = it.totalDivergenceValue;

                  return (
                    <tr key={it.productId} className="hover:bg-neutral-850/40">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {it.productName}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-neutral-400">
                        {it.systemQty} un
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={it.countedQty}
                          onChange={e => handleUpdateCount(it.productId, parseInt(e.target.value) || 0)}
                          className="w-20 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span
                          className={
                            diff < 0
                              ? 'text-rose-400'
                              : diff > 0
                              ? 'text-emerald-400'
                              : 'text-neutral-500'
                          }
                        >
                          {diff > 0 ? `+${diff}` : diff} un
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        <span
                          className={
                            diffCost < 0
                              ? 'text-rose-400'
                              : diffCost > 0
                              ? 'text-emerald-400'
                              : 'text-neutral-500'
                          }
                        >
                          {diffCost < 0 ? `-R$ ${Math.abs(diffCost).toFixed(2)}` : `R$ ${diffCost.toFixed(2)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Historical Audits List */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-3">Histórico de Auditorias Concluídas</h3>
        <div className="space-y-2">
          {audits.filter(a => a.status === 'FINALIZADO').length === 0 ? (
            <div className="text-neutral-500 text-xs py-6 text-center">
              Nenhum inventário finalizado registrado ainda.
            </div>
          ) : (
            audits
              .filter(a => a.status === 'FINALIZADO')
              .map(a => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{a.notes || 'Auditoria Concluída'}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      Finalizado em {new Date(a.finishedAt || a.createdAt).toLocaleDateString('pt-BR')} · Responsável: {a.openedBy}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      CONCLUÍDO
                    </span>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      {a.items.length} itens auditados
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* MODAL: New Audit */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Iniciar Inventário Físico</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartNewAudit} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Título / Descrição da Contagem *</label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Contagem Geral Fechamento de Mês"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Iniciar Contagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
