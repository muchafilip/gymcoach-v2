# GymCoach V2

A workout tracking app with multi-week progressive overload training plans.

## Quick Reference Commands

### Database (PostgreSQL)

```bash
# Connect to PostgreSQL
/opt/homebrew/opt/postgresql@17/bin/psql -h localhost -U fm -d gymcoach

# Common queries
SELECT * FROM "WorkoutTemplates";
SELECT * FROM "Exercises" WHERE "Id" > 40;
SELECT * FROM "CustomTemplateExercises" WHERE "WorkoutDayTemplateId" = 100;
SELECT * FROM "UserWorkoutPlans" WHERE "IsActive" = true;
```

### API (.NET Backend)

```bash
cd /Users/fm/dev/gymcoach-v2/apps/api/GymCoach.Api

# Build
/opt/homebrew/bin/dotnet build

# Run (port 5104)
/opt/homebrew/bin/dotnet run

# Create migration
DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec /Users/fm/.dotnet/tools/dotnet-ef migrations add MigrationName

# Apply migrations
DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec /Users/fm/.dotnet/tools/dotnet-ef database update

# Remove last migration
DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec /Users/fm/.dotnet/tools/dotnet-ef migrations remove --force
```

### Mobile App (React Native/Expo)

```bash
cd /Users/fm/dev/gymcoach-v2/apps/mobile

# Install dependencies
/opt/homebrew/bin/npm install

# Type check
npx tsc --noEmit --skipLibCheck

# Start Expo dev server
npx expo start

# Prebuild for native (iOS/Android)
npx expo prebuild

# Install specific packages
/opt/homebrew/bin/npm install <package-name>
```

## Project Structure

```
gymcoach-v2/
├── apps/
│   ├── api/                    # .NET 8 Backend
│   │   └── GymCoach.Api/
│   │       ├── Controllers/    # REST endpoints
│   │       ├── Services/       # Business logic (WorkoutGeneratorService)
│   │       ├── Models/         # EF Core entities
│   │       ├── Data/           # DbContext, SeedData
│   │       └── Migrations/     # EF migrations
│   │
│   └── mobile/                 # React Native + Expo
│       ├── src/
│       │   ├── screens/        # Screen components
│       │   ├── components/     # Shared components (FAB, PremiumGate)
│       │   ├── api/            # API client functions
│       │   ├── store/          # Zustand stores (auth, theme, features)
│       │   ├── db/             # SQLite (offline support)
│       │   ├── navigation/     # React Navigation
│       │   ├── services/       # RevenueCat purchases
│       │   └── types/          # TypeScript types
│       └── App.tsx
```

## Key Files

| Purpose | File |
|---------|------|
| Premium gating | `src/store/featureStore.ts` |
| Workout generation | `Services/WorkoutGeneratorService.cs` |
| Template exercises | `Data/SeedData.cs` |
| RevenueCat setup | `src/services/purchases.ts` |
| Navigation | `src/navigation/AppNavigator.tsx` |
| Theme colors | `src/store/themeStore.ts` |
| Floating button | `src/components/FloatingActionButton.tsx` |

## Database Schema

| Table | Purpose |
|-------|---------|
| `WorkoutTemplates` | System + user templates (`UserId` null = system) |
| `WorkoutDayTemplates` | Days within a template |
| `CustomTemplateExercises` | Pinned exercises (overrides random selection) |
| `WorkoutDayTemplateMuscle` | Target muscles for random exercise selection |
| `UserWorkoutPlans` | User's generated plans from templates |
| `UserWorkoutDays` | Individual workout days |
| `UserExerciseLogs` | Exercises in a workout day |
| `ExerciseSets` | Sets within an exercise |

## Common Database Operations

### Add exercises
```sql
INSERT INTO "Exercises" ("Id", "Name", "PrimaryMuscleGroupId", "Description", "Type", "DefaultRole")
VALUES (45, 'Conventional Deadlift', 2, 'Full-body compound lift', 1, 1);

INSERT INTO "ExerciseEquipment" ("ExerciseId", "EquipmentId")
VALUES (45, 3);  -- Barbell
```

### Pin exercises to template day
```sql
INSERT INTO "CustomTemplateExercises" ("WorkoutDayTemplateId", "ExerciseId", "OrderIndex", "Sets", "TargetReps")
VALUES (100, 45, 0, 4, 5);  -- Deadlift 4x5 as first exercise
```

