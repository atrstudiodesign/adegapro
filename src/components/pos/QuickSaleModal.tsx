import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../../types';
import { db } from '../../services/db';
import { soundService } from '../../services/soundService';
import {
  Zap,
  Barcode,
  Search,
  CheckCircle2,
  X,
  Plus,
  Flame,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Volume2,
  VolumeX
} from 'lucide-react';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onAddAndCheckout: (product: Product, quantity: number) => void;
  products: Product[];
  currentCartCount: number;
  currentCartTotal: number;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  onAddAndCheckout,
  products,
  currentCartCount,
  currentCartTotal
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [continuousMode, setContinuousMode] = useState(true);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{ product: Product; qty: number; timestamp: string }>>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setQuantity(1);
      setMatchedProduct(null);
      setFeedback(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // High-volume popular fast-access items in adegas
  const fastItems = products
    .filter(p => !p.isCombo && p.currentStock > 0)
    .slice(0, 8);

  // Parse code input in real-time
  useEffect(() => {
    const raw = codeInput.trim();
    if (!raw) {
      setMatchedProduct(null);
      return;
    }

    // Check for multiplier syntax like 3*789... or 6*SKU
    let searchBarcode = raw;
    let detectedQty = quantity;

    if (raw.includes('*')) {
      const parts = raw.split('*');
      const parsedQty = parseInt(parts[0], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        detectedQty = parsedQty;
        searchBarcode = parts.slice(1).join('*').trim();
      }
    }

    // Exact barcode match first
    const found =
      db.getProductByBarcode(searchBarcode) ||
      products.find(
        p =>
          p.barcode.toLowerCase() === searchBarcode.toLowerCase() ||
          p.sku.toLowerCase() === searchBarcode.toLowerCase() ||
          p.id === searchBarcode
      );

    if (found) {
      setMatchedProduct(found);
      if (raw.includes('*')) {
        setQuantity(detectedQty);
      }
    } else {
      // Partial name or barcode match for autocomplete
      const partial = products.find(
        p =>
          p.barcode.toLowerCase().includes(searchBarcode.toLowerCase()) ||
          p.name.toLowerCase().includes(searchBarcode.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchBarcode.toLowerCase())
      );
      setMatchedProduct(partial || null);
    }
  }, [codeInput, products]);

  const [isAudioMuted, setIsAudioMuted] = useState(soundService.getMuted());

  const handleExecuteAdd = (directCheckout = false) => {
    if (!matchedProduct) {
      // Try searching by current input as fallback
      const raw = codeInput.trim();
      const found = products.find(
        p =>
          p.barcode === raw ||
          p.sku.toLowerCase() === raw.toLowerCase() ||
          p.name.toLowerCase().includes(raw.toLowerCase())
      );
      if (found) {
        processProductAdd(found, quantity, directCheckout);
      } else {
        soundService.playScanError();
        setFeedback({
          message: `Código "${raw || 'vazio'}" não reconhecido no sistema. Verifique o produto.`,
          type: 'error'
        });
      }
      return;
    }

    processProductAdd(matchedProduct, quantity, directCheckout);
  };

  const processProductAdd = (product: Product, qty: number, directCheckout: boolean) => {
    if (product.currentStock <= 0) {
      soundService.playScanError();
      setFeedback({
        message: `Atenção: Produto "${product.name}" sem estoque disponível no momento.`,
        type: 'error'
      });
      return;
    }

    // Audio feedback for successful scan
    soundService.playScanSuccess();

    if (directCheckout) {
      onAddAndCheckout(product, qty);
      onClose();
      return;
    }

    onAddToCart(product, qty);

    setRecentScans(prev => [
      {
        product,
        qty,
        timestamp: new Date().toLocaleTimeString('pt-BR', { minute: '2-digit', second: '2-digit' })
      },
      ...prev.slice(0, 4)
    ]);

    setFeedback({
      message: `${qty}x "${product.name}" adicionado com sucesso!`,
      type: 'success'
    });

    // Reset input for next scan
    setCodeInput('');
    setQuantity(1);
    setMatchedProduct(null);

    if (!continuousMode) {
      onClose();
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  };

  const handleQuickPresetClick = (product: Product, presetQty = 1) => {
    processProductAdd(product, presetQty, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey || e.ctrlKey) {
        handleExecuteAdd(true); // Direct checkout
      } else {
        handleExecuteAdd(false);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-amber-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-neutral-100"
        onKeyDown={handleKeyDown}
      >
        {/* Header with Luxury Brand Accent */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-tight">
                  Venda Rápida · Bipagem Contínua
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  ALTO FLUXO
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Bipe o leitor de código de barras ou digite o código com quantidade expressa (ex: <span className="text-amber-400 font-mono">3*7890001</span>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Feedback indicator / toggle */}
            <button
              type="button"
              onClick={() => {
                const newMuted = soundService.toggleMute();
                setIsAudioMuted(newMuted);
              }}
              className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isAudioMuted
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60'
              }`}
              title={isAudioMuted ? 'Áudio desativado (Clique para ativar feedback sonoro)' : 'Áudio Ativo: Bip ao ler com sucesso / Buzzer ao falhar (Clique para silenciar)'}
            >
              {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="animate-pulse text-emerald-400" />}
              <span className="hidden md:inline text-[11px] font-bold">
                {isAudioMuted ? 'Mudo' : 'Bip Som'}
              </span>
            </button>

            <label className="hidden sm:flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={e => setContinuousMode(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-neutral-300">Manter aberto após bipar</span>
            </label>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Fechar (ESC)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Barcode & Code Input Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Barcode size={16} />
                <span>Código de Barras / SKU / Código do Produto</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Atalho: [ENTER] Adicionar · [SHIFT+ENTER] Pagar
              </span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                placeholder="Bipe com o leitor ou digite o código..."
                className="w-full bg-neutral-950 border-2 border-amber-500/50 focus:border-amber-400 rounded-2xl px-5 py-4 text-white font-mono text-lg font-bold placeholder-neutral-600 focus:outline-none focus:ring-4 focus:ring-amber-500/15 shadow-inner transition-all pr-32"
                autoComplete="off"
                autoFocus
              />

              {/* Quantity Preset Controls attached inside input */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 px-1 font-bold">QTD:</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 bg-neutral-950 border border-neutral-700 rounded-lg text-center text-amber-400 font-mono font-black text-sm py-1 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Fast Quantity Selector Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-neutral-500 font-semibold mr-1">Multiplicadores:</span>
              {[
                { label: '1x Unidade', qty: 1 },
                { label: '2x Duplo', qty: 2 },
                { label: '3x', qty: 3 },
                { label: '6x Pack/Fardo', qty: 6 },
                { label: '12x Caixa', qty: 12 },
                { label: '24x Fardo', qty: 24 }
              ].map(preset => (
                <button
                  key={preset.qty}
                  type="button"
                  onClick={() => {
                    setQuantity(preset.qty);
                    inputRef.current?.focus();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    quantity === preset.qty
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback message (Flash Banner) */}
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-700/80 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className={feedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} />
                <span className="font-semibold">{feedback.message}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">Pronto para o próximo</span>
            </div>
          )}

          {/* Live Product Preview when Matched */}
          {matchedProduct ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in zoom-in-95 duration-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-black text-sm">
                  {matchedProduct.isCombo ? <Layers size={22} /> : <Package size={22} />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{matchedProduct.name}</span>
                    {matchedProduct.isCold && (
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-bold">
                        GELADA
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                    <span>Cód: {matchedProduct.barcode}</span>
                    <span>•</span>
                    <span className={matchedProduct.currentStock > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Estoque: {matchedProduct.currentStock} un
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {quantity}x R$ {matchedProduct.salePrice.toFixed(2)}
                  </div>
                  <div className="text-xl font-black font-mono text-amber-400">
                    R$ {(matchedProduct.salePrice * quantity).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExecuteAdd(false)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Adicionar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteAdd(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                    title="Adicionar e abrir tela de pagamento imediata (Shift+Enter)"
                  >
                    <span>Pagar Já</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            codeInput.trim() && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
                <span>Digitando código: <strong className="text-white font-mono">{codeInput}</strong>...</span>
                <span className="text-[11px] text-neutral-500">Pressione ENTER para buscar</span>
              </div>
            )
          )}

          {/* Quick Beverage Buttons for Ultra-High Volume Transactions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} className="text-amber-500" />
                <span>Atalhos Rápidos de Maior Giro (1 Clique)</span>
              </span>
              <span className="text-[10px] text-neutral-500">Clique para adicionar direto</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {fastItems.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickPresetClick(p, 1)}
                  className="p-2.5 rounded-2xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800/80 hover:border-amber-500/40 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="text-xs font-bold text-neutral-200 group-hover:text-amber-400 truncate">
                    {p.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                    <span className="text-amber-400 font-bold">R$ {p.salePrice.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-500">{p.currentStock} un</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scanned Items in This Session History */}
          {recentScans.length > 0 && (
            <div className="pt-2 border-t border-neutral-800">
              <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Últimos Bipados Nesta Sessão
              </div>
              <div className="space-y-1.5">
                {recentScans.map((scan, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-mono font-bold">{scan.qty}x</span>
                      <span className="text-white font-medium truncate max-w-xs">{scan.product.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-amber-400 font-bold">
                        R$ {(scan.product.salePrice * scan.qty).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-500">{scan.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Running Cart Total */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 flex items-center justify-center text-amber-400 border border-neutral-800">
              <ShoppingBag size={16} />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-bold">Carrinho Atual</div>
              <div className="text-sm font-black font-mono text-white">
                {currentCartCount} {currentCartCount === 1 ? 'item' : 'itens'} ·{' '}
                <span className="text-amber-400">R$ {currentCartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Concluir &amp; Fechar (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
