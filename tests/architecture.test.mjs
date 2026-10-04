import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("production architecture guards", () => {
  test("App routes production POS and cash through dedicated secure views", async () => {
    const app = await readFile("src/App.tsx", "utf8");
    expect(app).toContain("ProductionPosScreen");
    expect(app).toContain("ProductionCashView");
    expect(app).toContain("ProductionOperatorLock");
  });

  test("Windows release starts as a GUI application without a console window", async () => {
    const main = await readFile("src-tauri/src/main.rs", "utf8");
    expect(main).toContain('#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]');
  });

  test("Windows splashscreen stays visible until the main webview finishes loading", async () => {
    const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
    const backend = await readFile("src-tauri/src/lib.rs", "utf8");
    const splash = await readFile("public/splashscreen.html", "utf8");
    const mainWindow = config.app.windows.find(window => window.label === "main");
    const splashWindow = config.app.windows.find(window => window.label === "splashscreen");

    expect(mainWindow.visible).toBe(false);
    expect(splashWindow.url).toBe("splashscreen.html");
    expect(splashWindow.decorations).toBe(false);
    expect(backend).toContain("PageLoadEvent::Finished");
    expect(backend).toContain('get_webview_window("splashscreen")');
    expect(backend).toContain('get_webview_window("main")');
    expect(backend).toContain("Duration::from_millis(1200)");
    expect(splash).toContain("/adega-pro-brand.svg");
    expect(splash).toContain("Versão 1.1.5");
  });

  test("Windows main window requires company login before operator PIN", async () => {
    const app = await readFile("src/App.tsx", "utf8");
    const auth = await readFile("src/components/auth/SaasAccessScreen.tsx", "utf8");

    expect(app).toContain("isDesktopRuntime() && !desktopModule");
    expect(app).toContain("supabase.auth.signOut({ scope: 'local' })");
    expect(app).toContain("setSaasEntryView('LOGIN')");
    expect(app.indexOf("if (!saasAuthenticated && !demoAccessGranted")).toBeLessThan(app.indexOf("if (isLocked)"));
    expect(auth.match(/adega-pro-brand\.svg/g)?.length).toBeGreaterThanOrEqual(3);
    expect(auth).toContain("Entre com a conta principal antes de liberar o PIN do operador.");
  });

  test("Windows package metadata and installed version remain synchronized", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
    const cargo = await readFile("src-tauri/Cargo.toml", "utf8");
    const workflow = await readFile(".github/workflows/desktop-windows.yml", "utf8");

    expect(packageJson.version).toBe("1.1.5");
    expect(config.version).toBe(packageJson.version);
    expect(cargo).toContain('version = "1.1.5"');
    expect(config.bundle.shortDescription).toContain("1.1.5");
    expect(config.bundle.longDescription).toContain("1.1.5");
    expect(workflow).toContain('$expectedVersion = "1.1.5"');
    expect(workflow).toContain("FileDescription");
    expect(workflow).toContain("ProductVersion");
  });

  test("pre-auth rate limit does not call the public RPC directly", async () => {
    const auth = await readFile("src/components/auth/SaasAccessScreen.tsx", "utf8");
    expect(auth).toContain("supabase.functions.invoke('auth-rate-limit'");
    expect(auth).not.toContain("supabase.rpc('check_auth_rate_limit'");
  });

  test("tenant password recovery requires an explicit new password", async () => {
    const app = await readFile("src/App.tsx", "utf8");
    const auth = await readFile("src/components/auth/SaasAccessScreen.tsx", "utf8");
    expect(app).toContain("PASSWORD_RECOVERY");
    expect(auth).toContain("RESET_PASSWORD");
    expect(auth).toContain("supabase.auth.updateUser({ password: newPassword })");
    expect(auth).toContain("redirectTo: `${window.location.origin}/entrar`");
  });

  test("production customer persistence keeps contact and address fields", async () => {
    const repo = await readFile("src/services/productionDb.ts", "utf8");
    expect(repo).toContain("email: customer.email?.trim() || null");
    expect(repo).toContain("address: customer.address?.trim() || null");
    expect(repo).not.toContain("email: null,\n    address: null");
  });

  test("production repository requires an operator session token for sales", async () => {
    const repo = await readFile("src/services/productionDb.ts", "utf8");
    expect(repo).toContain("operator_session_token");
    expect(repo).toContain("adega_pro_operator_session_token");
  });

  test("operator PIN can be entered with a physical keyboard", async () => {
    const lock = await readFile("src/components/auth/ProductionOperatorLock.tsx", "utf8");
    expect(lock).toContain('aria-label="PIN do operador"');
    expect(lock).toContain('inputMode="numeric"');
    expect(lock).toContain("event.key === 'Enter'");
  });

  test("platform control refreshes new tenants automatically", async () => {
    const control = await readFile("src/components/admin/PlatformControlView.tsx", "utf8");
    expect(control).toContain('window.setInterval(refresh,30000)');
    expect(control).toContain("document.addEventListener('visibilitychange',refresh)");
  });

  test("production shell does not render a translucent watermark over the system", async () => {
    const app = await readFile("src/App.tsx", "utf8");
    expect(app).not.toContain('CONTEÚDO PROTEGIDO');
    expect(app).not.toContain('opacity-[0.025]');
  });

  test("POS persists cart discount into finalize_sale item discounts", async () => {
    const pos = await readFile("src/components/pos/ProductionPosScreen.tsx", "utf8");
    expect(pos).toContain("remainingDiscountCents");
    expect(pos).toContain("items:saleItems");
    expect(pos).not.toContain("items:cart.map(l=>({product_id:l.product.id,quantity:l.quantity,discount:0}))");
  });

  test("POS blocks cart quantity above available stock", async () => {
    const pos = await readFile("src/components/pos/ProductionPosScreen.tsx", "utf8");
    expect(pos).toContain("inCart>=p.currentStock");
    expect(pos).toContain("inCart+quantity>product.currentStock");
  });

  test("product loader prevents orphan combos from entering combo transaction path", async () => {
    const repo = await readFile("src/services/productionDb.ts", "utf8");
    expect(repo).toContain("configuredComboProducts");
    expect(repo).toContain("comboConfigurationMissing");
    expect(repo).toContain(".from('combos')");
  });

  test("sale finalization remains server-side and idempotent", async () => {
    const pos = await readFile("src/components/pos/ProductionPosScreen.tsx", "utf8");
    const repo = await readFile("src/services/productionDb.ts", "utf8");
    expect(pos).toContain("idempotency_key:crypto.randomUUID()");
    expect(repo).toContain("supabase.rpc('finalize_sale'");
    expect(repo).toContain("operator_session_token");
  });

  test("cash open and close remain secure RPC operations", async () => {
    const repo = await readFile("src/services/productionDb.ts", "utf8");
    expect(repo).toContain("open_cash_session_secure");
    expect(repo).toContain("close_cash_session_secure");
  });

  test("CI gates every pull request with typecheck tests and build", async () => {
    const ci = await readFile(".github/workflows/ci.yml", "utf8");
    expect(ci).toContain("pull_request:");
    expect(ci).toContain("bun run lint");
    expect(ci).toContain("bun test");
    expect(ci).toContain("bun run build");
  });

  test("Windows 7 Legacy remains an isolated online shell for the production app", async () => {
    const legacyPackage = JSON.parse(await readFile("legacy-electron/package.json", "utf8"));
    const legacyMain = await readFile("legacy-electron/main.cjs", "utf8");
    const legacyPreload = await readFile("legacy-electron/preload.cjs", "utf8");
    const vite = await readFile("vite.config.ts", "utf8");

    expect(legacyPackage.build.electronVersion).toBe("22.3.27");
    expect(legacyMain).toContain("const ONLINE_URL = 'https://adegapro.vercel.app'");
    expect(legacyMain).toContain("contextIsolation: true");
    expect(legacyMain).toContain("nodeIntegration: false");
    expect(legacyMain).toContain("sandbox: true");
    expect(legacyPreload).toContain("command !== 'open_module_window'");
    expect(vite).toContain("target: 'chrome108'");
  });

  test("Windows 7 Legacy does not introduce a second production database", async () => {
    const legacyMain = await readFile("legacy-electron/main.cjs", "utf8");
    const legacyPackage = await readFile("legacy-electron/package.json", "utf8");

    expect(legacyMain).not.toContain("supabase");
    expect(legacyMain).not.toContain("sqlite");
    expect(legacyMain).not.toContain("indexedDB");
    expect(legacyPackage).not.toContain("@supabase/supabase-js");
  });

});
