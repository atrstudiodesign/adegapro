/**
 * Encrypted export of offline recovery records. A password is supplied by the
 * administrator at export/import time and is never stored on the device.
 * This is a backup envelope, not authorization for offline checkout.
 */
import { validateContingencyRecoveryFile, type ContingencyEntry } from './offlineContingencyJournal';

type EncryptedEnvelope = {
  format: 'ADEGA_PRO_OFFLINE_ENCRYPTED';
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-256-GCM';
  salt: number[];
  iv: number[];
  ciphertext: number[];
};

const ITERATIONS = 310000;
const bytes = (value: Uint8Array): number[] => Array.from(value);

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (password.length < 12) throw new Error('Use uma senha de backup com pelo menos 12 caracteres.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function encryptOfflineRecovery(
  entries: readonly ContingencyEntry[], tenantId: string, storeId: string, password: string,
): Promise<Blob> {
  if (!tenantId || !storeId || entries.some(e => e.tenantId !== tenantId || e.storeId !== storeId)) {
    throw new Error('Backup contém dados de outra empresa ou loja.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const plain = new TextEncoder().encode(JSON.stringify({
    format: 'ADEGA_PRO_OFFLINE_RECOVERY', version: 1, tenantId, storeId,
    exportedAt: new Date().toISOString(), entries,
  }));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const envelope: EncryptedEnvelope = {
    format: 'ADEGA_PRO_OFFLINE_ENCRYPTED', version: 1, kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: bytes(salt), iv: bytes(iv), ciphertext: bytes(ciphertext),
  };
  return new Blob([JSON.stringify(envelope)], { type: 'application/json' });
}

function decodeBytes(value: unknown, size?: number): Uint8Array {
  if (!Array.isArray(value) || (size !== undefined && value.length !== size) ||
      value.some(n => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error('Arquivo criptografado inválido.');
  }
  return new Uint8Array(value);
}

export async function decryptOfflineRecovery(
  input: unknown, tenantId: string, storeId: string, password: string,
): Promise<ContingencyEntry[]> {
  if (!input || typeof input !== 'object') throw new Error('Arquivo inválido.');
  const e = input as Partial<EncryptedEnvelope>;
  if (e.format !== 'ADEGA_PRO_OFFLINE_ENCRYPTED' || e.version !== 1 ||
      e.kdf !== 'PBKDF2-SHA256' || e.cipher !== 'AES-256-GCM' ||
      e.iterations !== ITERATIONS) throw new Error('Formato criptográfico não suportado.');
  const salt = decodeBytes(e.salt, 16);
  const iv = decodeBytes(e.iv, 12);
  const ciphertext = decodeBytes(e.ciphertext);
  if (ciphertext.length < 16 || ciphertext.length > 50 * 1024 * 1024) throw new Error('Tamanho do arquivo inválido.');
  try {
    const key = await deriveKey(password, salt, ITERATIONS);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ciphertext as BufferSource);
    return validateContingencyRecoveryFile(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decrypted)), tenantId, storeId);
  } catch {
    throw new Error('Não foi possível abrir o backup: senha incorreta, arquivo danificado ou dados de outra loja.');
  }
}
