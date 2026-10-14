/**
 * A fail-closed capability gate for contingency mode.
 * This gate deliberately cannot authorize offline checkout until the
 * signed-grant issuer, PIN verifier and idempotent server replay exist.
 */
export type OfflineReadiness = {
  signedGrantIssuer: boolean;
  pinnedVerifierKey: boolean;
  localPinVerifier: boolean;
  durableEncryptedStore: boolean;
  idempotentReplay: boolean;
};

export const OFFLINE_READINESS: Readonly<OfflineReadiness> = Object.freeze({
  signedGrantIssuer: false,
  pinnedVerifierKey: false,
  localPinVerifier: false,
  durableEncryptedStore: false,
  idempotentReplay: false,
});

export function assertOfflineCheckoutReady(readiness: OfflineReadiness = OFFLINE_READINESS): void {
  if (!Object.values(readiness).every(Boolean)) {
    throw new Error('Venda offline indisponível: segurança do PIN, persistência e sincronização ainda não homologadas.');
  }
}
