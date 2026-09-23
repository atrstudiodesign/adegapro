import React, { useState } from 'react';
import { db } from '../../services/db';
import { Store } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { Settings, Save, CheckCircle2, RotateCcw, Download, Upload, AlertCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [store, setStore] = useState<Store>(db.getStore());
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveStore(store);
    setFeedback('Configurações da loja salvas com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExportBackup = () => {
    const data = db.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_tome_no_seu_toba_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = event.target?.result as string;
        db.importAllData(json);
        setStore(db.getStore());
        setFeedback('Backup restaurado com sucesso! Dados sincronizados.');
        setTimeout(() => setFeedback(null), 4000);
      } catch (err) {
        alert('Erro ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('Tem certeza que deseja restaurar as configurações e produtos originais de fábrica da marca "Tome no seu Toba"?')) {
      db.resetToSeed();
      setStore(db.getStore());
      setFeedback('Banco de dados restaurado para os dados originais da loja!');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="pb-4 border-b border-neutral-800">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings size={22} className="text-amber-400" />
          <span>Configurações Gerais do Estabelecimento</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Identificação jurídica, impressoras térmicas, políticas de desconto e backup do sistema.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Brand Identity Showcase */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo size="lg" variant="full" />
          <div className="border-l border-neutral-800 pl-4 text-xs text-neutral-400">
            <div>SaaS Multi-tenant: <span className="text-white font-semibold">Tome no seu Toba</span></div>
            <div>Identidade visual minimalista e vetorizada em alta resolução.</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identification */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Dados da Empresa &amp; CNPJ</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Razão Social</label>
              <input
                type="text"
                value={store.name}
                onChange={e => setStore({ ...store, name: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Nome Fantasia da Marca</label>
              <input
                type="text"
                value={store.tradeName}
                onChange={e => setStore({ ...store, tradeName: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none font-bold text-amber-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">CNPJ</label>
              <input
                type="text"
                value={store.cnpj}
                onChange={e => setStore({ ...store, cnpj: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Inscrição Estadual (IE)</label>
              <input
                type="text"
                value={store.stateRegistration}
                onChange={e => setStore({ ...store, stateRegistration: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-neutral-400 block mb-1">Endereço Completo</label>
              <input
                type="text"
                value={store.address}
                onChange={e => setStore({ ...store, address: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Cidade / UF</label>
              <input
                type="text"
                value={`${store.city} - ${store.state}`}
                onChange={e => setStore({ ...store, city: e.target.value.split('-')[0].trim() })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">WhatsApp / Telefone para Contato</label>
              <input
                type="text"
                value={store.phone}
                onChange={e => setStore({ ...store, phone: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Operational & POS Rules */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Parâmetros Operacionais do PDV &amp; Cupom</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Largura Padrão da Impressora Térmica</label>
              <select
                value={store.thermalWidth}
                onChange={e => setStore({ ...store, thermalWidth: e.target.value as any })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              >
                <option value="80mm">80mm (Bobina Padrão Comercial)</option>
                <option value="58mm">58mm (Bobina Compacta Portátil)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Desconto Máximo Sem Senha Gerencial (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={store.maxDiscountPercent}
                onChange={e => setStore({ ...store, maxDiscountPercent: parseFloat(e.target.value) || 0 })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-neutral-400 block mb-1">Mensagem de Rodapé do Cupom Impresso</label>
              <input
                type="text"
                value={store.receiptFooter}
                onChange={e => setStore({ ...store, receiptFooter: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="allowSellWithoutStock"
                checked={store.allowSellWithoutStock}
                onChange={e => setStore({ ...store, allowSellWithoutStock: e.target.checked })}
                className="rounded border-neutral-700 text-amber-500 focus:ring-0"
              />
              <label htmlFor="allowSellWithoutStock" className="text-xs text-neutral-300 cursor-pointer">
                Permitir venda de produtos com estoque zerado no PDV
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="requireCustomer"
                checked={store.requireCustomer}
                onChange={e => setStore({ ...store, requireCustomer: e.target.checked })}
                className="rounded border-neutral-700 text-amber-500 focus:ring-0"
              />
              <label htmlFor="requireCustomer" className="text-xs text-neutral-300 cursor-pointer">
                Exigir identificação obrigatória do cliente antes de finalizar venda
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Save size={16} />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>
      </form>

      {/* Backup and Data Management */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Backup &amp; Manutenção de Dados</h3>
        <p className="text-xs text-neutral-400">
          Exporte o banco de dados completo (produtos, clientes, vendas, caixas) para backup em JSON ou restaure em qualquer máquina.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Fazer Backup dos Dados (JSON)</span>
          </button>

          <label className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Upload size={14} />
            <span>Restaurar Backup</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleResetData}
            className="px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão de Fábrica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
