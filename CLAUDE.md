# GymCoach V2

A workout tracking app with multi-week progressive overload training plans.

## Project Structure

```
gymcoach-v2/
├── apps/
│   ├── api/          # ASP.NET Core 9 Web API
│   │   └── GymCoach.Api/
│   │       ├── Controllers/    # API endpoints
│   │       ├── Models/         # Entity models
│   │       ├── Services/       # Business logic
│   │       ├── Data/           # DbContext
│   │       └── Migrations/     # EF Core migrations
│   └── mobile/       # React Native + Expo app
│       └── src/
│           ├── api/           # API client functions
│           ├── db/            # SQLite database (offline-first)
│           ├── navigation/    # React Navigation setup
│           ├── screens/       # Screen components
│           ├── types/         # TypeScript types
│           └── utils/         # Constants, helpers
└── packages/         # Shared packages (future)
```

## Tech Stack

### Backend
- ASP.NET Core 9
- Entity Framework Core
- PostgreSQL (via Npgsql)
- Running on port 5104

### Mobile
- React Native with Expo
- TypeScript
- expo-sqlite (offline-first)
- React Navigation (bottom tabs + stack)
- Axios for API calls

## Key Features

1. **Multi-week workout plans** (4/6/8 weeks)
   - Pre-generated workout days with weekly progression
   - Same-day progression (Week 2 Day 1 based on Week 1 Day 1)

2. **Progressive overload**
   - 8-15 rep range tracking
   - +2.5kg when hitting 15 reps

3. **Plan management**
   - Create multiple plans
   - Switch between active plans
   - Deactivate/delete plans

4. **Exercise substitution**
   - Swap exercises based on equipment + muscle group

5. **Workout tracking**
   - Log sets, reps, weight
   - Mark workouts complete
   - View history

## Running the Project

### Backend
```bash
cd apps/api/GymCoach.Api
dotnet run
```

### Mobile
```bash
cd apps/mobile
npm start
```

### Database Migrations
```bash
cd apps/api/GymCoach.Api
dotnet ef database update
```

## Common Tasks

### Add a new EF migration
```bash
cd apps/api/GymCoach.Api
dotnet ef migrations add MigrationName
dotnet ef database update
```

### Mobile SQLite migrations
Edit `apps/mobile/src/db/init.ts` - add migration logic to `runMigrations()` function.

## API Endpoints

See `apps/api/README.md` for full API documentation.

Key endpoints:
- `POST /api/workouts/generate` - Create new workout plan
- `GET /api/workouts/user/{userId}/active-plan` - Get active plan
- `GET /api/workouts/user/{userId}/plans` - Get all user plans
- `POST /api/workouts/plans/{planId}/activate` - Set plan as active
- `POST /api/workouts/plans/{planId}/deactivate` - Deactivate plan
- `DELETE /api/workouts/plans/{planId}` - Delete plan
- `GET /api/workouts/plans/{planId}` - Get plan details
- `POST /api/workouts/days/{dayId}/complete` - Complete a workout day

## Mobile Screens

- **HomeScreen** - Dashboard with stats, next workout, recent activity
- **TemplatesScreen** - View templates, manage plans, create new plans
- **WorkoutPlanScreen** - Calendar/list view of workout days
- **WorkoutDayScreen** - Log sets, reps, weight for exercises
- **HistoryScreen** - View completed workouts
- **SettingsScreen** - App settings

## Development Notes

- Mock user ID is used (see `utils/constants.ts`)
- SQLite has migration system in `db/init.ts`
- Backend uses EF Core code-first migrations
- API client base URL in `api/client.ts`
