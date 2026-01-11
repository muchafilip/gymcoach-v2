# GymCoach - Product Roadmap

## Implemented Features

### Authentication
- [x] Google Sign-In (iOS)
- [x] JWT token authentication
- [x] Secure token storage

### Onboarding
- [x] Equipment selection
- [x] Personalized workout generation based on equipment

### Workout Plans
- [x] Browse workout templates
- [x] Generate personalized multi-week plans
- [x] Subscribe to workout plans
- [x] Calendar view for workout schedule
- [x] Navigate between workout days

### Workout Tracking
- [x] View exercises for each workout day
- [x] Track sets with wheel picker (reps & weight)
- [x] Mark sets as completed
- [x] Complete workout days
- [x] Visual progress indicators

### History
- [x] View completed workouts
- [x] Workout history calendar

### Settings & Preferences
- [x] Dark mode toggle
- [x] Theme persistence
- [x] Logout functionality

### Technical
- [x] Offline support infrastructure
- [x] Sync manager for offline data
- [x] Theming system with light/dark modes

---

## Suggested Features (Free Tier)

### High Priority
| Feature | Description |
|---------|-------------|
| **Rest Timer** | Configurable timer between sets with notifications |
| **Exercise Instructions** | Video/GIF demonstrations for each exercise |
| **Workout Notes** | Add notes to individual workouts or exercises |
| **Progress Photos** | Take and store progress photos with date stamps |
| **Body Measurements** | Track weight, body fat %, measurements over time |

### Medium Priority
| Feature | Description |
|---------|-------------|
| **Exercise History** | View history for specific exercises (weight progression) |
| **Workout Reminders** | Push notifications for scheduled workout days |
| **Social Sharing** | Share completed workouts to social media |
| **Exercise Substitutions** | Swap exercises based on available equipment |
| **Quick Start** | Resume last incomplete workout with one tap |

### Nice to Have
| Feature | Description |
|---------|-------------|
| **Apple Watch App** | Track workouts from wrist, rest timer |
| **Widgets** | Home screen widgets showing today's workout |
| **Achievements** | Badges for milestones (100 workouts, PRs, streaks) |
| **Streaks** | Track consecutive workout days/weeks |

---

## Premium Features

### Tier 1: Pro ($4.99/month or $39.99/year)

| Feature | Description | Value |
|---------|-------------|-------|
| **AI Workout Generation** | GPT-powered custom workout plans based on goals, injuries, preferences | High |
| **Progressive Overload** | Auto-adjust weights based on performance history | High |
| **Advanced Analytics** | Charts for strength progression, volume, frequency | High |
| **Unlimited Plans** | Create and save unlimited workout plans (free: 3 plans) | Medium |
| **Export Data** | Export workout history to CSV/PDF | Medium |
| **Custom Exercises** | Add your own exercises with custom instructions | Medium |

### Tier 2: Elite ($9.99/month or $79.99/year)

| Feature | Description | Value |
|---------|-------------|-------|
| **AI Coach Chat** | Ask questions about form, nutrition, recovery | Very High |
| **Periodization** | Auto-generate mesocycles with deload weeks | High |
| **Nutrition Tracking** | Calorie/macro tracking with meal suggestions | High |
| **Workout Programs** | Access to premium programs (PPL, 5/3/1, nSuns) | High |
| **1RM Calculator** | Estimate one-rep max with various formulas | Medium |
| **Supersets & Circuits** | Create complex workout structures | Medium |
| **Cloud Backup** | Automatic cloud sync across devices | Medium |

### Monetization Strategy

```
Free Tier (Core)
├── Basic workout tracking
├── 3 active workout plans
├── 30-day history
├── Equipment-based plan generation
└── Dark mode

Pro Tier ($4.99/mo)
├── Everything in Free
├── Unlimited plans
├── Full history
├── AI workout generation
├── Progressive overload
├── Advanced analytics
└── Data export

Elite Tier ($9.99/mo)
├── Everything in Pro
├── AI Coach chat
├── Nutrition tracking
├── Premium programs
├── Periodization
└── Priority support
```

---

## Implementation Priority

### Phase 1 (Next Sprint)
1. Rest timer with haptic feedback
2. Exercise instructions/videos
3. Body weight tracking

### Phase 2
1. Exercise history charts
2. Workout reminders (push notifications)
3. Progress photos

### Phase 3 (Premium MVP)
1. AI workout generation (OpenAI integration)
2. Progressive overload algorithm
3. Basic analytics dashboard
4. Subscription paywall (RevenueCat)

### Phase 4
1. AI Coach chat
2. Advanced analytics
3. Nutrition basics

---

## Technical Debt / Improvements

- [ ] Add unit tests for API layer
- [ ] Add E2E tests with Detox
- [ ] Implement proper error boundaries
- [ ] Add crash reporting (Sentry)
- [ ] Optimize list rendering with FlashList
- [ ] Add skeleton loaders for better UX
- [ ] Implement proper form validation
- [ ] Add haptic feedback throughout app

---

## Notes

- Focus on workout tracking excellence before expanding to nutrition
- Keep free tier valuable enough for retention
- Premium features should save time or provide insights
- Consider annual discount (2 months free) to improve LTV
