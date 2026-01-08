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
    public async Task<UserWorkoutPlan> GenerateWorkoutPlan(int userId, int templateId, int durationWeeks = 4)
    {
        // Check for existing active plan with same template
        var existingPlan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
            .FirstOrDefaultAsync(p => p.UserId == userId
                && p.WorkoutTemplateId == templateId
                && p.IsActive);

        if (existingPlan != null)
        {
            Console.WriteLine($"[Generate] Returning existing plan {existingPlan.Id} with {existingPlan.WorkoutDays.Count} days");
            return existingPlan; // Return existing plan to prevent data loss
        }

        Console.WriteLine($"[Generate] Creating new plan with {durationWeeks} weeks");

        // Deactivate any other active plans for this user
        var activePlans = await _context.UserWorkoutPlans
            .Where(p => p.UserId == userId && p.IsActive)
            .ToListAsync();

        foreach (var plan in activePlans)
        {
            plan.IsActive = false;
        }

        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.TargetMuscles)
            .FirstOrDefaultAsync(t => t.Id == templateId)
            ?? throw new ArgumentException("Template not found");

        // Get user's equipment
        var userEquipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        // Always include bodyweight
        if (!userEquipmentIds.Contains(1))
            userEquipmentIds.Add(1);

        // Create the user workout plan
        var newPlan = new UserWorkoutPlan
        {
            UserId = userId,
            WorkoutTemplateId = templateId,
            StartDate = DateTime.UtcNow,
            DurationWeeks = durationWeeks,
            IsActive = true
        };

        _context.UserWorkoutPlans.Add(newPlan);
        await _context.SaveChangesAsync();

        var templateDaysCount = template.DayTemplates.Count;
        var totalDays = templateDaysCount * durationWeeks;
        var dayNumber = 0;

        // Pre-generate ALL workout days for the entire duration
        for (int week = 1; week <= durationWeeks; week++)
        {
            foreach (var dayTemplate in template.DayTemplates.OrderBy(d => d.DayNumber))
            {
                dayNumber++;
                var workoutDay = new UserWorkoutDay
                {
                    UserWorkoutPlanId = newPlan.Id,
                    DayNumber = dayNumber,
                    WeekNumber = week,
                    DayTypeId = dayTemplate.Id,  // Track which template day this is
                    WorkoutDayTemplateId = dayTemplate.Id
                };

                _context.UserWorkoutDays.Add(workoutDay);
                await _context.SaveChangesAsync();

                // Only generate exercises for Week 1
                // Later weeks are placeholders - exercises generated after prior week completion
                if (week == 1)
                {
                    await GenerateExercisesForDay(workoutDay.Id, dayTemplate, userId, userEquipmentIds, null);
                }
            }
        }

        await _context.SaveChangesAsync();
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
        int? dayTypeIdForProgression)
    {
        int orderIndex = 0;
        foreach (var targetMuscle in dayTemplate.TargetMuscles)
        {
            var availableExercises = await _context.Exercises
                .Include(e => e.RequiredEquipment)
                .Where(e =>
                    (e.PrimaryMuscleGroupId == targetMuscle.MuscleGroupId ||
                     e.SecondaryMuscles.Any(sm => sm.MuscleGroupId == targetMuscle.MuscleGroupId)) &&
                    e.RequiredEquipment.All(re => userEquipmentIds.Contains(re.EquipmentId)))
                .ToListAsync();

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

            foreach (var exercise in selectedExercises)
            {
                var exerciseLog = new UserExerciseLog
                {
                    UserWorkoutDayId = workoutDayId,
                    ExerciseId = exercise.Id,
                    OrderIndex = orderIndex++
                };

                _context.UserExerciseLogs.Add(exerciseLog);
                await _context.SaveChangesAsync();

                // Get progression target - use dayTypeId for same-day progression
                var target = await _progressionService.CalculateNextTarget(userId, exercise.Id, dayTypeIdForProgression);

                for (int setNum = 1; setNum <= 3; setNum++)
                {
                    var set = new ExerciseSet
                    {
                        UserExerciseLogId = exerciseLog.Id,
                        SetNumber = setNum,
                        TargetReps = target.TargetReps,
                        Weight = target.Weight,
                        Completed = false
                    };
                    _context.ExerciseSets.Add(set);
                }
            }
        }
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Generates exercises for all days in the next week based on previous week's performance
    /// </summary>
    public async Task<bool> GenerateNextWeekWorkouts(int planId, int weekNumber)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
            .Include(p => p.WorkoutTemplate)
                .ThenInclude(t => t.DayTemplates)
                    .ThenInclude(d => d.TargetMuscles)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return false;

        // Get user's equipment
        var userEquipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == plan.UserId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        if (!userEquipmentIds.Contains(1))
            userEquipmentIds.Add(1);

        // Get all placeholder days for this week (no exercises yet)
        var weekDays = plan.WorkoutDays
            .Where(d => d.WeekNumber == weekNumber)
            .ToList();

        foreach (var day in weekDays)
        {
            // Check if exercises already exist
            var existingExercises = await _context.UserExerciseLogs
                .AnyAsync(el => el.UserWorkoutDayId == day.Id);

            if (existingExercises) continue; // Skip if already generated

            var dayTemplate = plan.WorkoutTemplate.DayTemplates
                .FirstOrDefault(dt => dt.Id == day.DayTypeId);

            if (dayTemplate == null) continue;

            // Generate exercises with progression based on same dayTypeId
            await GenerateExercisesForDay(day.Id, dayTemplate, plan.UserId, userEquipmentIds, day.DayTypeId);
        }

        return true;
    }

    /// <summary>
    /// Checks if all days in a week are completed and triggers next week generation
    /// </summary>
    public async Task<bool> CheckAndGenerateNextWeek(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return false;

        // Find the current week (lowest week with incomplete days)
        var incompleteDaysByWeek = plan.WorkoutDays
            .Where(d => d.CompletedAt == null)
            .GroupBy(d => d.WeekNumber)
            .OrderBy(g => g.Key)
            .FirstOrDefault();

        if (incompleteDaysByWeek == null)
        {
            // All weeks complete
            return false;
        }

        var currentWeek = incompleteDaysByWeek.Key;

        // Check if all days in the previous week are completed
        var previousWeek = currentWeek - 1;
        if (previousWeek < 1) return false;

        var previousWeekDays = plan.WorkoutDays.Where(d => d.WeekNumber == previousWeek).ToList();
        var allPreviousCompleted = previousWeekDays.All(d => d.CompletedAt != null);

        if (allPreviousCompleted)
        {
            // Generate exercises for next week
            return await GenerateNextWeekWorkouts(planId, currentWeek);
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
