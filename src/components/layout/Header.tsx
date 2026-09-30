import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import { User, CashSession } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { PinAuthModal } from '../common/PinAuthModal';
import { OfflineSyncControl } from '../common/OfflineSyncControl';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ShoppingCart, UserCheck, Bell, Store as StoreIcon, Lock, Menu, Moon, Sun, Zap } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User;
  onUserChanged: (user: User) => void;
  currentSession?: CashSession;
  onLock?: () => void;
  onMenuToggle?: () => void;
  appMode?: AppMode;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,onNavigate,currentUser,onUserChanged,currentSession,onLock,onMenuToggle,appMode='DEMO'
}) => {
  const [showPinModal,setShowPinModal]=useState(false);
  const [unreadNotifications,setUnreadNotifications]=useState(0);
  const [store,setStore]=useState(()=>db.getStore());
  const [theme,setTheme]=useState<'dark'|'light'>(()=>localStorage.getItem('adega_pro_theme')==='light'?'light':'dark');

  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('adega_pro_theme',theme);},[theme]);
  useEffect(()=>{
    let alive=true;
    if(appMode==='PRODUCTION'){
      Promise.all([productionDb.getStore(),productionDb.getProducts(),productionDb.getExpiryAlerts(30)])
        .then(([s,products,expiry])=>{
          if(!alive)return;
          setStore(s);
          const low=products.filter(p=>!p.isCombo&&p.currentStock<=p.minStock).length;
          setUnreadNotifications(low+expiry.length);
        }).catch(()=>{if(alive)setUnreadNotifications(1);});
    }else{
      setStore(db.getStore());
      setUnreadNotifications(db.getNotifications().filter(n=>!n.read).length);
    }
    return()=>{alive=false};
  },[currentTab,appMode]);

  const actionClass=(active:boolean)=>`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] sm:text-xs font-black transition-all ${active?'bg-amber-500 text-neutral-950 border-amber-400':'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-500/50 hover:text-white'}`;

  return (
    <header className="min-h-16 px-3 sm:px-4 lg:px-6 bg-[#0a0a0a] border-b border-amber-500/10 flex items-center justify-between sticky top-0 z-30 gap-2 shadow-[0_8px_30px_rgba(0,0,0,.28)]">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button onClick={()=>onNavigate('dashboard')} className="flex items-center text-left focus-visible:outline-none">
          <BrandLogo size="sm" variant="full"/>
        </button>
        <span className="hidden xl:inline-block text-neutral-600">/</span>
        <div className="hidden xl:flex items-center gap-2 text-xs text-neutral-400">
          <StoreIcon size={14} className="text-amber-400"/>
          <span className="text-neutral-200 font-medium">{store.name}</span>
          <span className="text-neutral-600">·</span>
          <span>{currentSession?currentSession.cashRegisterNumber+' aberto':'Caixa fechado'}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto">
        <button onClick={()=>onNavigate('pos')} className={actionClass(currentTab==='pos')}>
          <ShoppingCart size={15}/><span className="hidden sm:inline">PDV Completo</span>
        </button>
        <button onClick={()=>onNavigate('minidash')} className={actionClass(currentTab==='minidash')}>
          <Zap size={15}/><span className="hidden sm:inline">Mini PDV Rápido</span>
        </button>
        <button onClick={onMenuToggle} className={actionClass(false)} title="Abrir funcionalidades administrativas da loja">
          <Menu size={15}/><span className="hidden md:inline">Funcionalidades</span>
        </button>

        <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} title="Alternar tema" className="w-9 h-9 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 grid place-items-center hover:text-amber-400">{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>}</button>
        <div className="hidden lg:block"><OfflineSyncControl/></div>
        <div className="hidden lg:block"><PWAInstallButton/></div>
        <button onClick={()=>setShowPinModal(true)} title="Trocar operador por PIN" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-neutral-300 text-xs border border-neutral-700">
          <UserCheck size={14} className="text-amber-400"/><span>PIN</span>
        </button>
        {onLock&&<button onClick={onLock} title="Bloquear terminal" className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 grid place-items-center hover:text-amber-400"><Lock size={14}/></button>}
        <button onClick={()=>onNavigate('dashboard')} title={unreadNotifications?unreadNotifications+' alerta(s)':'Sem alertas'} className="relative w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 grid place-items-center">
          <Bell size={15}/>
          {unreadNotifications>0&&<span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-neutral-950 text-[8px] font-black grid place-items-center">{unreadNotifications>9?'9+':unreadNotifications}</span>}
        </button>
      </div>

      <PinAuthModal
        isOpen={showPinModal}
        onClose={()=>setShowPinModal(false)}
        onSuccess={onUserChanged}
        title="Troca Rápida de Operador"
        description="Digite seu PIN de 4 dígitos para assumir a sessão do terminal"
      />
    </header>
  );
};