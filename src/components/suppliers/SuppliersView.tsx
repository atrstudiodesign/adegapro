import React, { useState } from 'react';
import { db } from '../../services/db';
import { Supplier } from '../../types';
import { Truck, Plus, Phone, Mail, MapPin, Search } from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const [search, setSearch] = useState('');
  const suppliers = db.getSuppliers().filter(s =>
    [s.tradeName, s.corporateName, s.cnpj].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-5 bg-neutral-950">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Truck size={22} className="text-amber-400" />
            Fornecedores
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Cadastro comercial separado das compras e entradas de mercadoria.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs uppercase flex items-center gap-2">
          <Plus size={15}/> Novo fornecedor
        </button>
      </div>

      <div className="relative max-w-lg">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar fornecedor por nome ou CNPJ..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {suppliers.map((s: Supplier) => (
          <article key={s.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{s.tradeName}</h3>
                <p className="text-xs text-neutral-500 mt-1">{s.corporateName}</p>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded-lg">{s.cnpj}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-xs text-neutral-300">
              <div className="flex items-center gap-2"><Phone size={14} className="text-amber-400"/>{s.phone || 'Sem telefone'}</div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-amber-400"/>{s.email || 'Sem e-mail'}</div>
              <div className="sm:col-span-2 flex items-start gap-2"><MapPin size={14} className="text-amber-400 mt-0.5"/>{s.address || 'Endereço não informado'}</div>
            </div>
            {s.notes && <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500">{s.notes}</div>}
          </article>
        ))}
      </div>
    </div>
  );
};
