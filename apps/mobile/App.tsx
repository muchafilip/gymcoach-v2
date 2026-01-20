import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/init';
import { syncReferenceData } from './src/db/sync';
import { initNetwork } from './src/utils/network';
import { initPurchases } from './src/services/purchases';
import { useFeatureStore } from './src/store/featureStore';

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState('Initializing...');
  const { syncPremiumStatus } = useFeatureStore();

  React.useEffect(() => {
    async function prepare() {
      try {
        // Initialize database
        setSyncStatus('Initializing database...');
        await initDatabase();
        console.log('Database initialized successfully');

        // Initialize network monitoring (for offline support)
        setSyncStatus('Checking network...');
        await initNetwork();

        // Initialize RevenueCat purchases
        setSyncStatus('Initializing purchases...');
        try {
          await initPurchases();
          // Sync premium status from RevenueCat
          await syncPremiumStatus();
          console.log('Purchases initialized successfully');
        } catch (purchaseError) {
          console.warn('Purchases initialization failed, continuing:', purchaseError);
        }

        // Try to sync reference data from backend (skips if offline)
        try {
          setSyncStatus('Syncing data...');
          await syncReferenceData();
          console.log('Initial sync completed');
        } catch (syncError) {
          console.warn('Sync failed, continuing offline:', syncError);
          setSyncStatus('Running offline');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setSyncStatus('Initialization failed');
      } finally {
        // Always mark as ready so app can start
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (isReady === false) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>{syncStatus}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
});
