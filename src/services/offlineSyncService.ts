// Local Persistence & Offline Sync Service for ADEGA PRO POS
// Ensures 100% operation when connection drops and seamlessly reconciles data on reconnection.

import { Sale, CashMovement } from '../types';
import { soundService } from './soundService';

export interface SyncItem {
  id: string;
  type: 'SALE' | 'CASH_MOVEMENT';
  dataId: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
}

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_SUCCESS' | 'SYNC_ERROR';

type Listener = (state: {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  lastSyncTime: string | null;
  isSimulatedOffline: boolean;
}) => void;

const STORAGE_PREFIX = 'toba_saas_v1_';

class OfflineSyncService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private syncState: SyncState = 'ONLINE';
  private lastSyncTime: string | null = null;
  private listeners: Set<Listener> = new Set();
  private isSyncingInProgress: boolean = false;

  constructor() {
    this.restoreState();
    this.setupNetworkListeners();
    // Auto-check and reconcile queue on load if online
    if (this.isOnline()) {
      setTimeout(() => {
        this.processQueue();
      }, 1200);
    }
  }

  private restoreState() {
    try {
      const savedLastSync = localStorage.getItem(STORAGE_PREFIX + 'last_sync_time');
      if (savedLastSync) {
        this.lastSyncTime = savedLastSync;
      }
      const savedSimOffline = localStorage.getItem(STORAGE_PREFIX + 'simulated_offline');
      if (savedSimOffline) {
        this.isSimulatedOffline = savedSimOffline === 'true';
      }
      this.syncState = this.isOnline() ? 'ONLINE' : 'OFFLINE';
    } catch {
      // LocalStorage fallback
    }
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnlineStatus = true;
      if (!this.isSimulatedOffline) {
        this.syncState = 'ONLINE';
        this.notify();
        // Auto-sync immediately when internet comes back
        this.processQueue();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnlineStatus = false;
      this.syncState = 'OFFLINE';
      this.notify();
      soundService.playWarning();
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({
      isOnline: this.isOnline(),
      syncState: this.syncState,
      pendingCount: this.getPendingCount(),
      lastSyncTime: this.lastSyncTime,
      isSimulatedOffline: this.isSimulatedOffline
    });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const payload = {
      isOnline: this.isOnline(),
      syncState: this.syncState,
      pendingCount: this.getPendingCount(),
      lastSyncTime: this.lastSyncTime,
      isSimulatedOffline: this.isSimulatedOffline
    };
    this.listeners.forEach(l => l(payload));
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return this.isOnlineStatus;
  }

  public getIsSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(simulated: boolean): void {
    this.isSimulatedOffline = simulated;
    try {
      localStorage.setItem(STORAGE_PREFIX + 'simulated_offline', String(simulated));
    } catch {
      // Ignore
    }
    if (simulated) {
      this.syncState = 'OFFLINE';
      soundService.playWarning();
    } else {
      this.syncState = this.isOnlineStatus ? 'ONLINE' : 'OFFLINE';
      if (this.isOnlineStatus) {
        this.processQueue();
      }
    }
    this.notify();
  }

  // --- Queue Management ---
  public getQueue(): SyncItem[] {
    try {
      const data = localStorage.getItem(STORAGE_PREFIX + 'sync_queue');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setQueue(queue: SyncItem[]): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'sync_queue', JSON.stringify(queue));
    } catch {
      // Fallback
    }
  }

  public getPendingCount(): number {
    return this.getQueue().filter(i => i.status !== 'SYNCED').length;
  }

  public getPendingItems(): SyncItem[] {
    return this.getQueue().filter(i => i.status !== 'SYNCED');
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  public enqueueSale(sale: Sale): void {
    const queue = this.getQueue();
    // Avoid duplicates
    if (queue.some(i => i.dataId === sale.id)) return;

    const item: SyncItem = {
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type: 'SALE',
      dataId: sale.id,
      payload: sale,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING'
    };

    queue.push(item);
    this.setQueue(queue);
    this.notify();

    // If online, auto-sync
    if (this.isOnline() && !this.isSyncingInProgress) {
      this.processQueue();
    }
  }

  public enqueueCashMovement(movement: CashMovement): void {
    const queue = this.getQueue();
    if (queue.some(i => i.dataId === movement.id)) return;

    const item: SyncItem = {
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type: 'CASH_MOVEMENT',
      dataId: movement.id,
      payload: movement,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING'
    };

    queue.push(item);
    this.setQueue(queue);
    this.notify();

    if (this.isOnline() && !this.isSyncingInProgress) {
      this.processQueue();
    }
  }

  /**
   * Process and synchronize pending items with server/cloud
   */
  public async processQueue(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (!this.isOnline()) {
      this.syncState = 'OFFLINE';
      this.notify();
      return { success: false, syncedCount: 0, error: 'Terminal sem conexão com a internet.' };
    }

    if (this.isSyncingInProgress) {
      return { success: true, syncedCount: 0 };
    }

    const queue = this.getQueue();
    const pending = queue.filter(i => i.status !== 'SYNCED');

    if (pending.length === 0) {
      this.syncState = 'ONLINE';
      this.notify();
      return { success: true, syncedCount: 0 };
    }

    this.isSyncingInProgress = true;
    this.syncState = 'SYNCING';
    this.notify();

    let successfullySynced = 0;

    try {
      // Simulate real cloud sync with latency and batch reconciliation
      await new Promise(resolve => setTimeout(resolve, 800));

      const updatedQueue = [...queue];

      // Retrieve sales from localStorage directly using standard prefix
      let allSales: Sale[] = [];
      let allMovements: CashMovement[] = [];
      try {
        const rawSales = localStorage.getItem(STORAGE_PREFIX + 'sales');
        if (rawSales) allSales = JSON.parse(rawSales);
        const rawMovs = localStorage.getItem(STORAGE_PREFIX + 'cashMovements');
        if (rawMovs) allMovements = JSON.parse(rawMovs);
      } catch {
        // Continue
      }

      let hasDbUpdates = false;

      for (const item of pending) {
        try {
          // Reconcile / mark as synced in Local Database
          if (item.type === 'SALE') {
            const saleIdx = allSales.findIndex(s => s.id === item.dataId);
            if (saleIdx !== -1) {
              allSales[saleIdx].isOfflineSyncPending = false;
              allSales[saleIdx].syncedAt = new Date().toISOString();
              hasDbUpdates = true;
            }
          } else if (item.type === 'CASH_MOVEMENT') {
            const movIdx = allMovements.findIndex(m => m.id === item.dataId);
            if (movIdx !== -1) {
              allMovements[movIdx].isOfflineSyncPending = false;
              allMovements[movIdx].syncedAt = new Date().toISOString();
              hasDbUpdates = true;
            }
          }

          // Mark item in queue
          const qIdx = updatedQueue.findIndex(q => q.id === item.id);
          if (qIdx !== -1) {
            updatedQueue[qIdx].status = 'SYNCED';
          }
          successfullySynced++;
        } catch (itemErr: any) {
          const qIdx = updatedQueue.findIndex(q => q.id === item.id);
          if (qIdx !== -1) {
            updatedQueue[qIdx].retryCount += 1;
            updatedQueue[qIdx].status = 'ERROR';
            updatedQueue[qIdx].errorMessage = itemErr?.message || 'Falha na reconciliação';
          }
        }
      }

      // Persist cleaned queue (remove synced items)
      const remainingItems = updatedQueue.filter(i => i.status !== 'SYNCED');
      this.setQueue(remainingItems);

      // Save database updates
      if (hasDbUpdates) {
        try {
          localStorage.setItem(STORAGE_PREFIX + 'sales', JSON.stringify(allSales));
          localStorage.setItem(STORAGE_PREFIX + 'cashMovements', JSON.stringify(allMovements));
        } catch {
          // Ignore
        }
      }

      this.lastSyncTime = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_PREFIX + 'last_sync_time', this.lastSyncTime);
      } catch {
        // Ignore
      }

      this.syncState = 'SYNC_SUCCESS';
      soundService.playTransactionSuccess();

      setTimeout(() => {
        if (this.syncState === 'SYNC_SUCCESS') {
          this.syncState = 'ONLINE';
          this.notify();
        }
      }, 3500);

      return { success: true, syncedCount: successfullySynced };
    } catch (err: any) {
      console.error('[OfflineSyncService] Erro ao sincronizar dados:', err);
      this.syncState = 'SYNC_ERROR';
      return { success: false, syncedCount: successfullySynced, error: err?.message || 'Falha no processo de sincronização' };
    } finally {
      this.isSyncingInProgress = false;
      this.notify();
    }
  }

  public clearQueue(): void {
    this.setQueue([]);
    this.notify();
  }
}

export const offlineSyncService = new OfflineSyncService();
