import { describeOfflineCashAssignment, type ContingencyTerminalGrant } from './offlineContingencyAuthorization';

function grant(override: Partial<ContingencyTerminalGrant> = {}): ContingencyTerminalGrant {
  return {
    tenantId: 'tenant-a', storeId: 'store-a', terminalId: 'terminal-a',
    administratorUserId: 'admin-a',
    issuedAt: '2026-10-14T10:00:00.000Z',
    expiresAt: '2026-10-14T14:00:00.000Z',
    allowedOperators: [{ operatorId: 'operator-a', cashRegisterId: 'register-a', cashSessionId: 'session-a' }],
    ...override,
  };
}

// Pure contract tests; no production DB and no PIN material.
import { describe, expect, it } from 'bun:test';

describe('offline cash assignment metadata (not authorization)', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');

  it('shows the assigned register and session for the selected operator', () => {
    expect(describeOfflineCashAssignment(grant(), 'operator-a', now)).toEqual({
      operatorId: 'operator-a', cashRegisterId: 'register-a', cashSessionId: 'session-a',
    });
  });
  it('does not show another operator assignment', () => {
    expect(describeOfflineCashAssignment(grant(), 'operator-b', now)).toBeNull();
  });
  it('rejects expired and future grants', () => {
    expect(describeOfflineCashAssignment(grant({ expiresAt: '2026-10-14T11:00:00Z' }), 'operator-a', now)).toBeNull();
    expect(describeOfflineCashAssignment(grant({ issuedAt: '2026-10-14T13:00:00Z' }), 'operator-a', now)).toBeNull();
  });
  it('rejects duplicate operator assignments', () => {
    const duplicated = grant();
    expect(describeOfflineCashAssignment({ ...duplicated, allowedOperators: [...duplicated.allowedOperators, ...duplicated.allowedOperators] }, 'operator-a', now)).toBeNull();
  });
});
