import NetInfo from '@react-native-community/netinfo';
import { syncPendingChanges } from '../api/syncManager';

let online = true;

export const initNetwork = () => {
  // Get initial state
  NetInfo.fetch().then(state => {
    online = state.isConnected ?? true;
  });

  // Listen for changes
  NetInfo.addEventListener(state => {
    const wasOffline = !online;
    online = state.isConnected ?? false;

    console.log(`[Network] Status: ${online ? 'online' : 'offline'}`);

    // Sync when coming back online
    if (online && wasOffline) {
      console.log('[Network] Back online - syncing pending changes...');
      syncPendingChanges();
    }
  });
};

export const isOnline = () => online;
