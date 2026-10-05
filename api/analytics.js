const PROJECT_ID = 'prj_2MSlEgf8aGwIgQTlrfL7lc0q2HEy';
const TEAM_ID = 'team_5i6pRadzO4J3hYoGpdOUKeCo';
const BASE = 'https://api.vercel.com/v1/query/web-analytics';

async function query(path, params, token) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const response = await fetch(`${BASE}/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Vercel Analytics ${response.status}`);
  return response.json();
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
  const response = await fetch(url + '/rest/v1/rpc/is_platform_admin', {
    method: 'POST',
    headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}'
  });
  return response.ok && (await response.json()) === true;
}

async function queryFirstParty(days) {
  const { url, service } = supabaseConfig();
  if (!service) throw new Error('supabase_service_key_missing');
  const response = await fetch(url + '/rest/v1/rpc/get_landing_analytics_service', {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_days: days })
  });
  if (!response.ok) throw new Error(`Supabase Analytics ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await requirePlatformAdmin(req))) return res.status(403).json({ error: 'forbidden' });

  const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
  const until = new Date();
  const since = new Date(until.getTime() - days * 86400000);
  const range = { since: since.toISOString(), until: until.toISOString() };
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_OIDC_TOKEN;

  if (token) {
    try {
      const [count, paths, refs, devices, countries] = await Promise.all([
        query('visits/count', range, token),
        query('visits/aggregate', { ...range, by: 'requestPath', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'referrerHostname', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'deviceType', limit: '10' }, token),
        query('visits/aggregate', { ...range, by: 'country', limit: '10' }, token)
      ]);
      res.setHeader('Cache-Control', 'private, max-age=60');
      return res.status(200).json({
        days,
        count: count.data || {},
        paths: paths.data || [],
        referrers: refs.data || [],
        devices: devices.data || [],
        countries: countries.data || [],
        source: 'VERCEL'
      });
    } catch (error) {
      console.warn('[ATR CONTROL] Vercel Analytics indisponível; usando fallback próprio.', error);
    }
  }

  try {
    const payload = await queryFirstParty(days);
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({
      error: 'analytics_query_failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
