import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useUserStore } from '../store/userStore';
import { Equipment } from '../types';
import { fetchEquipment, saveUserEquipment } from '../api/equipment';
import { MOCK_USER_ID } from '../utils/constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { selectedEquipment, setEquipment } = useUserStore();
  const [equipment, setEquipmentList] = React.useState<Equipment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      const data = await fetchEquipment();
      setEquipmentList(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEquipment = (equipmentId: number) => {
    if (selectedEquipment.includes(equipmentId)) {
      setEquipment(selectedEquipment.filter((id) => id !== equipmentId));
    } else {
      setEquipment([...selectedEquipment, equipmentId]);
    }
  };

  const handleContinue = async () => {
    if (selectedEquipment.length === 0) {
      alert('Please select at least one equipment type');
      return;
    }

    try {
      await saveUserEquipment(MOCK_USER_ID, selectedEquipment);
      console.log('Equipment saved successfully');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Failed to save equipment. Please try again.');
    }
  };

  if (loading === true) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to GymCoach</Text>
        <Text style={styles.subtitle}>
          Select the equipment you have access to
        </Text>
      </View>

      <FlatList
        data={equipment}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isSelected = selectedEquipment.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.card, isSelected === true && styles.cardSelected]}
              onPress={() => toggleEquipment(item.id)}
            >
              <Text style={styles.cardText}>{item.name}</Text>
              {isSelected === true ? <Text style={styles.checkmark}>✓</Text> : null}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            selectedEquipment.length === 0 && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedEquipment.length === 0 ? true : false}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  cardText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 20,
    color: '#2196f3',
  },
  footer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
