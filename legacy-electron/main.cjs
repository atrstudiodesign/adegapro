const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');

const ONLINE_URL = 'https://adegapro.vercel.app';
const ALLOWED_MODULES = new Set([
  'dashboard','pos','sales','products','stock','inventory','cash',
  'purchases','finance','customers','suppliers','reports','customer-display'
]);

const windowOptions = {
  dashboard: { title: 'ADEGA PRO — Dashboard', width: 1360, height: 860, minWidth: 1024, minHeight: 700 },
  pos: { title: 'ADEGA PRO — PDV', width: 1440, height: 900, minWidth: 1100, minHeight: 720 },
  sales: { title: 'ADEGA PRO — Vendas e Cupons', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  products: { title: 'ADEGA PRO — Produtos', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  stock: { title: 'ADEGA PRO — Estoque', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  inventory: { title: 'ADEGA PRO — Inventário', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  cash: { title: 'ADEGA PRO — Caixa e Sessões', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  purchases: { title: 'ADEGA PRO — Compras', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  finance: { title: 'ADEGA PRO — Financeiro', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  customers: { title: 'ADEGA PRO — Clientes', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  suppliers: { title: 'ADEGA PRO — Fornecedores', width: 1280, height: 820, minWidth: 960, minHeight: 640 },
  reports: { title: 'ADEGA PRO — Relatórios', width: 1360, height: 860, minWidth: 1024, minHeight: 700 },
  'customer-display': { title: 'ADEGA PRO — Tela do Cliente', width: 1200, height: 800, minWidth: 720, minHeight: 480 }
};

const moduleWindows = new Map();

function secureWebContents(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === ONLINE_URL) return { action: 'allow' };
      void shell.openExternal(url);
    } catch {}
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === ONLINE_URL) return;
      event.preventDefault();
      void shell.openExternal(url);
    } catch {
      event.preventDefault();
    }
  });
}

function browserPreferences() {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false
  };
}

function createMainWindow() {
  const main = new BrowserWindow({
    title: 'ADEGA PRO — Sistema para Adegas',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    center: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: browserPreferences()
  });

  const splash = new BrowserWindow({
    title: 'ADEGA PRO',
    width: 720,
    height: 420,
    center: true,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#080808',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
  secureWebContents(main);

  main.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (!splash.isDestroyed()) splash.close();
      if (!main.isDestroyed()) {
        main.show();
        main.focus();
      }
    }, 900);
  });

  main.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (!splash.isDestroyed()) splash.close();
    dialog.showErrorBox(
      'ADEGA PRO — conexão indisponível',
      'Não foi possível abrir o sistema online.\n\n' +
      'Verifique a conexão com a internet e tente novamente.\n\n' +
      'Código: ' + errorCode + '\n' + errorDescription + '\n' + validatedURL
    );
    app.quit();
  });

  main.loadURL(ONLINE_URL + '/');
  return main;
}

function openModule(module) {
  if (!ALLOWED_MODULES.has(module)) {
    throw new Error('Módulo de janela inválido.');
  }

  const existing = moduleWindows.get(module);
  if (existing && !existing.isDestroyed()) {
    existing.restore();
    existing.show();
    existing.focus();
    return;
  }

  const options = windowOptions[module];
  const win = new BrowserWindow({
    ...options,
    center: true,
    show: true,
    autoHideMenuBar: true,
    webPreferences: browserPreferences()
  });

  secureWebContents(win);
  const url = new URL(ONLINE_URL + '/');
  url.searchParams.set('desktopModule', module);
  win.loadURL(url.toString());

  win.on('closed', () => moduleWindows.delete(module));
  moduleWindows.set(module, win);
}

ipcMain.handle('open_module_window', (_event, args) => {
  const module = args && typeof args.module === 'string' ? args.module : '';
  openModule(module);
  return null;
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
