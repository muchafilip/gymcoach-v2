using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class XpService
{
    private readonly GymCoachDbContext _context;
    private readonly PlanUnlockService _planUnlockService;

    // XP Constants
    private const int XP_WORKOUT_COMPLETE = 100;
    private const int XP_SET_COMPLETE = 5;
    private const int XP_NEW_PR = 50;
    private const int XP_STREAK_DAY = 20;
    private const int XP_WEEKLY_GOAL = 200;
    private const int XP_FIRST_WORKOUT_OF_WEEK = 25;

    public XpService(GymCoachDbContext context, PlanUnlockService planUnlockService)
    {
        _context = context;
        _planUnlockService = planUnlockService;
    }

    /// <summary>
    /// Get or create user progress record
    /// </summary>
    public async Task<UserProgress> GetOrCreateProgress(int userId)
    {
        var progress = await _context.UserProgress
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (progress == null)
        {
            progress = new UserProgress
            {
                UserId = userId,
                TotalXp = 0,
                Level = 1,
                CurrentStreak = 0,
                LongestStreak = 0,
                WorkoutsThisWeek = 0,
                WeeklyGoal = 3,
                WeekStartDate = GetWeekStart(DateTime.UtcNow)
            };
            _context.UserProgress.Add(progress);
            await _context.SaveChangesAsync();
        }

        return progress;
    }

    /// <summary>
    /// Award XP for an event
    /// </summary>
    public async Task<XpAwardResult> AwardXp(int userId, XpEventType eventType, int? relatedEntityId = null)
    {
        var progress = await GetOrCreateProgress(userId);
        int xpAmount = GetXpForEvent(eventType);

        // Log the XP event
        var xpEvent = new XpEvent
        {
            UserId = userId,
            EventType = eventType,
            XpAmount = xpAmount,
            Description = GetEventDescription(eventType),
            RelatedEntityId = relatedEntityId
        };
        _context.XpEvents.Add(xpEvent);

        // Update progress
        int previousLevel = progress.Level;
        progress.TotalXp += xpAmount;
        progress.Level = CalculateLevel(progress.TotalXp);
        progress.UpdatedAt = DateTime.UtcNow;

        bool leveledUp = progress.Level > previousLevel;

        // If leveled up, log a level up event
        if (leveledUp)
        {
            _context.XpEvents.Add(new XpEvent
            {
                UserId = userId,
                EventType = XpEventType.LevelUp,
                XpAmount = 0,
                Description = $"Reached level {progress.Level}!"
            });
        }

        await _context.SaveChangesAsync();

        return new XpAwardResult
        {
            XpAwarded = xpAmount,
            TotalXp = progress.TotalXp,
            Level = progress.Level,
            LeveledUp = leveledUp,
            XpToNextLevel = GetXpForLevel(progress.Level + 1) - progress.TotalXp
        };
    }

    /// <summary>
    /// Called when a workout is completed - handles all XP awards and streak updates
    /// Now uses weekly goal-based streak instead of daily streak
    /// </summary>
    public async Task<WorkoutCompleteXpResult> OnWorkoutCompleted(int userId, int workoutDayId, int setsCompleted, int newPRs)
    {
        var progress = await GetOrCreateProgress(userId);
        var results = new List<XpAwardResult>();
        var now = DateTime.UtcNow;

        // Reset weekly counter if new week (but don't reset streak here - that's done on Monday by QuestService)
        if (progress.WeekStartDate == null || now >= progress.WeekStartDate.Value.AddDays(7))
        {
            progress.WeekStartDate = GetWeekStart(now);
            progress.WorkoutsThisWeek = 0;
            progress.WeeklyGoalMetThisWeek = false;
        }

        // Check if first workout of the week
        bool isFirstOfWeek = progress.WorkoutsThisWeek == 0;

        progress.LastWorkoutDate = now;
        progress.WorkoutsThisWeek++;

        // Award XP for workout completion
        results.Add(await AwardXp(userId, XpEventType.WorkoutComplete, workoutDayId));

        // Award XP for sets (only completed sets)
        for (int i = 0; i < setsCompleted; i++)
        {
            results.Add(await AwardXp(userId, XpEventType.SetComplete, workoutDayId));
        }

        // Award XP for PRs
        for (int i = 0; i < newPRs; i++)
        {
            results.Add(await AwardXp(userId, XpEventType.NewPersonalRecord, workoutDayId));
        }

        // Award XP for first workout of week
        if (isFirstOfWeek)
        {
            results.Add(await AwardXp(userId, XpEventType.FirstWorkoutOfWeek, workoutDayId));
        }

        // Check weekly goal - award XP and mark goal met (for streak tracking)
        bool weeklyGoalReached = progress.WorkoutsThisWeek >= progress.WeeklyGoal;
        bool weeklyGoalJustReached = weeklyGoalReached && !progress.WeeklyGoalMetThisWeek;
        if (weeklyGoalJustReached)
        {
            progress.WeeklyGoalMetThisWeek = true;
            results.Add(await AwardXp(userId, XpEventType.WeeklyGoalComplete, workoutDayId));
        }

        await _context.SaveChangesAsync();

        // Re-fetch to get final state
        progress = await GetOrCreateProgress(userId);

        // Check for plan unlock if leveled up
        PlanUnlockResult? unlockedPlan = null;
        bool leveledUp = results.Any(r => r.LeveledUp);
        if (leveledUp)
        {
            unlockedPlan = await _planUnlockService.CheckAndProcessUnlock(userId, progress.Level);
        }

        return new WorkoutCompleteXpResult
        {
            TotalXpAwarded = results.Sum(r => r.XpAwarded),
            TotalXp = progress.TotalXp,
            Level = progress.Level,
            LeveledUp = leveledUp,
            CurrentStreak = progress.CurrentStreak,
            WorkoutsThisWeek = progress.WorkoutsThisWeek,
            WeeklyGoalReached = weeklyGoalReached,
            WeeklyGoalJustReached = weeklyGoalJustReached,
            XpToNextLevel = GetXpForLevel(progress.Level + 1) - progress.TotalXp,
            UnlockedPlan = unlockedPlan,
            NextUnlockLevel = PlanUnlockService.GetNextUnlockLevel(progress.Level)
        };
    }

    /// <summary>
    /// Get user's progress summary
    /// </summary>
    public async Task<ProgressSummary> GetProgressSummary(int userId)
    {
        var progress = await GetOrCreateProgress(userId);
        int xpForCurrentLevel = GetXpForLevel(progress.Level);
        int xpForNextLevel = GetXpForLevel(progress.Level + 1);
        int xpInCurrentLevel = progress.TotalXp - xpForCurrentLevel;
        int xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

        // Get unlock progress
        var unlockProgress = await _planUnlockService.GetUnlockProgress(userId, progress.Level, progress.TotalXp);

        return new ProgressSummary
        {
            TotalXp = progress.TotalXp,
            Level = progress.Level,
            XpInCurrentLevel = xpInCurrentLevel,
            XpNeededForLevel = xpNeededForLevel,
            XpToNextLevel = xpForNextLevel - progress.TotalXp,
            CurrentStreak = progress.CurrentStreak,
            LongestStreak = progress.LongestStreak,
            WorkoutsThisWeek = progress.WorkoutsThisWeek,
            WeeklyGoal = progress.WeeklyGoal,
            NextUnlockLevel = unlockProgress.NextUnlockLevel,
            UnlockedPlansCount = unlockProgress.UnlockedPlansCount
        };
    }

    /// <summary>
    /// Get recent XP events for display
    /// </summary>
    public async Task<List<XpEventDto>> GetRecentXpEvents(int userId, int count = 20)
    {
        return await _context.XpEvents
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(count)
            .Select(e => new XpEventDto
            {
                EventType = e.EventType.ToString(),
                XpAmount = e.XpAmount,
                Description = e.Description,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();
    }

    // ===== Helper Methods =====

    private static int GetXpForEvent(XpEventType eventType) => eventType switch
    {
        XpEventType.WorkoutComplete => XP_WORKOUT_COMPLETE,
        XpEventType.SetComplete => XP_SET_COMPLETE,
        XpEventType.NewPersonalRecord => XP_NEW_PR,
        XpEventType.StreakMaintained => XP_STREAK_DAY,
        XpEventType.WeeklyGoalComplete => XP_WEEKLY_GOAL,
        XpEventType.FirstWorkoutOfWeek => XP_FIRST_WORKOUT_OF_WEEK,
        _ => 0
    };

    private static string GetEventDescription(XpEventType eventType) => eventType switch
    {
        XpEventType.WorkoutComplete => "Workout completed",
        XpEventType.SetComplete => "Set completed",
        XpEventType.NewPersonalRecord => "New personal record!",
        XpEventType.StreakMaintained => "Streak maintained",
        XpEventType.WeeklyGoalComplete => "Weekly goal reached!",
        XpEventType.FirstWorkoutOfWeek => "First workout of the week",
        _ => ""
    };

    /// <summary>
    /// Calculate level from total XP using formula: Level = floor(sqrt(XP / 100)) + 1
    /// This gives: Level 1 = 0 XP, Level 2 = 100 XP, Level 5 = 1600 XP, Level 10 = 8100 XP
    /// </summary>
    private static int CalculateLevel(int totalXp)
    {
        return (int)Math.Floor(Math.Sqrt(totalXp / 100.0)) + 1;
    }

    /// <summary>
    /// Get XP required for a specific level
    /// Inverse of CalculateLevel: XP = (Level - 1)^2 * 100
    /// </summary>
    private static int GetXpForLevel(int level)
    {
        return (level - 1) * (level - 1) * 100;
    }

    private static DateTime GetWeekStart(DateTime date)
    {
        int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.Date.AddDays(-diff);
    }
}

// DTOs
public class XpAwardResult
{
    public int XpAwarded { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public bool LeveledUp { get; set; }
    public int XpToNextLevel { get; set; }
}

public class WorkoutCompleteXpResult
{
    public int TotalXpAwarded { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public bool LeveledUp { get; set; }
    public int CurrentStreak { get; set; }
    public int WorkoutsThisWeek { get; set; }
    public bool WeeklyGoalReached { get; set; }
    public bool WeeklyGoalJustReached { get; set; }
    public int XpToNextLevel { get; set; }

    // Plan unlock info (for free users)
    public PlanUnlockResult? UnlockedPlan { get; set; }
    public int NextUnlockLevel { get; set; }
}

public class ProgressSummary
{
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public int XpInCurrentLevel { get; set; }
    public int XpNeededForLevel { get; set; }
    public int XpToNextLevel { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public int WorkoutsThisWeek { get; set; }
    public int WeeklyGoal { get; set; }

    // Plan unlock info
    public int NextUnlockLevel { get; set; }
    public int UnlockedPlansCount { get; set; }
}

public class XpEventDto
{
    public string EventType { get; set; } = "";
    public int XpAmount { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
