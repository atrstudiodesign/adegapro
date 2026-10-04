export const DESKTOP_MODULES = [
  'dashboard',
  'pos',
  'sales',
  'products',
  'stock',
  'inventory',
  'cash',
  'purchases',
  'finance',
  'customers',
  'suppliers',
  'reports',
  'customer-display'
] as const;

export type DesktopModule = typeof DESKTOP_MODULES[number];

export type CustomerDisplaySnapshot = {
  storeName: string;
  storeLogoUrl?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  status: 'WAITING' | 'OPEN' | 'COMPLETED';
  updatedAt: number;
};

const CUSTOMER_DISPLAY_KEY = 'adega_pro_customer_display_v1';
const CUSTOMER_DISPLAY_CHANNEL = 'adega-pro-customer-display';
const CUSTOMER_DISPLAY_MAX_AGE_MS = 5_000;

declare global {
  interface Window {
    __ADEGA_DESKTOP_MODULE__?: string;
    __TAURI_INTERNALS__?: {
      invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
    };
  }
}

export const isDesktopRuntime = () => Boolean(window.__TAURI_INTERNALS__?.invoke);

export const getDesktopModule = (): DesktopModule | null => {
  const requested = window.__ADEGA_DESKTOP_MODULE__
    || new URLSearchParams(window.location.search).get('desktopModule');
  return DESKTOP_MODULES.includes(requested as DesktopModule) ? requested as DesktopModule : null;
};

export async function openDesktopModule(module: DesktopModule): Promise<void> {
  if (!DESKTOP_MODULES.includes(module)) throw new Error('Módulo de janela inválido.');

  if (isDesktopRuntime()) {
    await window.__TAURI_INTERNALS__!.invoke('open_module_window', { module });
    return;
  }

  const url = new URL(window.location.href);
  url.pathname = '/';
  url.hash = '';
  url.search = new URLSearchParams({ desktopModule: module }).toString();
  window.open(url.toString(), `adega-pro-${module}`, 'noopener,noreferrer');
}

const isSnapshot = (value: unknown): value is CustomerDisplaySnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as CustomerDisplaySnapshot;
  return typeof snapshot.storeName === 'string'
    && Array.isArray(snapshot.items)
    && Number.isFinite(snapshot.total)
    && Number.isFinite(snapshot.updatedAt)
    && ['WAITING', 'OPEN', 'COMPLETED'].includes(snapshot.status);
};

export function publishCustomerDisplay(snapshot: CustomerDisplaySnapshot): void {
  const safeSnapshot: CustomerDisplaySnapshot = {
    ...snapshot,
    storeName: snapshot.storeName.slice(0, 120),
    storeLogoUrl: snapshot.storeLogoUrl?.slice(0, 2_048),
    items: snapshot.items.slice(0, 100).map(item => ({
      name: item.name.slice(0, 160),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      lineTotal: Number(item.lineTotal) || 0
    }))
  };

  localStorage.setItem(CUSTOMER_DISPLAY_KEY, JSON.stringify(safeSnapshot));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.postMessage(safeSnapshot);
    channel.close();
  }
}

export function readCustomerDisplay(): CustomerDisplaySnapshot | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOMER_DISPLAY_KEY) || 'null');
    if (!isSnapshot(parsed)) return null;
    if (Date.now() - parsed.updatedAt > CUSTOMER_DISPLAY_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function subscribeCustomerDisplay(
  onSnapshot: (snapshot: CustomerDisplaySnapshot) => void
): () => void {
  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL)
    : null;
  const onMessage = (event: MessageEvent<unknown>) => {
    if (isSnapshot(event.data)) onSnapshot(event.data);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CUSTOMER_DISPLAY_KEY || !event.newValue) return;
    try {
      const parsed: unknown = JSON.parse(event.newValue);
      if (isSnapshot(parsed)) onSnapshot(parsed);
    } catch {
      // An invalid cross-window payload is intentionally ignored.
    }
  };

  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    channel?.removeEventListener('message', onMessage);
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}
