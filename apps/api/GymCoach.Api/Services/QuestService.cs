using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class QuestService
{
    private readonly GymCoachDbContext _context;
    private readonly XpService _xpService;
    private readonly Random _random = new();

    public QuestService(GymCoachDbContext context, XpService xpService)
    {
        _context = context;
        _xpService = xpService;
    }

    /// <summary>
    /// Get user's active quests, auto-refreshing if needed
    /// </summary>
    public async Task<List<UserQuestDto>> GetActiveQuests(int userId)
    {
        var progress = await _xpService.GetOrCreateProgress(userId);
        var now = DateTime.UtcNow;

        // Check if we need to refresh quests
        await RefreshQuestsIfNeeded(userId, progress, now);

        // Ensure onboarding quests are assigned
        await EnsureOnboardingQuests(userId, progress.Level);

        // Ensure achievement quests are assigned
        await EnsureAchievementQuests(userId, progress.Level);

        // Get all active quests
        var userQuests = await _context.UserQuests
            .Include(uq => uq.Quest)
            .Where(uq => uq.UserId == userId)
            .Where(uq => !uq.Claimed) // Hide claimed quests
            .Where(uq => uq.ExpiresAt == null || uq.ExpiresAt > now) // Not expired
            .OrderBy(uq => uq.Quest.Type)
            .ThenByDescending(uq => uq.Completed)
            .ThenBy(uq => uq.AssignedAt)
            .ToListAsync();

        return userQuests.Select(uq => ToDto(uq)).ToList();
    }

    /// <summary>
    /// Update progress on all matching active quests
    /// </summary>
    public async Task UpdateQuestProgress(int userId, string targetType, int increment = 1)
    {
        var now = DateTime.UtcNow;

        var activeQuests = await _context.UserQuests
            .Include(uq => uq.Quest)
            .Where(uq => uq.UserId == userId)
            .Where(uq => !uq.Completed && !uq.Claimed)
            .Where(uq => uq.ExpiresAt == null || uq.ExpiresAt > now)
            .Where(uq => uq.Quest.TargetType == targetType)
            .ToListAsync();

        foreach (var userQuest in activeQuests)
        {
            userQuest.Progress += increment;

            if (userQuest.Progress >= userQuest.Quest.TargetValue)
            {
                userQuest.Completed = true;
                userQuest.CompletedAt = now;
            }
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Claim completed quest reward
    /// </summary>
    public async Task<QuestClaimResult> ClaimQuestReward(int userId, int userQuestId)
    {
        var userQuest = await _context.UserQuests
            .Include(uq => uq.Quest)
            .FirstOrDefaultAsync(uq => uq.Id == userQuestId && uq.UserId == userId);

        if (userQuest == null)
            throw new InvalidOperationException("Quest not found");

        if (!userQuest.Completed)
            throw new InvalidOperationException("Quest not completed");

        if (userQuest.Claimed)
            throw new InvalidOperationException("Quest already claimed");

        // Mark as claimed
        userQuest.Claimed = true;

        // Award XP
        var progress = await _xpService.GetOrCreateProgress(userId);
        int previousLevel = progress.Level;

        progress.TotalXp += userQuest.Quest.XpReward;
        progress.Level = CalculateLevel(progress.TotalXp);
        progress.UpdatedAt = DateTime.UtcNow;

        // Log XP event
        _context.XpEvents.Add(new XpEvent
        {
            UserId = userId,
            EventType = XpEventType.QuestClaimed,
            XpAmount = userQuest.Quest.XpReward,
            Description = $"Quest completed: {userQuest.Quest.Title}",
            RelatedEntityId = userQuest.QuestId
        });

        bool leveledUp = progress.Level > previousLevel;
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

        return new QuestClaimResult
        {
            XpAwarded = userQuest.Quest.XpReward,
            TotalXp = progress.TotalXp,
            Level = progress.Level,
            LeveledUp = leveledUp,
            XpToNextLevel = GetXpForLevel(progress.Level + 1) - progress.TotalXp
        };
    }

    /// <summary>
    /// Refresh quests if needed based on day/week boundaries
    /// </summary>
    private async Task RefreshQuestsIfNeeded(int userId, UserProgress progress, DateTime now)
    {
        var weekStart = GetWeekStart(now);
        var today = now.Date;

        // Get user's most recent daily quest refresh
        var lastDailyRefresh = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Daily)
            .OrderByDescending(uq => uq.LastRefreshedAt ?? uq.AssignedAt)
            .Select(uq => uq.LastRefreshedAt ?? uq.AssignedAt)
            .FirstOrDefaultAsync();

        bool isNewWeek = lastDailyRefresh == default || lastDailyRefresh < weekStart;
        bool isNewDay = lastDailyRefresh == default || lastDailyRefresh.Date < today;

        if (isNewWeek)
        {
            // Monday reset: clear all dailies, add 3 new
            await ResetDailyQuests(userId, now, weekStart);

            // Check weekly streak
            await CheckWeeklyStreak(userId, progress, now);

            // Refresh weekly quests (keep in-progress ones)
            await RefreshWeeklyQuests(userId, now, weekStart);
        }
        else if (isNewDay)
        {
            // Add 1 new daily quest (up to 5 max)
            await AddDailyQuest(userId, now, weekStart);
        }
    }

    /// <summary>
    /// Reset all daily quests on Monday
    /// </summary>
    private async Task ResetDailyQuests(int userId, DateTime now, DateTime weekStart)
    {
        // Remove old unclaimed daily quests
        var oldDailies = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Daily && !uq.Claimed)
            .ToListAsync();

        _context.UserQuests.RemoveRange(oldDailies);

        // Get available daily quests for user's level
        var progress = await _xpService.GetOrCreateProgress(userId);
        var availableDailies = await _context.Quests
            .Where(q => q.Type == QuestType.Daily && q.IsActive)
            .Where(q => q.RequiredLevel == null || q.RequiredLevel <= progress.Level)
            .ToListAsync();

        // Randomly pick 3 unique quests
        var selected = availableDailies.OrderBy(_ => _random.Next()).Take(3).ToList();

        var nextMonday = weekStart.AddDays(7);
        foreach (var quest in selected)
        {
            _context.UserQuests.Add(new UserQuest
            {
                UserId = userId,
                QuestId = quest.Id,
                Progress = 0,
                Completed = false,
                Claimed = false,
                AssignedAt = now,
                ExpiresAt = nextMonday,
                LastRefreshedAt = now
            });
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Add 1 daily quest each day (max 5)
    /// </summary>
    private async Task AddDailyQuest(int userId, DateTime now, DateTime weekStart)
    {
        // Count current active dailies
        var activeDailyCount = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Daily)
            .Where(uq => !uq.Claimed && (uq.ExpiresAt == null || uq.ExpiresAt > now))
            .CountAsync();

        if (activeDailyCount >= 5)
            return;

        // Get already assigned daily quest IDs
        var assignedQuestIds = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Daily)
            .Where(uq => !uq.Claimed && (uq.ExpiresAt == null || uq.ExpiresAt > now))
            .Select(uq => uq.QuestId)
            .ToListAsync();

        // Get available daily quests not already assigned
        var progress = await _xpService.GetOrCreateProgress(userId);
        var availableDailies = await _context.Quests
            .Where(q => q.Type == QuestType.Daily && q.IsActive)
            .Where(q => q.RequiredLevel == null || q.RequiredLevel <= progress.Level)
            .Where(q => !assignedQuestIds.Contains(q.Id))
            .ToListAsync();

        if (availableDailies.Count == 0)
            return;

        var selected = availableDailies.OrderBy(_ => _random.Next()).First();
        var nextMonday = weekStart.AddDays(7);

        _context.UserQuests.Add(new UserQuest
        {
            UserId = userId,
            QuestId = selected.Id,
            Progress = 0,
            Completed = false,
            Claimed = false,
            AssignedAt = now,
            ExpiresAt = nextMonday,
            LastRefreshedAt = now
        });

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Refresh weekly quests on Monday (keep in-progress ones)
    /// </summary>
    private async Task RefreshWeeklyQuests(int userId, DateTime now, DateTime weekStart)
    {
        // Remove uncompleted and not-started weekly quests
        var oldWeeklies = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Weekly)
            .Where(uq => !uq.Claimed && uq.Progress == 0) // Only remove if no progress
            .ToListAsync();

        _context.UserQuests.RemoveRange(oldWeeklies);

        // Count remaining weekly quests
        var remainingCount = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Weekly)
            .Where(uq => !uq.Claimed)
            .CountAsync();

        // Need to add quests to have 3 total
        int toAdd = Math.Max(0, 3 - remainingCount);

        if (toAdd == 0)
        {
            await _context.SaveChangesAsync();
            return;
        }

        // Get already assigned weekly quest IDs
        var assignedQuestIds = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Weekly)
            .Where(uq => !uq.Claimed)
            .Select(uq => uq.QuestId)
            .ToListAsync();

        var progress = await _xpService.GetOrCreateProgress(userId);
        var availableWeeklies = await _context.Quests
            .Where(q => q.Type == QuestType.Weekly && q.IsActive)
            .Where(q => q.RequiredLevel == null || q.RequiredLevel <= progress.Level)
            .Where(q => !assignedQuestIds.Contains(q.Id))
            .ToListAsync();

        var selected = availableWeeklies.OrderBy(_ => _random.Next()).Take(toAdd).ToList();

        var nextMonday = weekStart.AddDays(7);
        foreach (var quest in selected)
        {
            _context.UserQuests.Add(new UserQuest
            {
                UserId = userId,
                QuestId = quest.Id,
                Progress = 0,
                Completed = false,
                Claimed = false,
                AssignedAt = now,
                ExpiresAt = nextMonday,
                LastRefreshedAt = now
            });
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Check and update weekly goal-based streak
    /// </summary>
    private async Task CheckWeeklyStreak(int userId, UserProgress progress, DateTime now)
    {
        // Called on Monday - check if last week's goal was met
        if (progress.WeeklyGoalMetThisWeek)
        {
            progress.CurrentStreak++;
            if (progress.CurrentStreak > progress.LongestStreak)
            {
                progress.LongestStreak = progress.CurrentStreak;
            }

            // Update achievement quests for streak
            await UpdateQuestProgress(userId, "streak", progress.CurrentStreak);
        }
        else
        {
            progress.CurrentStreak = 0;
        }

        // Reset for new week
        progress.WeeklyGoalMetThisWeek = false;
        progress.WorkoutsThisWeek = 0;
        progress.WeekStartDate = GetWeekStart(now);

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Ensure onboarding quests are assigned (one-time)
    /// </summary>
    private async Task EnsureOnboardingQuests(int userId, int userLevel)
    {
        var existingOnboarding = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Onboarding)
            .Select(uq => uq.QuestId)
            .ToListAsync();

        var onboardingQuests = await _context.Quests
            .Where(q => q.Type == QuestType.Onboarding && q.IsActive)
            .Where(q => q.RequiredLevel == null || q.RequiredLevel <= userLevel)
            .Where(q => !existingOnboarding.Contains(q.Id))
            .ToListAsync();

        foreach (var quest in onboardingQuests)
        {
            _context.UserQuests.Add(new UserQuest
            {
                UserId = userId,
                QuestId = quest.Id,
                Progress = 0,
                Completed = false,
                Claimed = false,
                AssignedAt = DateTime.UtcNow,
                ExpiresAt = null // Never expires
            });
        }

        if (onboardingQuests.Count > 0)
            await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Ensure achievement quests are assigned
    /// </summary>
    private async Task EnsureAchievementQuests(int userId, int userLevel)
    {
        var existingAchievements = await _context.UserQuests
            .Where(uq => uq.UserId == userId && uq.Quest.Type == QuestType.Achievement)
            .Select(uq => uq.QuestId)
            .ToListAsync();

        var achievementQuests = await _context.Quests
            .Where(q => q.Type == QuestType.Achievement && q.IsActive)
            .Where(q => q.RequiredLevel == null || q.RequiredLevel <= userLevel)
            .Where(q => !existingAchievements.Contains(q.Id))
            .ToListAsync();

        foreach (var quest in achievementQuests)
        {
            _context.UserQuests.Add(new UserQuest
            {
                UserId = userId,
                QuestId = quest.Id,
                Progress = 0,
                Completed = false,
                Claimed = false,
                AssignedAt = DateTime.UtcNow,
                ExpiresAt = null // Never expires
            });
        }

        if (achievementQuests.Count > 0)
            await _context.SaveChangesAsync();
    }

    // Helper methods
    private static DateTime GetWeekStart(DateTime date)
    {
        int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.Date.AddDays(-diff);
    }

    private static int CalculateLevel(int totalXp)
    {
        return (int)Math.Floor(Math.Sqrt(totalXp / 100.0)) + 1;
    }

    private static int GetXpForLevel(int level)
    {
        return (level - 1) * (level - 1) * 100;
    }

    private static UserQuestDto ToDto(UserQuest uq) => new()
    {
        Id = uq.Id,
        QuestId = uq.Quest.Id,
        Code = uq.Quest.Code,
        Title = uq.Quest.Title,
        Description = uq.Quest.Description,
        Type = uq.Quest.Type.ToString().ToLower(),
        XpReward = uq.Quest.XpReward,
        Icon = uq.Quest.Icon,
        Progress = uq.Progress,
        Target = uq.Quest.TargetValue,
        Completed = uq.Completed,
        Claimed = uq.Claimed,
        ExpiresAt = uq.ExpiresAt
    };
}

// DTOs
public class UserQuestDto
{
    public int Id { get; set; }
    public int QuestId { get; set; }
    public string Code { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Type { get; set; } = "";
    public int XpReward { get; set; }
    public string Icon { get; set; } = "";
    public int Progress { get; set; }
    public int Target { get; set; }
    public bool Completed { get; set; }
    public bool Claimed { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class QuestClaimResult
{
    public int XpAwarded { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public bool LeveledUp { get; set; }
    public int XpToNextLevel { get; set; }
}
