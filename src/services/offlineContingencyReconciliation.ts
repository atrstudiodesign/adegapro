import type { ContingencyEntry } from './offlineContingencyJournal';

/**
 * Deterministic reconciliation preflight. Never replays financial data.
 * The server must verify a signed terminal grant and operator authority
 * before accepting any offline entry.
 */
export type ReconciliationPreflight = {
  eligible: ContingencyEntry[];
  needsReview: ContingencyEntry[];
  rejected: Array<{ id: string; reason: string }>;
};

export function preflightContingencyReconciliation(
  entries: readonly ContingencyEntry[],
  scope: { tenantId: string; storeId: string; operatorId: string; cashSessionId: string },
): ReconciliationPreflight {
  const eligible: ContingencyEntry[] = [];
  const needsReview: ContingencyEntry[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.id || seen.has(entry.id)) {
      rejected.push({ id: entry.id, reason: 'Identificador duplicado ou ausente' });
      continue;
    }
    seen.add(entry.id);
    if (entry.tenantId !== scope.tenantId || entry.storeId !== scope.storeId ||
        entry.operatorId !== scope.operatorId || entry.cashSessionId !== scope.cashSessionId) {
      rejected.push({ id: entry.id, reason: 'Registro pertence a outra loja, operador ou turno' });
      continue;
    }
    if (!entry.cashRegisterId || !Number.isFinite(Date.parse(entry.createdAt))) {
      rejected.push({ id: entry.id, reason: 'Caixa ou data inválidos' });
      continue;
    }
    if (entry.status === 'REVIEW_REQUIRED' || entry.kind !== 'SALE_DRAFT') {
      needsReview.push(entry);
      continue;
    }
    if (entry.status !== 'PENDING' || !entry.payload ||
        typeof entry.payload !== 'object' || Array.isArray(entry.payload)) {
      rejected.push({ id: entry.id, reason: 'Formato inválido' });
      continue;
    }
    eligible.push(entry);
  }
  return { eligible, needsReview, rejected };
}
