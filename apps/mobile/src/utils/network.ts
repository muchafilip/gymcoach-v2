import NetInfo from '@react-native-community/netinfo';
import { syncPendingChanges } from '../api/syncManager';

// Default to false until we confirm network status
let online = false;
let initialized = false;

export const initNetwork = async (): Promise<void> => {
  // Get initial state synchronously
  const state = await NetInfo.fetch();
  online = state.isConnected ?? false;
  initialized = true;
  console.log(`[Network] Initial status: ${online ? 'online' : 'offline'}`);

  // Listen for changes
  NetInfo.addEventListener(state => {
    const wasOffline = !online;
    online = state.isConnected ?? false;

    console.log(`[Network] Status changed: ${online ? 'online' : 'offline'}`);

    // Sync when coming back online
    if (online && wasOffline && initialized) {
      console.log('[Network] Back online - syncing pending changes...');
      syncPendingChanges();
    }
  });
};

export const isOnline = () => online;
