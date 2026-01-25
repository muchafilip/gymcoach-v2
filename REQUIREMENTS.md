# GymCoach V2 - Feature Requirements

## Core Features

### 1. Workout Plan Generation
- [ ] User can generate a workout plan from a template
- [ ] System templates are available to all users
- [ ] Custom templates require premium
- [ ] Plans generate Week 1 exercises on creation
- [ ] Day-by-day generation: completing a day generates next occurrence of same day type
- [ ] Progressive overload: if ALL sets hit target reps, TargetReps +1 (max 15)
- [ ] Weight carries over from previous week

### 2. Workout Execution
- [ ] User can view current workout day with exercises and sets
- [ ] User can log actual reps for each set
- [ ] User can log weight for each set
- [ ] User can mark sets as complete
- [ ] User can add additional sets to exercises
- [ ] User can delete sets from exercises
- [ ] User can complete workout day
- [ ] Workout timer tracks total duration
- [ ] Rest timer between sets (configurable)

### 3. Exercise Management
- [ ] User can swap an exercise for an alternative (same muscle group)
- [ ] User can add exercises from catalog to current workout
- [ ] User can remove exercises from current workout
- [ ] User can view exercise info (muscles, equipment, instructions)
- [ ] User can see exercise demo video link

### 4. Supersets (Premium)
- [ ] User can create supersets from suggested pairings
- [ ] User can create manual supersets from any exercises
- [ ] Giant sets supported (3+ exercises)
- [ ] Supersets display grouped together in workout

### 5. Progress Tracking
- [ ] Personal records tracked (max weight, best set)
- [ ] PR notifications when new record achieved
- [ ] Workout history with all completed workouts
- [ ] Exercise history showing performance over time
- [ ] Volume tracking (sets × reps × weight)

### 6. Home Screen
- [ ] Shows next workout day to start
- [ ] Shows current streak
- [ ] Shows workouts this week
- [ ] Shows recent PRs
- [ ] Shows insights (premium)

### 7. XP & Leveling (Premium)
- [ ] XP awarded for completing workouts
- [ ] XP awarded for achieving PRs
- [ ] XP awarded for maintaining streaks
- [ ] Level up progression
- [ ] Plans unlock at specific levels

### 8. Quests (Premium)
- [ ] Daily quests refresh each day
- [ ] Weekly quests refresh each week
- [ ] Onboarding quests guide new users
- [ ] Achievement quests for milestones
- [ ] Quest completion awards XP

### 9. Muscle Priority Selection
- [ ] User can select 1-2 priority muscles when generating plan
- [ ] Priority muscles get +1 exercise per relevant workout day
- [ ] Priority selection shown in template preview

### 10. Offline Support
- [ ] App works without internet connection
- [ ] Workout data synced to local SQLite
- [ ] Changes queued when offline
- [ ] Sync runs on app focus and after workouts
- [ ] Visual indicator of sync status

---

## Premium Features

| Feature | Free | Premium |
|---------|------|---------|
| System templates | ✅ | ✅ |
| Custom templates | ❌ | ✅ |
| Supersets | ❌ | ✅ |
| Smart progression hints | ❌ | ✅ |
| Insights/analytics | ❌ | ✅ |
| XP/Leveling | ❌ | ✅ |
| Quests | ❌ | ✅ |
| Exercise swap | ✅ | ✅ |
| Workout timer | ✅ | ✅ |
| Rest timer | ✅ | ✅ |
| Daily workout limit | 2/day | Unlimited |

---

## API Endpoints

### Workouts
- `POST /api/workouts/generate` - Generate new plan from template
- `GET /api/workouts/home` - Home screen data
- `GET /api/workouts/active-plan` - Get current active plan
- `GET /api/workouts/plans` - List all user plans
- `GET /api/workouts/plans/{id}` - Get plan details
- `POST /api/workouts/plans/{id}/activate` - Set plan as active
- `GET /api/workouts/days/{id}` - Get workout day details
- `POST /api/workouts/days/{id}/start` - Start workout timer
- `POST /api/workouts/days/{id}/complete` - Complete workout day
- `PUT /api/workouts/sets/{id}` - Update set (reps, weight, completed)
- `POST /api/workouts/days/{id}/sets` - Add set to exercise
- `DELETE /api/workouts/sets/{id}` - Delete set
- `DELETE /api/workouts/exercises/{id}` - Delete exercise from day

### Progression
- `GET /api/workouts/progression/{id}` - Get progression for one exercise
- `POST /api/workouts/progression/batch` - Get progression for multiple exercises

### Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/{id}` - Get template details
- `POST /api/templates` - Create custom template (premium)
- `PUT /api/templates/{id}` - Update custom template
- `DELETE /api/templates/{id}` - Delete custom template

### Exercises
- `GET /api/exercises` - List all exercises
- `GET /api/exercises/{id}` - Get exercise details
- `GET /api/exercises/alternatives/{id}` - Get alternative exercises

### Progress
- `GET /api/progress` - Get user progress stats
- `GET /api/workouts/personal-records` - Get all PRs
- `GET /api/workouts/history` - Get workout history
- `GET /api/insights` - Get AI insights (premium)

### Quests
- `GET /api/quests` - Get active quests
- `POST /api/quests/{id}/claim` - Claim quest reward

### Supersets
- `GET /api/supersets/suggestions/{dayId}` - Get superset suggestions
- `POST /api/supersets` - Create superset

---

## Test Scenarios

### Workout Generation
1. Generate 3-day full body plan → should create 3 days with exercises
2. Complete day 1 → should generate week 2 day 1 immediately
3. Complete all 3 days → all week 2 days should exist
4. Priority muscles selected → should have +1 exercise per relevant day

### Progressive Overload
1. Hit all target reps → next week target reps should be +1
2. Miss some reps → next week target reps should stay same
3. Reps at max (15) → should not increase further

### Offline Mode
1. Start workout offline → should load from SQLite
2. Log sets offline → should queue for sync
3. Come online → should sync queued changes
4. Conflict resolution → server wins

### Premium Gating
1. Free user tries premium template → should show paywall
2. Free user completes 2 workouts → should block 3rd
3. Premium user → unlimited workouts

---

## Known Issues / TODO

- [ ] Rate limiting (429) when navigating quickly - need request debouncing
- [ ] Exercise info modal could be larger
- [ ] Superset creation could be faster (now uses parallel API calls)
