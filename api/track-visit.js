function config() {
  const url = process.env.SUPABASE_URL || 'https://fwjsxknbdkxzkoxvuncp.supabase.co';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return { url, service };
}

function deviceType(userAgent='') {
  const ua = String(userAgent).toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod/.test(ua)) return 'mobile';
  return 'desktop';
}

function safePath(value) {
  const path = String(value || '/').trim();
  if (!path.startsWith('/')) return '/';
  return path.slice(0, 512);
}

function safeReferrer(value) {
  try {
    if (!value) return null;
    return new URL(String(value)).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'forbidden_origin' }); }
    catch { return res.status(403).json({ error: 'forbidden_origin' }); }
  }
  if (/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) return res.status(204).end();
  const { url, service } = config();
  if (!service) return res.status(503).json({ error: 'analytics_storage_unavailable' });

  const visitorKey = String(req.body?.visitor_key || '').trim().slice(0,128);
  if (visitorKey.length < 8) return res.status(400).json({ error: 'invalid_visitor_key' });

  const requestPath = safePath(req.body?.request_path);
  const publicPaths = ['/', '/inicio', '/recursos', '/produtos', '/integracoes', '/planos', '/promocao'];
  if (!publicPaths.includes(requestPath)) return res.status(204).end();

  const decode = (value) => { try { return decodeURIComponent(String(value || '')).slice(0,120) || null; } catch { return null; } };
  const payload = {
    p_visitor: visitorKey,
    p_path: requestPath,
    p_referrer: safeReferrer(req.body?.referrer),
    p_device: deviceType(req.headers['user-agent'] || ''),
    p_country: decode(req.headers['x-vercel-ip-country']),
    p_city: decode(req.headers['x-vercel-ip-city']),
    p_region: decode(req.headers['x-vercel-ip-country-region']),
    p_pageview: req.body?.event !== 'heartbeat'
  };

  const response = await fetch(url + '/rest/v1/rpc/record_landing_activity_service', {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text().catch(()=>'');
    console.error('[ADEGA PRO] Falha ao registrar visita:', response.status, message);
    return res.status(502).json({ error: 'visit_write_failed' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(204).end();
}
