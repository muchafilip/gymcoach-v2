using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class ProgressionService
{
    private readonly GymCoachDbContext _context;

    public ProgressionService(GymCoachDbContext context)
    {
        _context = context;
    }

    public async Task<SetTarget> CalculateNextTarget(int userId, int exerciseId, int? dayTypeId = null)
    {
        // Get the progression rule for this exercise (or default)
        var rule = await _context.ProgressionRules
            .FirstOrDefaultAsync(r => r.ExerciseId == exerciseId)
            ?? await _context.ProgressionRules
                .FirstOrDefaultAsync(r => r.IsDefault)
            ?? new ProgressionRule
            {
                Name = "Default",
                MinReps = 8,
                MaxReps = 15,
                RepIncrement = 1,
                WeightIncrement = 2.5m,
                FailureThreshold = 2
            };

        // Get the last completed set for this exercise by this user
        // If dayTypeId is provided, filter to same-day type for same-day progression (Week 1 Day 1 -> Week 2 Day 1)
        var query = _context.ExerciseSets
            .Where(s => s.UserExerciseLog.ExerciseId == exerciseId
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.Completed);

        if (dayTypeId.HasValue)
        {
            query = query.Where(s => s.UserExerciseLog.UserWorkoutDay.DayTypeId == dayTypeId.Value);
        }

        var lastSet = await query
            .OrderByDescending(s => s.UserExerciseLog.UserWorkoutDay.CompletedAt)
            .ThenByDescending(s => s.SetNumber)
            .FirstOrDefaultAsync();

        // If no previous sets, return starting values
        if (lastSet == null || lastSet.ActualReps == null)
        {
            return new SetTarget
            {
                TargetReps = rule.MinReps,
                Weight = 0, // User should set their starting weight
                Suggestion = "Start with a weight you can do for " + rule.MinReps + " reps with good form"
            };
        }

        var actualReps = lastSet.ActualReps.Value;
        var targetReps = lastSet.TargetReps;
        var weight = lastSet.Weight ?? 0;

        // Count consecutive failures (missed targets)
        var recentSetsQuery = _context.ExerciseSets
            .Where(s => s.UserExerciseLog.ExerciseId == exerciseId
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.Completed);

        if (dayTypeId.HasValue)
        {
            recentSetsQuery = recentSetsQuery.Where(s => s.UserExerciseLog.UserWorkoutDay.DayTypeId == dayTypeId.Value);
        }

        var recentSets = await recentSetsQuery
            .OrderByDescending(s => s.UserExerciseLog.UserWorkoutDay.CompletedAt)
            .Take(rule.FailureThreshold)
            .ToListAsync();

        var consecutiveFailures = recentSets.Count(s => s.ActualReps < s.TargetReps);

        // User hit or exceeded target
        if (actualReps >= targetReps)
        {
            // At max reps? Increase weight, reset reps
            if (targetReps >= rule.MaxReps)
            {
                return new SetTarget
                {
                    TargetReps = rule.MinReps,
                    Weight = weight + rule.WeightIncrement,
                    Suggestion = $"Great progress! Increased weight by {rule.WeightIncrement}kg"
                };
            }

            // Otherwise increase reps
            return new SetTarget
            {
                TargetReps = targetReps + rule.RepIncrement,
                Weight = weight,
                Suggestion = actualReps > targetReps
                    ? "Excellent! You exceeded your target, adding extra reps"
                    : "Target hit! Adding reps for next session"
            };
        }

        // User missed target multiple times? Suggest decrease
        if (consecutiveFailures >= rule.FailureThreshold)
        {
            return new SetTarget
            {
                TargetReps = targetReps,
                Weight = Math.Max(0, weight - rule.WeightIncrement),
                Suggestion = $"Consider decreasing weight by {rule.WeightIncrement}kg to maintain form"
            };
        }

        // Keep same target
        return new SetTarget
        {
            TargetReps = targetReps,
            Weight = weight,
            Suggestion = actualReps < targetReps - 2
                ? "Missed by a lot - consider reducing weight"
                : "Almost there! Keep the same target"
        };
    }
}
