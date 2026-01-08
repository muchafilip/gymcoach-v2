import { apiClient } from './client';
import { Equipment } from '../types';

export const fetchEquipment = async (): Promise<Equipment[]> => {
  const response = await apiClient.get<Equipment[]>('/equipment');
  return response.data;
};

export const getUserEquipment = async (userId: number): Promise<number[]> => {
  const response = await apiClient.get<number[]>(`/equipment/user/${userId}`);
  return response.data;
};

export const saveUserEquipment = async (userId: number, equipmentIds: number[]): Promise<void> => {
  await apiClient.put(`/equipment/user/${userId}`, { equipmentIds });
};
