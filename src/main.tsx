import { applyPageSeo } from './seo/applyPageSeo';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

applyPageSeo();
window.addEventListener('popstate', applyPageSeo);

// Register Service Worker for offline POS operations
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[ADEGA PRO SW] Nova versão disponível. Atualizando automaticamente...');
  },
  onOfflineReady() {
    console.log('[ADEGA PRO SW] Interface instalada e pronta. Dados conectados continuam sujeitos à sincronização.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
