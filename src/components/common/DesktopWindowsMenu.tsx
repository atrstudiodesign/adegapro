import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Boxes,
  DollarSign,
  LayoutDashboard,
  MonitorUp,
  Package,
  PanelTopOpen,
  Receipt,
  ShoppingCart,
  Users,
  Wallet
} from 'lucide-react';
import type { User } from '../../types';
import { isDesktopRuntime, openDesktopModule, type DesktopModule } from '../../services/desktopWindows';

type WindowOption = {
  id: DesktopModule;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission?: string;
  cashier?: boolean;
};

const OPTIONS: WindowOption[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'PDV completo', icon: ShoppingCart, permission: 'sales.create', cashier: true },
  { id: 'customer-display', label: 'Tela do cliente', icon: MonitorUp, cashier: true },
  { id: 'sales', label: 'Vendas e cupons', icon: Receipt, permission: 'sales.view', cashier: true },
  { id: 'cash', label: 'Caixa e sessões', icon: Wallet, permission: 'cash.view', cashier: true },
  { id: 'products', label: 'Produtos', icon: Package, permission: 'products.view', cashier: true },
  { id: 'stock', label: 'Estoque', icon: Boxes, permission: 'inventory.view' },
  { id: 'finance', label: 'Financeiro', icon: DollarSign, permission: 'finance.view' },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, permission: 'reports.view' }
];

interface DesktopWindowsMenuProps {
  currentUser: User;
  compact?: boolean;
}

export const DesktopWindowsMenu: React.FC<DesktopWindowsMenuProps> = ({ currentUser, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!isDesktopRuntime()) return null;

  const isAdmin = currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'SUPER_ADMIN';
  const options = OPTIONS.filter(option => {
    if (currentUser.role === 'CAIXA') return option.cashier;
    if (!option.permission || isAdmin) return true;
    return currentUser.permissions.includes(option.permission as never);
  });

  const launch = async (module: DesktopModule) => {
    setError('');
    try {
      await openDesktopModule(module);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir a janela.');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="Abrir módulos em janelas separadas"
        title="Abrir módulos em janelas separadas"
        className={compact
          ? 'w-10 h-10 rounded-xl border border-neutral-700 bg-[#0d1217] text-neutral-200 grid place-items-center hover:border-amber-400/60'
          : 'h-10 px-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 flex items-center gap-2 text-[10px] font-black hover:border-amber-400/60'}
      >
        <PanelTopOpen size={15}/>
        {!compact && <span className="hidden xl:inline">Janelas</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[100] w-[min(92vw,340px)] rounded-2xl border border-neutral-700 bg-[#0b0f13] shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800">
            <div className="text-sm font-black text-white">Abrir em outra janela</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Use módulos lado a lado ou em outro monitor.</div>
          </div>
          <div className="p-2 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {options.map(option => {
              const Icon = option.icon;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => void launch(option.id)}
                  className="min-h-20 p-3 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-amber-500/50 text-left text-neutral-200"
                >
                  <Icon size={18} className="text-amber-400"/>
                  <span className="block text-[11px] font-black mt-2">{option.label}</span>
                </button>
              );
            })}
          </div>
          {error && <div className="mx-2 mb-2 p-2 rounded-lg border border-rose-800 bg-rose-950/40 text-[10px] text-rose-300">{error}</div>}
        </div>
      )}
    </div>
  );
};
