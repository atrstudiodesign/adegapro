import React, { useEffect, useState } from 'react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import type { Supplier } from '../../types';
import { Truck, Plus, Phone, Mail, MapPin, Search, Loader2 } from 'lucide-react';
import { EmptyState, PageHeader } from '../ui/ProUi';

interface SuppliersViewProps { appMode?: AppMode; }

export const SuppliersView: React.FC<SuppliersViewProps> = ({ appMode = 'DEMO' }) => {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Supplier[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try {
      setRows(appMode === 'PRODUCTION' ? await productionDb.getSuppliers() : db.getSuppliers());
    } catch (err:any) { setError(err?.message || 'Falha ao carregar fornecedores.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, [appMode]);

  const create = async () => {
    const tradeName = window.prompt('Nome fantasia do fornecedor:')?.trim();
    if (!tradeName) return;
    const cnpj = window.prompt('CNPJ (opcional):')?.trim() || '';
    try {
      setBusy(true);
      if (appMode === 'PRODUCTION') await productionDb.saveSupplier({ tradeName, cnpj });
      else db.saveSupplier({ tradeName, cnpj });
      await load();
    } catch (err:any) { setError(err?.message || 'Não foi possível salvar o fornecedor.'); setBusy(false); }
  };

  const suppliers = rows.filter(s => [s.tradeName,s.corporateName,s.cnpj].join(' ').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-5">
      <PageHeader eyebrow="Compras" title="Fornecedores" description="Cadastro comercial separado das entradas e documentos de compra." actions={<button disabled={busy} onClick={() => void create()} className="px-4 py-2 rounded-xl bg-amber-500 disabled:opacity-50 text-neutral-950 font-black text-xs uppercase flex items-center justify-center gap-2"><Plus size={15}/> Novo fornecedor</button>}/>

      {error && <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {busy && <div className="text-xs text-neutral-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Sincronizando fornecedores...</div>}

      <div className="relative max-w-lg">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar fornecedor por nome ou CNPJ..." className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
      </div>

      {suppliers.length===0?<EmptyState title="Nenhum fornecedor encontrado" description="Cadastre fornecedores para vincular compras, produtos e histórico de custo." action={<button onClick={()=>void create()} className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black">Novo fornecedor</button>}/>:<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {suppliers.map(s => (
          <article key={s.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-bold text-white">{s.tradeName}</h3><p className="text-xs text-neutral-500 mt-1">{s.corporateName}</p></div>
              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded-lg">{s.cnpj || 'SEM CNPJ'}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-xs text-neutral-300">
              <div className="flex items-center gap-2"><Phone size={14} className="text-amber-400"/>{s.phone || 'Sem telefone'}</div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-amber-400"/>{s.email || 'Sem e-mail'}</div>
              <div className="sm:col-span-2 flex items-start gap-2"><MapPin size={14} className="text-amber-400 mt-0.5"/>{s.address || 'Endereço não informado'}</div>
            </div>
            {s.notes && <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500">{s.notes}</div>}
          </article>
        ))}
      </div>}
    </div>
  );
};
