import React,{useEffect,useState} from 'react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import { User,CashSession } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { OfflineSyncControl } from '../common/OfflineSyncControl';
import { PWAInstallButton } from '../common/PWAInstallButton';
import {
  ShoppingCart,Bell,Store as StoreIcon,Lock,Menu,Moon,Sun,Zap,
  Grid3X3,ChevronDown
} from 'lucide-react';

interface HeaderProps{
  currentTab:string;
  onNavigate:(tab:string)=>void;
  currentUser:User;
  onUserChanged:(user:User)=>void;
  currentSession?:CashSession;
  onLock?:()=>void;
  onMenuToggle?:()=>void;
  appMode?:AppMode;
}

export const Header:React.FC<HeaderProps>=({
  currentTab,onNavigate,currentUser,currentSession,onLock,onMenuToggle,appMode='DEMO'
})=>{
  const[unreadNotifications,setUnreadNotifications]=useState(0);
  const[hrAlerts,setHrAlerts]=useState<any>({pending_total:0,due_today:0,overdue:0,urgent:0,items:[]});
  const[store,setStore]=useState(()=>db.getStore());
  const[theme,setTheme]=useState<'dark'|'light'>(()=>localStorage.getItem('adega_pro_theme')==='light'?'light':'dark');
  const isPos=currentTab==='pos'||currentTab==='minidash';

  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('adega_pro_theme',theme);},[theme]);
  useEffect(()=>{
    let alive=true;
    let timer:number|undefined;
    const load=async()=>{
      if(appMode==='PRODUCTION'){
        try{
          const [s,products,expiry]=await Promise.all([productionDb.getStore(),productionDb.getProducts(),productionDb.getExpiryAlerts(30)]);
          if(!alive)return;
          setStore(s);
          setUnreadNotifications(products.filter(p=>!p.isCombo&&p.currentStock<=p.minStock).length+expiry.length);
          if(['ADMINISTRADOR','GERENTE'].includes(currentUser.role)){
            const alerts=await productionDb.getHrAlerts().catch(()=>({pending_total:0,due_today:0,overdue:0,urgent:0,items:[]}));
            if(alive)setHrAlerts(alerts);
          }else if(alive){
            setHrAlerts({pending_total:0,due_today:0,overdue:0,urgent:0,items:[]});
          }
        }catch{
          if(alive)setUnreadNotifications(1);
        }
      }else{
        setStore(db.getStore());
        setUnreadNotifications(db.getNotifications().filter(n=>!n.read).length);
        setHrAlerts({pending_total:0,due_today:0,overdue:0,urgent:0,items:[]});
      }
    };
    void load();
    if(appMode==='PRODUCTION'&&['ADMINISTRADOR','GERENTE'].includes(currentUser.role)){
      timer=window.setInterval(()=>void load(),60000);
    }
    return()=>{alive=false;if(timer)window.clearInterval(timer);};
  },[currentTab,appMode,currentUser.role]);

  const navClass=(active:boolean)=>`h-11 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-black whitespace-nowrap transition-all ${active?'bg-amber-400 border-amber-300 text-neutral-950 shadow-[0_0_22px_rgba(250,204,21,.16)]':'bg-[#0d1217] border-neutral-700 text-neutral-200 hover:border-neutral-500'}`;
  const initials=currentUser.name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'OP';
  const openMiniPdv=()=>{
    if(currentTab!=='pos') onNavigate('pos');
    window.setTimeout(()=>window.dispatchEvent(new CustomEvent('adega:open-mini-pdv')),currentTab==='pos'?0:80);
  };

  if(isPos){
    const topAlert=hrAlerts?.items?.[0];
    const hrPending=Number(hrAlerts?.pending_total||0);
    return <div className="sticky top-0 z-40">
      <header className="min-h-16 px-3 sm:px-5 bg-[#070b0f] border-b border-neutral-800 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,.28)]">
      <button onClick={onMenuToggle} aria-label="Abrir funcionalidades" className="w-10 h-10 rounded-xl text-neutral-200 grid place-items-center hover:bg-neutral-900 shrink-0"><Menu size={22}/></button>
      <button onClick={()=>onNavigate('dashboard')} className="shrink-0"><BrandLogo size="sm" variant="full"/></button>

      <div className="hidden md:flex items-center gap-2 ml-4">
        <button onClick={()=>onNavigate('pos')} className={navClass(currentTab==='pos')}><ShoppingCart size={15}/>PDV Completo</button>
        <button onClick={openMiniPdv} className={navClass(false)}><Zap size={15}/>Mini PDV Rápido</button>
        <button onClick={onMenuToggle} className={navClass(false)}><Grid3X3 size={15}/>Funcionalidades<ChevronDown size={13}/></button>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button onClick={()=>hrPending>0?onNavigate('hr'):onNavigate('dashboard')} title={hrPending>0?hrPending+' pendência(s) do RH':unreadNotifications?unreadNotifications+' alerta(s)':'Sem alertas'} className="relative w-10 h-10 rounded-xl text-neutral-300 grid place-items-center hover:bg-neutral-900">
          <Bell size={18}/>
          {(unreadNotifications+hrPending)>0&&<span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-black grid place-items-center">{(unreadNotifications+hrPending)>9?'9+':unreadNotifications+hrPending}</span>}
        </button>

        <button onClick={()=>onNavigate('store-profile')} className="hidden lg:flex h-11 min-w-48 px-3 rounded-xl border border-neutral-700 bg-[#0d1217] items-center gap-3 text-left">
          <StoreIcon size={17} className="text-neutral-300"/>
          <div className="min-w-0 flex-1"><div className="text-[9px] text-neutral-500">Loja Atual</div><div className="text-xs font-bold truncate">{store.tradeName||store.name}</div></div>
          <ChevronDown size={14} className="text-neutral-500"/>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 grid place-items-center text-xs font-black">{initials}</span>
          <span className="hidden xl:block text-left"><span className="block text-xs font-black">{currentUser.name}</span><span className="block text-[10px] text-neutral-400">Operador PDV</span></span>
        </div>
        {onLock&&<button onClick={onLock} title="Abrir tela de bloqueio" className="h-10 px-3 rounded-xl border border-neutral-700 bg-[#0d1217] text-neutral-200 flex items-center gap-2 text-[10px] font-black hover:border-amber-400/60"><Lock size={14}/><span className="hidden lg:inline">Tela de bloqueio</span></button>}
      </div>

      <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 grid grid-cols-3 gap-2 p-2 rounded-2xl bg-[#090d11]/95 border border-neutral-700 shadow-2xl backdrop-blur">
        <button onClick={()=>onNavigate('pos')} className={navClass(currentTab==='pos')}><ShoppingCart size={14}/><span className="hidden min-[420px]:inline">PDV</span></button>
        <button onClick={openMiniPdv} className={navClass(false)}><Zap size={14}/><span className="hidden min-[420px]:inline">Mini PDV</span></button>
        <button onClick={onMenuToggle} className={navClass(false)}><Grid3X3 size={14}/><span className="hidden min-[420px]:inline">Funções</span></button>
      </div>
      </header>
      {hrPending>0&&['ADMINISTRADOR','GERENTE'].includes(currentUser.role)&&<button onClick={()=>onNavigate('hr')} className={`w-full min-h-9 px-3 sm:px-5 flex items-center gap-2 text-left border-b text-[10px] sm:text-xs font-bold ${Number(hrAlerts?.overdue||0)>0||Number(hrAlerts?.urgent||0)>0?'bg-rose-950/90 border-rose-800 text-rose-200':'bg-amber-950/90 border-amber-800 text-amber-100'}`}>
        <Bell size={13} className="shrink-0"/>
        <span className="truncate"><b>RH:</b> {hrPending} pendência(s){Number(hrAlerts?.overdue||0)>0?' · '+hrAlerts.overdue+' atrasada(s)':''}{Number(hrAlerts?.due_today||0)>0?' · '+hrAlerts.due_today+' para hoje':''}{topAlert?.title?' · '+topAlert.title:''}</span>
        <span className="ml-auto shrink-0 text-[9px] font-black">VER RH</span>
      </button>}
    </div>;
  }

  return <header className="min-h-16 px-3 sm:px-4 lg:px-6 bg-[#0a0a0a] border-b border-amber-500/10 flex items-center justify-between sticky top-0 z-30 gap-2 shadow-[0_8px_30px_rgba(0,0,0,.28)]">
    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
      <button onClick={onMenuToggle} className="w-10 h-10 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 grid place-items-center"><Menu size={18}/></button>
      <button onClick={()=>onNavigate('dashboard')}><BrandLogo size="sm" variant="full"/></button>
      <div className="hidden xl:flex items-center gap-2 text-xs text-neutral-400"><StoreIcon size={14} className="text-amber-400"/><span className="text-neutral-200 font-medium">{store.tradeName||store.name}</span><span className="text-neutral-600">·</span><span>{currentSession?currentSession.cashRegisterNumber+' aberto':'Caixa fechado'}</span></div>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={()=>onNavigate('pos')} className={navClass(false)}><ShoppingCart size={15}/><span className="hidden sm:inline">PDV Completo</span></button>
      <button onClick={openMiniPdv} className={navClass(false)}><Zap size={15}/><span className="hidden md:inline">Mini PDV Rápido</span></button>
      <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} className="w-10 h-10 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 grid place-items-center">{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>}</button>
      <div className="hidden lg:block"><OfflineSyncControl/></div><div className="hidden lg:block"><PWAInstallButton/></div>
      {onLock&&<button onClick={onLock} title="Tela de bloqueio" className="h-10 px-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-300 flex items-center gap-2 text-[10px] font-black"><Lock size={14}/><span className="hidden md:inline">Tela de bloqueio</span></button>}
    </div>
  </header>;
};