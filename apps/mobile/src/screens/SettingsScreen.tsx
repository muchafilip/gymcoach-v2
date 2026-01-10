import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';
import { useThemeStore } from '../store/themeStore';
import { performFullSync } from '../db/sync';
import { getUserEquipment, fetchEquipment } from '../api/equipment';
import { Equipment } from '../types';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user: authUser, signOut } = useAuthStore();
  const { setEquipment } = useUserStore();
  const { lastSyncedAt, setSyncing, setLastSynced } = useSyncStore();
  const { isDarkMode, colors, toggleTheme } = useThemeStore();
  const [localSyncing, setLocalSyncing] = useState(false);
  const [equipmentNames, setEquipmentNames] = useState<string[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);

  useEffect(() => {
    loadUserEquipment();
  }, []);

  const loadUserEquipment = async () => {
    try {
      const [userEquipmentIds, allEquipment] = await Promise.all([
        getUserEquipment(),
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
      await performFullSync();
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

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <Text style={[styles.value, { color: colors.text }]}>{authUser?.displayName || 'User'}</Text>
        </View>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{authUser?.email || '-'}</Text>
        </View>
        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]} onPress={handleSignOut}>
          <Text style={[styles.signOutButtonText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync</Text>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last synced</Text>
          <Text style={[styles.value, { color: colors.text }]}>{formatLastSync()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: colors.primary }, localSyncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={localSyncing}
        >
          {localSyncing ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.syncButtonText, { color: colors.buttonText }]}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment</Text>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>My Equipment</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {loadingEquipment ? 'Loading...' : equipmentNames.length > 0 ? equipmentNames.join(', ') : 'None'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleEditEquipment}>
          <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Equipment</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={[styles.card, { borderBottomColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Version</Text>
          <Text style={[styles.value, { color: colors.text }]}>1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  syncButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
