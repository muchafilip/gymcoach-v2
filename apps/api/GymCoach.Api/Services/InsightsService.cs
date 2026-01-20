using GymCoach.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class Insight
{
    public string Type { get; set; } = "";  // "plateau", "progress", "volume", "consistency", "streak"
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string? Suggestion { get; set; }
    public string? ExerciseName { get; set; }
    public string? IconEmoji { get; set; }
}

public class InsightsService
{
    private readonly GymCoachDbContext _context;
    private readonly XpService _xpService;

    public InsightsService(GymCoachDbContext context, XpService xpService)
    {
        _context = context;
        _xpService = xpService;
    }

    /// <summary>
    /// Generate all insights for a user
    /// </summary>
    public async Task<List<Insight>> GetInsights(int userId)
    {
        var insights = new List<Insight>();

        // Run sequentially - DbContext is not thread-safe
        insights.AddRange(await GetStreakInfo(userId));
        insights.AddRange(await GetProgressHighlights(userId));
        insights.AddRange(await GetVolumeAnalysis(userId));
        insights.AddRange(await GetPlateauWarnings(userId));
        insights.AddRange(await GetConsistencyNudges(userId));

        // Always add summary stats if we don't have enough insights
        if (insights.Count < 3)
        {
            insights.AddRange(await GetSummaryStats(userId, 3 - insights.Count));
        }

        // Already in priority order: streaks, progress, volume, plateau, consistency, summary
        return insights;
    }

    /// <summary>
    /// Get summary statistics insights (total workouts, best lifts, etc.)
    /// Used as fallback when other insights aren't available
    /// </summary>
    private async Task<List<Insight>> GetSummaryStats(int userId, int maxCount)
    {
        var insights = new List<Insight>();

        // Get user's all-time stats
        var completedDays = await _context.UserWorkoutDays
            .Include(d => d.UserWorkoutPlan)
            .Where(d => d.UserWorkoutPlan.UserId == userId && d.CompletedAt != null)
            .CountAsync();

        var totalVolume = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
                .ThenInclude(l => l.UserWorkoutDay)
                    .ThenInclude(d => d.UserWorkoutPlan)
            .Where(s => s.Completed
                && s.Weight.HasValue
                && s.ActualReps.HasValue
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId)
            .SumAsync(s => (decimal)(s.Weight!.Value * s.ActualReps!.Value));

        // Workout milestone insight
        if (completedDays > 0 && insights.Count < maxCount)
        {
            var milestone = completedDays switch
            {
                >= 100 => "100+ workouts - you're a machine!",
                >= 50 => "50+ workouts completed. Incredible!",
                >= 25 => "25+ workouts done. You're building a habit!",
                >= 10 => "10+ workouts in the books. Keep going!",
                _ => $"{completedDays} workouts logged. Every rep counts!"
            };

            insights.Add(new Insight
            {
                Type = "progress",
                Title = "Your Journey",
                Message = milestone,
                IconEmoji = "muscle"
            });
        }

        // Volume insight
        if (totalVolume > 0 && insights.Count < maxCount)
        {
            var volumeText = totalVolume >= 100000
                ? $"{totalVolume / 1000:F0} tons lifted total!"
                : $"{totalVolume:F0}kg lifted total!";

            insights.Add(new Insight
            {
                Type = "volume",
                Title = "Total Volume",
                Message = volumeText,
                IconEmoji = "weight_lifting"
            });
        }

        // Motivational tip if still need more
        if (insights.Count < maxCount)
        {
            var tips = new[]
            {
                new Insight { Type = "consistency", Title = "Pro Tip", Message = "Progressive overload is key - try to add a little more weight or reps each week.", IconEmoji = "lightbulb" },
                new Insight { Type = "consistency", Title = "Recovery Matters", Message = "Muscles grow during rest. Make sure you're getting 7-9 hours of sleep.", IconEmoji = "zzz" },
                new Insight { Type = "consistency", Title = "Stay Hydrated", Message = "Drink water before, during, and after your workout for optimal performance.", IconEmoji = "droplet" },
            };

            var random = new Random();
            insights.Add(tips[random.Next(tips.Length)]);
        }

        return insights.Take(maxCount).ToList();
    }

