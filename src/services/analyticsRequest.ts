export class AnalyticsRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

// Retry only this read-only admin query. Never retry writes or alter authorization.
export async function requestVisitorAnalytics(days: number, accessToken: string, signal: AbortSignal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 10_000);
    try {
      const response = await fetch(`/api/analytics?days=${days}`, {
        cache: 'no-store', signal: controller.signal,
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new AnalyticsRequestError(
        payload?.message || (response.status === 401 || response.status === 403 ? 'Sessão sem autorização para consultar visitantes.' : 'Não foi possível consultar visitantes. Tentando reconectar.'),
        [408,429,500,502,503,504].includes(response.status)
      );
      if (!payload || typeof payload !== 'object' || !payload.count) throw new AnalyticsRequestError('Resposta de visitantes inválida. Tentando reconectar.', true);
      return payload;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof AnalyticsRequestError && !error.retryable) throw error;
      if (attempt === 1) throw new AnalyticsRequestError('Não foi possível conectar ao serviço de visitantes. Reconexão automática ativa; os últimos dados foram preservados.', true);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  throw new AnalyticsRequestError('Visitantes temporariamente indisponíveis.', true);
}
