import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { User, CashSession } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Views
import { PosScreen } from './components/pos/PosScreen';
import { ProductionPosScreen } from './components/pos/ProductionPosScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductionDashboardView } from './components/dashboard/ProductionDashboardView';
import { CashierMiniDashView } from './components/dashboard/CashierMiniDashView';
import { ProductionCashierMiniDashView } from './components/dashboard/ProductionCashierMiniDashView';
import { ProductsView } from './components/products/ProductsView';
import { CategoriesView } from './components/categories/CategoriesView';
import { CombosView } from './components/combos/CombosView';
import { ProductionCombosView } from './components/combos/ProductionCombosView';
import { StockView } from './components/stock/StockView';
import { ProductionStockView } from './components/stock/ProductionStockView';
import { InventoryView } from './components/inventory/InventoryView';
import { ProductionInventoryView } from './components/inventory/ProductionInventoryView';
import { CashView } from './components/cash/CashView';
import { ProductionCashView } from './components/cash/ProductionCashView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { ProductionSalesHistoryView } from './components/sales/ProductionSalesHistoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { ProductionPurchasesView } from './components/purchases/ProductionPurchasesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { FinanceView } from './components/finance/FinanceView';
import { ProductionFinanceView } from './components/finance/ProductionFinanceView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductionCustomersView } from './components/customers/ProductionCustomersView';
import { EmployeesView } from './components/employees/EmployeesView';
import { ProductionEmployeesView } from './components/employees/ProductionEmployeesView';
import { ReportsView } from './components/reports/ReportsView';
import { ProductionReportsView } from './components/reports/ProductionReportsView';
import { AuditView } from './components/audit/AuditView';
import { ProductionAuditView } from './components/audit/ProductionAuditView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { ProductionIntegrationsView } from './components/integrations/ProductionIntegrationsView';
import { SettingsView } from './components/settings/SettingsView';
import { StoreProfileView } from './components/store/StoreProfileView';
import { SupportView } from './components/support/SupportView';
import { DigitalReceiptView } from './components/receipt/DigitalReceiptView';
import { LoginScreen } from './components/auth/LoginScreen';
import { ProductionOperatorLock } from './components/auth/ProductionOperatorLock';
import { CommercialAccessGate } from './components/auth/CommercialAccessGate';
import { SaasAccessScreen } from './components/auth/SaasAccessScreen';
import { AppMode, getAppMode, setAppMode } from './services/appMode';
import { supabase } from './services/supabase';
import { LegalConsentGate } from './components/legal/LegalConsentGate';
import { LegalCenter } from './components/legal/LegalCenter';
import { LegalDocKey } from './legal/legalDocuments';
import { ProductionModuleGuard } from './components/common/ProductionModuleGuard';
import { productionDb } from './services/productionDb';
import { PlatformAdminAccessScreen } from './components/admin/PlatformAdminAccessScreen';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(db.getCurrentUser());
  const [currentSession, setCurrentSession] = useState<CashSession | undefined>(db.getCurrentSession());
  const [receiptHashId, setReceiptHashId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/comprovante/')) return decodeURIComponent(path.slice('/comprovante/'.length));
    const hash = window.location.hash;
    return hash.startsWith('#/comprovante/') ? decodeURIComponent(hash.replace('#/comprovante/', '')) : null;
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [appMode, setCurrentAppMode] = useState<AppMode>(() => getAppMode());
  const [saasReady, setSaasReady] = useState(false);
  const [saasAuthenticated, setSaasAuthenticated] = useState(false);
  const [demoAccessGranted, setDemoAccessGranted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [legalCleared, setLegalCleared] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>('terms_of_use');
  const [saasEntryView, setSaasEntryView] = useState<'LANDING' | 'LOGIN' | 'REGISTER'>('LANDING');
  const [commercialCleared, setCommercialCleared] = useState(false);
  const [platformAdminRoute, setPlatformAdminRoute] = useState(() =>
    window.location.pathname === '/atr-control' || window.location.hash === '#/atr-control'
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const hasSession = Boolean(data.session);
      setSaasAuthenticated(hasSession);
      if (hasSession) {
        setAppMode('PRODUCTION');
        setCurrentAppMode('PRODUCTION');
        setLegalCleared(false);
        setCommercialCleared(false);
        setIsLocked(true);
      }
      setSaasReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const hasSession = Boolean(session);
      setSaasAuthenticated(hasSession);
      if (!hasSession) { setLegalCleared(false); setCommercialCleared(false); }
      if (!hasSession && appMode === 'PRODUCTION') {
        setSaasReady(true);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Clean public/admin routes. Legacy hash URLs are redirected to their slash equivalents.
  useEffect(() => {
    const syncRoute = () => {
      const { pathname, hash } = window.location;

      if (hash === '#/atr-control') {
        window.history.replaceState({}, '', '/atr-control');
      } else if (hash.startsWith('#/comprovante/')) {
        window.history.replaceState({}, '', hash.replace('#', ''));
      }

      const path = window.location.pathname;
      setPlatformAdminRoute(path === '/atr-control');
      setReceiptHashId(path.startsWith('/comprovante/')
        ? decodeURIComponent(path.slice('/comprovante/'.length))
        : null);
    };

    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const handleSessionUpdated = async () => {
    if (appMode === 'PRODUCTION') {
      try {
        setCurrentSession(await productionDb.getCurrentCashSession());
      } catch {
        setCurrentSession(undefined);
      }
      return;
    }
    setCurrentSession(db.getCurrentSession());
  };

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    setCurrentAppMode(mode);
    setCurrentTab('dashboard');
  };

  const handleUserChanged = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'CAIXA') {
      const allowedCaixaTabs = ['pos', 'minidash', 'products', 'sales', 'cash'];
      if (!allowedCaixaTabs.includes(currentTab)) {
        setCurrentTab('pos');
      }
    }
  };

  // Enforce access control: Caixa only sees PDV, produtos, vendas do dia, mini dash e caixa
  useEffect(() => {
    if (currentUser.role === 'CAIXA') {
      const allowedCaixaTabs = ['pos', 'minidash', 'products', 'sales', 'cash'];
      if (!allowedCaixaTabs.includes(currentTab)) {
        setCurrentTab('pos');
      }
    }
  }, [currentUser.role, currentTab]);

  if (platformAdminRoute) {
    return <PlatformAdminAccessScreen />;
  }

  if (!saasReady) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white grid place-items-center">
        <div className="text-center">
          <img src="/adega-pro-icon.jpg" alt="Adega Pro" className="w-14 h-14 rounded-2xl mx-auto mb-4 border border-amber-500/30" />
          <div className="font-black">ADEGA <span className="text-amber-400">PRO</span></div>
          <div className="text-xs text-neutral-500 mt-1">Preparando ambiente seguro...</div>
        </div>
      </div>
    );
  }

  if (!saasAuthenticated && !demoAccessGranted && !receiptHashId) {
    return (
      <SaasAccessScreen
        initialView={saasEntryView}
        onDemo={() => {
          setAppMode('DEMO');
          setCurrentAppMode('DEMO');
          setDemoAccessGranted(true);
          setIsLocked(false);
          setCurrentTab('dashboard');
          setSaasEntryView('LANDING');
        }}
        onAuthenticated={() => {
          setAppMode('PRODUCTION');
          setCurrentAppMode('PRODUCTION');
          setSaasAuthenticated(true);
          setDemoAccessGranted(false);
          setCommercialCleared(false);
          setIsLocked(true);
        }}
      />
    );
  }

  if (saasAuthenticated && appMode === 'PRODUCTION' && !legalCleared && !receiptHashId) {
    return <LegalConsentGate onAccepted={() => setLegalCleared(true)} />;
  }

  if (saasAuthenticated && appMode === 'PRODUCTION' && legalCleared && !commercialCleared && !receiptHashId) {
    return <CommercialAccessGate onAllowed={() => setCommercialCleared(true)} />;
  }

  // If a public customer opens the digital receipt URL
  if (receiptHashId) {
    return (
      <DigitalReceiptView
        receiptId={receiptHashId}
        onBack={() => {
          window.history.pushState({}, '', '/');
          setReceiptHashId(null);
        }}
      />
    );
  }

  // If screen is locked / Frente de Tela do Sistema
  if (isLocked) {
    if (appMode === 'PRODUCTION') {
      return (
        <ProductionOperatorLock
          onLogin={(user) => {
            setCurrentUser(user);
            void productionDb.getCurrentCashSession()
              .then(session => setCurrentSession(session))
              .catch(() => setCurrentSession(undefined));
            setIsLocked(false);
          }}
        />
      );
    }

    return (
      <LoginScreen
        currentSession={currentSession}
        onLogin={(user) => {
          setCurrentUser(user);
          setIsLocked(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans text-neutral-100 antialiased selection:bg-amber-500 selection:text-neutral-950 relative">
      <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden opacity-[0.025] select-none" aria-hidden="true">
        <div className="absolute inset-[-20%] grid place-items-center -rotate-12">
          <div className="text-[3vw] font-black tracking-[0.25em] whitespace-nowrap text-white">
            ADEGA PRO · CONTEÚDO PROTEGIDO · {currentUser.name} · {db.getStore().name}
          </div>
        </div>
      </div>
      {appMode === 'DEMO' && (
        <div className="bg-violet-600 text-white text-[11px] font-black tracking-[0.18em] uppercase text-center py-1.5 border-b border-violet-400/30">
          Modo Demonstração · Dados fictícios e isolados · Não altera o banco real
        </div>
      )}
      {/* Universal Top Bar */}
      <Header
        currentTab={currentTab}
        onNavigate={tab => setCurrentTab(tab)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        currentSession={currentSession}
        onLock={() => {
          if (appMode === 'PRODUCTION') void productionDb.revokeOperatorSession();
          setIsLocked(true);
        }}
        onMenuToggle={() => setMobileNavOpen(v => !v)}
        appMode={appMode}
      />

      {/* Main Workspace: Sidebar + Dynamic Module View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hide sidebar when in full-focus POS mode on smaller screens or allow instant collapse */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={tab => setCurrentTab(tab)}
          currentUser={currentUser}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <main className="app-content flex-1 min-w-0 flex flex-col overflow-hidden bg-neutral-950">
          {currentTab === 'dashboard' && (
            appMode === 'PRODUCTION' ? (
              <ProductionDashboardView onNavigate={tab => setCurrentTab(tab)} />
            ) : (
              <DashboardView
                onNavigate={tab => setCurrentTab(tab)}
                appMode={appMode}
                onChangeMode={handleModeChange}
                onRequestProduction={() => {
                  setAppMode('PRODUCTION');
                  setCurrentAppMode('PRODUCTION');
                  if (saasAuthenticated) {
                    setDemoAccessGranted(false);
                    setLegalCleared(false);
                    setIsLocked(true);
                  } else {
                    setSaasEntryView('LOGIN');
                    setDemoAccessGranted(false);
                    setIsLocked(false);
                  }
                }}
              />
            )
          )}
          {currentTab === 'minidash' && (appMode === 'PRODUCTION' ? <ProductionCashierMiniDashView onNavigate={tab => setCurrentTab(tab)} /> : <CashierMiniDashView currentUser={currentUser} currentSession={currentSession} onNavigate={tab => setCurrentTab(tab)} />)}
          {currentTab === 'pos' && (
            appMode === 'PRODUCTION' ? (
              <ProductionPosScreen
                currentUser={currentUser}
                currentSession={currentSession}
                onNavigate={tab => setCurrentTab(tab)}
              />
            ) : (
              <PosScreen
                currentUser={currentUser}
                currentSession={currentSession}
                onNavigate={tab => setCurrentTab(tab)}
              />
            )
          )}
          {currentTab === 'sales' && (appMode === 'PRODUCTION' ? <ProductionSalesHistoryView /> : <SalesHistoryView currentUser={currentUser} />)}
          {currentTab === 'products' && <ProductsView appMode={appMode} />}
          {currentTab === 'categories' && <CategoriesView appMode={appMode} />}
          {currentTab === 'combos' && (appMode === 'PRODUCTION' ? <ProductionCombosView /> : <CombosView />)}
          {currentTab === 'stock' && (appMode === 'PRODUCTION' ? <ProductionStockView /> : <StockView />)}
          {currentTab === 'inventory' && (appMode === 'PRODUCTION' ? <ProductionInventoryView /> : <InventoryView />)}
          {currentTab === 'cash' && (
            appMode === 'PRODUCTION' ? (
              <ProductionCashView
                currentUser={currentUser}
                currentSession={currentSession}
                onSessionUpdated={handleSessionUpdated}
              />
            ) : (
              <CashView currentUser={currentUser} onSessionUpdated={handleSessionUpdated} />
            )
          )}
          {currentTab === 'purchases' && (appMode === 'PRODUCTION' ? <ProductionPurchasesView /> : <PurchasesView />)}
          {currentTab === 'finance' && (appMode === 'PRODUCTION' ? <ProductionFinanceView /> : <FinanceView />)}
          {currentTab === 'customers' && (appMode === 'PRODUCTION' ? <ProductionCustomersView currentSession={currentSession} /> : <CustomersView />)}
          {currentTab === 'suppliers' && <SuppliersView appMode={appMode} />}
          {currentTab === 'employees' && (appMode === 'PRODUCTION' ? <ProductionEmployeesView /> : <EmployeesView />)}
          {currentTab === 'reports' && (appMode === 'PRODUCTION' ? <ProductionReportsView /> : <ReportsView />)}
          {currentTab === 'audit' && (appMode === 'PRODUCTION' ? <ProductionAuditView /> : <AuditView />)}
          {currentTab === 'integrations' && (appMode === 'PRODUCTION' ? <ProductionIntegrationsView /> : <IntegrationsView />)}
          {currentTab === 'store-profile' && <StoreProfileView appMode={appMode} />}
          {currentTab === 'settings' && (appMode === 'PRODUCTION' ? <StoreProfileView appMode={appMode} /> : <SettingsView />)}
          {currentTab === 'support' && <SupportView appMode={appMode} />}
          {currentTab === 'legal' && (
            <LegalCenter
              active={legalDoc}
              onSelect={setLegalDoc}
              onBack={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