    /// <summary>
    /// Detect exercises where user hasn't improved max weight in 3+ weeks
    /// Compare max weight in weeks 1-3 ago vs max weight in last week
    /// </summary>
    private async Task<List<Insight>> GetPlateauWarnings(int userId)
    {
        var insights = new List<Insight>();
        var now = DateTime.UtcNow;
        var oneWeekAgo = now.AddDays(-7);
        var threeWeeksAgo = now.AddDays(-21);
        var fourWeeksAgo = now.AddDays(-28);

        // Get completed sets grouped by exercise for different time periods
        var recentSets = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
                .ThenInclude(l => l.UserWorkoutDay)
                    .ThenInclude(d => d.UserWorkoutPlan)
            .Include(s => s.UserExerciseLog.Exercise)
            .Where(s => s.Completed
                && s.Weight.HasValue
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.UserExerciseLog.UserWorkoutDay.CompletedAt >= fourWeeksAgo)
            .Select(s => new
            {
                s.Weight,
                s.UserExerciseLog.ExerciseId,
                ExerciseName = s.UserExerciseLog.Exercise.Name,
                CompletedAt = s.UserExerciseLog.UserWorkoutDay.CompletedAt
            })
            .ToListAsync();

        // Group by exercise
        var exerciseGroups = recentSets.GroupBy(s => s.ExerciseId);

        foreach (var group in exerciseGroups)
        {
            var exerciseName = group.First().ExerciseName;

            // Max weight in last week
            var lastWeekMax = group
                .Where(s => s.CompletedAt >= oneWeekAgo)
                .Max(s => s.Weight) ?? 0;

            // Max weight from 1-3 weeks ago
            var previousMax = group
                .Where(s => s.CompletedAt >= threeWeeksAgo && s.CompletedAt < oneWeekAgo)
                .Max(s => s.Weight) ?? 0;

            // Plateau detected if no improvement and we have data from both periods
            if (previousMax > 0 && lastWeekMax > 0 && lastWeekMax <= previousMax)
            {
                insights.Add(new Insight
                {
                    Type = "plateau",
                    Title = "Plateau Detected",
                    Message = $"Your max weight on {exerciseName} hasn't increased in 3 weeks ({lastWeekMax}kg).",
                    Suggestion = "Try adding 2.5kg or switching to a variation exercise for a few weeks.",
                    ExerciseName = exerciseName,
                    IconEmoji = "warning"
                });
            }
        }

        // Limit to top 2 plateau warnings
        return insights.Take(2).ToList();
    }

