import { create } from 'zustand';
import { MOCK_USER } from '../utils/constants';

interface UserState {
  user: typeof MOCK_USER;
  selectedEquipment: number[];
  setEquipment: (equipment: number[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: MOCK_USER,
  selectedEquipment: [],
  setEquipment: (equipment) => set({ selectedEquipment: equipment }),
}));
