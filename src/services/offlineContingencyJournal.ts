/**
 * Offline contingency journal foundation.
 *
 * This is NOT an offline sale finalizer. Entries remain pending until a
 * server-side idempotent reconciliation endpoint has been implemented.
 * Do not store PINs, auth tokens, payment credentials or customer PII here.
 */
export type ContingencyEntry = {
  id: string;
  tenantId: string;
  storeId: string;
  operatorId: string;
  cashRegisterId: string;
  cashSessionId: string;
  createdAt: string;
  kind: 'SALE_DRAFT' | 'CASH_MOVEMENT_DRAFT';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'REVIEW_REQUIRED';
};

const DB_NAME = 'adega-pro-contingency-v1';
const STORE_NAME = 'journal';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Armazenamento offline indisponível neste dispositivo.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_store', ['tenantId', 'storeId']);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    const transaction = db.transaction(STORE_NAME, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    // Ask the browser for the strongest supported commit durability. Some browsers
    // may ignore this hint; an exported backup remains necessary.
    if (mode === 'readwrite' && 'durability' in transaction) {
      // The durability option must be selected when opening a transaction;
      // no mutation of the transaction is attempted here.
    }
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    operation(transaction.objectStore(STORE_NAME), value => { result = value; });
  });
}

/** Caller must use a UUID generated once per operation, including retries. */
export async function recordContingencyDraft(entry: ContingencyEntry): Promise<void> {
  if (!entry.id || !entry.tenantId || !entry.storeId || !entry.operatorId ||
      !entry.cashRegisterId || !entry.cashSessionId || !entry.createdAt) {
    throw new Error('Identificação completa do operador, loja, caixa e turno é obrigatória.');
  }
  if (entry.status !== 'PENDING') throw new Error('Novos registros devem começar como pendentes.');
  if (entry.kind !== 'SALE_DRAFT' && entry.kind !== 'CASH_MOVEMENT_DRAFT') throw new Error('Tipo de registro inválido.');
  if (!Number.isFinite(Date.parse(entry.createdAt))) throw new Error('Data do registro inválida.');
  await transact<void>('readwrite', (store, done) => {
    // add, not put: a repeated operation must never overwrite the original draft.
    const request = store.add(entry);
    request.onsuccess = () => done(undefined);
  });
}

export async function listContingencyDrafts(
  tenantId: string,
  storeId: string,
): Promise<ContingencyEntry[]> {
  if (!tenantId || !storeId) throw new Error('Loja não identificada.');
  return transact<ContingencyEntry[]>('readonly', (store, done) => {
    const request = store.index('by_store').getAll([tenantId, storeId]);
    request.onsuccess = () => done(request.result as ContingencyEntry[]);
  });
}

export async function flagContingencyDraftForReview(
  id: string,
  tenantId: string,
  storeId: string,
): Promise<void> {
  await transact<void>('readwrite', (store, done) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const entry = request.result as ContingencyEntry | undefined;
      if (!entry || entry.tenantId !== tenantId || entry.storeId !== storeId) {
        store.transaction.abort();
        return;
      }
      const update = store.put({ ...entry, status: 'REVIEW_REQUIRED' });
      update.onsuccess = () => done(undefined);
    };
  });
}

/** Export a scoped recovery copy without deleting any local entries. */
export async function exportContingencyRecoveryFile(
  tenantId: string,
  storeId: string,
): Promise<Blob> {
  const entries = await listContingencyDrafts(tenantId, storeId);
  const payload = {
    format: 'ADEGA_PRO_OFFLINE_RECOVERY',
    version: 1,
    tenantId,
    storeId,
    exportedAt: new Date().toISOString(),
    entries,
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

/** Validate a recovery copy. This deliberately never imports or replays sales. */
export function validateContingencyRecoveryFile(
  raw: unknown,
  tenantId: string,
  storeId: string,
): ContingencyEntry[] {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido.');
  const file = raw as Record<string, unknown>;
  if (file.format !== 'ADEGA_PRO_OFFLINE_RECOVERY' || file.version !== 1 ||
      file.tenantId !== tenantId || file.storeId !== storeId || !Array.isArray(file.entries)) {
    throw new Error('Backup offline incompatível ou pertencente a outra loja.');
  }
  const ids = new Set<string>();
  for (const item of file.entries) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(item.id) ||
        ids.has(item.id) || item.tenantId !== tenantId || item.storeId !== storeId ||
        !item.operatorId || !item.cashRegisterId || !item.cashSessionId ||
        !Number.isFinite(Date.parse(item.createdAt)) ||
        !['PENDING','REVIEW_REQUIRED'].includes(item.status) ||
        !['SALE_DRAFT','CASH_MOVEMENT_DRAFT'].includes(item.kind) ||
        !item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload)) {
      throw new Error('Arquivo contém registros inválidos ou duplicados.');
    }
    ids.add(item.id);
  }
  return file.entries as ContingencyEntry[];
}
