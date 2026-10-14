/**
 * Fail-closed offline contingency authorization model.
 * An administrator must provision a terminal while online.
 * PIN verification and cryptographic integrity are NOT implemented yet.
 * This module intentionally refuses to grant offline access.
 */
export type ContingencyTerminalGrant = {
  tenantId: string;
  storeId: string;
  terminalId: string;
  issuedAt: string;
  expiresAt: string;
  administratorUserId: string;
  allowedOperators: ReadonlyArray<{
    operatorId: string;
    cashRegisterId: string;
    cashSessionId: string;
    shiftLabel?: string;
  }>;
};

export type ContingencyOperatorIdentity = {
  operatorId: string;
  cashRegisterId: string;
  cashSessionId: string;
  shiftLabel?: string;
};

/** Prevent an unverified grant from ever enabling cashier operations. */
export function authorizeOfflineOperator(
  _grant: ContingencyTerminalGrant,
  _operatorId: string,
  _pin: string,
): never {
  throw new Error(
    'Modo offline bloqueado: autorização assinada e verificação segura do PIN ainda não homologadas.',
  );
}

/** Pure validation for displaying a previously authorized shift, not access control. */
export function describeOfflineCashAssignment(
  grant: ContingencyTerminalGrant,
  operatorId: string,
  now: Date = new Date(),
): ContingencyOperatorIdentity | null {
  if (!grant.tenantId || !grant.storeId || !grant.terminalId ||
      !grant.administratorUserId || !grant.issuedAt || !grant.expiresAt) return null;
  const issued = Date.parse(grant.issuedAt);
  const expiry = Date.parse(grant.expiresAt);
  const current = now.getTime();
  if (!Number.isFinite(issued) || !Number.isFinite(expiry) ||
      issued > current || expiry <= current || expiry <= issued) return null;
  const matching = grant.allowedOperators.filter(o => o.operatorId === operatorId);
  if (matching.length !== 1) return null;
  const assignment = matching[0];
  if (!assignment.cashRegisterId || !assignment.cashSessionId) return null;
  return { ...assignment };
}
