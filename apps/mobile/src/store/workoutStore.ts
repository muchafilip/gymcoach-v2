import { create } from 'zustand';
import { UserWorkoutDay } from '../types';

interface WorkoutState {
  currentWorkout: UserWorkoutDay | null;
  setCurrentWorkout: (workout: UserWorkoutDay | null) => void;
  updateSet: (exerciseLogId: number, setId: number, data: {
    actualReps?: number;
    weight?: number;
    completed?: boolean;
  }) => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  currentWorkout: null,
  setCurrentWorkout: (workout) => set({ currentWorkout: workout }),

  updateSet: (exerciseLogId, setId, data) => set((state) => {
    if (!state.currentWorkout) return state;

    const updatedExercises = state.currentWorkout.exercises.map((exercise) => {
      if (exercise.id !== exerciseLogId) return exercise;

      return {
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.id === setId ? { ...set, ...data } : set
        ),
      };
    });

    return {
      currentWorkout: {
        ...state.currentWorkout,
        exercises: updatedExercises,
      },
    };
  }),
}));
