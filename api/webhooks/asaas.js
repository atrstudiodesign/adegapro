import { createHash, timingSafeEqual } from 'node:crypto';

function env() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || 'https://fwjsxknbdkxzkoxvuncp.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
  };
}

function tokenMatches(provided, expected) {
  const left = Buffer.from(String(provided || ''), 'utf8');
  const right = Buffer.from(String(expected || ''), 'utf8');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function parseBody(body) {
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') return JSON.parse(body);
  return null;
}

function eventStatus(eventType) {
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventType)) return 'ACTIVE';
  if (eventType === 'PAYMENT_OVERDUE') return 'PAST_DUE';
  if (eventType === 'PAYMENT_REFUNDED') return 'SUSPENDED';
  return null;
}

function serviceHeaders(serviceKey, prefer) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function supabaseFetch(path, serviceKey, init = {}) {
  const { supabaseUrl } = env();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(serviceKey, init.prefer), ...(init.headers || {}) },
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`supabase_${response.status}`);
  return data;
}

async function findSubscription(payment, serviceKey) {
  const subscriptionRef = String(payment?.subscription || '').trim();
  const customerRef = String(payment?.customer || '').trim();
  const filter = subscriptionRef
    ? `provider_subscription_ref=eq.${encodeURIComponent(subscriptionRef)}`
    : customerRef
      ? `provider_customer_ref=eq.${encodeURIComponent(customerRef)}`
      : null;
  if (!filter) return null;
  const rows = await supabaseFetch(
    `billing_subscriptions?select=id,tenant_id,status&provider=ilike.ASAAS&${filter}&limit=1`,
    serviceKey,
  );
  return rows?.[0] || null;
}

async function recordEvent(payload, serviceKey) {
  const eventId = String(payload.id).trim();
  const eventType = String(payload.event).trim().toUpperCase();
  const payment = payload.payment || {};
  const subscription = await findSubscription(payment, serviceKey);
  const eventRow = {
    provider: 'ASAAS',
    provider_event_id: eventId,
    event_type: eventType,
    tenant_id: subscription?.tenant_id || null,
    subscription_id: subscription?.id || null,
    provider_customer_ref: payment.customer ? String(payment.customer) : null,
    provider_subscription_ref: payment.subscription ? String(payment.subscription) : null,
    provider_payment_ref: payment.id ? String(payment.id) : null,
    payload,
    processing_status: subscription ? 'PROCESSED' : 'IGNORED',
    processed_at: new Date().toISOString(),
  };

  const inserted = await supabaseFetch(
    'billing_provider_events?on_conflict=provider,provider_event_id',
    serviceKey,
    {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: JSON.stringify(eventRow),
    },
  );
  const duplicate = Array.isArray(inserted) && inserted.length === 0;
  if (duplicate) return { duplicate: true, linked: Boolean(subscription) };

  const legacyRow = {
    tenant_id: subscription?.tenant_id || null,
    provider: 'ASAAS',
    provider_event_id: eventId,
    event_type: eventType,
    payload_hash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    payload,
    processed: true,
    processed_at: new Date().toISOString(),
  };
  await supabaseFetch('billing_events?on_conflict=provider,provider_event_id', serviceKey, {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: JSON.stringify(legacyRow),
  });

  const nextStatus = eventStatus(eventType);
  if (subscription && nextStatus) {
    await supabaseFetch(`billing_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`, serviceKey, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ status: nextStatus, updated_at: new Date().toISOString() }),
    });
  }
  return { duplicate: false, linked: Boolean(subscription) };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { serviceKey, webhookToken } = env();
  if (!serviceKey || !webhookToken) {
    console.error('[ADEGA PRO] Webhook Asaas sem configuração de backend.');
    return res.status(503).json({ error: 'webhook_not_configured' });
  }
  if (!tokenMatches(req.headers['asaas-access-token'], webhookToken)) {
    return res.status(401).json({ error: 'invalid_webhook_token' });
  }

  let payload;
  try {
    payload = parseBody(req.body);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }
  if (!payload || !String(payload.id || '').trim() || !String(payload.event || '').trim()) {
    return res.status(400).json({ error: 'invalid_asaas_event' });
  }

  try {
    const result = await recordEvent(payload, serviceKey);
    return res.status(200).json({ received: true, duplicate: result.duplicate, linked: result.linked });
  } catch (error) {
    console.error('[ADEGA PRO] Falha ao processar webhook Asaas:', error?.message || 'unknown_error');
    return res.status(500).json({ error: 'webhook_processing_failed' });
  }
}