    /// <summary>
    /// Highlight exercises where user has made significant progress (10%+ weight increase)
    /// Compare best weight this month vs last month
    /// </summary>
    private async Task<List<Insight>> GetProgressHighlights(int userId)
    {
        var insights = new List<Insight>();
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sixtyDaysAgo = now.AddDays(-60);

        var recentSets = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
                .ThenInclude(l => l.UserWorkoutDay)
                    .ThenInclude(d => d.UserWorkoutPlan)
            .Include(s => s.UserExerciseLog.Exercise)
            .Where(s => s.Completed
                && s.Weight.HasValue
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.UserExerciseLog.UserWorkoutDay.CompletedAt >= sixtyDaysAgo)
            .Select(s => new
            {
                s.Weight,
                s.UserExerciseLog.ExerciseId,
                ExerciseName = s.UserExerciseLog.Exercise.Name,
                CompletedAt = s.UserExerciseLog.UserWorkoutDay.CompletedAt
            })
            .ToListAsync();

        var exerciseGroups = recentSets.GroupBy(s => s.ExerciseId);

        foreach (var group in exerciseGroups)
        {
            var exerciseName = group.First().ExerciseName;

            // Best weight this month
            var thisMonthMax = group
                .Where(s => s.CompletedAt >= thirtyDaysAgo)
                .Max(s => s.Weight) ?? 0;

            // Best weight last month
            var lastMonthMax = group
                .Where(s => s.CompletedAt >= sixtyDaysAgo && s.CompletedAt < thirtyDaysAgo)
                .Max(s => s.Weight) ?? 0;

            if (lastMonthMax > 0 && thisMonthMax > lastMonthMax)
            {
                var percentIncrease = ((thisMonthMax - lastMonthMax) / lastMonthMax) * 100;

                if (percentIncrease >= 5) // 5% or more improvement
                {
                    insights.Add(new Insight
                    {
                        Type = "progress",
                        Title = "Great Progress!",
                        Message = $"Your {exerciseName} has improved by {percentIncrease:F0}% this month ({lastMonthMax}kg -> {thisMonthMax}kg)!",
                        ExerciseName = exerciseName,
                        IconEmoji = "trophy"
                    });
                }
            }
        }

        // Return top 2 progress highlights, sorted by highest percentage
        return insights
            .OrderByDescending(i => i.Message) // Higher percentages appear first
            .Take(2)
            .ToList();
    }

