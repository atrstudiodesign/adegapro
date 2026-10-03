const PROJECT_ID = 'prj_2MSlEgf8aGwIgQTlrfL7lc0q2HEy';
const TEAM_ID = 'team_5i6pRadzO4J3hYoGpdOUKeCo';
const BASE = 'https://api.vercel.com/v1/query/web-analytics';

async function query(path, params, token) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const response = await fetch(`${BASE}/${path}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Vercel Analytics ${response.status}`);
  return response.json();
}

async function requirePlatformAdmin(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const supabaseUrl = process.env.SUPABASE_URL || 'https://fwjsxknbdkxzkoxvuncp.supabase.co';
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_D2_QLrItrkQ2Ksx7aiU8gg_yXqguL4C';
  const response = await fetch(supabaseUrl + '/rest/v1/rpc/is_platform_admin', {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}'
  });
  return response.ok && (await response.json()) === true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await requirePlatformAdmin(req))) return res.status(403).json({ error: 'forbidden' });
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_OIDC_TOKEN;
  if (!token) return res.status(503).json({ error: 'analytics_token_missing' });

  const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
  const until = new Date();
  const since = new Date(until.getTime() - days * 86400000);
  const range = { since: since.toISOString(), until: until.toISOString() };

  try {
    const [count, paths, refs, devices, countries] = await Promise.all([
      query('visits/count', range, token),
      query('visits/aggregate', { ...range, by: 'requestPath', limit: '10' }, token),
      query('visits/aggregate', { ...range, by: 'referrerHostname', limit: '10' }, token),
      query('visits/aggregate', { ...range, by: 'deviceType', limit: '10' }, token),
      query('visits/aggregate', { ...range, by: 'country', limit: '10' }, token)
    ]);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({ days, count: count.data || {}, paths: paths.data || [], referrers: refs.data || [], devices: devices.data || [], countries: countries.data || [] });
  } catch (error) {
    return res.status(502).json({ error: 'analytics_query_failed', message: error instanceof Error ? error.message : String(error) });
  }
}
