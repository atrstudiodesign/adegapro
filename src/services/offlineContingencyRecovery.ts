/**
 * Read-only offline recovery preview. No access rights are granted here.
 * Recovered assignments must be authenticated against a verified, signed
 * terminal grant and an approved local PIN verifier before any POS operation.
 */
import { describeOfflineCashAssignment, type ContingencyTerminalGrant } from './offlineContingencyAuthorization';
import { listContingencyDrafts } from './offlineContingencyJournal';

export type OfflineRecoveryPreview = {
  operatorId: string;
  cashRegisterId: string;
  cashSessionId: string;
  shiftLabel?: string;
  pendingCount: number;
  reviewCount: number;
};

/**
 * Read-only display of locally recorded drafts for a previously assigned
 * operator/shift. Does not establish that a server cash session is still open.
 */
export async function previewOfflineShiftRecovery(
  grant: ContingencyTerminalGrant,
  tenantId: string,
  storeId: string,
  terminalId: string,
  operatorId: string,
  now: Date = new Date(),
): Promise<OfflineRecoveryPreview | null> {
  if (!tenantId || !storeId || !terminalId ||
      grant.tenantId !== tenantId || grant.storeId !== storeId ||
      grant.terminalId !== terminalId) return null;

  const assignment = describeOfflineCashAssignment(grant, operatorId, now);
  if (!assignment) return null;

  const entries = await listContingencyDrafts(tenantId, storeId);
  const scoped = entries.filter(entry =>
    entry.operatorId === operatorId &&
    entry.cashRegisterId === assignment.cashRegisterId &&
    entry.cashSessionId === assignment.cashSessionId
  );
  return {
    ...assignment,
    pendingCount: scoped.filter(entry => entry.status === 'PENDING').length,
    reviewCount: scoped.filter(entry => entry.status === 'REVIEW_REQUIRED').length,
  };
}
