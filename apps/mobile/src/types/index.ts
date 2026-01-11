// Auth types
export interface AuthUser {
  id: number;
  email: string;
  displayName?: string;
  profilePictureUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

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

// Exercise classification types
export type ExerciseType = 'Compound' | 'Isolation';
export type ExerciseRole = 'MainMover' | 'Accessory' | 'Finisher';

export interface UserExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  primaryMuscleGroup?: string;
  exerciseType?: ExerciseType;
  exerciseRole?: ExerciseRole;
  supersetGroupId?: number;
  supersetOrder?: number;
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
  personalRecords: PersonalRecord[];
}

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  maxWeight: number;
  bestSetReps: number;
  bestSetWeight: number;
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

// Rep Scheme types
export type RepSchemeType =
  | 'Power'
  | 'Strength'
  | 'Hypertrophy'
  | 'MuscularEndurance'
  | 'CardioHiit'
  | 'EMOM'
  | 'AMRAP'
  | 'TimedSet'
  | 'Custom';

export interface RepScheme {
  id: number;
  name: string;
  type: RepSchemeType;
  minReps?: number;
  maxReps?: number;
  targetSets?: number;
  durationSeconds?: number;
  restSeconds?: number;
  isSystem: boolean;
}

// Superset types
export interface SupersetTemplate {
  id: number;
  name: string;
  isAntagonist: boolean;
  muscleGroupA: string;
  muscleGroupB: string;
}

export interface SupersetSuggestion {
  templateId: number;
  templateName: string;
  exerciseAId: number;
  exerciseAName: string;
  exerciseBId: number;
  exerciseBName: string;
}

export interface Superset {
  id: number;
  exerciseLogAId: number;
  exerciseLogBId: number;
  isManual: boolean;
}

// Custom Template types
export interface CustomTemplate {
  id: number;
  name: string;
  description?: string;
  days: CustomTemplateDay[];
}

export interface CustomTemplateDay {
  id: number;
  dayNumber: number;
  name: string;
  exercises: CustomTemplateExercise[];
}

export interface CustomTemplateExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  primaryMuscleGroup: string;
  orderIndex: number;
  sets: number;
  targetReps: number;
  defaultWeight?: number;
  notes?: string;
}
