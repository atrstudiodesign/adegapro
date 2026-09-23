export type AppMode = 'DEMO' | 'PRODUCTION';

const KEY = 'adega_pro_app_mode';

export function getAppMode(): AppMode {
  const stored = localStorage.getItem(KEY);
  if (stored === 'PRODUCTION' || stored === 'DEMO') return stored;
  return 'DEMO';
}

export function setAppMode(mode: AppMode) {
  localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent('adega-pro-mode-change', { detail: mode }));
}

export function isDemoMode() {
  return getAppMode() === 'DEMO';
}
