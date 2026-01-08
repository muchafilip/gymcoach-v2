import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  setSyncing: (syncing: boolean) => void;
  setLastSynced: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSynced: (date) => set({ lastSyncedAt: date }),
}));
