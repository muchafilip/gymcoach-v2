import { create } from 'zustand';

interface UserState {
  selectedEquipment: number[];
  setEquipment: (equipment: number[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  selectedEquipment: [],
  setEquipment: (equipment) => set({ selectedEquipment: equipment }),
}));
