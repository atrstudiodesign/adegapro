import React from 'react';
import { db } from '../../services/db';
import { Sale, Store, SaleItem, SalePayment } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { CheckCircle2, Printer, Share2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface DigitalReceiptViewProps {
  receiptId: string;
  onBack: () => void;
}

export const DigitalReceiptView: React.FC<DigitalReceiptViewProps> = ({ receiptId, onBack }) => {
  const sale = db.getSaleByReceiptId(receiptId);
  const store = db.getStore();

  if (!sale) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Comprovante Não Encontrado</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Não foi possível localizar uma venda com o código informado: <span className="font-mono text-amber-400">{receiptId}</span>
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = window.location.href;
    const msg = `Comprovante da compra na ${store.tradeName}: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-neutral-950 py-8 px-4 flex flex-col items-center select-text">
      {/* Action Bar (Hidden on print) */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Sistema</span>
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Share2 size={14} />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Digital Receipt Card */}
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 text-neutral-200">
        {/* Header with Minimalist Logo */}
        <div className="text-center pb-4 border-b border-neutral-800">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" variant="full" />
          </div>
          <div className="text-xs text-neutral-400 mt-1">{store.address}</div>
          <div className="text-xs text-neutral-400 font-mono">CNPJ: {store.cnpj} · Tel: {store.phone}</div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Comprovante de Compra Concluída (#{sale.saleNumber})</span>
        </div>

        {/* Date & Cashier Details */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs py-2 border-b border-neutral-800/80 font-mono">
          <div>
            <span className="text-neutral-500 block text-[10px]">DATA E HORA</span>
            <span className="text-white">{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>
          </div>
          <div className="text-right">
            <span className="text-neutral-500 block text-[10px]">OPERADOR</span>
            <span className="text-white">{sale.cashierName.split(' ')[0]}</span>
          </div>
        </div>

        {/* Purchased Items Table */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Itens Adquiridos</div>
          <div className="divide-y divide-neutral-800/80">
            {sale.items.map((item: SaleItem, idx: number) => (
              <div key={idx} className="py-2.5 flex justify-between items-start text-xs">
                <div>
                  <div className="font-bold text-white leading-tight">{item.productName}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    {item.quantity} un x R$ {item.unitPrice.toFixed(2)}
                  </div>
                </div>
                <div className="font-mono font-bold text-white text-right">
                  R$ {item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 pt-3 border-t border-neutral-800 text-xs font-mono">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal:</span>
            <span>R$ {sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Desconto:</span>
              <span>-R$ {sale.discount.toFixed(2)}</span>
            </div>
          )}
          {sale.surcharge > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Acréscimo:</span>
              <span>+R$ {sale.surcharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-amber-400 pt-2 border-t border-neutral-800">
            <span>VALOR TOTAL PAGO:</span>
            <span>R$ {sale.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 space-y-1 text-xs">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            Forma de Liquidação
          </div>
          {sale.payments.map((p: SalePayment, idx: number) => (
            <div key={idx} className="flex justify-between font-mono">
              <span className="text-neutral-300">{p.method}</span>
              <span className="font-bold text-white">R$ {p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Authenticity Hash Footer */}
        <div className="text-center pt-3 border-t border-neutral-800 text-[10px] text-neutral-500 space-y-1">
          <div className="flex items-center justify-center gap-1 text-neutral-400">
            <ShieldCheck size={12} className="text-amber-400" />
            <span>ID Autêntico: {sale.digitalReceiptId}</span>
          </div>
          <div>{store.receiptFooter || 'Obrigado pela preferência! Volte sempre!'}</div>
        </div>
      </div>
    </div>
  );
};
