/**
 * Verification primitives for future server-signed offline terminal grants.
 * The public key must be pinned in the shipped application, not downloaded
 * from the same untrusted storage as the grant.
 * Verification does not grant access or validate an operator PIN.
 */
import type { ContingencyTerminalGrant } from './offlineContingencyAuthorization';

export type SignedTerminalGrant = {
  grant: ContingencyTerminalGrant;
  signature: string; // base64url Ed25519 signature
  keyId: string;
  algorithm: 'Ed25519';
};

/** Stable, unambiguous JSON encoding for a signed grant contract. */
export function canonicalGrantPayload(grant: ContingencyTerminalGrant): string {
  const sortedOperators = [...grant.allowedOperators]
    .map(o => ({
      operatorId: o.operatorId,
      cashRegisterId: o.cashRegisterId,
      cashSessionId: o.cashSessionId,
      shiftLabel: o.shiftLabel ?? null,
    }))
    .sort((a, b) =>
      a.operatorId.localeCompare(b.operatorId) ||
      a.cashRegisterId.localeCompare(b.cashRegisterId) ||
      a.cashSessionId.localeCompare(b.cashSessionId)
    );
  return JSON.stringify({
    version: 1,
    tenantId: grant.tenantId,
    storeId: grant.storeId,
    terminalId: grant.terminalId,
    administratorUserId: grant.administratorUserId,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    allowedOperators: sortedOperators,
  });
}

function base64urlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Assinatura inválida.');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function verifySignedTerminalGrant(
  signed: SignedTerminalGrant,
  pinnedPublicKey: CryptoKey,
  expectedKeyId: string,
  expectedTenantId: string,
  expectedStoreId: string,
  expectedTerminalId: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (signed.algorithm !== 'Ed25519' || !expectedKeyId ||
      signed.keyId !== expectedKeyId || pinnedPublicKey.algorithm.name !== 'Ed25519' ||
      !pinnedPublicKey.usages.includes('verify')) return false;
  const grant = signed.grant;
  if (!grant || grant.tenantId !== expectedTenantId ||
      grant.storeId !== expectedStoreId || grant.terminalId !== expectedTerminalId ||
      !grant.administratorUserId || !grant.allowedOperators.length) return false;
  const issued = Date.parse(grant.issuedAt);
  const expiry = Date.parse(grant.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expiry) ||
      issued > now.getTime() || expiry <= now.getTime() || expiry <= issued) return false;
  try {
    const payload = new TextEncoder().encode(canonicalGrantPayload(grant));
    return await crypto.subtle.verify(
      { name: 'Ed25519' }, pinnedPublicKey,
      base64urlToBytes(signed.signature) as BufferSource,
      payload,
    );
  } catch {
    return false;
  }
}
