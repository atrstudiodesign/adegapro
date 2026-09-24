import React, { useEffect, useState } from 'react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import { compressProductImage } from '../../utils/imageCompression';
import { Product, Category, Supplier } from '../../types';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode,
  Edit2,
  Copy,
  Power,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  X,
  CheckCircle2,
  Layers,
  Grid3X3,
  List,
  ImagePlus,
  ImageOff
} from 'lucide-react';

interface ProductsViewProps { appMode?: AppMode; }

export const ProductsView: React.FC<ProductsViewProps> = ({ appMode = 'DEMO' }) => {
  const [products, setProducts] = useState<Product[]>(appMode === 'DEMO' ? db.getProducts() : []);
  const [categories, setCategories] = useState<Category[]>(appMode === 'DEMO' ? db.getCategories() : []);
  const [suppliers, setSuppliers] = useState<Supplier[]>(appMode === 'DEMO' ? db.getSuppliers() : []);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStockAlert, setSelectedStockAlert] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'GRID'|'LIST'>('GRID');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const refreshProducts = async () => {
    setLoadError('');
    try {
      if (appMode === 'PRODUCTION') {
        const [p, cats, supps] = await Promise.all([
          productionDb.getProducts(), productionDb.getCategories(), productionDb.getSuppliers()
        ]);
        setProducts(p); setCategories(cats); setSuppliers(supps);
      } else {
        setProducts(db.getProducts()); setCategories(db.getCategories()); setSuppliers(db.getSuppliers());
      }
    } catch (err:any) {
      setLoadError(err?.message || 'Falha ao carregar catálogo.');
    }
  };

  useEffect(() => { void refreshProducts(); }, [appMode]);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    if (selectedCat !== 'ALL' && p.categoryId !== selectedCat) return false;
    if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
    if (selectedStockAlert === 'LOW' && (p.currentStock > p.minStock || p.currentStock <= 0)) return false;
    if (selectedStockAlert === 'ZERO' && p.currentStock > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        String(p.packageSize || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenNew = () => {
    setEditingProduct({
      name: '',
      description: '',
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      barcode: String(7890000000000 + Math.floor(Math.random() * 100000000)),
      categoryId: categories[0]?.id || 'cat-cervejas',
      brand: '',
      packageSize: '',
      unit: 'UN',
      costPrice: 0,
      salePrice: 0,
      margin: 50,
      currentStock: 0,
      minStock: 12,
      maxStock: 120,
      status: 'ACTIVE'
    });
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleDuplicate = (p: Product) => {
    setEditingProduct({
      ...p,
      id: undefined,
      name: `${p.name} (Cópia)`,
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      barcode: String(7890000000000 + Math.floor(Math.random() * 100000000)),
      currentStock: 0
    });
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (p: Product) => {
    const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      if (appMode === 'PRODUCTION') await productionDb.saveProduct({ ...p, status: nextStatus });
      else db.saveProduct({ id: p.id, name: p.name, salePrice: p.salePrice, status: nextStatus });
      await refreshProducts();
      setFeedback(`Produto "${p.name}" foi ${nextStatus === 'ACTIVE' ? 'ativado' : 'desativado'}.`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err:any) { setLoadError(err?.message || 'Não foi possível alterar o produto.'); }
  };

  const handleDelete = async (p: Product) => {
    if (appMode === 'PRODUCTION') {
      const ok = window.confirm(`Por segurança e auditoria, o produto "${p.name}" será INATIVADO, não apagado. Continuar?`);
      if (ok) await handleToggleStatus({ ...p, status: 'ACTIVE' });
      return;
    }
    const movements = db.getStockMovements().filter(m => m.productId === p.id);
    if (movements.length > 0) {
      alert(`O produto "${p.name}" possui ${movements.length} movimentação(ões) registrada(s) no histórico. Conforme regra de conformidade e auditoria, o produto será marcado como INATIVO.`);
      await handleToggleStatus(p);
      return;
    }
    if (window.confirm(`Confirma a exclusão do produto "${p.name}"?`)) {
      db.saveProduct({ id: p.id, name: p.name, salePrice: p.salePrice, status: 'INACTIVE' });
      await refreshProducts();
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.salePrice) {
      alert('Por favor, preencha o nome do produto e o preço de venda.');
      return;
    }
    try {
      if (appMode === 'PRODUCTION') {
        const saved = await productionDb.saveProduct(editingProduct as any);
        if (imageFile) {
          const optimized = await compressProductImage(imageFile);
          await productionDb.uploadProductImage(saved.id, optimized);
        }
      } else {
        db.saveProduct(editingProduct as any);
      }
      await refreshProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview('');
      setFeedback(appMode === 'PRODUCTION' ? 'Produto salvo no ambiente de produção.' : 'Produto salvo no modo demonstração.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err:any) { setLoadError(err?.message || 'Não foi possível salvar o produto.'); }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Nome', 'SKU', 'Codigo_Barras', 'Categoria', 'Marca', 'Apresentacao', 'Preco_Custo', 'Preco_Venda', 'Margem_Pct', 'Estoque_Atual', 'Estoque_Minimo', 'Status'];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || p.categoryId;
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.sku,
        p.barcode,
        `"${cat}"`,
        `"${p.brand}"`,
        `"${p.packageSize || ''}"`,
        p.costPrice.toFixed(2),
        p.salePrice.toFixed(2),
        p.margin.toFixed(2),
        p.currentStock,
        p.minStock,
        p.status
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `produtos_tome_no_seu_toba_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Package size={22} className="text-amber-400" />
            <span>Cadastro &amp; Catálogo de Produtos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Gerenciamento completo de cervejas, destilados, combos, custos, margens e estoque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {loadError && <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{loadError}</div>}

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, EAN, SKU, marca ou apresentação..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="ALL">Todas as Categorias</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Stock Alert Filter */}
        <select
          value={selectedStockAlert}
          onChange={e => setSelectedStockAlert(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="ALL">Todos os Níveis de Estoque</option>
          <option value="LOW">Alerta: Estoque Baixo (&le; Mínimo)</option>
          <option value="ZERO">Crítico: Esgotado (Zero Estoque)</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="ALL">Todos os Status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] text-neutral-500">
          {filteredProducts.length} produto(s) · catálogo visual com estoque, preço e margem
        </div>
        <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 p-1">
          <button type="button" onClick={()=>setViewMode('GRID')} className={`w-9 h-8 rounded-lg grid place-items-center ${viewMode==='GRID'?'bg-amber-500 text-neutral-950':'text-neutral-500 hover:text-white'}`} title="Visual em grade"><Grid3X3 size={15}/></button>
          <button type="button" onClick={()=>setViewMode('LIST')} className={`w-9 h-8 rounded-lg grid place-items-center ${viewMode==='LIST'?'bg-amber-500 text-neutral-950':'text-neutral-500 hover:text-white'}`} title="Visual em lista"><List size={15}/></button>
        </div>
      </div>

      {/* Products Catalog */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 px-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
          <Package size={34} className="mx-auto text-neutral-700"/>
          <div className="mt-3 font-black text-white">Nenhum produto encontrado</div>
          <div className="mt-1 text-xs text-neutral-500">Ajuste os filtros ou cadastre um novo produto.</div>
          <button onClick={handleOpenNew} className="mt-5 px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black"><Plus size={14} className="inline mr-1"/>Novo produto</button>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {filteredProducts.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            const isLow = !p.isCombo && p.currentStock > 0 && p.currentStock <= p.minStock;
            const isZero = !p.isCombo && p.currentStock <= 0;
            return <article key={p.id} className="group rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-amber-500/40 transition-all">
              <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform" loading="lazy"/> :
                  <div className="w-full h-full grid place-items-center bg-[radial-gradient(circle_at_center,rgba(245,158,11,.10),transparent_60%)]"><div className="text-center"><Package size={34} className="mx-auto text-neutral-700"/><div className="text-[9px] text-neutral-600 mt-2">Sem foto</div></div></div>}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  {p.isCombo && <span className="px-2 py-1 rounded-full bg-violet-950/90 border border-violet-700/70 text-[9px] font-black text-violet-200">COMBO</span>}
                  {p.isCold && <span className="px-2 py-1 rounded-full bg-sky-950/90 border border-sky-700/70 text-[9px] font-black text-sky-200">GELADO</span>}
                </div>
                <span className={`absolute right-2 top-2 px-2 py-1 rounded-full text-[9px] font-black border ${p.status==='ACTIVE'?'bg-emerald-950/90 text-emerald-300 border-emerald-800':'bg-neutral-900 text-neutral-500 border-neutral-700'}`}>{p.status==='ACTIVE'?'ATIVO':'INATIVO'}</span>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-neutral-500 truncate">{cat?.name || 'Geral'}{p.brand ? ` · ${p.brand}` : ''}{p.packageSize ? ` · ${p.packageSize}` : ''}</div>
                <h3 className="mt-1 font-black text-sm text-white leading-tight line-clamp-2 min-h-[2.25rem]">{p.name}</h3>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div><div className="text-[9px] text-neutral-500">Preço</div><div className="font-mono font-black text-amber-400 text-base">R$ {p.salePrice.toFixed(2)}</div></div>
                  <div className="text-right"><div className="text-[9px] text-neutral-500">Margem</div><div className="font-mono text-[11px] text-emerald-400">+{p.margin.toFixed(1)}%</div></div>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <div><div className="text-[9px] text-neutral-500">Estoque</div><div className={`font-mono font-black text-xs ${isZero?'text-rose-400':isLow?'text-amber-400':'text-neutral-200'}`}>{p.currentStock} {p.unit}</div></div>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>handleEdit(p)} className="w-8 h-8 rounded-lg grid place-items-center bg-neutral-800 text-neutral-300 hover:text-white" title="Editar"><Edit2 size={13}/></button>
                    <button onClick={()=>handleDuplicate(p)} className="w-8 h-8 rounded-lg grid place-items-center bg-neutral-800 text-neutral-400 hover:text-white" title="Duplicar"><Copy size={13}/></button>
                    <button onClick={()=>void handleToggleStatus(p)} className="w-8 h-8 rounded-lg grid place-items-center bg-neutral-800 text-amber-400" title={p.status==='ACTIVE'?'Desativar':'Ativar'}><Power size={13}/></button>
                  </div>
                </div>
              </div>
            </article>
          })}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                <tr><th className="py-3 px-4">Produto</th><th className="py-3 px-3">EAN / SKU</th><th className="py-3 px-3">Categoria</th><th className="py-3 px-3 text-right">Custo</th><th className="py-3 px-3 text-right">Venda</th><th className="py-3 px-3 text-right">Margem</th><th className="py-3 px-3 text-center">Estoque</th><th className="py-3 px-4 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filteredProducts.map(p=>{const cat=categories.find(c=>c.id===p.categoryId);return <tr key={p.id} className="hover:bg-neutral-800/40">
                  <td className="p-3"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0">{p.imageUrl?<img src={p.imageUrl} alt="" className="w-full h-full object-contain p-1"/>:<Package className="m-3 text-neutral-700" size={20}/>}</div><div><div className="font-bold text-white">{p.name}</div><div className="text-[10px] text-neutral-500">{p.brand}{p.packageSize ? ` · ${p.packageSize}` : ''}</div></div></div></td>
                  <td className="p-3 font-mono text-[10px] text-neutral-400">{p.barcode}<br/>{p.sku}</td><td className="p-3">{cat?.name||'Geral'}</td><td className="p-3 text-right font-mono">R$ {p.costPrice.toFixed(2)}</td><td className="p-3 text-right font-mono font-black text-amber-400">R$ {p.salePrice.toFixed(2)}</td><td className="p-3 text-right font-mono text-emerald-400">+{p.margin.toFixed(1)}%</td><td className="p-3 text-center font-mono">{p.currentStock} {p.unit}</td>
                  <td className="p-3"><div className="flex justify-end gap-1"><button onClick={()=>handleEdit(p)} className="p-2 rounded-lg bg-neutral-800"><Edit2 size={13}/></button><button onClick={()=>handleDuplicate(p)} className="p-2 rounded-lg bg-neutral-800"><Copy size={13}/></button><button onClick={()=>void handleToggleStatus(p)} className="p-2 rounded-lg bg-neutral-800 text-amber-400"><Power size={13}/></button><button onClick={()=>void handleDelete(p)} className="p-2 rounded-lg bg-neutral-800 text-rose-400"><Trash2 size={13}/></button></div></td>
                </tr>})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Create / Edit Product */}
      {/* ---------------------------------------------------- */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <h3 className="text-base font-bold text-white">
                {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              <div className="grid sm:grid-cols-[180px_1fr] gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="aspect-square rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden grid place-items-center">
                  {imagePreview ? <img src={imagePreview} alt="Prévia do produto" className="w-full h-full object-contain p-2"/> : <div className="text-center text-neutral-600"><ImagePlus size={30} className="mx-auto"/><div className="text-[10px] mt-2">Foto do produto</div></div>}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white">Imagem do produto</div>
                  <div className="text-[10px] text-neutral-500 mt-1 leading-relaxed">Use uma foto frontal, fundo limpo, JPG/PNG/WebP de até 5MB. Em produção a imagem fica isolada por tenant no Storage.</div>
                  <label className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black cursor-pointer">
                    <Upload size={14}/> Selecionar foto
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{
                      const file=e.target.files?.[0]||null;
                      setImageFile(file);
                      if(file){const url=URL.createObjectURL(file);setImagePreview(url);}
                    }}/>
                  </label>
                  {imagePreview && <button type="button" onClick={async()=>{
                    if(editingProduct.id && appMode==='PRODUCTION' && !imageFile){
                      try{await productionDb.removeProductImage(editingProduct.id);setImagePreview('');await refreshProducts();}catch(err:any){setLoadError(err?.message||'Não foi possível remover a imagem.');}
                    } else {setImageFile(null);setImagePreview('');}
                  }} className="mt-2 ml-2 px-3 py-2 rounded-xl border border-neutral-700 text-[10px] text-neutral-400 hover:text-rose-300"><ImageOff size={13} className="inline mr-1"/>Remover</button>}
                </div>
              </div>

              {/* Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-neutral-400 block mb-1">Nome do Produto *</label>
                  <input
                    required
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                    placeholder="Ex: Cerveja Corona Extra"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                    placeholder="Ex: Corona"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Apresentação / Volume</label>
                <input
                  type="text"
                  value={editingProduct.packageSize || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, packageSize: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  placeholder="Ex: 350ml, 750ml, 1L, 5kg"
                />
              </div>

              {/* Barcode & SKU & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    placeholder="7890000000000"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">SKU Interno</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    placeholder="CERV-01"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Categoria</label>
                  <select
                    value={editingProduct.categoryId || 'cat-cervejas'}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prices & Margins */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.costPrice || ''}
                    onChange={e => {
                      const cost = parseFloat(e.target.value) || 0;
                      const sale = editingProduct.salePrice || 0;
                      const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 100;
                      setEditingProduct({ ...editingProduct, costPrice: cost, margin });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Preço de Venda (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={editingProduct.salePrice || ''}
                    onChange={e => {
                      const sale = parseFloat(e.target.value) || 0;
                      const cost = editingProduct.costPrice || 0;
                      const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 100;
                      setEditingProduct({ ...editingProduct, salePrice: sale, margin });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs font-bold text-amber-400 focus:border-amber-400 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Margem Lucro Calculada</label>
                  <div className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 font-mono text-emerald-400 font-bold text-xs">
                    +{Number(editingProduct.margin || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Stock Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    value={editingProduct.currentStock ?? 0}
                    onChange={e => setEditingProduct({ ...editingProduct, currentStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={editingProduct.minStock ?? 10}
                    onChange={e => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Estoque Máximo</label>
                  <input
                    type="number"
                    value={editingProduct.maxStock ?? 100}
                    onChange={e => setEditingProduct({ ...editingProduct, maxStock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Unidade</label>
                  <select
                    value={editingProduct.unit || 'UN'}
                    onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="PACK">PACK</option>
                    <option value="CX">CX (Caixa)</option>
                    <option value="L">L (Litro)</option>
                    <option value="ML">ML</option>
                    <option value="KG">KG</option>
                  </select>
                </div>
              </div>

              {/* Supplier & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Fornecedor Principal</label>
                  <select
                    value={editingProduct.supplierId || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, supplierId: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="">Nenhum / Não vinculado</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Status do Produto</label>
                  <select
                    value={editingProduct.status || 'ACTIVE'}
                    onChange={e => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ACTIVE">ATIVO</option>
                    <option value="INACTIVE">INATIVO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Descrição Adicional</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  placeholder="Detalhes, safra, teor alcoólico ou observações do produto..."
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
