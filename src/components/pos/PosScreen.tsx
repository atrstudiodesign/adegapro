import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/db';
import { paymentService } from '../../services/paymentService';
import { printService } from '../../services/printService';
import { fiscalService } from '../../services/fiscalService';
import { Product, SaleItem, SalePayment, PaymentMethod, Customer, Sale, User, CashSession } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  UserPlus,
  Clock,
  Printer,
  Share2,
  AlertTriangle,
  Layers,
  Keyboard,
  ArrowRight,
  Zap,
  Volume2,
  VolumeX,
  Volume1,
  Bell,
  Calculator,
  Edit2,
  Tag
} from 'lucide-react';
import { QuickSaleModal } from './QuickSaleModal';
import { VirtualNumpadModal, NumpadMode } from './VirtualNumpadModal';
import { soundService } from '../../services/soundService';
import { OfflineSyncControl } from '../common/OfflineSyncControl';

interface PosScreenProps {
  currentUser: User;
  currentSession?: CashSession;
  onNavigate: (tab: string) => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  currentUser,
  currentSession,
  onNavigate
}) => {
  const store = db.getStore();
  const products = db.getProducts().filter(p => p.status === 'ACTIVE');
  const customers = db.getCustomers();

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [surcharge, setSurcharge] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Search & Barcode input
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Suspended Sales
  const [suspendedSales, setSuspendedSales] = useState<Array<{ id: string; time: string; cart: SaleItem[]; customer: Customer | null }>>([]);

  // Modals
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Payment Breakdown State
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [pixData, setPixData] = useState<{ payload: string; qrCodeDataUrl: string; txId: string } | null>(null);
  const [isProcessingPix, setIsProcessingPix] = useState(false);
  const [tefMessage, setTefMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Feedback State
  const [isAudioMuted, setIsAudioMuted] = useState(soundService.getMuted());
  const [audioVolume, setAudioVolume] = useState(soundService.getVolume());
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  const toggleSound = () => {
    const nextMuted = soundService.toggleMute();
    setIsAudioMuted(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    soundService.setVolume(newVol);
    setAudioVolume(newVol);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - discount + surcharge);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingToPay = Math.max(0, total - totalPaid);
  const changeDue = Math.max(0, (cashTendered > 0 ? cashTendered : 0) - remainingToPay);

  // Focus search input on mount and keep available
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter products when search changes
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const matches = products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(matches);
  }, [searchQuery]);

  // Keyboard Shortcuts Listener (F1, F2, F3, F4, F5, F6, F7, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsQuickSaleOpen(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsCustomerModalOpen(prev => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setIsDiscountModalOpen(prev => !prev);
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0 && !isPaymentModalOpen) {
          openPaymentModal();
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleSuspendSale();
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsSuspendedModalOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsAudioModalOpen(false);
        setIsQuickSaleOpen(false);
        setIsCustomerModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsPaymentModalOpen(false);
        setIsSuspendedModalOpen(false);
        setErrorMessage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, total]);

  // Add product to cart
  const addToCart = (product: Product, quantity = 1) => {
    if (!store.allowSellWithoutStock && product.currentStock <= 0) {
      soundService.playScanError();
      setErrorMessage(`Produto "${product.name}" está sem estoque.`);
      return;
    }

    // Audio feedback for successful item scan
    soundService.playScanSuccess();
    setErrorMessage(null);

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = item.quantity + quantity;
        item.quantity = newQty;
        item.subtotal = newQty * item.unitPrice - item.discount;
        return updated;
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          unitPrice: product.salePrice,
          costPrice: product.costPrice,
          quantity,
          discount: 0,
          subtotal: quantity * product.salePrice,
          isCombo: product.isCombo
        };
        return [newItem, ...prev];
      }
    });

    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Handle Search Input submit (Barcode Scanner simulation or Enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Support multiplier format (e.g., 3*7891991000836 or 6*HEINEKEN)
    let targetCode = query;
    let scanQty = 1;
    if (query.includes('*')) {
      const parts = query.split('*');
      const parsedQty = parseInt(parts[0], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        scanQty = parsedQty;
        targetCode = parts.slice(1).join('*').trim();
      }
    }

    // Check exact barcode or SKU first
    const exact = db.getProductByBarcode(targetCode) || products.find(p => p.barcode === targetCode || p.sku.toLowerCase() === targetCode.toLowerCase());
    if (exact) {
      addToCart(exact, scanQty);
      return;
    }

    // Check first result
    if (searchResults.length > 0) {
      addToCart(searchResults[0], scanQty);
      return;
    }

    // Audio alert when barcode scan fails!
    soundService.playScanError();
    setErrorMessage(`Código de barras ou produto não encontrado: "${query}". Verifique a etiqueta.`);
  };

  const updateItemQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = Math.max(1, item.quantity + delta);
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice - item.discount
            };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearSale = () => {
    if (cart.length > 0 && !window.confirm('Deseja realmente cancelar os itens desta venda?')) {
      return;
    }
    setCart([]);
    setDiscount(0);
    setSurcharge(0);
    setSelectedCustomer(null);
    setPayments([]);
    setErrorMessage(null);
    searchInputRef.current?.focus();
  };

  // Suspend sale
  const handleSuspendSale = () => {
    if (cart.length === 0) return;
    const suspended = {
      id: 'susp-' + Date.now(),
      time: new Date().toLocaleTimeString('pt-BR'),
      cart: [...cart],
      customer: selectedCustomer
    };
    setSuspendedSales(prev => [suspended, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setSurcharge(0);
    setErrorMessage('Venda suspensa com sucesso. Pressione F7 para recuperá-la a qualquer momento.');
  };

  // Restore suspended sale
  const restoreSuspendedSale = (id: string) => {
    const item = suspendedSales.find(s => s.id === id);
    if (item) {
      setCart(item.cart);
      setSelectedCustomer(item.customer);
      setSuspendedSales(prev => prev.filter(s => s.id !== id));
      setIsSuspendedModalOpen(false);
      setErrorMessage(null);
    }
  };

  // Open Payment Modal
  const openPaymentModal = () => {
    if (cart.length === 0) {
      soundService.playWarning();
      setErrorMessage('O carrinho está vazio. Adicione itens antes de finalizar a venda.');
      return;
    }
    if (!currentSession) {
      soundService.playWarning();
      setErrorMessage('O caixa está fechado! Abra uma sessão de caixa antes de receber pagamentos.');
      return;
    }
    if (store.requireCustomer && !selectedCustomer) {
      soundService.playWarning();
      setIsCustomerModalOpen(true);
      setErrorMessage('Esta loja exige a seleção de um cliente para finalizar a venda.');
      return;
    }

    setPayments([]);
    setCurrentMethod('DINHEIRO');
    setPaymentAmountInput(total.toFixed(2));
    setCashTendered(total);
    setPixData(null);
    setTefMessage(null);
    setErrorMessage(null);
    setIsPaymentModalOpen(true);
  };

  // Add a payment method split
  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmountInput);
    if (isNaN(amount) || amount <= 0) {
      soundService.playScanError();
      setErrorMessage('Informe um valor de pagamento válido.');
      return;
    }

    if (amount > remainingToPay && currentMethod !== 'DINHEIRO') {
      soundService.playScanError();
      setErrorMessage('O valor não pode ultrapassar o saldo restante a pagar.');
      return;
    }

    if (currentMethod === 'PIX') {
      setIsProcessingPix(true);
      try {
        const pixRes = await paymentService.generatePix(amount, `Venda PDV ${store.tradeName}`);
        setPixData(pixRes);
        setIsProcessingPix(false);
      } catch (e) {
        setIsProcessingPix(false);
        soundService.playScanError();
        setErrorMessage('Falha ao gerar QR Code PIX.');
        return;
      }
    } else if (currentMethod === 'DEBITO' || currentMethod === 'CREDITO') {
      const tefRes = await paymentService.processTef({
        type: currentMethod,
        amount
      });
      if (!tefRes.configured) {
        setTefMessage(tefRes.message);
        // We still allow manual card payment as authorized fallback!
      }
    }

    const newPayment: SalePayment = {
      id: 'pay-' + Date.now(),
      method: currentMethod,
      amount: Math.min(amount, remainingToPay),
      change: currentMethod === 'DINHEIRO' && cashTendered > amount ? cashTendered - amount : 0,
      provider: currentMethod === 'PIX' ? 'PIX_GATEWAY' : currentMethod === 'DEBITO' || currentMethod === 'CREDITO' ? 'TEF' : 'MANUAL',
      status: 'CONFIRMADO'
    };

    const nextPayments = [...payments, newPayment];
    setPayments(nextPayments);

    const nextTotalPaid = nextPayments.reduce((acc, p) => acc + p.amount, 0);
    const newRemaining = Math.max(0, total - nextTotalPaid);

    if (newRemaining > 0) {
      setPaymentAmountInput(newRemaining.toFixed(2));
      setCashTendered(newRemaining);
    } else {
      // All paid! Complete sale automatically
      executeFinishSale(nextPayments);
    }
  };

  // Execute and save final sale into Database
  const executeFinishSale = (confirmedPayments: SalePayment[]) => {
    try {
      const sale = db.createSale({
        items: cart,
        subtotal,
        discount,
        surcharge,
        total,
        payments: confirmedPayments,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name
      });

      // Audio feedback: Transaction successful fanfare!
      soundService.playTransactionSuccess();

      // Prepare QR code for receipt
      const receiptUrl = `${window.location.origin}/#/comprovante/${sale.digitalReceiptId}`;
      printService.generateReceiptQrCode(receiptUrl).then(url => {
        setQrCodeUrl(url);
      });

      setCompletedSale(sale);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);

      // Reset cart
      setCart([]);
      setDiscount(0);
      setSurcharge(0);
      setSelectedCustomer(null);
      setPayments([]);

      // Auto print if configured
      // window.print() can be triggered here if user wants
    } catch (err: any) {
      soundService.playScanError();
      setErrorMessage(err.message || 'Erro ao processar a venda.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Banner Alert if Caixa Closed */}
      {!currentSession && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-6 py-2 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400 animate-pulse" />
            <span>CAIXA FECHADO: É necessário abrir uma sessão de caixa para realizar vendas.</span>
          </div>
          <button
            onClick={() => onNavigate('cash')}
            className="px-3 py-1 bg-rose-500 hover:bg-rose-400 text-neutral-950 rounded font-bold cursor-pointer transition-colors"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Main PDV Layout: Left Side (Products Catalog & Barcode) | Right Side (Cart & Totals) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* LEFT COLUMN: Fast Search, Barcode & Quick Categories (7 cols) */}
        <div className="col-span-7 border-r border-neutral-800 flex flex-col p-4 bg-neutral-900/40 overflow-hidden">
          {/* Barcode & Search Input Bar with Quick Sale Launcher */}
          <div className="flex items-center gap-2 mb-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <div className="flex items-center bg-neutral-900 border-2 border-amber-500/80 rounded-xl px-4 py-2.5 shadow-lg focus-within:border-amber-400 transition-colors">
                <Barcode className="text-amber-400 mr-3 shrink-0" size={24} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Passe o leitor de código de barras ou digite o nome do produto..."
                  className="w-full bg-transparent text-white text-base font-medium placeholder-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Buscar
                </button>
              </div>

              {/* Instant Search Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-40 overflow-hidden max-h-72 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p, 1)}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-800/90 flex items-center justify-between border-b border-neutral-800/50 last:border-b-0 cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          {p.name}
                          {p.isCombo && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              COMBO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono">
                          EAN: {p.barcode} · Estoque: {p.currentStock} {p.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold font-mono text-base">
                          R$ {p.salePrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-neutral-500">Clique ou Enter</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Quick Sale / Bipagem Contínua Button */}
            <button
              type="button"
              onClick={() => setIsQuickSaleOpen(true)}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
              title="Venda Rápida · Bipagem Contínua de Alta Velocidade (F1)"
            >
              <Zap size={16} className="fill-neutral-950 animate-pulse" />
              <span className="hidden sm:inline">Venda Rápida (F1)</span>
              <span className="sm:hidden font-mono">F1</span>
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-900/60 border border-neutral-800 rounded-lg px-3 py-1.5 mb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsQuickSaleOpen(true)}
                className="flex items-center gap-1 text-amber-400 font-bold hover:underline cursor-pointer"
              >
                <kbd className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[10px] text-amber-300 font-mono">F1</kbd>
                <span>Venda Rápida</span>
              </button>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-amber-300 font-mono">F2</kbd>
                <span>Busca</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-amber-300 font-mono">F3</kbd>
                <span>Cliente</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-amber-300 font-mono">F4</kbd>
                <span>Desconto</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-amber-300 font-mono">F5</kbd>
                <span>Pagar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-amber-300 font-mono">F6</kbd>
                <span>Suspender</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Real-time Connection & Offline Sync Status */}
              <OfflineSyncControl />

              {suspendedSales.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSuspendedModalOpen(true)}
                  className="text-amber-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>F7: {suspendedSales.length} Suspensa(s)</span>
                </button>
              )}

              {/* Audio Feedback Status & Quick Tester Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isAudioMuted
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    : 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/80 shadow-sm'
                }`}
                title="Configurações e Testes de Feedback Sonoro (Bip de Leitura, Alerta de Erro e Venda Concluída)"
              >
                {isAudioMuted ? (
                  <VolumeX size={14} className="text-neutral-400" />
                ) : (
                  <Volume2 size={14} className="text-emerald-400 animate-pulse" />
                )}
                <span className="hidden sm:inline font-mono text-[11px]">
                  {isAudioMuted ? 'Mudo' : 'Bip Áudio: Ativo'}
                </span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Quick Beverage Grid (Most Sold / Favorites in Adega) */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-xs font-bold text-neutral-400 mb-2 flex items-center justify-between">
              <span>PRODUTOS MAIS VENDIDOS &amp; COMBOS</span>
              <span className="text-[10px] text-neutral-500">Toque ou clique para adicionar</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {products.slice(0, 15).map(prod => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod, 1)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all hover:border-amber-500/60 active:scale-[0.98] cursor-pointer ${
                    prod.isCombo
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                        {prod.brand}
                      </span>
                      {prod.isCombo && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded font-bold">
                          KIT
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-2 leading-snug">
                      {prod.name}
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-amber-400 font-mono font-bold text-sm">
                      R$ {prod.salePrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Estq: {prod.currentStock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cart, Totals & Checkout (5 cols) */}
        <div className="col-span-5 flex flex-col bg-neutral-950 p-4 overflow-hidden">
          {/* Customer Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Cliente:</span>
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400">{selectedCustomer.name}</span>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-neutral-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-neutral-500 italic">Consumidor Final (Balcão)</span>
              )}
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>{selectedCustomer ? 'Alterar (F3)' : 'Identificar (F3)'}</span>
            </button>
          </div>

          {/* Cart Table Header */}
          <div className="grid grid-cols-12 text-[11px] font-bold text-neutral-500 uppercase pb-2 border-b border-neutral-800 px-1">
            <div className="col-span-6">Item / Descrição</div>
            <div className="col-span-3 text-center">Qtd</div>
            <div className="col-span-3 text-right">Subtotal</div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 pr-1 py-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500">
                <Receipt size={40} className="mb-2 opacity-30 text-amber-400" />
                <p className="text-sm font-semibold text-neutral-400">Caixa Pronto para Nova Venda</p>
                <p className="text-xs text-neutral-500 mt-1">Bipe um produto ou pressione F2 para buscar</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-12 items-center py-2.5 px-1 hover:bg-neutral-900/60 rounded-lg group transition-colors"
                >
                  <div className="col-span-6 pr-2">
                    <div className="text-xs font-semibold text-neutral-200 line-clamp-1">
                      {item.productName}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      R$ {item.unitPrice.toFixed(2)} cada
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateItemQty(item.productId, -1)}
                      className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItemQty(item.productId, 1)}
                      className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Item Subtotal & Delete */}
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <span className="font-mono font-bold text-xs text-white">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-neutral-600 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotals & Discounts Panel */}
          <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} itens):</span>
              <span className="font-mono font-semibold text-white">R$ {subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Desconto aplicado:</span>
                <span className="font-mono font-semibold">-R$ {discount.toFixed(2)}</span>
              </div>
            )}

            {surcharge > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Acréscimo:</span>
                <span className="font-mono font-semibold">+R$ {surcharge.toFixed(2)}</span>
              </div>
            )}

            {/* Total Highlight */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 mt-2 flex items-baseline justify-between shadow-inner">
              <span className="text-sm font-bold text-neutral-300">TOTAL A PAGAR</span>
              <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                R$ {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={clearSale}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 text-xs font-semibold border border-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Cancelar (ESC)
            </button>

            <button
              onClick={() => setIsDiscountModalOpen(true)}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Desconto (F4)
            </button>

            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 disabled:opacity-40 transition-all cursor-pointer"
            >
              <span>Pagar (F5)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: Customer Selection (F3) */}
      {/* ---------------------------------------------------- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus size={18} className="text-amber-400" />
                <span>Identificar Cliente na Venda</span>
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{c.name}</div>
                    <div className="text-xs text-neutral-400 font-mono">
                      CPF: {c.cpf || 'Não informado'} · Tel: {c.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-400">Fiado em Aberto:</div>
                    <div className={`text-xs font-mono font-bold ${c.creditBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      R$ {c.creditBalance.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
              <span>Ou prossiga sem identificação para venda balcão.</span>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsCustomerModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
              >
                Balcão Anônimo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Discount & Surcharge (F4) */}
      {/* ---------------------------------------------------- */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Desconto &amp; Acréscimo (F4)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Desconto em Reais (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discount || ''}
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-amber-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Acréscimo / Taxa em Reais (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={surcharge || ''}
                  onChange={e => setSurcharge(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:border-amber-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs uppercase"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Payment Checkout (F5) with Real PIX & TEF */}
      {/* ---------------------------------------------------- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div>
                <h3 className="text-lg font-black text-white">Finalização de Pagamento (F5)</h3>
                <p className="text-xs text-neutral-400">
                  {store.name} · {currentSession?.cashRegisterNumber}
                </p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Total Summary */}
            <div className="grid grid-cols-3 gap-3 my-4 shrink-0">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 font-bold uppercase">Total Venda</div>
                <div className="text-lg font-mono font-bold text-white">R$ {total.toFixed(2)}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 font-bold uppercase">Já Pago</div>
                <div className="text-lg font-mono font-bold text-emerald-400">R$ {totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div className="text-[10px] text-neutral-500 font-bold uppercase">Restante</div>
                <div className="text-lg font-mono font-bold text-amber-400">R$ {remainingToPay.toFixed(2)}</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-6 gap-2 mb-4 shrink-0">
              {[
                { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                { id: 'PIX', label: 'PIX', icon: QrCode },
                { id: 'DEBITO', label: 'Débito', icon: CreditCard },
                { id: 'CREDITO', label: 'Crédito', icon: CreditCard },
                { id: 'VOUCHER', label: 'Voucher', icon: Receipt },
                { id: 'FIADO', label: 'Fiado', icon: UserPlus }
              ].map(method => {
                const Icon = method.icon;
                const isSelected = currentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      setCurrentMethod(method.id as PaymentMethod);
                      setPaymentAmountInput(remainingToPay.toFixed(2));
                    }}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md'
                        : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 border-neutral-700/60'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[11px] leading-tight">{method.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input Value for Payment Method */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Valor a lançar em {currentMethod} (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmountInput}
                    onChange={e => setPaymentAmountInput(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono text-xl font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {currentMethod === 'DINHEIRO' && (
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Valor Entregue pelo Cliente (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashTendered || ''}
                      onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono text-xl font-bold focus:border-amber-400 focus:outline-none"
                      placeholder={paymentAmountInput}
                    />
                    {changeDue > 0 && (
                      <div className="mt-1.5 text-xs text-emerald-400 font-bold font-mono">
                        Troco a Devolver: R$ {changeDue.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PIX Dynamic QR Code Preview */}
              {currentMethod === 'PIX' && (
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center gap-4">
                  {pixData ? (
                    <>
                      <img
                        src={pixData.qrCodeDataUrl}
                        alt="PIX QR Code"
                        className="w-32 h-32 rounded-lg bg-white p-1 shrink-0"
                      />
                      <div className="text-xs space-y-2 overflow-hidden">
                        <div className="font-bold text-amber-400">QR Code PIX Banco Central Gerado</div>
                        <p className="text-neutral-400">
                          Aponte o app do banco ou copie a chave Pix Copia e Cola:
                        </p>
                        <input
                          readOnly
                          value={pixData.payload}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-[10px] font-mono text-neutral-300"
                        />
                        <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>Simulação de Webhook ativa: aguardando liquidação</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-neutral-400">
                      Clique no botão "Confirmar Pagamento" para gerar o QR Code oficial de cobrança PIX.
                    </div>
                  )}
                </div>
              )}

              {/* TEF Info / Card Fallback */}
              {(currentMethod === 'DEBITO' || currentMethod === 'CREDITO') && tefMessage && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block">Status TEF:</span>
                    <span>{tefMessage}</span>
                  </div>
                </div>
              )}

              {/* Payments Registered in this Sale */}
              {payments.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-neutral-400 mb-2">Formas já lançadas:</div>
                  <div className="space-y-1.5">
                    {payments.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex justify-between items-center text-xs"
                      >
                        <span className="font-semibold text-white">{p.method}</span>
                        <div className="font-mono text-emerald-400 font-bold">
                          R$ {p.amount.toFixed(2)}
                          {p.change ? ` (Troco: R$ ${p.change.toFixed(2)})` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom CTA */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>

              <button
                onClick={handleAddPayment}
                disabled={isProcessingPix}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Pagamento ({remainingToPay <= 0 ? 'Concluir' : 'Lançar'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Thermal Receipt & Digital Coupon (58mm/80mm) */}
      {/* ---------------------------------------------------- */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <h3 className="text-base font-bold text-white">Venda #{completedSale.saleNumber} Concluída!</h3>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Printable Thermal Receipt Box */}
            <div className="flex-1 overflow-y-auto my-4 bg-white text-black p-4 rounded-xl shadow font-mono text-xs select-text">
              <div id="thermal-receipt" className={`mx-auto ${store.thermalWidth === '58mm' ? 'receipt-58mm' : 'receipt-80mm'}`}>
                {/* Logo & Header */}
                <div className="text-center pb-2 border-b border-dashed border-neutral-400 mb-2">
                  <div className="flex justify-center mb-1">
                    <BrandLogo variant="mono" />
                  </div>
                  <div className="font-bold text-sm tracking-wide">{store.tradeName}</div>
                  <div>CNPJ: {store.cnpj}</div>
                  <div className="text-[10px]">{store.address}</div>
                  <div className="text-[10px]">Tel/WhatsApp: {store.phone}</div>
                </div>

                <div className="flex justify-between pb-1 text-[11px]">
                  <span>CUPOM NÃO FISCAL #{completedSale.saleNumber}</span>
                  <span>{new Date(completedSale.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-dashed border-neutral-400 text-[10px]">
                  <span>HORA: {new Date(completedSale.createdAt).toLocaleTimeString('pt-BR')}</span>
                  <span>OP: {completedSale.cashierName.split(' ')[0]}</span>
                </div>

                {/* Items */}
                <div className="py-2 space-y-1.5 border-b border-dashed border-neutral-400">
                  {completedSale.items.map((it, idx) => (
                    <div key={idx} className="leading-tight">
                      <div className="font-bold">
                        {String(idx + 1).padStart(2, '0')}. {it.productName}
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>{it.quantity} un x R$ {it.unitPrice.toFixed(2)}</span>
                        <span className="font-bold">R$ {it.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>R$ {completedSale.subtotal.toFixed(2)}</span>
                  </div>
                  {completedSale.discount > 0 && (
                    <div className="flex justify-between">
                      <span>DESCONTO:</span>
                      <span>-R$ {completedSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {completedSale.surcharge > 0 && (
                    <div className="flex justify-between">
                      <span>ACRÉSCIMO:</span>
                      <span>+R$ {completedSale.surcharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black pt-1">
                    <span>TOTAL:</span>
                    <span>R$ {completedSale.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payments */}
                <div className="py-2 border-b border-dashed border-neutral-400">
                  <div className="font-bold mb-1 text-[11px]">FORMAS DE PAGAMENTO:</div>
                  {completedSale.payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{p.method}:</span>
                      <span>R$ {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* QR Code and Digital Receipt */}
                <div className="pt-3 text-center">
                  {qrCodeUrl && (
                    <div className="flex justify-center mb-2">
                      <img src={qrCodeUrl} alt="Comprovante QR" className="w-24 h-24" />
                    </div>
                  )}
                  <div className="text-[10px] font-bold">COMPROVANTE DIGITAL</div>
                  <div className="text-[10px] break-all">{completedSale.digitalReceiptId}</div>
                  <div className="text-[9px] mt-2 italic text-neutral-600">
                    {store.receiptFooter || 'Obrigado pela preferência! Volte sempre!'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for receipt */}
            <div className="pt-3 border-t border-neutral-800 flex gap-2 shrink-0">
              <button
                onClick={() => printService.printReceipt()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={16} />
                <span>Imprimir Cupom ({store.thermalWidth})</span>
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/#/comprovante/${completedSale.digitalReceiptId}`;
                  const zapMsg = `Olá! Segue o comprovante da sua compra na ${store.tradeName}: ${url}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(zapMsg)}`, '_blank');
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 size={16} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Suspended Sales (F7) */}
      {/* ---------------------------------------------------- */}
      {isSuspendedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                <span>Vendas Suspensas no Caixa (F7)</span>
              </h3>
              <button onClick={() => setIsSuspendedModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
              {suspendedSales.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  Nenhuma venda suspensa no momento.
                </div>
              ) : (
                suspendedSales.map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">
                        {s.cart.length} itens · {s.customer ? s.customer.name : 'Cliente Balcão'}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        Horário: {s.time} · Total: R$ {s.cart.reduce((a, b) => a + b.subtotal, 0).toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreSuspendedSale(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
                    >
                      Recuperar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Sale / Bipagem Express Modal */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        onAddToCart={(product, qty) => addToCart(product, qty)}
        onAddAndCheckout={(product, qty) => {
          addToCart(product, qty);
          setTimeout(() => {
            openPaymentModal();
          }, 80);
        }}
        products={products}
        currentCartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        currentCartTotal={total}
      />

      {/* Audio Feedback Settings & Sound Tester Modal */}
      {isAudioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Volume2 size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Feedback Sonoro do PDV
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ALTA VELOCIDADE
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Sons sintetizados via Web Audio API para operação contínua sem desviar o olhar da mercadoria.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* General Toggle & Volume */}
              <div className="bg-neutral-950/60 border border-neutral-800 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Status dos Sons do PDV</div>
                    <div className="text-xs text-neutral-400">
                      {isAudioMuted ? 'Áudio desativado (silencioso)' : 'Áudio ativo para bips, alertas de erro e pagamentos'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                      isAudioMuted
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-950/40'
                    }`}
                  >
                    {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    <span>{isAudioMuted ? 'Ativar Sons' : 'Sons Ativados'}</span>
                  </button>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Volume1 size={15} className="text-neutral-400" />
                      <span>Volume Geral do Terminal</span>
                    </span>
                    <span className="font-mono text-amber-400">{Math.round(audioVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                    disabled={isAudioMuted}
                    className="w-full accent-amber-500 h-2 bg-neutral-800 rounded-lg cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Audio Test Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Testar Alertas Sonoros
                </div>

                {/* 1. Scan Success */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between hover:border-neutral-700 transition-colors">
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>1. Bip de Leitura com Sucesso</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 leading-tight">
                      Bip agudo curto (1760Hz). Confirma que o produto foi lido pelo leitor e inserido no carrinho.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => soundService.playScanSuccess()}
                    className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Volume2 size={14} />
                    <span>Testar Bip</span>
                  </button>
                </div>

                {/* 2. Scan Error Alert */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between hover:border-neutral-700 transition-colors">
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>2. Alerta de Falha / Código Não Encontrado</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 leading-tight">
                      Buzzer grave discordante em pulso duplo. Alerta instantaneamente que o produto não foi encontrado ou está sem estoque.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => soundService.playScanError()}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Bell size={14} />
                    <span>Testar Erro</span>
                  </button>
                </div>

                {/* 3. Transaction Success */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between hover:border-neutral-700 transition-colors">
                  <div className="space-y-0.5 max-w-[70%]">
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>3. Conclusão de Venda &amp; Pagamento</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 leading-tight">
                      Fanfarra harmônica ascendente (C5-E5-G5-C6). Confirma recebimento total e emissão de comprovante.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => soundService.playTransactionSuccess()}
                    className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Volume2 size={14} />
                    <span>Testar Venda</span>
                  </button>
                </div>
              </div>

              {/* Cashier Tip */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300/90 leading-relaxed">
                💡 <strong>Dica de Operação:</strong> Com os alertas sonoros ativados, você pode escanear garrafas e fardos em sequência rápida. Se ouvir o buzzer grave, pare e verifique o último item antes de continuar.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAudioModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
