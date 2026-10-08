// Heartbeats never count as page views and only run on visible public pages.
export function startPublicVisitTracking(path: string): () => void {
  if (!['/', '/inicio', '/recursos', '/produtos', '/integracoes', '/planos', '/promocao'].includes(path)) return () => {};
  let visitor = '';
  try {
    visitor = localStorage.getItem('adega_pro_public_visitor_key') || crypto.randomUUID();
    localStorage.setItem('adega_pro_public_visitor_key', visitor);
  } catch { visitor = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  let pending = false;
  let stopped = false;
  const dedupeKey = `adega_pro_visit_sent:${path}`;
  const send = async () => {
    if (stopped || pending || document.visibilityState !== 'visible') return;
    pending = true;
    let pageview = false;
    try { pageview = Date.now() - Number(sessionStorage.getItem(dedupeKey) || 0) >= 30 * 60 * 1000; }
    catch { pageview = true; }
    try {
      const response = await fetch('/api/track-visit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ visitor_key: visitor, request_path: path, referrer: document.referrer || null, event: pageview ? 'pageview' : 'heartbeat' })
      });
      if (response.ok && pageview) { try { sessionStorage.setItem(dedupeKey, String(Date.now())); } catch { /* storage unavailable */ } }
    } catch { /* analytics must not interrupt registration or navigation */ }
    finally { pending = false; }
  };
  void send();
  const timer = window.setInterval(() => void send(), 30_000);
  const onVisible = () => void send();
  document.addEventListener('visibilitychange', onVisible);
  return () => { stopped = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
}
