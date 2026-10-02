import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("production architecture guards", () => {
  test("App routes production POS and cash through dedicated secure views", async () => {
    const app = await readFile("src/App.tsx", "utf8");
    expect(app).toContain("ProductionPosScreen");
    expect(app).toContain("ProductionCashView");
    expect(app).toContain("ProductionOperatorLock");
  });

  test("pre-auth rate limit does not call the public RPC directly", async () => {
    const auth = await readFile("src/components/auth/SaasAccessScreen.tsx", "utf8");
    expect(auth).toContain("supabase.functions.invoke('auth-rate-limit'");
    expect(auth).not.toContain("supabase.rpc('check_auth_rate_limit'");
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
});
