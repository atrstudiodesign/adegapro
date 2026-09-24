import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { inject } from '@vercel/analytics';

// Register Service Worker for offline POS operations
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[ADEGA PRO SW] Nova versão disponível. Atualizando automaticamente...');
  },
  onOfflineReady() {
    console.log('[ADEGA PRO SW] Aplicativo cacheado e 100% pronto para operação offline!');
  },
});

// Initialize Vercel Web Analytics
inject();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
