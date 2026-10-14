export async function initializeOfflineJournal(): Promise<void> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB indisponível.');
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('adega-pro-contingency-v1', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('journal')) {
        const store = db.createObjectStore('journal', { keyPath: 'id' });
        store.createIndex('by_store', ['tenantId', 'storeId']);
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Banco local bloqueado por outra aba.'));
    request.onsuccess = () => { request.result.close(); resolve(); };
  });
}
