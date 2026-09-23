import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { User, CashSession } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { PinAuthModal } from '../common/PinAuthModal';
import { OfflineSyncControl } from '../common/OfflineSyncControl';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ShoppingCart, UserCheck, Bell, Store as StoreIcon, Lock } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User;
  onUserChanged: (user: User) => void;
  currentSession?: CashSession;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  currentUser,
  onUserChanged,
  currentSession,
  onLock
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const store = db.getStore();

  useEffect(() => {
    const notifs = db.getNotifications();
    setUnreadNotifications(notifs.filter(n => !n.read).length);
  }, [currentTab]);

  return (
    <header className="h-16 px-6 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Zone 1: Single element Brand & Store name */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center text-left focus-visible:outline-none"
        >
          <BrandLogo size="sm" variant="full" />
        </button>
        <span className="hidden md:inline-block text-neutral-600">/</span>
        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
          <StoreIcon size={14} className="text-amber-400" />
          <span className="text-neutral-200 font-medium">{store.name}</span>
          <span className="text-neutral-600">·</span>
          <span>CNPJ {store.cnpj}</span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Fast contextual stats */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-neutral-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">Caixa Atual:</span>
          {currentSession ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {currentSession.cashRegisterNumber} (Aberto)
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Caixa Fechado
            </span>
          )}
        </div>
        <span className="text-neutral-700">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500">Operador:</span>
          <span className="text-neutral-200 font-medium">{currentUser.name.split(' ')[0]}</span>
          <span className="text-neutral-500 font-mono text-[10px]">({currentUser.role})</span>
        </div>
      </div>

      {/* Zone 3: 1-2 Primary Action Buttons */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Offline Sync Status & Service Worker Connection Controller */}
        <OfflineSyncControl />

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Rapid POS Switch CTA */}
        {currentTab !== 'pos' ? (
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95"
          >
            <ShoppingCart size={15} />
            <span>Frente de Caixa (PDV)</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate(currentUser.role === 'CAIXA' ? 'minidash' : 'dashboard')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors border border-neutral-700 cursor-pointer"
          >
            <span>{currentUser.role === 'CAIXA' ? 'Mini Dash do Caixa' : 'Retornar ao Painel'}</span>
          </button>
        )}

        {/* Quick User / Role Switcher for instant testing */}
        <div className="relative">
          <select
            value={currentUser.id}
            onChange={e => {
              const selected = db.getUsers().find(u => u.id === e.target.value);
              if (selected) {
                db.setCurrentUser(selected);
                onUserChanged(selected);
              }
            }}
            className="bg-neutral-800/90 hover:bg-neutral-800 text-neutral-200 text-xs rounded-xl px-2.5 py-2 border border-neutral-700/80 focus:outline-none focus:border-amber-400 cursor-pointer font-medium max-w-[140px] sm:max-w-none"
            title="Alternar perfil de usuário (Super Admin / Frente de Caixa)"
          >
            {db.getUsers().map(u => (
              <option key={u.id} value={u.id} className="bg-neutral-900 text-white">
                {u.name} ({u.role === 'ADMINISTRADOR' ? 'Super Admin' : u.role === 'CAIXA' ? 'Frente Caixa' : u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Change Cashier / User via PIN */}
        <button
          onClick={() => setShowPinModal(true)}
          title="Autenticar por PIN de 4 dígitos"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs border border-neutral-700/60 transition-colors cursor-pointer"
        >
          <UserCheck size={14} className="text-amber-400" />
          <span className="font-mono font-bold">PIN</span>
        </button>

        {/* Lock Terminal / Frente da Tela */}
        {onLock && (
          <button
            onClick={onLock}
            title="Bloquear Terminal / Frente da Tela (ADEGA PRO)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/80 hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400 text-xs border border-neutral-700/60 hover:border-amber-500/40 transition-colors cursor-pointer"
          >
            <Lock size={14} />
            <span className="hidden sm:inline text-[11px] font-semibold">Bloquear</span>
          </button>
        )}

        {/* Quick Notifications Indicator */}
        <button
          onClick={() => onNavigate('products')}
          title="Ver alertas de estoque"
          className="relative p-2 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <Bell size={16} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
      </div>

      <PinAuthModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={(user) => onUserChanged(user)}
        title="Troca Rápida de Operador"
        description="Digite seu PIN de 4 dígitos para assumir a sessão do terminal"
      />
    </header>
  );
};
