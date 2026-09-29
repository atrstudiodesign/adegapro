import React, { useState } from 'react';
import { db } from '../../services/db';
import { Customer } from '../../types';
import { Users, Plus, Phone, MessageSquare, CheckCircle2, DollarSign, X, Ban } from 'lucide-react';
import { adegaAlert } from '../ui/AdegaDialog';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const store = db.getStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [settleCustomer, setSettleCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = () => {
    setCustomers(db.getCustomers());
  };

  const handleOpenNew = () => {
    setEditingCustomer({
      name: '',
      firstName: '',
      lastName: '',
      nickname: '',
      customerType: 'AVULSO',
      cpf: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      creditLimit: 0,
      creditBalance: 0,
      status: 'LIBERADO'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = editingCustomer?.firstName?.trim();
    const lastName = editingCustomer?.lastName?.trim();
    const whatsapp = (editingCustomer?.whatsapp || editingCustomer?.phone || '').trim();
    if (!firstName || !lastName || !whatsapp) {
      await adegaAlert({ title: 'Dados obrigatórios', message: 'Informe nome, sobrenome e WhatsApp do cliente.' });
      return;
    }

    const customerDraft = editingCustomer;
    if (!customerDraft) return;
    db.saveCustomer({ ...customerDraft, name: `${firstName} ${lastName}`.trim(), phone: whatsapp, whatsapp, creditLimit: customerDraft.creditLimit || 0 } as any);
    refresh();
    setIsModalOpen(false);
    setFeedback('Cliente salvo com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCustomer || settleAmount <= 0) return;

    db.settleCustomerBalance(settleCustomer.id, settleAmount);
    refresh();
    setSettleCustomer(null);
    setSettleAmount(0);
    setFeedback(`Pagamento de R$ ${settleAmount.toFixed(2)} abatido do fiado de ${settleCustomer.name}!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const sendWhatsAppReminder = (c: Customer) => {
    const zapText = `Olá, ${c.name}! Passando para lembrar sobre o seu saldo em aberto de R$ ${c.creditBalance.toFixed(2)} na ${store.tradeName}. Chave PIX: ${store.cnpj}. Qualquer dúvida estamos à disposição!`;
    const cleanPhone = (c.whatsapp || c.phone).replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(zapText)}`, '_blank');
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users size={22} className="text-amber-400" />
            <span>Clientes &amp; Controle de Fiado (Crediário)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Limite de crédito, histórico de consumo e cobrança direta via WhatsApp.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
        >
          <Plus size={16} />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Cliente</th><th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">CPF</th>
                <th className="py-3 px-3">WhatsApp</th>
                <th className="py-3 px-3 text-right">Limite de Fiado</th>
                <th className="py-3 px-3 text-right">Saldo Devedor Atual</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {customers.map(c => {
                const isOverLimit = c.creditBalance > c.creditLimit;
                return (
                  <tr key={c.id} className="hover:bg-neutral-850/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">{c.name}{c.nickname&&<div className="text-[10px] text-neutral-500 font-normal mt-0.5">{c.nickname}</div>}</td>
                    <td className="py-3.5 px-3 text-[10px] font-black text-amber-400">{c.customerType||'AVULSO'}</td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-neutral-400">
                      {c.cpf || 'Não informado'}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-neutral-300">
                      {c.whatsapp || c.phone}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-neutral-300">
                      R$ {c.creditLimit.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-sm">
                      <span className={c.creditBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        R$ {c.creditBalance.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          (c.status || 'LIBERADO') === 'LIBERADO'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {c.status || 'LIBERADO'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.creditBalance > 0 && (
                          <>
                            <button
                              onClick={() => sendWhatsAppReminder(c)}
                              title="Cobrar via WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 transition-colors cursor-pointer"
                            >
                              <MessageSquare size={13} />
                            </button>

                            <button
                              onClick={() => {
                                setSettleCustomer(c);
                                setSettleAmount(c.creditBalance);
                              }}
                              title="Receber Pagamento do Fiado"
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs cursor-pointer"
                            >
                              Acertar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: New Customer */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Cadastrar Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Tipo de cliente *</label>
                <select value={editingCustomer.customerType || 'AVULSO'} onChange={e=>setEditingCustomer({...editingCustomer,customerType:e.target.value as 'MENSAL'|'AVULSO'})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none">
                  <option value="AVULSO">Avulso</option><option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs text-neutral-400 block mb-1">Nome *</label><input required value={editingCustomer.firstName||''} onChange={e=>setEditingCustomer({...editingCustomer,firstName:e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"/></div>
                <div><label className="text-xs text-neutral-400 block mb-1">Sobrenome *</label><input required value={editingCustomer.lastName||''} onChange={e=>setEditingCustomer({...editingCustomer,lastName:e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"/></div>
              </div>
              <div><label className="text-xs text-neutral-400 block mb-1">Apelido</label><input value={editingCustomer.nickname||''} onChange={e=>setEditingCustomer({...editingCustomer,nickname:e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-amber-400 focus:outline-none"/></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs text-neutral-400 block mb-1">CPF (opcional)</label><input value={editingCustomer.cpf||''} onChange={e=>setEditingCustomer({...editingCustomer,cpf:e.target.value})} placeholder="000.000.000-00" className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"/></div>
                <div><label className="text-xs text-neutral-400 block mb-1">WhatsApp *</label><input required inputMode="tel" value={editingCustomer.whatsapp||editingCustomer.phone||''} onChange={e=>setEditingCustomer({...editingCustomer,whatsapp:e.target.value,phone:e.target.value})} placeholder="(11) 99999-9999" className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"/></div>
              </div>
              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button type="button" onClick={()=>setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Settle Fiado */}
      {settleCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">Acerto de Fiado</h3>
              <button onClick={() => setSettleCustomer(null)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4 py-4">
              <div className="text-xs text-neutral-400">
                Cliente: <strong className="text-white">{settleCustomer.name}</strong>
                <br />
                Saldo Devedor Total: <span className="font-mono text-rose-400 font-bold">R$ {settleCustomer.creditBalance.toFixed(2)}</span>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor Pago pelo Cliente (R$) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={e => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono font-bold text-lg focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettleCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Confirmar Acerto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
