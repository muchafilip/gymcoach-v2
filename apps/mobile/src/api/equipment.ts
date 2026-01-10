import { apiClient } from './client';
import { Equipment } from '../types';

export const fetchEquipment = async (): Promise<Equipment[]> => {
  const response = await apiClient.get<Equipment[]>('/equipment');
  return response.data;
};

export const getUserEquipment = async (): Promise<number[]> => {
  const response = await apiClient.get<number[]>('/equipment/me');
  return response.data;
};

export const saveUserEquipment = async (equipmentIds: number[]): Promise<void> => {
  await apiClient.put('/equipment/me', { equipmentIds });
};
