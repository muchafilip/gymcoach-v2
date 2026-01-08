import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { useSyncStore } from '../store/syncStore';
import { performFullSync } from '../db/sync';
import { getUserEquipment, fetchEquipment } from '../api/equipment';
import { MOCK_USER_ID } from '../utils/constants';
import { Equipment } from '../types';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, setEquipment } = useUserStore();
  const { isSyncing, lastSyncedAt, setSyncing, setLastSynced } = useSyncStore();
  const [localSyncing, setLocalSyncing] = useState(false);
  const [equipmentNames, setEquipmentNames] = useState<string[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);

  useEffect(() => {
    loadUserEquipment();
  }, []);

  const loadUserEquipment = async () => {
    try {
      const [userEquipmentIds, allEquipment] = await Promise.all([
        getUserEquipment(MOCK_USER_ID),
        fetchEquipment(),
      ]);

      // Update user store with current equipment
      setEquipment(userEquipmentIds);

      // Get equipment names for display
      const names = allEquipment
        .filter((e: Equipment) => userEquipmentIds.includes(e.id))
        .map((e: Equipment) => e.name);
      setEquipmentNames(names);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleEditEquipment = () => {
    // Navigate to onboarding to re-select equipment
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      })
    );
  };

  const handleSync = async () => {
    setLocalSyncing(true);
    setSyncing(true);

    try {
      await performFullSync(MOCK_USER_ID);
      setLastSynced(new Date());
      Alert.alert('Success', 'Data synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync data. Check your connection.');
    } finally {
      setLocalSyncing(false);
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncedAt) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSyncedAt.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user.displayName}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Subscription</Text>
          <Text style={styles.value}>{user.subscriptionStatus.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Last synced</Text>
          <Text style={styles.value}>{formatLastSync()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, localSyncing === true && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={localSyncing === true}
        >
          {localSyncing === true ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment</Text>
        <View style={styles.card}>
          <Text style={styles.label}>My Equipment</Text>
          <Text style={styles.value}>
            {loadingEquipment ? 'Loading...' : equipmentNames.length > 0 ? equipmentNames.join(', ') : 'None'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditEquipment}>
          <Text style={styles.editButtonText}>Edit Equipment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  syncButton: {
    marginTop: 16,
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    marginTop: 16,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
});
