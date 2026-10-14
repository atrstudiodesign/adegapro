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
    const transaction = db.transaction(STORE_NAME, mode);
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
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
