const PROJECT_ID = 'prj_2MSlEgf8aGwIgQTlrfL7lc0q2HEy';
const TEAM_ID = 'team_5i6pRadzO4J3hYoGpdOUKeCo';
const BASE = 'https://api.vercel.com/v1/query/web-analytics';

// Bound every upstream request so the admin endpoint always returns a JSON response.
async function boundedJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error('upstream_unavailable');
  return response.json();
}

async function query(path, params, token) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  return boundedJson(`${BASE}/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://fwjsxknbdkxzkoxvuncp.supabase.co';
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_D2_QLrItrkQ2Ksx7aiU8gg_yXqguL4C';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  return { url, anon, service };
}

async function requirePlatformAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const { url, anon } = supabaseConfig();
  const result = await boundedJson(url + '/rest/v1/rpc/is_platform_admin', {
    method: 'POST',
    headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}'
  });
  return result === true;
}

async function queryFirstParty(days, rpc = 'get_landing_analytics_service') {
  const { url, service } = supabaseConfig();
  if (!service) throw new Error('supabase_service_key_missing');
  return boundedJson(url + '/rest/v1/rpc/' + rpc, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_days: days })
  });

}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    if (!(await requirePlatformAdmin(req))) return res.status(403).json({ error: 'forbidden', message: 'Sessão sem autorização para o ATR Control.' });
  } catch {
    return res.status(503).json({ error: 'admin_verification_unavailable', message: 'Não foi possível verificar a sessão. A consulta será tentada novamente.' });
  }

  const requestedDays = Number(req.query.days || 30);
  const days = Number.isFinite(requestedDays) ? Math.min(90, Math.max(1, Math.floor(requestedDays))) : 30;
  res.setHeader('Cache-Control', 'private, no-store');
  const until = new Date();
  const since = new Date(until.getTime() - days * 86400000);
  const range = { since: since.toISOString(), until: until.toISOString() };
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_OIDC_TOKEN;

  // Prefer the synchronized first-party dataset; Vercel is a bounded fallback.
  const [historyResult, liveResult] = await Promise.allSettled([
    queryFirstParty(days),
    queryFirstParty(days, 'get_landing_live_analytics_service')
  ]);
  const live = liveResult.status === 'fulfilled' ? liveResult.value : { online: null, liveUnavailable: true };
  if (historyResult.status === 'fulfilled') return res.status(200).json({ ...historyResult.value, live });

  if (token) {
    try {
      const [count, paths, refs, devices, countries] = await Promise.all([
        query('visits/count', range, token),
        query('visits/aggregate', { ...range, by: 'requestPath', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'referrerHostname', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'deviceType', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'country', limit: '10' }, token)
      ]);

      return res.status(200).json({
        days,
        live,
        count: count.data || {},
        paths: paths.data || [],
        referrers: refs.data || [],
        devices: devices.data || [],
        countries: countries.data || [],
        source: 'VERCEL'
      });
    } catch (error) {
      console.warn('[ATR CONTROL] Fontes de analytics temporariamente indisponíveis.');
    }
  }

  return res.status(503).json({
    error: 'analytics_temporarily_unavailable',
    message: 'Visitantes temporariamente indisponíveis. A consulta será tentada novamente.'
  });
}
