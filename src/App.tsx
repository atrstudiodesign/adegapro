import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { User, CashSession } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';

// Views
import { PosScreen } from './components/pos/PosScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { CashierMiniDashView } from './components/dashboard/CashierMiniDashView';
import { ProductsView } from './components/products/ProductsView';
import { CategoriesView } from './components/categories/CategoriesView';
import { CombosView } from './components/combos/CombosView';
import { StockView } from './components/stock/StockView';
import { InventoryView } from './components/inventory/InventoryView';
import { CashView } from './components/cash/CashView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { FinanceView } from './components/finance/FinanceView';
import { CustomersView } from './components/customers/CustomersView';
import { EmployeesView } from './components/employees/EmployeesView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditView } from './components/audit/AuditView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { SettingsView } from './components/settings/SettingsView';
import { StoreProfileView } from './components/store/StoreProfileView';
import { SupportView } from './components/support/SupportView';
import { DigitalReceiptView } from './components/receipt/DigitalReceiptView';
import { LoginScreen } from './components/auth/LoginScreen';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(db.getCurrentUser());
  const [currentSession, setCurrentSession] = useState<CashSession | undefined>(db.getCurrentSession());
  const [receiptHashId, setReceiptHashId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Monitor URL hash for public digital receipt routing: #/comprovante/:id
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/comprovante/')) {
        const id = hash.replace('#/comprovante/', '');
        setReceiptHashId(id);
      } else {
        setReceiptHashId(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleSessionUpdated = () => {
    setCurrentSession(db.getCurrentSession());
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

  // If a public customer opens the digital receipt URL
  if (receiptHashId) {
    return (
      <DigitalReceiptView
        receiptId={receiptHashId}
        onBack={() => {
          window.location.hash = '';
          setReceiptHashId(null);
        }}
      />
    );
  }

  // If screen is locked / Frente de Tela do Sistema
  if (isLocked) {
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
      {/* Universal Top Bar */}
      <Header
        currentTab={currentTab}
        onNavigate={tab => setCurrentTab(tab)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        currentSession={currentSession}
        onLock={() => setIsLocked(true)}
      />

      {/* Main Workspace: Sidebar + Dynamic Module View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hide sidebar when in full-focus POS mode on smaller screens or allow instant collapse */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={tab => setCurrentTab(tab)}
          currentUser={currentUser}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
          {currentTab === 'dashboard' && <DashboardView onNavigate={tab => setCurrentTab(tab)} />}
          {currentTab === 'minidash' && (
            <CashierMiniDashView
              currentUser={currentUser}
              currentSession={currentSession}
              onNavigate={tab => setCurrentTab(tab)}
            />
          )}
          {currentTab === 'pos' && (
            <PosScreen
              currentUser={currentUser}
              currentSession={currentSession}
              onNavigate={tab => setCurrentTab(tab)}
            />
          )}
          {currentTab === 'sales' && <SalesHistoryView currentUser={currentUser} />}
          {currentTab === 'products' && <ProductsView />}
          {currentTab === 'categories' && <CategoriesView />}
          {currentTab === 'combos' && <CombosView />}
          {currentTab === 'stock' && <StockView />}
          {currentTab === 'inventory' && <InventoryView />}
          {currentTab === 'cash' && (
            <CashView currentUser={currentUser} onSessionUpdated={handleSessionUpdated} />
          )}
          {currentTab === 'purchases' && <PurchasesView />}
          {currentTab === 'finance' && <FinanceView />}
          {currentTab === 'customers' && <CustomersView />}
          {currentTab === 'suppliers' && <SuppliersView />}
          {currentTab === 'employees' && <EmployeesView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'audit' && <AuditView />}
          {currentTab === 'integrations' && <IntegrationsView />}
          {currentTab === 'store-profile' && <StoreProfileView />}
          {currentTab === 'settings' && <SettingsView />}
          {currentTab === 'support' && <SupportView />}
        </main>
      </div>
    </div>
  );
}
