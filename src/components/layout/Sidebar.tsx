import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Tags,
  Boxes,
  ClipboardList,
  Layers,
  Users,
  Truck,
  ShoppingBag,
  DollarSign,
  Wallet,
  UserCog,
  BarChart3,
  Cable,
  Settings,
  ShieldCheck,
  TrendingUp,
  Zap,
  Lock,
  Headphones,
  Store as StoreIcon
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  mobileOpen = false,
  onClose
}) => {
  const isSuperAdmin = currentUser.role === 'ADMINISTRADOR' || (currentUser.role as string) === 'SUPER_ADMIN';
  const isCaixa = currentUser.role === 'CAIXA';

  // Front-of-store cashier specific menu groups (as requested: PDV, cadastro de produtos, vendas do dia, total de saídas mini dash)
  const cashierMenuGroups = [
    {
      group: 'FRENTE DE LOJA',
      items: [
        { id: 'pos', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, highlight: true },
        { id: 'minidash', label: 'Mini Dash (Vendas & Saídas)', icon: TrendingUp },
        { id: 'sales', label: 'Vendas do Dia', icon: Receipt },
        { id: 'products', label: 'Cadastro de Produtos', icon: Package },
        { id: 'cash', label: 'Caixas & Sessões', icon: Wallet }
      ]
    }
  ];

  // Full system menu groups for Super Admin and managers
  const fullMenuGroups = [
    {
      group: 'OPERAÇÃO',
      items: [
        { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard, permission: null },
        { id: 'minidash', label: 'Mini Dash do Caixa', icon: TrendingUp, permission: null },
        { id: 'pos', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, permission: 'sales.create', highlight: true },
        { id: 'sales', label: 'Vendas & Cupons', icon: Receipt, permission: 'sales.view' },
        { id: 'cash', label: 'Caixas & Sessões', icon: Wallet, permission: 'cash.view' }
      ]
    },
    {
      group: 'CATÁLOGO & ESTOQUE',
      items: [
        { id: 'products', label: 'Produtos', icon: Package, permission: 'products.view' },
        { id: 'categories', label: 'Categorias', icon: Tags, permission: 'products.view' },
        { id: 'combos', label: 'Combos & Kits', icon: Layers, permission: 'products.view' },
        { id: 'stock', label: 'Movimentação Estoque', icon: Boxes, permission: 'inventory.view' },
        { id: 'inventory', label: 'Inventário Físico', icon: ClipboardList, permission: 'inventory.view' }
      ]
    },
    {
      group: 'RELACIONAMENTO & COMPRAS',
      items: [
        { id: 'customers', label: 'Clientes & Fiado', icon: Users, permission: null },
        { id: 'suppliers', label: 'Fornecedores', icon: Truck, permission: 'products.view' },
        { id: 'purchases', label: 'Compras & NF Entrada', icon: ShoppingBag, permission: 'products.edit' }
      ]
    },
    {
      group: 'GESTÃO & SISTEMA',
      items: [
        { id: 'finance', label: 'Financeiro & Fluxo', icon: DollarSign, permission: 'finance.view' },
        { id: 'employees', label: 'Funcionários & PINs', icon: UserCog, permission: 'employees.manage' },
        { id: 'reports', label: 'Centro de Relatórios', icon: BarChart3, permission: 'reports.view' },
        { id: 'audit', label: 'Log de Auditoria', icon: ShieldCheck, permission: 'reports.view' },
        { id: 'integrations', label: 'Integrações (PIX/TEF)', icon: Cable, permission: 'settings.edit' },
        { id: 'store-profile', label: 'Cadastro da Adega', icon: StoreIcon, permission: 'settings.edit' },
        { id: 'settings', label: 'Configurações Loja', icon: Settings, permission: 'settings.edit' },
        { id: 'support', label: 'Suporte ATR Studio', icon: Headphones, permission: null }
      ]
    }
  ];

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    return currentUser.permissions.includes(permission as any);
  };

  const activeGroups = isCaixa ? cashierMenuGroups : fullMenuGroups;

  const navigate = (tab: string) => {
    onNavigate(tab);
    onClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-[86vw] max-w-72 lg:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 overflow-y-auto select-none shadow-2xl lg:shadow-none transition-transform duration-200 ease-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      {/* Role Profile Badge Indicator */}
      <div className="p-3 mx-3 mt-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isSuperAdmin ? 'bg-amber-400 ring-2 ring-amber-400/30' : 'bg-emerald-400 ring-2 ring-emerald-400/30'
            }`}
          />
          <div className="truncate">
            <div className="text-[11px] font-extrabold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-amber-400 font-mono">
              {isSuperAdmin ? 'SUPER ADMIN (TOTAL)' : isCaixa ? 'FRENTE DE CAIXA' : currentUser.role}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {activeGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-neutral-500 tracking-wider">
              {group.group}
            </div>
            {group.items.map(item => {
              if ('permission' in item && !hasPermission(item.permission as any)) return null;
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                      : item.highlight
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-neutral-950' : item.highlight ? 'text-amber-400' : 'text-neutral-400'} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tenant Footer Info */}
      <div className="mt-auto p-4 border-t border-neutral-800/80 bg-neutral-950/60 text-[11px] text-neutral-400">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-amber-500/30 bg-neutral-900 shrink-0 shadow-sm">
            <img
              src="/adega-pro-icon.jpg"
              alt="ADEGA PRO"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="font-extrabold text-white text-xs tracking-tight">
              ADEGA <span className="text-amber-400">PRO</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">v1.0 · Frente de Loja</div>
            <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="text-[9px] text-amber-500 hover:text-amber-300">
              Desenvolvido por ATR Studio
            </a>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
};
