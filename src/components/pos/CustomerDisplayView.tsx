import React, { useEffect, useState } from 'react';
import { CheckCircle2, MonitorUp, ShoppingBasket } from 'lucide-react';
import {
  readCustomerDisplay,
  subscribeCustomerDisplay,
  type CustomerDisplaySnapshot
} from '../../services/desktopWindows';
import { BrandLogo } from '../common/BrandLogo';

const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(Number(value || 0));

export const CustomerDisplayView: React.FC = () => {
  const [initialSnapshot] = useState<CustomerDisplaySnapshot | null>(() => readCustomerDisplay());
  const [snapshot, setSnapshot] = useState<CustomerDisplaySnapshot | null>(initialSnapshot);
  const [online, setOnline] = useState(Boolean(initialSnapshot));

  useEffect(() => {
    const receive = (next: CustomerDisplaySnapshot) => {
      setSnapshot(next);
      setOnline(true);
    };
    const unsubscribe = subscribeCustomerDisplay(receive);
    const timer = window.setInterval(() => {
      const current = readCustomerDisplay();
      if (current) receive(current);
      else setOnline(false);
    }, 1_000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  const waiting = !online || !snapshot;
  const completed = !waiting && snapshot.status === 'COMPLETED';

  return (
    <main className="min-h-dvh bg-[#05080c] text-white overflow-hidden flex flex-col">
      <header className="h-20 px-6 lg:px-10 border-b border-amber-500/15 bg-[#090d11] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {snapshot?.storeLogoUrl ? (
            <img src={snapshot.storeLogoUrl} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/95 p-1"/>
          ) : (
            <BrandLogo size="sm" variant="full"/>
          )}
          <div className="hidden sm:block min-w-0">
            <div className="text-[10px] uppercase tracking-[.18em] text-neutral-500">Atendimento em andamento</div>
            <div className="font-black truncate">{snapshot?.storeName || 'ADEGA PRO'}</div>
          </div>
        </div>
        <div className={`px-3 py-2 rounded-full border text-[10px] font-black flex items-center gap-2 ${online ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-neutral-700 bg-neutral-900 text-neutral-500'}`}>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`}/>
          {online ? 'CONECTADO AO PDV' : 'AGUARDANDO PDV'}
        </div>
      </header>

      {waiting ? (
        <section className="flex-1 grid place-items-center p-8">
          <div className="text-center max-w-xl">
            <div className="w-24 h-24 mx-auto rounded-3xl border border-amber-500/30 bg-amber-500/10 grid place-items-center text-amber-400">
              <MonitorUp size={44}/>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mt-7">Pronto para atender</h1>
            <p className="mt-3 text-neutral-400 text-base sm:text-xl">Abra o PDV e adicione produtos. O pedido aparecerá nesta tela automaticamente.</p>
          </div>
        </section>
      ) : completed ? (
        <section className="flex-1 grid place-items-center p-8">
          <div className="text-center max-w-2xl">
            <div className="w-28 h-28 mx-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 grid place-items-center text-emerald-400">
              <CheckCircle2 size={58}/>
            </div>
            <div className="text-[11px] uppercase tracking-[.24em] text-emerald-400 font-black mt-7">Venda concluída</div>
            <h1 className="text-4xl sm:text-6xl font-black mt-2">Obrigado!</h1>
            <div className="text-3xl sm:text-5xl font-black text-amber-400 mt-7">{money(snapshot.total)}</div>
          </div>
        </section>
      ) : (
        <section className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-h-0 p-5 sm:p-8 lg:p-10 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBasket size={25} className="text-amber-400"/>
              <div>
                <h1 className="text-2xl font-black">Seu pedido</h1>
                <p className="text-xs text-neutral-500">Confira os itens antes de finalizar.</p>
              </div>
            </div>
            <div className="space-y-2">
              {snapshot.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)_auto] gap-4 items-center rounded-2xl border border-neutral-800 bg-[#0d1217] p-4">
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-xl font-black text-amber-400">{item.quantity}×</div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-black truncate">{item.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">{money(item.unitPrice)} cada</div>
                  </div>
                  <div className="text-lg sm:text-xl font-black">{money(item.lineTotal)}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-neutral-800 bg-[#090d11] p-6 sm:p-8 flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-[.2em] text-neutral-500 font-black">Resumo</div>
            <div className="mt-6 space-y-4 text-lg">
              <div className="flex justify-between gap-4 text-neutral-300"><span>Subtotal</span><strong>{money(snapshot.subtotal)}</strong></div>
              <div className="flex justify-between gap-4 text-emerald-400"><span>Desconto</span><strong>- {money(snapshot.discount)}</strong></div>
            </div>
            <div className="mt-7 pt-7 border-t border-neutral-800">
              <div className="text-sm text-neutral-400">Total a pagar</div>
              <div className="text-5xl lg:text-6xl font-black text-amber-400 mt-2 tracking-tight">{money(snapshot.total)}</div>
            </div>
            <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-neutral-300">
              Confira os itens e acompanhe a finalização com o atendente.
            </div>
          </aside>
        </section>
      )}
    </main>
  );
};
