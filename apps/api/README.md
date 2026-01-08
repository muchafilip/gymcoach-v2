# GymCoach API

ASP.NET Core 9 Web API for the GymCoach workout tracking app.

## Setup

1. Ensure PostgreSQL is running
2. Update connection string in `appsettings.json` if needed
3. Run migrations: `dotnet ef database update`
4. Start server: `dotnet run`

Server runs on `http://localhost:5104`

## Project Structure

```
GymCoach.Api/
├── Controllers/
│   ├── WorkoutsController.cs   # Workout plan & day endpoints
│   ├── TemplatesController.cs  # Workout template endpoints
│   └── ReferenceController.cs  # Equipment, muscles, exercises
├── Models/
│   ├── User.cs
│   ├── UserWorkoutPlan.cs      # Multi-week plan with duration
│   ├── UserWorkoutDay.cs       # Individual workout day
│   ├── UserExerciseLog.cs      # Exercise in a workout
│   ├── ExerciseSet.cs          # Individual set
│   ├── WorkoutTemplate.cs      # Template definitions
│   ├── WorkoutDayTemplate.cs   # Day within template
│   ├── Exercise.cs             # Exercise definitions
│   ├── Equipment.cs            # Gym equipment
│   └── MuscleGroup.cs          # Muscle group definitions
├── Services/
│   ├── WorkoutGeneratorService.cs  # Plan generation logic
│   └── ProgressionService.cs       # Progressive overload calculations
├── Data/
│   └── GymCoachDbContext.cs        # EF Core DbContext
└── Migrations/                      # EF Core migrations
```

## Key Models

### UserWorkoutPlan
- `DurationWeeks` - 4, 6, or 8 weeks
- `IsActive` - Only one active plan per user
- Links to WorkoutTemplate

### UserWorkoutDay
- `WeekNumber` - Which week (1-8)
- `DayNumber` - Sequential day number in plan
- `DayTypeId` - Links to template day type for progression

## API Endpoints

### Workout Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workouts/generate` | Generate new workout plan |
| GET | `/api/workouts/plans/{planId}` | Get plan with all days |
| GET | `/api/workouts/user/{userId}/plans` | Get all user's plans |
| GET | `/api/workouts/user/{userId}/active-plan` | Get active plan |
| POST | `/api/workouts/plans/{planId}/activate` | Set as active plan |
| POST | `/api/workouts/plans/{planId}/deactivate` | Deactivate plan |
| DELETE | `/api/workouts/plans/{planId}` | Delete plan permanently |

### Workout Days

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts/days/{dayId}` | Get workout day details |
| GET | `/api/workouts/plans/{planId}/current` | Get next incomplete day |
| POST | `/api/workouts/days/{dayId}/complete` | Mark day complete |

### Sets

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/workouts/sets/{setId}` | Update set (reps, weight, completed) |
| POST | `/api/workouts/exercises/{exerciseLogId}/sets` | Add extra set |

### Exercise Substitution

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts/exercises/alternatives/{exerciseId}` | Get alternative exercises |
| POST | `/api/workouts/exercises/{exerciseLogId}/substitute/{newExerciseId}` | Swap exercise |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | Get all workout templates |
| GET | `/api/templates/{id}` | Get template with days |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reference/equipment` | Get all equipment |
| GET | `/api/reference/muscles` | Get all muscle groups |
| GET | `/api/reference/exercises` | Get all exercises |

## Request/Response Examples

### Generate Plan
```json
POST /api/workouts/generate
{
  "userId": 1,
  "templateId": 1,
  "durationWeeks": 8
}
```

### Update Set
```json
PUT /api/workouts/sets/123
{
  "actualReps": 12,
  "weight": 50.0,
  "completed": true
}
```

## Services

### WorkoutGeneratorService

Handles plan generation:
- `GenerateWorkoutPlan(userId, templateId, durationWeeks)` - Create multi-week plan
- `GetActivePlan(userId)` - Get current active plan
- `ActivatePlan(planId, userId)` - Set plan as active
- `CheckAndGenerateNextWeek(planId)` - Auto-generate next week when current week completes
- `GetExerciseAlternatives(exerciseId, userId)` - Find swap options
- `SubstituteExercise(exerciseLogId, newExerciseId, userId)` - Perform swap

### ProgressionService

Handles progressive overload:
- `CalculateNextTarget(userId, exerciseId, dayTypeId?)` - Calculate next set targets
- Uses 8-15 rep range
- +2.5kg when hitting 15 reps
- `dayTypeId` filter ensures same-day progression (Week 2 Day 1 based on Week 1 Day 1)

## Database Migrations

```bash
# Add new migration
dotnet ef migrations add MigrationName

# Apply migrations
dotnet ef database update

# Remove last migration (if not applied)
dotnet ef migrations remove
```
