# GymCoach Mobile App

React Native + Expo mobile app for workout tracking with offline-first SQLite storage.

## Setup

```bash
npm install
npm start
```

## Project Structure

```
src/
├── api/
│   ├── client.ts          # Axios instance configuration
│   ├── templates.ts       # Template API calls
│   └── workouts.ts        # Workout plan/day API calls
├── db/
│   ├── init.ts            # SQLite schema + migrations
│   └── sync.ts            # API to SQLite sync functions
├── navigation/
│   └── AppNavigator.tsx   # React Navigation setup
├── screens/
│   ├── HomeScreen.tsx     # Dashboard with stats
│   ├── TemplatesScreen.tsx # Template list + plan management
│   ├── WorkoutPlanScreen.tsx # Calendar/list view of days
│   ├── WorkoutDayScreen.tsx  # Exercise logging
│   ├── HistoryScreen.tsx     # Completed workouts
│   ├── SettingsScreen.tsx    # App settings
│   └── OnboardingScreen.tsx  # Initial setup
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    └── constants.ts       # App constants (API URL, mock user)
```

## Key Screens

### HomeScreen
Dashboard showing:
- Total weight lifted
- Workout streak
- Workouts this week
- Next workout preview with "Start" button
- Recent activity (clickable to view details)

### TemplatesScreen
Two sections:
1. **My Plans** - User's existing workout plans with progress
   - Tap to view, activate, deactivate, or delete
   - Active plan highlighted in blue
2. **Start New Plan** - Available templates
   - Select duration (4/6/8 weeks) when creating

### WorkoutPlanScreen
Two view modes (toggle at top):
1. **Calendar** - Grid view grouped by week
2. **List** - Sequential list with week/day numbers

Day cards show:
- Completed (green) vs incomplete (gray)
- Exercise count
- Tap to start/view workout

### WorkoutDayScreen
Exercise logging interface:
- Exercise list with set table
- For each set: target reps, actual reps input, weight input, complete checkbox
- "Complete Workout" button (enabled when all sets done)
- Completed workouts are read-only

### HistoryScreen
List of completed workouts:
- Day name, completion date
- Exercise and set counts
- Tap to view workout details

## Database Schema (SQLite)

### Core Tables
- `User` - User info
- `UserWorkoutPlan` - Multi-week plans (durationWeeks, isActive)
- `UserWorkoutDay` - Individual workout days (weekNumber, dayTypeId)
- `UserExerciseLog` - Exercise in a workout
- `ExerciseSet` - Set data (targetReps, actualReps, weight)

### Reference Tables (synced from API)
- `WorkoutTemplate` - Template definitions
- `WorkoutDayTemplate` - Days within templates
- `Exercise` - Exercise library
- `Equipment` - Gym equipment
- `MuscleGroup` - Muscle groups

## Database Migrations

SQLite migrations are handled in `db/init.ts`:

```typescript
const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  // Check if columns exist using PRAGMA table_info
  // Add columns with ALTER TABLE if missing
  // Create indexes after columns exist
};
```

Migration runs on every app start. Checks column existence before adding.

## API Client

Base URL configured in `api/client.ts`:
```typescript
const API_BASE_URL = 'http://192.168.x.x:5104/api';
```

Key functions in `api/workouts.ts`:
- `generateWorkoutPlan(userId, templateId, durationWeeks)`
- `getUserPlans(userId)`
- `getActivePlan(userId)`
- `activatePlan(planId, userId)`
- `deactivatePlan(planId)`
- `deletePlan(planId)`
- `getWorkoutPlanDetail(planId)`
- `completeWorkoutDay(dayId)`
- `updateSet(setId, data)`

## Sync Flow

1. Generate plan on API
2. Sync to SQLite via `syncWorkoutPlan(planId)`
3. Local reads from SQLite
4. Writes update SQLite + queue for API sync

## Navigation Structure

```
RootStack
├── Onboarding
└── MainTabs
    ├── Home (HomeScreen)
    ├── Templates (TemplatesStack)
    │   ├── TemplatesList
    │   ├── WorkoutPlan
    │   └── WorkoutDay
    ├── History (HistoryScreen)
    └── Settings (SettingsScreen)
```

## TypeScript Types

Key interfaces in `types/index.ts`:
- `WorkoutTemplate`
- `UserWorkoutPlan`
- `UserWorkoutDay`
- `ExerciseLog`
- `ExerciseSet`
- `ExerciseAlternative`

## Development Notes

- Mock user ID (1) used throughout - see `utils/constants.ts`
- Update API URL in `api/client.ts` for local development
- Clear Expo app data to reset SQLite database
- TypeScript strict mode enabled
