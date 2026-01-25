using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class WorkoutGeneratorService
{
    private readonly GymCoachDbContext _context;
    private readonly ProgressionService _progressionService;

    public WorkoutGeneratorService(GymCoachDbContext context, ProgressionService progressionService)
    {
        _context = context;
        _progressionService = progressionService;
    }

    /// <summary>
    /// Generates a user workout plan from a template, selecting exercises based on user's equipment
    /// </summary>
    /// <param name="priorityMuscleIds">Optional list of 1-2 muscle group IDs to prioritize (extra volume)</param>
    public async Task<UserWorkoutPlan> GenerateWorkoutPlan(int userId, int templateId, List<int>? priorityMuscleIds = null)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        Console.WriteLine($"[Generate] START - userId={userId}, templateId={templateId}, priorityMuscles={string.Join(",", priorityMuscleIds ?? [])}");

        // Validate priority muscles (max 2)
        if (priorityMuscleIds?.Count > 2)
            throw new ArgumentException("Maximum 2 priority muscles allowed");

        // Deactivate any other active plans for this user
        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Deactivating old plans...");
        var activePlans = await _context.UserWorkoutPlans
            .Where(p => p.UserId == userId && p.IsActive)
            .ToListAsync();

        foreach (var plan in activePlans)
        {
            plan.IsActive = false;
        }

        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Loading template...");
        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.TargetMuscles)
            .FirstOrDefaultAsync(t => t.Id == templateId)
            ?? throw new ArgumentException("Template not found");

        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Loading user equipment...");
        // Get user's equipment
        var userEquipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        // Always include bodyweight
        if (!userEquipmentIds.Contains(1))
            userEquipmentIds.Add(1);

        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Creating plan entity...");
        // Create the user workout plan (plans are now indefinite - only generate week 1)
        var newPlan = new UserWorkoutPlan
        {
            UserId = userId,
            WorkoutTemplateId = templateId,
            StartDate = DateTime.UtcNow,
            DurationWeeks = 1, // Start with 1 week, more generated on demand
            IsActive = true
        };

        _context.UserWorkoutPlans.Add(newPlan);
        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Saving plan...");
        await _context.SaveChangesAsync();
        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Plan saved, ID={newPlan.Id}");

        // Store priority muscles (gracefully handle if table doesn't exist yet)
        if (priorityMuscleIds?.Any() == true)
        {
            try
            {
                Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Saving priority muscles...");
                foreach (var muscleId in priorityMuscleIds)
                {
                    _context.UserWorkoutPlanPriorityMuscles.Add(new UserWorkoutPlanPriorityMuscle
                    {
                        UserWorkoutPlanId = newPlan.Id,
                        MuscleGroupId = muscleId
                    });
                }
                await _context.SaveChangesAsync();
                Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Priority muscles saved");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Warning: Could not save priority muscles: {ex.Message}");
                // Continue without priority muscles - plan will still work
            }
        }

        var dayNumber = 0;
        var workoutDays = new List<(UserWorkoutDay day, WorkoutDayTemplate template)>();

        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Creating {template.DayTemplates.Count} workout days...");
        // Only generate Week 1 - more weeks generated on demand when week completes
        foreach (var dayTemplate in template.DayTemplates.OrderBy(d => d.DayNumber))
        {
            dayNumber++;
            var workoutDay = new UserWorkoutDay
            {
                UserWorkoutPlanId = newPlan.Id,
                DayNumber = dayNumber,
                WeekNumber = 1,
                DayTypeId = dayTemplate.Id,
                WorkoutDayTemplateId = dayTemplate.Id
            };

            _context.UserWorkoutDays.Add(workoutDay);
            workoutDays.Add((workoutDay, dayTemplate));
        }

        // Single save for all days
        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Saving all days...");
        await _context.SaveChangesAsync();
        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Days saved");

        // Now generate exercises for each day (they need the day IDs)
        foreach (var (workoutDay, dayTemplate) in workoutDays)
        {
            Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Generating exercises for day {workoutDay.DayNumber}...");
            await GenerateExercisesForDay(workoutDay.Id, dayTemplate, userId, userEquipmentIds, null, template.HasSupersets, priorityMuscleIds);
            Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - Day {workoutDay.DayNumber} complete");
        }

        Console.WriteLine($"[Generate] {sw.ElapsedMilliseconds}ms - DONE");
        return newPlan;
    }

    /// <summary>
    /// Generates exercises for a workout day based on template and user's equipment
    /// </summary>
    private async Task GenerateExercisesForDay(
        int workoutDayId,
        WorkoutDayTemplate dayTemplate,
        int userId,
        List<int> userEquipmentIds,
        int? dayTypeIdForProgression,
        bool createSupersets = false,
        List<int>? priorityMuscleIds = null)
    {
        // Check if this is a custom template with pre-defined exercises
        var customExercises = await _context.CustomTemplateExercises
            .Include(e => e.Exercise)
            .Where(e => e.WorkoutDayTemplateId == dayTemplate.Id)
            .OrderBy(e => e.OrderIndex)
            .ToListAsync();

        if (customExercises.Any())
        {
            // Use custom template exercises directly (no priority muscle support for custom templates)
            await GenerateFromCustomTemplate(workoutDayId, customExercises, userId, dayTypeIdForProgression);
        }
        else
        {
            // Use random selection based on target muscles (system templates)
            await GenerateFromSystemTemplate(workoutDayId, dayTemplate, userId, userEquipmentIds, dayTypeIdForProgression, createSupersets, priorityMuscleIds);
        }
    }

    /// <summary>
    /// Generates exercises from a custom template with pre-defined exercises
    /// </summary>
    private async Task GenerateFromCustomTemplate(
        int workoutDayId,
        List<CustomTemplateExercise> customExercises,
        int userId,
        int? dayTypeIdForProgression)
    {
        foreach (var customEx in customExercises)
        {
            var exerciseLog = new UserExerciseLog
            {
                UserWorkoutDayId = workoutDayId,
                ExerciseId = customEx.ExerciseId,
                OrderIndex = customEx.OrderIndex
            };

            _context.UserExerciseLogs.Add(exerciseLog);
            await _context.SaveChangesAsync();

            // Use custom template settings for sets
            for (int setNum = 1; setNum <= customEx.Sets; setNum++)
            {
                var set = new ExerciseSet
                {
                    UserExerciseLogId = exerciseLog.Id,
                    SetNumber = setNum,
                    TargetReps = customEx.TargetReps,
                    Weight = customEx.DefaultWeight,
                    Completed = false
                };
                _context.ExerciseSets.Add(set);
            }
        }
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Generates exercises from a system template using random selection based on target muscles
    /// </summary>
    private async Task GenerateFromSystemTemplate(
        int workoutDayId,
        WorkoutDayTemplate dayTemplate,
        int userId,
        List<int> userEquipmentIds,
        int? dayTypeIdForProgression,
        bool createSupersets,
        List<int>? priorityMuscleIds = null)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        Console.WriteLine($"[GenExercises] START day {workoutDayId}, {dayTemplate.TargetMuscles.Count} target muscles");

        int orderIndex = 0;
        // Track generated exercises by muscle group for superset pairing
        var exerciseLogs = new List<(int muscleGroupId, UserExerciseLog log)>();
        // Track which exercises were already selected (to avoid duplicates for priority muscles)
        var selectedExerciseIds = new HashSet<int>();

        foreach (var targetMuscle in dayTemplate.TargetMuscles)
        {
            Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Querying exercises for muscle {targetMuscle.MuscleGroupId}...");
            var availableExercises = await _context.Exercises
                .Include(e => e.RequiredEquipment)
                .Where(e =>
                    (e.PrimaryMuscleGroupId == targetMuscle.MuscleGroupId ||
                     e.SecondaryMuscles.Any(sm => sm.MuscleGroupId == targetMuscle.MuscleGroupId)) &&
                    e.RequiredEquipment.All(re => userEquipmentIds.Contains(re.EquipmentId)))
                .ToListAsync();
            Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Found {availableExercises.Count} exercises");

            var primaryExercises = availableExercises
                .Where(e => e.PrimaryMuscleGroupId == targetMuscle.MuscleGroupId)
                .ToList();

            var selectedExercises = primaryExercises
                .OrderBy(_ => Guid.NewGuid())
                .Take(targetMuscle.ExerciseCount)
                .ToList();

            if (selectedExercises.Count < targetMuscle.ExerciseCount)
            {
                var remaining = targetMuscle.ExerciseCount - selectedExercises.Count;
                var secondaryExercises = availableExercises
                    .Except(selectedExercises)
                    .OrderBy(_ => Guid.NewGuid())
                    .Take(remaining);
                selectedExercises.AddRange(secondaryExercises);
            }

            // Skip progression for new plans (dayTypeIdForProgression is null for week 1)
            var skipProgression = dayTypeIdForProgression == null;
            Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Adding {selectedExercises.Count} exercises (skipProgression={skipProgression})...");
            foreach (var exercise in selectedExercises)
            {
                selectedExerciseIds.Add(exercise.Id);
                var (newOrderIndex, exerciseLog) = await AddExerciseToDay(workoutDayId, exercise, userId, dayTypeIdForProgression, orderIndex, targetMuscle.MuscleGroupId, skipProgression);
                orderIndex = newOrderIndex;
                exerciseLogs.Add((targetMuscle.MuscleGroupId, exerciseLog));
            }
            Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Exercises added");
        }

        // Add +1 exercise for each priority muscle that's targeted on this day
        if (priorityMuscleIds != null)
        {
            var skipProgression = dayTypeIdForProgression == null;
            Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Processing priority muscles...");
            foreach (var priorityMuscleId in priorityMuscleIds)
            {
                // Check if this muscle is already targeted on this day
                if (dayTemplate.TargetMuscles.Any(tm => tm.MuscleGroupId == priorityMuscleId))
                {
                    Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Querying priority exercises for muscle {priorityMuscleId}...");
                    // Add 1 extra exercise for this priority muscle
                    var availableExercises = await _context.Exercises
                        .Include(e => e.RequiredEquipment)
                        .Where(e =>
                            e.PrimaryMuscleGroupId == priorityMuscleId &&
                            !selectedExerciseIds.Contains(e.Id) && // Exclude already selected
                            e.RequiredEquipment.All(re => userEquipmentIds.Contains(re.EquipmentId)))
                        .ToListAsync();

                    var priorityExercise = availableExercises
                        .OrderBy(_ => Guid.NewGuid())
                        .FirstOrDefault();

                    if (priorityExercise != null)
                    {
                        Console.WriteLine($"[GenExercises] {sw.ElapsedMilliseconds}ms - Adding priority exercise: {priorityExercise.Name}");
                        selectedExerciseIds.Add(priorityExercise.Id);
                        var (newOrderIndex, exerciseLog) = await AddExerciseToDay(workoutDayId, priorityExercise, userId, dayTypeIdForProgression, orderIndex, priorityMuscleId, skipProgression);
                        orderIndex = newOrderIndex;
                        exerciseLogs.Add((priorityMuscleId, exerciseLog));
                    }
                }
            }
        }

        // Single save for all exercises and sets
        await _context.SaveChangesAsync();

        // Create supersets if template requires it (needs IDs, so must be after save)
        if (createSupersets)
        {
            var exercisesByMuscle = exerciseLogs
                .GroupBy(x => x.muscleGroupId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.log.Id).ToList());
            await CreateSupersetsForDay(workoutDayId, exercisesByMuscle);
        }
    }

    /// <summary>
    /// Helper to add an exercise to a workout day (no save - caller must save)
    /// </summary>
    private async Task<(int orderIndex, UserExerciseLog exerciseLog)> AddExerciseToDay(
        int workoutDayId,
        Exercise exercise,
        int userId,
        int? dayTypeIdForProgression,
        int orderIndex,
        int muscleGroupId,
        bool skipProgression = false)
    {
        var exerciseLog = new UserExerciseLog
        {
            UserWorkoutDayId = workoutDayId,
            ExerciseId = exercise.Id,
            OrderIndex = orderIndex++
        };

        _context.UserExerciseLogs.Add(exerciseLog);
        // Don't save here - let caller batch saves

        // Get progression target (skip for new plans to avoid many DB calls)
        int targetReps = 10;
        decimal weight = 0;
        if (!skipProgression)
        {
            var target = await _progressionService.CalculateNextTarget(userId, exercise.Id, dayTypeIdForProgression);
            targetReps = target.TargetReps;
            weight = target.Weight;
        }

        for (int setNum = 1; setNum <= 3; setNum++)
        {
            var set = new ExerciseSet
            {
                UserExerciseLog = exerciseLog, // Use navigation property instead of ID
                SetNumber = setNum,
                TargetReps = targetReps,
                Weight = weight,
                Completed = false
            };
            _context.ExerciseSets.Add(set);
        }

        return (orderIndex, exerciseLog);
    }

    /// <summary>
    /// Creates supersets by pairing exercises from antagonist muscle groups
    /// </summary>
    private async Task CreateSupersetsForDay(int workoutDayId, Dictionary<int, List<int>> exercisesByMuscle)
    {
        // Antagonist muscle group pairs
        var antagonistPairs = new List<(int muscleA, int muscleB)>
        {
            (1, 2),   // Chest + Back
            (4, 5),   // Biceps + Triceps
            (6, 7),   // Quads + Hamstrings
            (3, 2),   // Shoulders + Back
        };

        var maxGroupId = await _context.UserExerciseLogs
            .Where(el => el.SupersetGroupId != null)
            .MaxAsync(el => (int?)el.SupersetGroupId) ?? 0;

        foreach (var (muscleA, muscleB) in antagonistPairs)
        {
            if (!exercisesByMuscle.ContainsKey(muscleA) || !exercisesByMuscle.ContainsKey(muscleB))
                continue;

            var exercisesA = exercisesByMuscle[muscleA];
            var exercisesB = exercisesByMuscle[muscleB];

            // Pair up exercises from each muscle group
            var pairCount = Math.Min(exercisesA.Count, exercisesB.Count);
            for (int i = 0; i < pairCount; i++)
            {
                maxGroupId++;
                var groupId = maxGroupId;

                var logA = await _context.UserExerciseLogs.FindAsync(exercisesA[i]);
                var logB = await _context.UserExerciseLogs.FindAsync(exercisesB[i]);

                if (logA != null && logB != null)
                {
                    logA.SupersetGroupId = groupId;
                    logA.SupersetOrder = 1;
                    logB.SupersetGroupId = groupId;
                    logB.SupersetOrder = 2;

                    // Create superset record
                    var superset = new UserSuperset
                    {
                        ExerciseLogAId = exercisesA[i],
                        ExerciseLogBId = exercisesB[i],
                        IsManual = false
                    };
                    _context.UserSupersets.Add(superset);
                }
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Generates exercises for all days in the next week by copying from previous week
    /// </summary>
    public async Task<bool> GenerateNextWeekWorkouts(int planId, int weekNumber)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
            .Include(p => p.WorkoutTemplate)
                .ThenInclude(t => t.DayTemplates)
                    .ThenInclude(d => d.TargetMuscles)
            .Include(p => p.PriorityMuscles)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return false;

        // Get priority muscle IDs for this plan
        var priorityMuscleIds = plan.PriorityMuscles.Select(pm => pm.MuscleGroupId).ToList();

        // Get all days for this week (no exercises yet)
        var weekDays = plan.WorkoutDays
            .Where(d => d.WeekNumber == weekNumber)
            .ToList();

        // Get previous week's days for copying
        var previousWeekNumber = weekNumber - 1;
        var previousWeekDays = await _context.UserWorkoutDays
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Exercise)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Sets)
            .Where(d => d.UserWorkoutPlanId == planId && d.WeekNumber == previousWeekNumber)
            .ToListAsync();

        foreach (var day in weekDays)
        {
            // Check if exercises already exist
            var existingExercises = await _context.UserExerciseLogs
                .AnyAsync(el => el.UserWorkoutDayId == day.Id);

            if (existingExercises) continue; // Skip if already generated

            // Find the corresponding day from previous week (same DayTypeId)
            var previousDay = previousWeekDays.FirstOrDefault(d => d.DayTypeId == day.DayTypeId);

            if (previousDay != null && previousDay.ExerciseLogs.Any())
            {
                // Copy exercises from previous week
                await CopyExercisesFromPreviousDay(day.Id, previousDay, plan.UserId, plan.WorkoutTemplate.HasSupersets);
            }
            else
            {
                // Fallback: generate from template (shouldn't happen normally)
                var dayTemplate = plan.WorkoutTemplate.DayTemplates
                    .FirstOrDefault(dt => dt.Id == day.DayTypeId);

                if (dayTemplate != null)
                {
                    var userEquipmentIds = await _context.Set<UserEquipment>()
                        .Where(ue => ue.UserId == plan.UserId)
                        .Select(ue => ue.EquipmentId)
                        .ToListAsync();

                    if (!userEquipmentIds.Contains(1))
                        userEquipmentIds.Add(1);

                    await GenerateExercisesForDay(day.Id, dayTemplate, plan.UserId, userEquipmentIds, day.DayTypeId, plan.WorkoutTemplate.HasSupersets, priorityMuscleIds.Any() ? priorityMuscleIds : null);
                }
            }
        }

        return true;
    }

    /// <summary>
    /// Copies exercises from a previous day, keeping same exercises and pre-filling weights.
    /// Implements progressive overload: if all sets hit target reps, increase target reps by 1.
    /// </summary>
    private async Task CopyExercisesFromPreviousDay(int newDayId, UserWorkoutDay previousDay, int userId, bool createSupersets)
    {
        const int MAX_TARGET_REPS = 15; // Cap progression at 15 reps

        var exercisesByMuscle = new Dictionary<int, List<int>>();
        var supersetMapping = new Dictionary<int, int>(); // old SupersetGroupId -> new SupersetGroupId

        // Get max superset group ID for creating new ones
        var maxGroupId = await _context.UserExerciseLogs
            .Where(el => el.SupersetGroupId != null)
            .MaxAsync(el => (int?)el.SupersetGroupId) ?? 0;

        foreach (var previousLog in previousDay.ExerciseLogs.OrderBy(el => el.OrderIndex))
        {
            // Create new exercise log with same exercise
            var exerciseLog = new UserExerciseLog
            {
                UserWorkoutDayId = newDayId,
                ExerciseId = previousLog.ExerciseId,
                OrderIndex = previousLog.OrderIndex
            };

            // Handle superset grouping
            if (previousLog.SupersetGroupId.HasValue)
            {
                if (!supersetMapping.ContainsKey(previousLog.SupersetGroupId.Value))
                {
                    maxGroupId++;
                    supersetMapping[previousLog.SupersetGroupId.Value] = maxGroupId;
                }
                exerciseLog.SupersetGroupId = supersetMapping[previousLog.SupersetGroupId.Value];
                exerciseLog.SupersetOrder = previousLog.SupersetOrder;
            }

            _context.UserExerciseLogs.Add(exerciseLog);
            await _context.SaveChangesAsync();

            // Track for potential superset creation
            var muscleGroupId = previousLog.Exercise.PrimaryMuscleGroupId;
            if (!exercisesByMuscle.ContainsKey(muscleGroupId))
            {
                exercisesByMuscle[muscleGroupId] = [];
            }
            exercisesByMuscle[muscleGroupId].Add(exerciseLog.Id);

            // Get last completed weight for this exercise from previous week
            var completedSets = previousLog.Sets.Where(s => s.Completed).ToList();
            var lastWeight = completedSets
                .Where(s => s.Weight.HasValue)
                .OrderByDescending(s => s.SetNumber)
                .FirstOrDefault()?.Weight;

            // Check if user hit all target reps for progressive overload
            // All sets must be completed and actual reps >= target reps
            var shouldProgressReps = completedSets.Count > 0 &&
                completedSets.Count == previousLog.Sets.Count &&
                completedSets.All(s => s.ActualReps.HasValue && s.ActualReps >= s.TargetReps);

            // Copy sets with progressive target reps
            foreach (var previousSet in previousLog.Sets.OrderBy(s => s.SetNumber))
            {
                // Calculate new target reps: increase by 1 if all sets were hit, otherwise keep same
                var newTargetReps = previousSet.TargetReps;
                if (shouldProgressReps && newTargetReps < MAX_TARGET_REPS)
                {
                    newTargetReps = previousSet.TargetReps + 1;
                }

                var set = new ExerciseSet
                {
                    UserExerciseLogId = exerciseLog.Id,
                    SetNumber = previousSet.SetNumber,
                    TargetReps = newTargetReps,
                    Weight = lastWeight ?? previousSet.Weight, // Use last week's weight
                    Completed = false
                };
                _context.ExerciseSets.Add(set);
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Checks if all days in a week are completed and triggers next week generation
    /// </summary>
    public async Task<bool> CheckAndGenerateNextWeek(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
            .Include(p => p.WorkoutTemplate)
                .ThenInclude(t => t.DayTemplates)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return false;

        // Find the max completed week
        var maxWeek = plan.WorkoutDays.Max(d => d.WeekNumber);
        var currentWeekDays = plan.WorkoutDays.Where(d => d.WeekNumber == maxWeek).ToList();
        var allCurrentWeekComplete = currentWeekDays.All(d => d.CompletedAt != null);

        if (allCurrentWeekComplete)
        {
            // Current week is complete - create next week
            var nextWeek = maxWeek + 1;
            Console.WriteLine($"[Generate] Week {maxWeek} complete, generating week {nextWeek}");

            // Create placeholder days for next week
            var templateDays = plan.WorkoutTemplate.DayTemplates.OrderBy(d => d.DayNumber).ToList();
            var baseDayNumber = plan.WorkoutDays.Max(d => d.DayNumber);

            foreach (var dayTemplate in templateDays)
            {
                baseDayNumber++;
                var workoutDay = new UserWorkoutDay
                {
                    UserWorkoutPlanId = plan.Id,
                    DayNumber = baseDayNumber,
                    WeekNumber = nextWeek,
                    DayTypeId = dayTemplate.Id,
                    WorkoutDayTemplateId = dayTemplate.Id
                };
                _context.UserWorkoutDays.Add(workoutDay);
            }
            await _context.SaveChangesAsync();

            // Update plan duration
            plan.DurationWeeks = nextWeek;
            await _context.SaveChangesAsync();

            // Generate exercises for the new week
            return await GenerateNextWeekWorkouts(planId, nextWeek);
        }

        // Check if there are any weeks with days but no exercises (edge case)
        var incompleteDaysByWeek = plan.WorkoutDays
            .Where(d => d.CompletedAt == null)
            .GroupBy(d => d.WeekNumber)
            .OrderBy(g => g.Key)
            .FirstOrDefault();

        if (incompleteDaysByWeek != null)
        {
            var currentWeek = incompleteDaysByWeek.Key;
            var previousWeek = currentWeek - 1;

            if (previousWeek >= 1)
            {
                var previousWeekDays = plan.WorkoutDays.Where(d => d.WeekNumber == previousWeek).ToList();
                var allPreviousCompleted = previousWeekDays.All(d => d.CompletedAt != null);

                if (allPreviousCompleted)
                {
                    return await GenerateNextWeekWorkouts(planId, currentWeek);
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Gets the user's active workout plan
    /// </summary>
    public async Task<UserWorkoutPlan?> GetActivePlan(int userId)
    {
        return await _context.UserWorkoutPlans
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);
    }

    /// <summary>
    /// Activates a plan and deactivates all others
    /// </summary>
    public async Task<bool> ActivatePlan(int planId, int userId)
    {
        var plan = await _context.UserWorkoutPlans.FindAsync(planId);
        if (plan == null) return false;

        // Use the plan's userId (ignore passed userId for now - no auth)
        var actualUserId = plan.UserId;

        // Deactivate all plans for this user
        var userPlans = await _context.UserWorkoutPlans
            .Where(p => p.UserId == actualUserId)
            .ToListAsync();

        foreach (var p in userPlans)
        {
            p.IsActive = p.Id == planId;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Gets alternative exercises for substitution (same muscle group + user's equipment)
    /// </summary>
    public async Task<List<Exercise>> GetExerciseAlternatives(int exerciseId, int userId)
    {
        var exercise = await _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(e => e.Id == exerciseId);

        if (exercise == null) return [];

        var userEquipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        if (!userEquipmentIds.Contains(1))
            userEquipmentIds.Add(1);

        return await _context.Exercises
            .Include(e => e.RequiredEquipment)
            .Where(e =>
                e.Id != exerciseId &&
                e.PrimaryMuscleGroupId == exercise.PrimaryMuscleGroupId &&
                e.RequiredEquipment.All(re => userEquipmentIds.Contains(re.EquipmentId)))
            .ToListAsync();
    }

    /// <summary>
    /// Substitutes an exercise in a workout day
    /// </summary>
    public async Task<bool> SubstituteExercise(int exerciseLogId, int newExerciseId, int userId)
    {
        var exerciseLog = await _context.UserExerciseLogs
            .Include(el => el.Sets)
            .Include(el => el.UserWorkoutDay)
                .ThenInclude(d => d.UserWorkoutPlan)
            .FirstOrDefaultAsync(el => el.Id == exerciseLogId);

        if (exerciseLog == null) return false;
        if (exerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId != userId) return false;

        var newExercise = await _context.Exercises.FindAsync(newExerciseId);
        if (newExercise == null) return false;

        // Update exercise reference
        exerciseLog.ExerciseId = newExerciseId;

        // Recalculate targets for all sets
        var target = await _progressionService.CalculateNextTarget(userId, newExerciseId, exerciseLog.UserWorkoutDay.DayTypeId);

        foreach (var set in exerciseLog.Sets)
        {
            if (!set.Completed)
            {
                set.TargetReps = target.TargetReps;
                set.Weight = target.Weight;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }
}