### Check template exercises
```sql
SELECT cte.*, e."Name"
FROM "CustomTemplateExercises" cte
JOIN "Exercises" e ON cte."ExerciseId" = e."Id"
WHERE cte."WorkoutDayTemplateId" IN (100, 101, 102, 103);
```

## RevenueCat Setup

1. Edit `src/services/purchases.ts` line 19
2. Replace `'YOUR_API_KEY_HERE'` with RevenueCat API key
3. Create "premium" entitlement in RevenueCat dashboard
4. Add subscription products in App Store Connect / Google Play Console

## Premium Feature Flags

Features in `featureStore.ts`:
- `supersets` - Premium
- `advancedStats` - Premium
- `progressCharts` - Premium
- `smartProgression` - Premium
- `xpSystem` - Premium
- `insights` - Premium
- `exerciseSwap` - Free
- `workoutTimer` - Free
- `restTimer` - Free

`devModeEnabled` bypasses premium checks in dev builds.

## Troubleshooting

### Template not showing correct exercises
1. Check `CustomTemplateExercises` table for pinned exercises
2. If empty, generator uses random selection based on `WorkoutDayTemplateMuscle`
3. Add pinned exercises to control exact selection

### Premium features accessible without subscription
1. Check `featureStore.ts` - `devModeEnabled` bypasses premium
2. Check `TemplatesScreen.tsx` - premium template tap should go to Paywall

### Migration ID conflicts
1. If ID conflicts occur, manually insert with different ID
2. Update SeedData.cs for future fresh installs

### API not connecting
1. Check API is running on port 5104
2. Check mobile `api/client.ts` base URL
3. Check network connectivity

## API Endpoints

Key endpoints:
- `POST /api/workouts/generate` - Create new workout plan
- `GET /api/workouts/home` - Dashboard data
- `GET /api/workouts/active-plan` - Get active plan
- `GET /api/workouts/plans` - Get all user plans
- `POST /api/workouts/plans/{id}/activate` - Set plan as active
- `GET /api/workouts/days/{id}` - Get workout day details
- `POST /api/workouts/days/{id}/complete` - Complete workout day
- `PUT /api/workouts/sets/{id}` - Update set (reps, weight)
- `POST /api/workouts/progression/batch` - Get progression for multiple exercises (1 call vs N)

## Architecture Notes

### Workout Generation Flow
1. User picks template → `POST /generate` → Creates `UserWorkoutPlan` + Week 1 days
2. User completes day → `POST /complete` → Generates next occurrence of same day type
3. Progressive overload: If ALL sets hit target reps, TargetReps +1 (max 15)

### Key Concept: DayTypeId
- Each workout day has a `DayTypeId` that identifies its template (Push, Pull, Legs, etc.)
- Week 1 Push (DayTypeId=4) → Week 2 Push (DayTypeId=4) → progression carries over
- This enables day-type-specific progression instead of whole-week generation

### Mobile Offline Architecture
- SQLite mirrors server data for offline access
- SyncQueue stores pending mutations
- `isOnline()` check before API calls, fallback to local
- Sync runs on app focus and after completing workouts

### Performance Tips
- Use batch endpoints (`/progression/batch`) instead of N single calls
- Avoid SaveChangesAsync() in loops - batch DB operations
- Use navigation properties for EF Core batch inserts

## Common Refactoring Patterns

### Mobile: Online/Offline Wrapper
```typescript
// Instead of repeating isOnline() + try/catch everywhere:
async function withFallback<T>(
  apiCall: () => Promise<T>,
  localFallback: () => Promise<T>
): Promise<T> {
  if (isOnline()) {
    try { return await apiCall(); }
    catch { /* fall through */ }
  }
  return localFallback();
}
```

### API: Include Chain Extensions
```csharp
// Instead of repeating .Include() chains:
public static IQueryable<UserWorkoutDay> IncludeFull(this IQueryable<UserWorkoutDay> query)
    => query.Include(d => d.WorkoutDayTemplate)
            .Include(d => d.ExerciseLogs).ThenInclude(el => el.Exercise)
            .Include(d => d.ExerciseLogs).ThenInclude(el => el.Sets);
```

## Future Improvements (Backlog)

### High Priority
- PR History tracking (track progression over time)
- Body composition/measurement tracking
- RPE (Rate of Perceived Exertion) logging

### Medium Priority
- Exercise variations/families (Squat → Back Squat, Front Squat, etc.)
- Social features (leaderboards, challenges)
- Nutrition integration (MyFitnessPal sync)

### Low Priority
- Coach dashboard (B2B)
- Apple Watch support
- Voice control for logging sets
