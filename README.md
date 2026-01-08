# GymCoach V2

A fitness workout planning and tracking app with progressive overload.

## Project Structure

```
/apps
  /api      - ASP.NET Core 9 Web API
  /mobile   - React Native (Expo) mobile app
  /admin    - React (Vite) admin panel
```

## Getting Started

### Prerequisites

- .NET 9 SDK
- Node.js 18+
- PostgreSQL database

### API Setup

```bash
cd apps/api/GymCoach.Api

# Update connection string in appsettings.json
# Host=localhost;Database=gymcoach;Username=postgres;Password=postgres

# Run migrations
dotnet ef database update

# Run the API
dotnet run
```

### Mobile Setup

```bash
cd apps/mobile
npm install
npx expo start
```

### Admin Setup

```bash
cd apps/admin
npm install
npm run dev
```

## Features

- Equipment-based exercise selection
- Workout templates (Full Body, Push/Pull/Legs, Upper/Lower)
- Progressive overload system (auto-adjusts reps/weight)
- Offline-first mobile app
- Freemium model (1 free template, others require subscription)

## API Endpoints

- `GET /api/equipment` - List all equipment
- `GET /api/musclegroups` - List all muscle groups
- `GET /api/exercises` - List exercises (filter by muscle/equipment)
- `GET /api/workouttemplates` - List workout templates
- `POST /api/workouts/generate` - Generate workout plan for user
- `GET /api/workouts/plans/{planId}/current` - Get current workout day
- `PUT /api/workouts/sets/{setId}` - Update set (log reps/weight)
- `POST /api/workouts/days/{dayId}/complete` - Mark day complete