    /// <summary>
    /// Compare total training volume (sum of weight * reps) this week vs last week
    /// </summary>
    private async Task<List<Insight>> GetVolumeAnalysis(int userId)
    {
        var insights = new List<Insight>();
        var now = DateTime.UtcNow;

        // Get start of current week (Monday)
        var currentWeekStart = now.Date.AddDays(-(int)now.DayOfWeek + (int)DayOfWeek.Monday);
        if (now.DayOfWeek == DayOfWeek.Sunday)
            currentWeekStart = currentWeekStart.AddDays(-7);

        var lastWeekStart = currentWeekStart.AddDays(-7);

        var sets = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
                .ThenInclude(l => l.UserWorkoutDay)
                    .ThenInclude(d => d.UserWorkoutPlan)
            .Where(s => s.Completed
                && s.Weight.HasValue
                && s.ActualReps.HasValue
                && s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.UserExerciseLog.UserWorkoutDay.CompletedAt >= lastWeekStart)
            .Select(s => new
            {
                Volume = s.Weight!.Value * s.ActualReps!.Value,
                CompletedAt = s.UserExerciseLog.UserWorkoutDay.CompletedAt
            })
            .ToListAsync();

        var thisWeekVolume = sets
            .Where(s => s.CompletedAt >= currentWeekStart)
            .Sum(s => s.Volume);

        var lastWeekVolume = sets
            .Where(s => s.CompletedAt >= lastWeekStart && s.CompletedAt < currentWeekStart)
            .Sum(s => s.Volume);

        if (lastWeekVolume > 0)
        {
            var percentChange = ((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100;

            if (percentChange >= 10)
            {
                insights.Add(new Insight
                {
                    Type = "volume",
                    Title = "Volume Up!",
                    Message = $"Your training volume is up {percentChange:F0}% compared to last week. Keep pushing!",
                    IconEmoji = "chart_increasing"
                });
            }
            else if (percentChange <= -20)
            {
                insights.Add(new Insight
                {
                    Type = "volume",
                    Title = "Lower Volume This Week",
                    Message = $"Your volume is down {Math.Abs(percentChange):F0}% vs last week. Recovery week or time to ramp back up?",
                    Suggestion = "If you're not deloading intentionally, try adding an extra set to each exercise.",
                    IconEmoji = "chart_decreasing"
                });
            }
        }

        return insights;
    }

    /// <summary>
    /// Check which muscle groups haven't been trained recently
    /// </summary>
    private async Task<List<Insight>> GetConsistencyNudges(int userId)
    {
        var insights = new List<Insight>();
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        // Get all exercises done in the last week with their muscle groups
        var recentExercises = await _context.UserExerciseLogs
            .Include(l => l.UserWorkoutDay)
                .ThenInclude(d => d.UserWorkoutPlan)
            .Include(l => l.Exercise)
                .ThenInclude(e => e.PrimaryMuscleGroup)
            .Where(l => l.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && l.UserWorkoutDay.CompletedAt >= sevenDaysAgo)
            .Select(l => l.Exercise.PrimaryMuscleGroup.Name)
            .Distinct()
            .ToListAsync();

        // Get muscle groups the user has trained in the last 30 days (their typical routine)
        var thirtyDaysAgo = now.AddDays(-30);
        var usualMuscleGroups = await _context.UserExerciseLogs
            .Include(l => l.UserWorkoutDay)
                .ThenInclude(d => d.UserWorkoutPlan)
            .Include(l => l.Exercise)
                .ThenInclude(e => e.PrimaryMuscleGroup)
            .Where(l => l.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && l.UserWorkoutDay.CompletedAt >= thirtyDaysAgo)
            .Select(l => l.Exercise.PrimaryMuscleGroup.Name)
            .Distinct()
            .ToListAsync();

        // Find muscle groups trained in last 30 days but not in last 7 days
        var missedMuscleGroups = usualMuscleGroups.Except(recentExercises).ToList();

        if (missedMuscleGroups.Count > 0)
        {
            var muscleList = string.Join(", ", missedMuscleGroups.Take(3));
            insights.Add(new Insight
            {
                Type = "consistency",
                Title = "Don't Forget These!",
                Message = $"You haven't trained {muscleList} in the last 7 days.",
                Suggestion = "Consider adding these to your next workout for balanced development.",
                IconEmoji = "flexed_biceps"
            });
        }

        return insights;
    }

    /// <summary>
    /// Get streak-related insights using existing UserProgress data
    /// </summary>
    private async Task<List<Insight>> GetStreakInfo(int userId)
    {
        var insights = new List<Insight>();

        var progress = await _xpService.GetOrCreateProgress(userId);

        // Celebrate significant streaks
        if (progress.CurrentStreak >= 7)
        {
            insights.Add(new Insight
            {
                Type = "streak",
                Title = $"{progress.CurrentStreak} Day Streak!",
                Message = progress.CurrentStreak >= 30
                    ? "Incredible consistency! You're building a powerful habit."
                    : progress.CurrentStreak >= 14
                        ? "Two weeks strong! You're on fire!"
                        : "A full week of consistency! Keep the momentum going!",
                IconEmoji = "fire"
            });
        }
        else if (progress.CurrentStreak >= 3)
        {
            insights.Add(new Insight
            {
                Type = "streak",
                Title = $"{progress.CurrentStreak} Day Streak",
                Message = "You're building momentum! A few more days to hit a week streak.",
                IconEmoji = "fire"
            });
        }

        // Weekly goal progress
        if (progress.WorkoutsThisWeek > 0 && progress.WorkoutsThisWeek < progress.WeeklyGoal)
        {
            var remaining = progress.WeeklyGoal - progress.WorkoutsThisWeek;
            insights.Add(new Insight
            {
                Type = "streak",
                Title = "Weekly Goal Progress",
                Message = $"You've done {progress.WorkoutsThisWeek}/{progress.WeeklyGoal} workouts this week. {remaining} more to hit your goal!",
                IconEmoji = "target"
            });
        }
        else if (progress.WorkoutsThisWeek >= progress.WeeklyGoal)
        {
            insights.Add(new Insight
            {
                Type = "streak",
                Title = "Weekly Goal Crushed!",
                Message = $"You hit your goal of {progress.WeeklyGoal} workouts this week. Amazing discipline!",
                IconEmoji = "checkmark"
            });
        }

        return insights.Take(2).ToList();
    }
}
