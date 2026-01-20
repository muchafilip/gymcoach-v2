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

        // Rep Schemes
        modelBuilder.Entity<RepScheme>().HasData(
            new RepScheme { Id = 1, Name = "Power", Type = RepSchemeType.Power, MinReps = 1, MaxReps = 3, TargetSets = 5, RestSeconds = 180, IsSystem = true },
            new RepScheme { Id = 2, Name = "Strength", Type = RepSchemeType.Strength, MinReps = 4, MaxReps = 6, TargetSets = 4, RestSeconds = 150, IsSystem = true },
            new RepScheme { Id = 3, Name = "Hypertrophy", Type = RepSchemeType.Hypertrophy, MinReps = 8, MaxReps = 12, TargetSets = 3, RestSeconds = 90, IsSystem = true },
            new RepScheme { Id = 4, Name = "Muscular Endurance", Type = RepSchemeType.MuscularEndurance, MinReps = 15, MaxReps = 20, TargetSets = 3, RestSeconds = 60, IsSystem = true },
            new RepScheme { Id = 5, Name = "Cardio/HIIT", Type = RepSchemeType.CardioHiit, MinReps = 20, MaxReps = 50, TargetSets = 2, RestSeconds = 30, IsSystem = true },
            new RepScheme { Id = 6, Name = "EMOM", Type = RepSchemeType.EMOM, DurationSeconds = 60, TargetSets = 10, IsSystem = true },
            new RepScheme { Id = 7, Name = "AMRAP", Type = RepSchemeType.AMRAP, DurationSeconds = 60, TargetSets = 1, IsSystem = true },
            new RepScheme { Id = 8, Name = "Timed Set", Type = RepSchemeType.TimedSet, DurationSeconds = 30, TargetSets = 3, RestSeconds = 60, IsSystem = true }
        );

        // Superset Templates (antagonist pairs)
        modelBuilder.Entity<SupersetTemplate>().HasData(
            new SupersetTemplate { Id = 1, Name = "Chest + Back", IsAntagonist = true, MuscleGroupAId = 1, MuscleGroupBId = 2 },
            new SupersetTemplate { Id = 2, Name = "Biceps + Triceps", IsAntagonist = true, MuscleGroupAId = 4, MuscleGroupBId = 5 },
            new SupersetTemplate { Id = 3, Name = "Quads + Hamstrings", IsAntagonist = true, MuscleGroupAId = 6, MuscleGroupBId = 7 },
            new SupersetTemplate { Id = 4, Name = "Shoulders + Back", IsAntagonist = true, MuscleGroupAId = 3, MuscleGroupBId = 2 }
        );

        // Exercises with Type and DefaultRole
        // Chest exercises
        modelBuilder.Entity<Exercise>().HasData(
            new Exercise { Id = 1, Name = "Push-ups", PrimaryMuscleGroupId = 1, Description = "Classic bodyweight chest exercise", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 2, Name = "Dumbbell Bench Press", PrimaryMuscleGroupId = 1, Description = "Flat bench press with dumbbells", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 3, Name = "Dumbbell Incline Press", PrimaryMuscleGroupId = 1, Description = "Incline bench press with dumbbells", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 4, Name = "Dumbbell Flyes", PrimaryMuscleGroupId = 1, Description = "Chest isolation exercise", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 5, Name = "Barbell Bench Press", PrimaryMuscleGroupId = 1, Description = "Flat bench press with barbell", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },

            // Back exercises
            new Exercise { Id = 6, Name = "Pull-ups", PrimaryMuscleGroupId = 2, Description = "Bodyweight back exercise", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 7, Name = "Dumbbell Rows", PrimaryMuscleGroupId = 2, Description = "Single arm dumbbell row", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 8, Name = "Barbell Rows", PrimaryMuscleGroupId = 2, Description = "Bent over barbell row", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 9, Name = "Lat Pulldown", PrimaryMuscleGroupId = 2, Description = "Cable lat pulldown", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 10, Name = "Seated Cable Row", PrimaryMuscleGroupId = 2, Description = "Cable row for back thickness", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },

            // Shoulder exercises
            new Exercise { Id = 11, Name = "Dumbbell Shoulder Press", PrimaryMuscleGroupId = 3, Description = "Overhead press with dumbbells", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 12, Name = "Dumbbell Lateral Raises", PrimaryMuscleGroupId = 3, Description = "Side deltoid isolation", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 13, Name = "Dumbbell Front Raises", PrimaryMuscleGroupId = 3, Description = "Front deltoid isolation", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 14, Name = "Face Pulls", PrimaryMuscleGroupId = 3, Description = "Rear deltoid and rotator cuff", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 15, Name = "Barbell Overhead Press", PrimaryMuscleGroupId = 3, Description = "Standing overhead press", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },

            // Biceps exercises
            new Exercise { Id = 16, Name = "Dumbbell Bicep Curls", PrimaryMuscleGroupId = 4, Description = "Standing dumbbell curls", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 17, Name = "Hammer Curls", PrimaryMuscleGroupId = 4, Description = "Neutral grip dumbbell curls", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 18, Name = "Barbell Curls", PrimaryMuscleGroupId = 4, Description = "Standing barbell curls", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 19, Name = "Cable Curls", PrimaryMuscleGroupId = 4, Description = "Cable bicep curls", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 20, Name = "Chin-ups", PrimaryMuscleGroupId = 4, Description = "Underhand pull-ups", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },

            // Triceps exercises
            new Exercise { Id = 21, Name = "Tricep Dips", PrimaryMuscleGroupId = 5, Description = "Bodyweight tricep exercise", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 22, Name = "Dumbbell Tricep Extension", PrimaryMuscleGroupId = 5, Description = "Overhead tricep extension", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 23, Name = "Tricep Pushdowns", PrimaryMuscleGroupId = 5, Description = "Cable pushdowns", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 24, Name = "Close Grip Bench Press", PrimaryMuscleGroupId = 5, Description = "Narrow grip bench press", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 25, Name = "Diamond Push-ups", PrimaryMuscleGroupId = 5, Description = "Narrow push-ups for triceps", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },

            // Quadriceps exercises
            new Exercise { Id = 26, Name = "Bodyweight Squats", PrimaryMuscleGroupId = 6, Description = "Basic bodyweight squat", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 27, Name = "Goblet Squats", PrimaryMuscleGroupId = 6, Description = "Dumbbell held at chest", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 28, Name = "Barbell Squats", PrimaryMuscleGroupId = 6, Description = "Back squats with barbell", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 29, Name = "Leg Press", PrimaryMuscleGroupId = 6, Description = "Machine leg press", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 30, Name = "Lunges", PrimaryMuscleGroupId = 6, Description = "Walking or stationary lunges", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },

            // Hamstrings exercises
            new Exercise { Id = 31, Name = "Romanian Deadlift", PrimaryMuscleGroupId = 7, Description = "Dumbbell or barbell RDL", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 32, Name = "Leg Curls", PrimaryMuscleGroupId = 7, Description = "Machine leg curls", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 33, Name = "Good Mornings", PrimaryMuscleGroupId = 7, Description = "Barbell good mornings", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 34, Name = "Nordic Curls", PrimaryMuscleGroupId = 7, Description = "Bodyweight hamstring exercise", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },

            // Glutes exercises
            new Exercise { Id = 35, Name = "Hip Thrusts", PrimaryMuscleGroupId = 8, Description = "Barbell or dumbbell hip thrusts", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 36, Name = "Glute Bridges", PrimaryMuscleGroupId = 8, Description = "Bodyweight glute bridges", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 37, Name = "Bulgarian Split Squats", PrimaryMuscleGroupId = 8, Description = "Rear foot elevated split squats", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },

            // Calves exercises
            new Exercise { Id = 38, Name = "Standing Calf Raises", PrimaryMuscleGroupId = 9, Description = "Dumbbell calf raises", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 39, Name = "Seated Calf Raises", PrimaryMuscleGroupId = 9, Description = "Machine seated calf raises", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },

            // Core exercises
            new Exercise { Id = 40, Name = "Plank", PrimaryMuscleGroupId = 10, Description = "Isometric core hold", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 41, Name = "Crunches", PrimaryMuscleGroupId = 10, Description = "Basic abdominal crunches", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 42, Name = "Hanging Leg Raises", PrimaryMuscleGroupId = 10, Description = "Hanging from bar leg raises", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 43, Name = "Russian Twists", PrimaryMuscleGroupId = 10, Description = "Rotational core exercise", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },
            new Exercise { Id = 44, Name = "Dead Bug", PrimaryMuscleGroupId = 10, Description = "Anti-rotation core exercise", Type = ExerciseType.Isolation, DefaultRole = ExerciseRole.Finisher },

            // Additional compound exercises for strength programs
            new Exercise { Id = 45, Name = "Conventional Deadlift", PrimaryMuscleGroupId = 2, Description = "Full-body compound lift from the floor", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover },
            new Exercise { Id = 46, Name = "Front Squat", PrimaryMuscleGroupId = 6, Description = "Barbell squat with front rack position", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.Accessory },
            new Exercise { Id = 47, Name = "Barbell Hip Thrust", PrimaryMuscleGroupId = 8, Description = "Barbell loaded hip thrust", Type = ExerciseType.Compound, DefaultRole = ExerciseRole.MainMover }
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
            new ExerciseEquipment { ExerciseId = 42, EquipmentId = 4 },  // Hanging Leg Raises - Pull-up Bar

            // New strength exercises
            new ExerciseEquipment { ExerciseId = 45, EquipmentId = 3 },  // Conventional Deadlift - Barbell
            new ExerciseEquipment { ExerciseId = 46, EquipmentId = 3 },  // Front Squat - Barbell
            new ExerciseEquipment { ExerciseId = 47, EquipmentId = 3 },  // Barbell Hip Thrust - Barbell
            new ExerciseEquipment { ExerciseId = 47, EquipmentId = 8 }   // Barbell Hip Thrust - Bench
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
            new ExerciseSecondaryMuscle { ExerciseId = 37, MuscleGroupId = 6 },

            // Conventional Deadlift works hamstrings, glutes, core
            new ExerciseSecondaryMuscle { ExerciseId = 45, MuscleGroupId = 7 },  // Hamstrings
            new ExerciseSecondaryMuscle { ExerciseId = 45, MuscleGroupId = 8 },  // Glutes
            new ExerciseSecondaryMuscle { ExerciseId = 45, MuscleGroupId = 10 }, // Core

            // Front Squat works core, glutes
            new ExerciseSecondaryMuscle { ExerciseId = 46, MuscleGroupId = 10 }, // Core
            new ExerciseSecondaryMuscle { ExerciseId = 46, MuscleGroupId = 8 },  // Glutes

            // Barbell Hip Thrust works hamstrings
            new ExerciseSecondaryMuscle { ExerciseId = 47, MuscleGroupId = 7 }   // Hamstrings
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
            },
            new WorkoutTemplate
            {
                Id = 4,
                Name = "Superset Training",
                Description = "High-intensity 3-day program with antagonist supersets for efficient workouts.",
                IsPremium = true,
                HasSupersets = true
            },
            new WorkoutTemplate
            {
                Id = 5,
                Name = "Minimal Strength 4-Day",
                Description = "Efficient 4-day strength program. Each day focuses on one main lift (Deadlift, OHP, Squat, Bench) with volume work and accessories.",
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
            new WorkoutDayTemplate { Id = 13, WorkoutTemplateId = 3, DayNumber = 4, Name = "Lower B" },

            // Superset Training (antagonist pairs)
            new WorkoutDayTemplate { Id = 14, WorkoutTemplateId = 4, DayNumber = 1, Name = "Chest + Back" },
            new WorkoutDayTemplate { Id = 15, WorkoutTemplateId = 4, DayNumber = 2, Name = "Arms (Bi + Tri)" },
            new WorkoutDayTemplate { Id = 16, WorkoutTemplateId = 4, DayNumber = 3, Name = "Legs (Quads + Hams)" },

            // Minimal Strength 4-Day
            new WorkoutDayTemplate { Id = 17, WorkoutTemplateId = 5, DayNumber = 1, Name = "Deadlift Day" },
            new WorkoutDayTemplate { Id = 18, WorkoutTemplateId = 5, DayNumber = 2, Name = "OHP Day" },
            new WorkoutDayTemplate { Id = 19, WorkoutTemplateId = 5, DayNumber = 3, Name = "Squat Day" },
            new WorkoutDayTemplate { Id = 20, WorkoutTemplateId = 5, DayNumber = 4, Name = "Bench Day" }
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
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 13, MuscleGroupId = 10, ExerciseCount = 1 },

            // Superset Training - Chest + Back day (antagonist supersets)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 14, MuscleGroupId = 1, ExerciseCount = 3 },  // Chest x3
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 14, MuscleGroupId = 2, ExerciseCount = 3 },  // Back x3

            // Superset Training - Arms (Bi + Tri) day (antagonist supersets)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 15, MuscleGroupId = 4, ExerciseCount = 3 },  // Biceps x3
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 15, MuscleGroupId = 5, ExerciseCount = 3 },  // Triceps x3

            // Superset Training - Legs (Quads + Hams) day (antagonist supersets)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 16, MuscleGroupId = 6, ExerciseCount = 3 },  // Quads x3
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 16, MuscleGroupId = 7, ExerciseCount = 3 },  // Hamstrings x3

            // Minimal Strength 4-Day
            // Deadlift Day - Back (main), Hamstrings (volume), Core (accessory)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 17, MuscleGroupId = 2, ExerciseCount = 1 },  // Back x1 (Deadlift)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 17, MuscleGroupId = 7, ExerciseCount = 1 },  // Hamstrings x1 (RDL)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 17, MuscleGroupId = 10, ExerciseCount = 1 }, // Core x1

            // OHP Day - Shoulders (main), Triceps (volume), Core (accessory)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 18, MuscleGroupId = 3, ExerciseCount = 2 },  // Shoulders x2 (OHP + volume)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 18, MuscleGroupId = 5, ExerciseCount = 1 },  // Triceps x1

            // Squat Day - Quads (main), Glutes (volume), Core (accessory)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 19, MuscleGroupId = 6, ExerciseCount = 2 },  // Quads x2 (Squat + Front Squat)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 19, MuscleGroupId = 8, ExerciseCount = 1 },  // Glutes x1

            // Bench Day - Chest (main), Triceps (volume), Shoulders (accessory)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 20, MuscleGroupId = 1, ExerciseCount = 2 },  // Chest x2 (Bench + volume)
            new WorkoutDayTemplateMuscle { WorkoutDayTemplateId = 20, MuscleGroupId = 5, ExerciseCount = 1 }   // Triceps x1
        );

        // Custom Template Exercises (pinned exercises for Minimal Strength 4-Day)
        // These override random selection for system templates
        modelBuilder.Entity<CustomTemplateExercise>().HasData(
            // Deadlift Day
            new CustomTemplateExercise { Id = 1, WorkoutDayTemplateId = 17, ExerciseId = 45, OrderIndex = 0, Sets = 4, TargetReps = 5 },  // Conventional Deadlift
            new CustomTemplateExercise { Id = 2, WorkoutDayTemplateId = 17, ExerciseId = 31, OrderIndex = 1, Sets = 3, TargetReps = 10 }, // Romanian Deadlift
            new CustomTemplateExercise { Id = 3, WorkoutDayTemplateId = 17, ExerciseId = 44, OrderIndex = 2, Sets = 3, TargetReps = 12 }, // Dead Bug

            // OHP Day
            new CustomTemplateExercise { Id = 4, WorkoutDayTemplateId = 18, ExerciseId = 15, OrderIndex = 0, Sets = 4, TargetReps = 5 },  // Barbell Overhead Press
            new CustomTemplateExercise { Id = 5, WorkoutDayTemplateId = 18, ExerciseId = 11, OrderIndex = 1, Sets = 3, TargetReps = 10 }, // DB Shoulder Press
            new CustomTemplateExercise { Id = 6, WorkoutDayTemplateId = 18, ExerciseId = 23, OrderIndex = 2, Sets = 3, TargetReps = 12 }, // Tricep Pushdowns

            // Squat Day
            new CustomTemplateExercise { Id = 7, WorkoutDayTemplateId = 19, ExerciseId = 28, OrderIndex = 0, Sets = 4, TargetReps = 5 },  // Barbell Squats
            new CustomTemplateExercise { Id = 8, WorkoutDayTemplateId = 19, ExerciseId = 46, OrderIndex = 1, Sets = 3, TargetReps = 8 },  // Front Squat
            new CustomTemplateExercise { Id = 9, WorkoutDayTemplateId = 19, ExerciseId = 47, OrderIndex = 2, Sets = 3, TargetReps = 12 }, // Barbell Hip Thrust

            // Bench Day
            new CustomTemplateExercise { Id = 10, WorkoutDayTemplateId = 20, ExerciseId = 5, OrderIndex = 0, Sets = 4, TargetReps = 5 },  // Barbell Bench Press
            new CustomTemplateExercise { Id = 11, WorkoutDayTemplateId = 20, ExerciseId = 3, OrderIndex = 1, Sets = 3, TargetReps = 10 }, // Dumbbell Incline Press
            new CustomTemplateExercise { Id = 12, WorkoutDayTemplateId = 20, ExerciseId = 24, OrderIndex = 2, Sets = 3, TargetReps = 12 } // Close Grip Bench Press
        );
    }
}
