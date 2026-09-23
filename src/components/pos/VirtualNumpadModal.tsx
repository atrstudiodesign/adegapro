import React, { useState, useEffect, useMemo } from 'react';
import { SaleItem, Product } from '../../types';
import { soundService } from '../../services/soundService';
import {
  Calculator,
  X,
  Delete,
  Check,
  Percent,
  DollarSign,
  Package,
  AlertTriangle,
  Layers,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export type NumpadMode = 'QUANTITY' | 'PRICE_OVERRIDE' | 'FAST_INPUT';

interface VirtualNumpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem?: SaleItem | null;
  initialMode?: NumpadMode;
  products: Product[];
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onUpdateUnitPrice: (productId: string, newUnitPrice: number, reason: string) => void;
  onFastAddToCart?: (barcodeOrQuery: string, quantity: number) => void;
}

const PRESET_REASONS = [
  'Promoção / Oferta Balcão',
  'Atacado / Caixa Fechada',
  'Avaria / Embalagem Amassada',
  'Validade Próxima',
  'Acordo Comercial / Fidelidade',
  'Ajuste Gerencial'
];

export const VirtualNumpadModal: React.FC<VirtualNumpadModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  initialMode = 'QUANTITY',
  products,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onFastAddToCart
}) => {
  const [activeMode, setActiveMode] = useState<NumpadMode>(initialMode);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Find linked product for cost price and current stock verification
  const linkedProduct = useMemo(() => {
    if (!targetItem) return null;
    return products.find(p => p.id === targetItem.productId) || null;
  }, [targetItem, products]);

  // Synchronize initial input value whenever opened or mode changes
  useEffect(() => {
    if (!isOpen) return;
    setWarningMessage(null);
    if (activeMode === 'QUANTITY') {
      setInputValue(targetItem ? String(targetItem.quantity) : '1');
    } else if (activeMode === 'PRICE_OVERRIDE') {
      // In cents mode or direct float
      const currentPrice = targetItem ? targetItem.unitPrice : 0;
      setInputValue(currentPrice > 0 ? currentPrice.toFixed(2).replace('.', ',') : '0,00');
      setSelectedReason(targetItem?.priceOverrideReason || PRESET_REASONS[0]);
    } else if (activeMode === 'FAST_INPUT') {
      setInputValue('');
    }
  }, [isOpen, activeMode, targetItem]);

  // Keyboard support for hybrid terminals (numpad keys, Backspace, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === ',' || e.key === '.') {
        e.preventDefault();
        handleComma();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputValue, activeMode, targetItem, selectedReason, customReason]);

  if (!isOpen) return null;

  // Keypad Handlers
  const handleDigit = (digit: string) => {
    soundService.playKeypadTap();
    setWarningMessage(null);

    if (activeMode === 'QUANTITY') {
      if (inputValue === '0' || inputValue === '') {
        setInputValue(digit);
      } else {
        // Limit max quantity to 9999 for sane POS operation
        if (inputValue.length < 4) {
          setInputValue(prev => prev + digit);
        }
      }
    } else if (activeMode === 'PRICE_OVERRIDE') {
      // Currency cents typing mode: shift digits
      const digitsOnly = (inputValue.replace(/\D/g, '') + digit).slice(-6); // Max 9999,99
      const num = parseInt(digitsOnly, 10) / 100;
      setInputValue(num.toFixed(2).replace('.', ','));
    } else {
      // Fast Barcode / Multiplier input
      setInputValue(prev => prev + digit);
    }
  };

  const handleDoubleZero = () => {
    soundService.playKeypadTap();
    if (activeMode === 'QUANTITY') {
      if (inputValue !== '0' && inputValue !== '' && inputValue.length < 3) {
        setInputValue(prev => prev + '00');
      }
    } else if (activeMode === 'PRICE_OVERRIDE') {
      const digitsOnly = (inputValue.replace(/\D/g, '') + '00').slice(-6);
      const num = parseInt(digitsOnly, 10) / 100;
      setInputValue(num.toFixed(2).replace('.', ','));
    } else {
      setInputValue(prev => prev + '00');
    }
  };

  const handleComma = () => {
    soundService.playKeypadTap();
    if (activeMode === 'FAST_INPUT' && !inputValue.includes('*')) {
      setInputValue(prev => prev + '*');
    }
  };

  const handleBackspace = () => {
    soundService.playKeypadTap();
    setWarningMessage(null);

    if (activeMode === 'QUANTITY') {
      if (inputValue.length <= 1) {
        setInputValue('0');
      } else {
        setInputValue(prev => prev.slice(0, -1));
      }
    } else if (activeMode === 'PRICE_OVERRIDE') {
      const digitsOnly = inputValue.replace(/\D/g, '').slice(0, -1);
      const num = (parseInt(digitsOnly, 10) || 0) / 100;
      setInputValue(num.toFixed(2).replace('.', ','));
    } else {
      setInputValue(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    soundService.playKeypadTap();
    setWarningMessage(null);
    if (activeMode === 'QUANTITY') {
      setInputValue('1');
    } else if (activeMode === 'PRICE_OVERRIDE') {
      setInputValue('0,00');
    } else {
      setInputValue('');
    }
  };

  // Preset Handlers for Quantity
  const handleSetPresetQty = (qty: number) => {
    soundService.playKeypadTap();
    setInputValue(String(qty));
  };

  const handleDeltaQty = (delta: number) => {
    soundService.playKeypadTap();
    const current = parseInt(inputValue, 10) || 0;
    const next = Math.max(1, current + delta);
    setInputValue(String(next));
  };

  // Preset Handlers for Price Override (Discounts)
  const handleDiscountPercent = (percent: number) => {
    soundService.playKeypadTap();
    if (!targetItem) return;
    const basePrice = targetItem.originalUnitPrice || targetItem.unitPrice;
    const discounted = Math.max(0, basePrice * (1 - percent / 100));
    setInputValue(discounted.toFixed(2).replace('.', ','));
    setSelectedReason(`Desconto Promocional (${percent}%)`);
  };

  const handleResetToOriginalPrice = () => {
    soundService.playKeypadTap();
    if (!targetItem) return;
    const original = targetItem.originalUnitPrice || linkedProduct?.salePrice || targetItem.unitPrice;
    setInputValue(original.toFixed(2).replace('.', ','));
    setSelectedReason(PRESET_REASONS[0]);
  };

  // Confirmation Execution
  const handleConfirm = () => {
    if (activeMode === 'QUANTITY') {
      const parsedQty = parseInt(inputValue, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        soundService.playScanError();
        setWarningMessage('Por favor, informe uma quantidade válida maior que zero.');
        return;
      }

      if (targetItem) {
        onUpdateQuantity(targetItem.productId, parsedQty);
        soundService.playScanSuccess();
        onClose();
      }
    } else if (activeMode === 'PRICE_OVERRIDE') {
      const cleanNum = parseFloat(inputValue.replace(',', '.'));
      if (isNaN(cleanNum) || cleanNum < 0) {
        soundService.playScanError();
        setWarningMessage('Informe um preço unitário válido.');
        return;
      }

      if (targetItem) {
        const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
        onUpdateUnitPrice(targetItem.productId, cleanNum, finalReason);
        soundService.playScanSuccess();
        onClose();
      }
    } else if (activeMode === 'FAST_INPUT') {
      const query = inputValue.trim();
      if (!query) {
        soundService.playScanError();
        setWarningMessage('Digite a quantidade ou código do produto.');
        return;
      }

      if (onFastAddToCart) {
        let qty = 1;
        let barcodeOrQuery = query;
        if (query.includes('*')) {
          const parts = query.split('*');
          qty = parseInt(parts[0], 10) || 1;
          barcodeOrQuery = parts.slice(1).join('*').trim();
        }
        onFastAddToCart(barcodeOrQuery, qty);
        soundService.playScanSuccess();
        onClose();
      }
    }
  };

  // Computations for active previews
  const currentNumericValue = useMemo(() => {
    if (activeMode === 'QUANTITY') {
      return parseInt(inputValue, 10) || 0;
    }
    if (activeMode === 'PRICE_OVERRIDE') {
      return parseFloat(inputValue.replace(',', '.')) || 0;
    }
    return 0;
  }, [inputValue, activeMode]);

  // Price calculations & cost floor alert
  const originalPrice = targetItem?.originalUnitPrice || targetItem?.unitPrice || 0;
  const costPrice = targetItem?.costPrice || linkedProduct?.costPrice || 0;
  const isBelowCost = activeMode === 'PRICE_OVERRIDE' && currentNumericValue > 0 && currentNumericValue < costPrice;
  const priceDifference = originalPrice - currentNumericValue;
  const percentDifference = originalPrice > 0 ? (priceDifference / originalPrice) * 100 : 0;

  // New subtotal projection
  const projectedSubtotal = useMemo(() => {
    if (!targetItem) return 0;
    if (activeMode === 'QUANTITY') {
      return currentNumericValue * targetItem.unitPrice;
    }
    if (activeMode === 'PRICE_OVERRIDE') {
      return targetItem.quantity * currentNumericValue;
    }
    return 0;
  }, [targetItem, activeMode, currentNumericValue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header / Mode Switch Tabs */}
        <div className="p-4 bg-neutral-950/90 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2 leading-none">
                Teclado Touch Virtual
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  KIOSK / TABLET
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                {targetItem ? targetItem.productName : 'Entrada Rápida de Multiplicador ou Código'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar Numpad"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {targetItem ? (
          <div className="grid grid-cols-2 p-1.5 bg-neutral-950/60 border-b border-neutral-800 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode('QUANTITY')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'QUANTITY'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Package size={15} />
              <span>Alterar Quantidade</span>
              {activeMode === 'QUANTITY' && (
                <span className="font-mono text-[10px] bg-neutral-950/20 px-1.5 py-0.5 rounded">
                  Foco
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('PRICE_OVERRIDE')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'PRICE_OVERRIDE'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/40'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <DollarSign size={15} />
              <span>Ajustar Preço Unitário</span>
              {activeMode === 'PRICE_OVERRIDE' && (
                <span className="font-mono text-[10px] bg-neutral-950/20 px-1.5 py-0.5 rounded">
                  Foco
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="p-2.5 bg-neutral-950/60 border-b border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
            <Layers size={14} className="text-amber-400 shrink-0" />
            <span>Multiplicador de balcão (Ex: 12*789199... para bipar pacote fechado)</span>
          </div>
        )}

        {/* Big Display Readout Area */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium">
              {activeMode === 'QUANTITY'
                ? 'Quantidade Desejada:'
                : activeMode === 'PRICE_OVERRIDE'
                ? 'Novo Preço Unitário (R$):'
                : 'Expressão de Balcão:'}
            </span>

            {targetItem && (
              <span className="font-mono text-[11px] text-neutral-400">
                {activeMode === 'QUANTITY'
                  ? `Estoque Disponível: ${linkedProduct?.currentStock ?? 'N/D'} un`
                  : `Preço Original: R$ ${originalPrice.toFixed(2)}`}
              </span>
            )}
          </div>

          {/* Huge Touch Display */}
          <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-700/80 rounded-2xl px-5 py-3 shadow-inner">
            <div className="flex items-baseline gap-2">
              {activeMode === 'PRICE_OVERRIDE' && (
                <span className="text-2xl font-black text-amber-500 font-mono">R$</span>
              )}
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums">
                {inputValue || '0'}
              </span>
              {activeMode === 'QUANTITY' && (
                <span className="text-base font-bold text-neutral-400 font-mono">UN</span>
              )}
            </div>

            {/* Micro Quick Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackspace}
                className="w-12 h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title="Apagar último dígito"
              >
                <Delete size={20} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="w-12 h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-rose-400 font-black font-mono text-base active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title="Limpar valor"
              >
                C
              </button>
            </div>
          </div>

          {/* Subtotal & Analysis Bar */}
          {targetItem && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-xs text-neutral-300 flex items-center gap-1.5 font-medium">
                <span className="text-neutral-500">Novo Subtotal do Item:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  R$ {projectedSubtotal.toFixed(2)}
                </span>
                {activeMode === 'PRICE_OVERRIDE' && priceDifference > 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                    (-R$ {priceDifference.toFixed(2)} · {percentDifference.toFixed(1)}% desc)
                  </span>
                )}
              </div>

              {activeMode === 'PRICE_OVERRIDE' && (
                <button
                  type="button"
                  onClick={handleResetToOriginalPrice}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw size={12} />
                  <span>Restaurar Preço de Tabela</span>
                </button>
              )}
            </div>
          )}

          {/* Cost Floor Warning */}
          {isBelowCost && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-600/80 text-rose-300 text-xs flex items-center gap-2 animate-pulse">
              <ShieldAlert size={16} className="text-rose-400 shrink-0" />
              <span>
                <strong>Atenção:</strong> O valor digitado (R$ {currentNumericValue.toFixed(2)}) é inferior ao custo do produto (R$ {costPrice.toFixed(2)}). A venda gerará margem negativa.
              </span>
            </div>
          )}

          {/* Warning Message */}
          {warningMessage && (
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              <span>{warningMessage}</span>
            </div>
          )}
        </div>

        {/* Quick Presets Strip */}
        <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
          {activeMode === 'QUANTITY' ? (
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
                Atalhos Rápidos:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeltaQty(-1)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleDeltaQty(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetQty(6)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer border border-neutral-700"
                >
                  6 un (Pack)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetQty(12)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer border border-neutral-700"
                >
                  12 un (Caixa)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetQty(24)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer border border-neutral-700"
                >
                  24 un (Fardo)
                </button>
              </div>
            </div>
          ) : activeMode === 'PRICE_OVERRIDE' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
                  Descontos Rápidos:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDiscountPercent(5)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer"
                  >
                    -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountPercent(10)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountPercent(15)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer"
                  >
                    -15%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountPercent(20)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-bold font-mono active:scale-95 transition-all cursor-pointer"
                  >
                    -20%
                  </button>
                </div>
              </div>

              {/* Justification Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400 shrink-0">Motivo:</span>
                <select
                  value={selectedReason}
                  onChange={e => setSelectedReason(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-700 text-xs text-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-400"
                >
                  {PRESET_REASONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-400 flex items-center justify-between">
              <span>Use o botão asterisco (*) para separar quantidade e código. Exemplo: <strong>6*789</strong></span>
            </div>
          )}
        </div>

        {/* Numpad Keypad Grid (Touch-First Dimensions >= 56px per key) */}
        <div className="p-4 grid grid-cols-4 gap-2.5 bg-neutral-950">
          {/* Row 1 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            9
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 font-bold border border-neutral-700 shadow-md active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <Delete size={20} />
            <span className="text-[10px] mt-0.5 text-neutral-400 font-sans">Apagar</span>
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            6
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold border border-rose-800/50 shadow-md active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer"
          >
            <span className="font-mono text-xl font-black">C</span>
            <span className="text-[10px] text-rose-400/80 font-sans">Limpar</span>
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            3
          </button>
          <button
            type="button"
            onClick={handleDoubleZero}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-amber-400 font-mono font-black text-xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            00
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-white font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Asterisk or Comma key */}
          <button
            type="button"
            onClick={handleComma}
            className="h-14 sm:h-16 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 text-neutral-300 font-mono font-black text-2xl border border-neutral-800 shadow-md active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="Separador de multiplicação ou decimal"
          >
            {activeMode === 'FAST_INPUT' ? '×' : ','}
          </button>

          {/* Confirm Big Button spanning 2 columns */}
          <button
            type="button"
            onClick={handleConfirm}
            className="col-span-2 h-14 sm:h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-black text-base sm:text-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check size={22} className="stroke-[3]" />
            <span>Confirmar (Enter)</span>
          </button>
        </div>

        {/* Footer info note for cashiers */}
        <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
          <span>Dica: No teclado físico você pode usar o teclado numérico e a tecla <strong>Enter</strong>.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-medium cursor-pointer"
          >
            Cancelar (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
