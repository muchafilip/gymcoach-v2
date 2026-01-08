using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Data;

public static class SeedData
{
    public static void Seed(ModelBuilder modelBuilder)
    {
        // Equipment
        modelBuilder.Entity<Equipment>().HasData(
            new Equipment { Id = 1, Name = "Bodyweight", Icon = "body" },
            new Equipment { Id = 2, Name = "Dumbbells", Icon = "dumbbell" },
            new Equipment { Id = 3, Name = "Barbell", Icon = "barbell" },
            new Equipment { Id = 4, Name = "Pull-up Bar", Icon = "pullup" },
            new Equipment { Id = 5, Name = "Cables", Icon = "cable" },
            new Equipment { Id = 6, Name = "Machines", Icon = "machine" },
            new Equipment { Id = 7, Name = "Kettlebell", Icon = "kettlebell" },
            new Equipment { Id = 8, Name = "Bench", Icon = "bench" },
            new Equipment { Id = 9, Name = "Resistance Bands", Icon = "band" }
        );

        // Muscle Groups
        modelBuilder.Entity<MuscleGroup>().HasData(
            new MuscleGroup { Id = 1, Name = "Chest" },
            new MuscleGroup { Id = 2, Name = "Back" },
            new MuscleGroup { Id = 3, Name = "Shoulders" },
            new MuscleGroup { Id = 4, Name = "Biceps" },
            new MuscleGroup { Id = 5, Name = "Triceps" },
            new MuscleGroup { Id = 6, Name = "Quadriceps" },
            new MuscleGroup { Id = 7, Name = "Hamstrings" },
            new MuscleGroup { Id = 8, Name = "Glutes" },
            new MuscleGroup { Id = 9, Name = "Calves" },
            new MuscleGroup { Id = 10, Name = "Core" },
            new MuscleGroup { Id = 11, Name = "Forearms" }
        );

        // Default Progression Rule
        modelBuilder.Entity<ProgressionRule>().HasData(
            new ProgressionRule
            {
                Id = 1,
                Name = "Standard Progression",
                MinReps = 8,
                MaxReps = 15,
                RepIncrement = 1,
                WeightIncrement = 2.5m,
                FailureThreshold = 2,
                IsDefault = true
            }
        );

        // Exercises
        // Chest exercises
        modelBuilder.Entity<Exercise>().HasData(
            new Exercise { Id = 1, Name = "Push-ups", PrimaryMuscleGroupId = 1, Description = "Classic bodyweight chest exercise" },
            new Exercise { Id = 2, Name = "Dumbbell Bench Press", PrimaryMuscleGroupId = 1, Description = "Flat bench press with dumbbells" },
            new Exercise { Id = 3, Name = "Dumbbell Incline Press", PrimaryMuscleGroupId = 1, Description = "Incline bench press with dumbbells" },
            new Exercise { Id = 4, Name = "Dumbbell Flyes", PrimaryMuscleGroupId = 1, Description = "Chest isolation exercise" },
            new Exercise { Id = 5, Name = "Barbell Bench Press", PrimaryMuscleGroupId = 1, Description = "Flat bench press with barbell" },

            // Back exercises
            new Exercise { Id = 6, Name = "Pull-ups", PrimaryMuscleGroupId = 2, Description = "Bodyweight back exercise" },
            new Exercise { Id = 7, Name = "Dumbbell Rows", PrimaryMuscleGroupId = 2, Description = "Single arm dumbbell row" },
            new Exercise { Id = 8, Name = "Barbell Rows", PrimaryMuscleGroupId = 2, Description = "Bent over barbell row" },
            new Exercise { Id = 9, Name = "Lat Pulldown", PrimaryMuscleGroupId = 2, Description = "Cable lat pulldown" },
            new Exercise { Id = 10, Name = "Seated Cable Row", PrimaryMuscleGroupId = 2, Description = "Cable row for back thickness" },

            // Shoulder exercises
            new Exercise { Id = 11, Name = "Dumbbell Shoulder Press", PrimaryMuscleGroupId = 3, Description = "Overhead press with dumbbells" },
            new Exercise { Id = 12, Name = "Dumbbell Lateral Raises", PrimaryMuscleGroupId = 3, Description = "Side deltoid isolation" },
            new Exercise { Id = 13, Name = "Dumbbell Front Raises", PrimaryMuscleGroupId = 3, Description = "Front deltoid isolation" },
            new Exercise { Id = 14, Name = "Face Pulls", PrimaryMuscleGroupId = 3, Description = "Rear deltoid and rotator cuff" },
            new Exercise { Id = 15, Name = "Barbell Overhead Press", PrimaryMuscleGroupId = 3, Description = "Standing overhead press" },

            // Biceps exercises
            new Exercise { Id = 16, Name = "Dumbbell Bicep Curls", PrimaryMuscleGroupId = 4, Description = "Standing dumbbell curls" },
            new Exercise { Id = 17, Name = "Hammer Curls", PrimaryMuscleGroupId = 4, Description = "Neutral grip dumbbell curls" },
            new Exercise { Id = 18, Name = "Barbell Curls", PrimaryMuscleGroupId = 4, Description = "Standing barbell curls" },
            new Exercise { Id = 19, Name = "Cable Curls", PrimaryMuscleGroupId = 4, Description = "Cable bicep curls" },
            new Exercise { Id = 20, Name = "Chin-ups", PrimaryMuscleGroupId = 4, Description = "Underhand pull-ups" },

            // Triceps exercises
            new Exercise { Id = 21, Name = "Tricep Dips", PrimaryMuscleGroupId = 5, Description = "Bodyweight tricep exercise" },
            new Exercise { Id = 22, Name = "Dumbbell Tricep Extension", PrimaryMuscleGroupId = 5, Description = "Overhead tricep extension" },
            new Exercise { Id = 23, Name = "Tricep Pushdowns", PrimaryMuscleGroupId = 5, Description = "Cable pushdowns" },
            new Exercise { Id = 24, Name = "Close Grip Bench Press", PrimaryMuscleGroupId = 5, Description = "Narrow grip bench press" },
            new Exercise { Id = 25, Name = "Diamond Push-ups", PrimaryMuscleGroupId = 5, Description = "Narrow push-ups for triceps" },

            // Quadriceps exercises
            new Exercise { Id = 26, Name = "Bodyweight Squats", PrimaryMuscleGroupId = 6, Description = "Basic bodyweight squat" },
            new Exercise { Id = 27, Name = "Goblet Squats", PrimaryMuscleGroupId = 6, Description = "Dumbbell held at chest" },
            new Exercise { Id = 28, Name = "Barbell Squats", PrimaryMuscleGroupId = 6, Description = "Back squats with barbell" },
            new Exercise { Id = 29, Name = "Leg Press", PrimaryMuscleGroupId = 6, Description = "Machine leg press" },
            new Exercise { Id = 30, Name = "Lunges", PrimaryMuscleGroupId = 6, Description = "Walking or stationary lunges" },

            // Hamstrings exercises
            new Exercise { Id = 31, Name = "Romanian Deadlift", PrimaryMuscleGroupId = 7, Description = "Dumbbell or barbell RDL" },
            new Exercise { Id = 32, Name = "Leg Curls", PrimaryMuscleGroupId = 7, Description = "Machine leg curls" },
            new Exercise { Id = 33, Name = "Good Mornings", PrimaryMuscleGroupId = 7, Description = "Barbell good mornings" },
            new Exercise { Id = 34, Name = "Nordic Curls", PrimaryMuscleGroupId = 7, Description = "Bodyweight hamstring exercise" },

            // Glutes exercises
            new Exercise { Id = 35, Name = "Hip Thrusts", PrimaryMuscleGroupId = 8, Description = "Barbell or dumbbell hip thrusts" },
            new Exercise { Id = 36, Name = "Glute Bridges", PrimaryMuscleGroupId = 8, Description = "Bodyweight glute bridges" },
            new Exercise { Id = 37, Name = "Bulgarian Split Squats", PrimaryMuscleGroupId = 8, Description = "Rear foot elevated split squats" },

            // Calves exercises
            new Exercise { Id = 38, Name = "Standing Calf Raises", PrimaryMuscleGroupId = 9, Description = "Dumbbell calf raises" },
            new Exercise { Id = 39, Name = "Seated Calf Raises", PrimaryMuscleGroupId = 9, Description = "Machine seated calf raises" },

            // Core exercises
            new Exercise { Id = 40, Name = "Plank", PrimaryMuscleGroupId = 10, Description = "Isometric core hold" },
            new Exercise { Id = 41, Name = "Crunches", PrimaryMuscleGroupId = 10, Description = "Basic abdominal crunches" },
            new Exercise { Id = 42, Name = "Hanging Leg Raises", PrimaryMuscleGroupId = 10, Description = "Hanging from bar leg raises" },
            new Exercise { Id = 43, Name = "Russian Twists", PrimaryMuscleGroupId = 10, Description = "Rotational core exercise" },
            new Exercise { Id = 44, Name = "Dead Bug", PrimaryMuscleGroupId = 10, Description = "Anti-rotation core exercise" }
        );

        // Exercise Equipment Relationships
        modelBuilder.Entity<ExerciseEquipment>().HasData(
            // Bodyweight exercises
            new ExerciseEquipment { ExerciseId = 1, EquipmentId = 1 },   // Push-ups - Bodyweight
            new ExerciseEquipment { ExerciseId = 6, EquipmentId = 4 },   // Pull-ups - Pull-up Bar
            new ExerciseEquipment { ExerciseId = 20, EquipmentId = 4 },  // Chin-ups - Pull-up Bar
            new ExerciseEquipment { ExerciseId = 21, EquipmentId = 1 },  // Tricep Dips - Bodyweight
            new ExerciseEquipment { ExerciseId = 25, EquipmentId = 1 },  // Diamond Push-ups - Bodyweight
            new ExerciseEquipment { ExerciseId = 26, EquipmentId = 1 },  // Bodyweight Squats - Bodyweight
            new ExerciseEquipment { ExerciseId = 34, EquipmentId = 1 },  // Nordic Curls - Bodyweight
            new ExerciseEquipment { ExerciseId = 36, EquipmentId = 1 },  // Glute Bridges - Bodyweight
            new ExerciseEquipment { ExerciseId = 40, EquipmentId = 1 },  // Plank - Bodyweight
            new ExerciseEquipment { ExerciseId = 41, EquipmentId = 1 },  // Crunches - Bodyweight
            new ExerciseEquipment { ExerciseId = 44, EquipmentId = 1 },  // Dead Bug - Bodyweight

            // Dumbbell exercises
            new ExerciseEquipment { ExerciseId = 2, EquipmentId = 2 },   // DB Bench Press - Dumbbells
            new ExerciseEquipment { ExerciseId = 2, EquipmentId = 8 },   // DB Bench Press - Bench
            new ExerciseEquipment { ExerciseId = 3, EquipmentId = 2 },   // DB Incline Press - Dumbbells
            new ExerciseEquipment { ExerciseId = 3, EquipmentId = 8 },   // DB Incline Press - Bench
            new ExerciseEquipment { ExerciseId = 4, EquipmentId = 2 },   // DB Flyes - Dumbbells
            new ExerciseEquipment { ExerciseId = 4, EquipmentId = 8 },   // DB Flyes - Bench
            new ExerciseEquipment { ExerciseId = 7, EquipmentId = 2 },   // DB Rows - Dumbbells
            new ExerciseEquipment { ExerciseId = 11, EquipmentId = 2 },  // DB Shoulder Press - Dumbbells
            new ExerciseEquipment { ExerciseId = 12, EquipmentId = 2 },  // DB Lateral Raises - Dumbbells
            new ExerciseEquipment { ExerciseId = 13, EquipmentId = 2 },  // DB Front Raises - Dumbbells
            new ExerciseEquipment { ExerciseId = 16, EquipmentId = 2 },  // DB Bicep Curls - Dumbbells
            new ExerciseEquipment { ExerciseId = 17, EquipmentId = 2 },  // Hammer Curls - Dumbbells
            new ExerciseEquipment { ExerciseId = 22, EquipmentId = 2 },  // DB Tricep Extension - Dumbbells
            new ExerciseEquipment { ExerciseId = 27, EquipmentId = 2 },  // Goblet Squats - Dumbbells
            new ExerciseEquipment { ExerciseId = 30, EquipmentId = 2 },  // Lunges - Dumbbells
            new ExerciseEquipment { ExerciseId = 31, EquipmentId = 2 },  // Romanian Deadlift - Dumbbells
            new ExerciseEquipment { ExerciseId = 35, EquipmentId = 2 },  // Hip Thrusts - Dumbbells
            new ExerciseEquipment { ExerciseId = 37, EquipmentId = 2 },  // Bulgarian Split Squats - Dumbbells
            new ExerciseEquipment { ExerciseId = 38, EquipmentId = 2 },  // Standing Calf Raises - Dumbbells
            new ExerciseEquipment { ExerciseId = 43, EquipmentId = 2 },  // Russian Twists - Dumbbells

            // Barbell exercises
            new ExerciseEquipment { ExerciseId = 5, EquipmentId = 3 },   // BB Bench Press - Barbell
            new ExerciseEquipment { ExerciseId = 5, EquipmentId = 8 },   // BB Bench Press - Bench
            new ExerciseEquipment { ExerciseId = 8, EquipmentId = 3 },   // BB Rows - Barbell
            new ExerciseEquipment { ExerciseId = 15, EquipmentId = 3 },  // BB Overhead Press - Barbell
            new ExerciseEquipment { ExerciseId = 18, EquipmentId = 3 },  // BB Curls - Barbell
            new ExerciseEquipment { ExerciseId = 24, EquipmentId = 3 },  // Close Grip Bench - Barbell
            new ExerciseEquipment { ExerciseId = 24, EquipmentId = 8 },  // Close Grip Bench - Bench
            new ExerciseEquipment { ExerciseId = 28, EquipmentId = 3 },  // BB Squats - Barbell
            new ExerciseEquipment { ExerciseId = 33, EquipmentId = 3 },  // Good Mornings - Barbell
            new ExerciseEquipment { ExerciseId = 35, EquipmentId = 3 },  // Hip Thrusts - Barbell (alternative)

            // Cable exercises
            new ExerciseEquipment { ExerciseId = 9, EquipmentId = 5 },   // Lat Pulldown - Cables
            new ExerciseEquipment { ExerciseId = 10, EquipmentId = 5 },  // Seated Cable Row - Cables
            new ExerciseEquipment { ExerciseId = 14, EquipmentId = 5 },  // Face Pulls - Cables
            new ExerciseEquipment { ExerciseId = 19, EquipmentId = 5 },  // Cable Curls - Cables
            new ExerciseEquipment { ExerciseId = 23, EquipmentId = 5 },  // Tricep Pushdowns - Cables

            // Machine exercises
            new ExerciseEquipment { ExerciseId = 29, EquipmentId = 6 },  // Leg Press - Machine
            new ExerciseEquipment { ExerciseId = 32, EquipmentId = 6 },  // Leg Curls - Machine
            new ExerciseEquipment { ExerciseId = 39, EquipmentId = 6 },  // Seated Calf Raises - Machine

            // Pull-up bar for hanging exercises
            new ExerciseEquipment { ExerciseId = 42, EquipmentId = 4 }   // Hanging Leg Raises - Pull-up Bar
        );

        // Secondary Muscle Groups
        modelBuilder.Entity<ExerciseSecondaryMuscle>().HasData(
            // Push-ups also work triceps and shoulders
            new ExerciseSecondaryMuscle { ExerciseId = 1, MuscleGroupId = 5 },  // Triceps
            new ExerciseSecondaryMuscle { ExerciseId = 1, MuscleGroupId = 3 },  // Shoulders

            // Bench Press variations work triceps
            new ExerciseSecondaryMuscle { ExerciseId = 2, MuscleGroupId = 5 },
            new ExerciseSecondaryMuscle { ExerciseId = 3, MuscleGroupId = 5 },
            new ExerciseSecondaryMuscle { ExerciseId = 5, MuscleGroupId = 5 },

            // Pull-ups work biceps
            new ExerciseSecondaryMuscle { ExerciseId = 6, MuscleGroupId = 4 },

            // Rows work biceps
            new ExerciseSecondaryMuscle { ExerciseId = 7, MuscleGroupId = 4 },
            new ExerciseSecondaryMuscle { ExerciseId = 8, MuscleGroupId = 4 },
            new ExerciseSecondaryMuscle { ExerciseId = 10, MuscleGroupId = 4 },

            // Shoulder press works triceps
            new ExerciseSecondaryMuscle { ExerciseId = 11, MuscleGroupId = 5 },
            new ExerciseSecondaryMuscle { ExerciseId = 15, MuscleGroupId = 5 },

            // Chin-ups work back
            new ExerciseSecondaryMuscle { ExerciseId = 20, MuscleGroupId = 2 },

            // Squats work glutes and hamstrings
            new ExerciseSecondaryMuscle { ExerciseId = 26, MuscleGroupId = 8 },
            new ExerciseSecondaryMuscle { ExerciseId = 27, MuscleGroupId = 8 },
            new ExerciseSecondaryMuscle { ExerciseId = 28, MuscleGroupId = 8 },
            new ExerciseSecondaryMuscle { ExerciseId = 28, MuscleGroupId = 7 },

            // Lunges work glutes
            new ExerciseSecondaryMuscle { ExerciseId = 30, MuscleGroupId = 8 },

            // RDL works glutes
            new ExerciseSecondaryMuscle { ExerciseId = 31, MuscleGroupId = 8 },

            // Bulgarian Split Squats work quads
            new ExerciseSecondaryMuscle { ExerciseId = 37, MuscleGroupId = 6 }
        );

        // Test User (for development)
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Email = "guest@gymcoach.app",
                PasswordHash = "dev-only-no-auth-yet",
                DisplayName = "Guest User",
                SubscriptionStatus = SubscriptionStatus.Free,
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        // Workout Templates
        modelBuilder.Entity<WorkoutTemplate>().HasData(
            new WorkoutTemplate
            {
                Id = 1,
                Name = "Full Body 3-Day",
                Description = "A complete full body workout, 3 days per week. Perfect for beginners.",
                IsPremium = false
            },
            new WorkoutTemplate
            {
                Id = 2,
                Name = "Push/Pull/Legs",
                Description = "Classic 6-day split targeting each muscle group twice per week.",
                IsPremium = true
            },
            new WorkoutTemplate
            {
                Id = 3,
                Name = "Upper/Lower Split",
                Description = "4-day split alternating between upper and lower body.",
                IsPremium = true
            }
        );

        // Workout Day Templates for Full Body
        modelBuilder.Entity<WorkoutDayTemplate>().HasData(
            new WorkoutDayTemplate { Id = 1, WorkoutTemplateId = 1, DayNumber = 1, Name = "Full Body A" },
            new WorkoutDayTemplate { Id = 2, WorkoutTemplateId = 1, DayNumber = 2, Name = "Full Body B" },
            new WorkoutDayTemplate { Id = 3, WorkoutTemplateId = 1, DayNumber = 3, Name = "Full Body C" },

            // Push/Pull/Legs
            new WorkoutDayTemplate { Id = 4, WorkoutTemplateId = 2, DayNumber = 1, Name = "Push" },
            new WorkoutDayTemplate { Id = 5, WorkoutTemplateId = 2, DayNumber = 2, Name = "Pull" },
            new WorkoutDayTemplate { Id = 6, WorkoutTemplateId = 2, DayNumber = 3, Name = "Legs" },
            new WorkoutDayTemplate { Id = 7, WorkoutTemplateId = 2, DayNumber = 4, Name = "Push" },
            new WorkoutDayTemplate { Id = 8, WorkoutTemplateId = 2, DayNumber = 5, Name = "Pull" },
            new WorkoutDayTemplate { Id = 9, WorkoutTemplateId = 2, DayNumber = 6, Name = "Legs" },

            // Upper/Lower
            new WorkoutDayTemplate { Id = 10, WorkoutTemplateId = 3, DayNumber = 1, Name = "Upper A" },
            new WorkoutDayTemplate { Id = 11, WorkoutTemplateId = 3, DayNumber = 2, Name = "Lower A" },
            new WorkoutDayTemplate { Id = 12, WorkoutTemplateId = 3, DayNumber = 3, Name = "Upper B" },
            new WorkoutDayTemplate { Id = 13, WorkoutTemplateId = 3, DayNumber = 4, Name = "Lower B" }
        );

        // Target muscles for each day template
        modelBuilder.Entity<WorkoutDayTemplateMuscle>().HasData(
            // Full Body A - Chest, Back, Shoulders, Quads, Core
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 1, MuscleGroupId = 1, ExerciseCount = 1 },  // Chest
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 1, MuscleGroupId = 2, ExerciseCount = 1 },  // Back
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 1, MuscleGroupId = 3, ExerciseCount = 1 },  // Shoulders
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 1, MuscleGroupId = 6, ExerciseCount = 1 },  // Quads
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 1, MuscleGroupId = 10, ExerciseCount = 1 }, // Core

            // Full Body B - Chest, Back, Biceps, Hamstrings, Glutes
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 2, MuscleGroupId = 1, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 2, MuscleGroupId = 2, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 2, MuscleGroupId = 4, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 2, MuscleGroupId = 7, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 2, MuscleGroupId = 8, ExerciseCount = 1 },

            // Full Body C - Shoulders, Triceps, Back, Quads, Calves
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 3, MuscleGroupId = 3, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 3, MuscleGroupId = 5, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 3, MuscleGroupId = 2, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 3, MuscleGroupId = 6, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 3, MuscleGroupId = 9, ExerciseCount = 1 },

            // Push Day
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 4, MuscleGroupId = 1, ExerciseCount = 2 },  // Chest x2
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 4, MuscleGroupId = 3, ExerciseCount = 2 },  // Shoulders x2
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 4, MuscleGroupId = 5, ExerciseCount = 1 },  // Triceps
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 7, MuscleGroupId = 1, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 7, MuscleGroupId = 3, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 7, MuscleGroupId = 5, ExerciseCount = 1 },

            // Pull Day
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 5, MuscleGroupId = 2, ExerciseCount = 3 },  // Back x3
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 5, MuscleGroupId = 4, ExerciseCount = 2 },  // Biceps x2
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 8, MuscleGroupId = 2, ExerciseCount = 3 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 8, MuscleGroupId = 4, ExerciseCount = 2 },

            // Legs Day
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 6, MuscleGroupId = 6, ExerciseCount = 2 },  // Quads x2
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 6, MuscleGroupId = 7, ExerciseCount = 1 },  // Hamstrings
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 6, MuscleGroupId = 8, ExerciseCount = 1 },  // Glutes
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 6, MuscleGroupId = 9, ExerciseCount = 1 },  // Calves
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 9, MuscleGroupId = 6, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 9, MuscleGroupId = 7, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 9, MuscleGroupId = 8, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 9, MuscleGroupId = 9, ExerciseCount = 1 },

            // Upper A
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 10, MuscleGroupId = 1, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 10, MuscleGroupId = 2, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 10, MuscleGroupId = 3, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 10, MuscleGroupId = 4, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 10, MuscleGroupId = 5, ExerciseCount = 1 },

            // Lower A
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 11, MuscleGroupId = 6, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 11, MuscleGroupId = 7, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 11, MuscleGroupId = 8, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 11, MuscleGroupId = 9, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 11, MuscleGroupId = 10, ExerciseCount = 1 },

            // Upper B
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 12, MuscleGroupId = 1, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 12, MuscleGroupId = 2, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 12, MuscleGroupId = 3, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 12, MuscleGroupId = 4, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 12, MuscleGroupId = 5, ExerciseCount = 1 },

            // Lower B
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 6, ExerciseCount = 2 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 7, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 8, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 9, ExerciseCount = 1 },
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 10, ExerciseCount = 1 }
        );
    }
}
