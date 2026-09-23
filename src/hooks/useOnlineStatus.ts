import { useEffect, useState } from 'react';
import { offlineSyncService, SyncState } from '../services/offlineSyncService';

export function useOnlineStatus() {
  const [status, setStatus] = useState(() => ({
    isOnline: offlineSyncService.isOnline(),
    syncState: (offlineSyncService.isOnline() ? 'ONLINE' : 'OFFLINE') as SyncState,
    pendingCount: offlineSyncService.getPendingCount(),
    lastSyncTime: offlineSyncService.getLastSyncTime(),
    isSimulatedOffline: offlineSyncService.getIsSimulatedOffline()
  }));

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe(newStatus => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return {
    ...status,
    syncNow: () => offlineSyncService.processQueue(),
    setSimulatedOffline: (val: boolean) => offlineSyncService.setSimulatedOffline(val)
  };
}
