import React, { useMemo, useState } from 'react';
import { db } from '../../services/db';
import { Category } from '../../types';
import { Tags, Search, Plus, CheckCircle2, CircleOff } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const [search, setSearch] = useState('');
  const categories = db.getCategories();
  const products = db.getProducts();

  const rows = useMemo(() => categories
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .map(c => ({
      ...c,
      productsCount: products.filter(p => p.categoryId === c.id).length
    })), [categories, products, search]);

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-5 bg-neutral-950">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Tags size={22} className="text-amber-400" />
            Categorias de Produtos
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Organize o catálogo sem misturar categorias com o cadastro individual de produtos.
          </p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs uppercase flex items-center gap-2">
          <Plus size={15} /> Nova categoria
        </button>
      </div>

      <div className="relative max-w-lg">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar categoria..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((c: Category & { productsCount: number }) => (
          <article key={c.id} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-[11px] text-neutral-500 font-mono mt-1">{c.slug}</div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1 ${c.active ? 'text-emerald-400 border-emerald-800 bg-emerald-950/40' : 'text-neutral-500 border-neutral-700'}`}>
                {c.active ? <CheckCircle2 size={11}/> : <CircleOff size={11}/>}
                {c.active ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Produtos vinculados</span>
              <strong className="text-amber-400 font-mono">{c.productsCount}</strong>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
