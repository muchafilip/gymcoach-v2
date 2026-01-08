export interface Equipment {
  id: number;
  name: string;
  icon?: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  primaryMuscleGroup: string;
  secondaryMuscleGroups: string[];
  requiredEquipment: string[];
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description?: string;
  isPremium: boolean;
  dayCount?: number;
}

export interface WorkoutDayTemplate {
  id: number;
  dayNumber: number;
  name: string;
  targetMuscles: TargetMuscle[];
}

export interface TargetMuscle {
  muscleGroupId: number;
  muscleGroupName: string;
  exerciseCount: number;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  subscriptionStatus: 'free' | 'premium' | 'cancelled';
}

export interface UserWorkoutPlan {
  id: number;
  userId: number;
  templateId: number;
  templateName?: string;
  startDate: string;
  durationWeeks: number;
  isActive: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface UserWorkoutDay {
  id: number;
  planId: number;
  dayNumber: number;
  weekNumber: number;
  dayTypeId: number;
  name: string;
  scheduledDate?: string;
  completedAt?: string;
  exercises: UserExercise[];
  syncStatus: 'pending' | 'synced' | 'error';
}

export interface ExerciseAlternative {
  id: number;
  name: string;
  description?: string;
}

export interface UserExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  orderIndex: number;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  id: number;
  setNumber: number;
  targetReps: number;
  actualReps?: number;
  weight?: number;
  completed: boolean;
}

export interface SyncQueueItem {
  id: number;
  tableName: string;
  recordId: number;
  operation: 'insert' | 'update' | 'delete';
  payload: string;
  createdAt: string;
}

export interface HomeData {
  totalWeightLifted: number;
  workoutsCompleted: number;
  nextWorkout: NextWorkout | null;
  recentWorkouts: RecentWorkout[];
}

export interface NextWorkout {
  dayId: number;
  planId: number;
  dayName: string;
  planName: string;
  weekNumber: number;
}

export interface RecentWorkout {
  id: number;
  name: string;
  completedAt: string;
  exerciseCount: number;
}
