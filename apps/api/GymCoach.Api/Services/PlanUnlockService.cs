using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class PlanUnlockResult
{
    public int PlanId { get; set; }
    public string PlanName { get; set; } = "";
    public int UnlockedAtLevel { get; set; }
}

public class PlanUnlockService
{
    private readonly GymCoachDbContext _context;

    // Levels at which free users can unlock a premium plan
    public static readonly int[] UNLOCK_LEVELS = { 5, 10, 15, 20, 30, 50 };

    public PlanUnlockService(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Check if the new level triggers an unlock and process it
    /// </summary>
    public async Task<PlanUnlockResult?> CheckAndProcessUnlock(int userId, int newLevel)
    {
        // Check if this level triggers an unlock
        if (!UNLOCK_LEVELS.Contains(newLevel))
        {
            return null;
        }

        // Get IDs of plans already unlocked by this user
        var unlockedPlanIds = await _context.UnlockedPlans
            .Where(up => up.UserId == userId)
            .Select(up => up.WorkoutTemplateId)
            .ToListAsync();

        // Find first available premium plan not yet unlocked
        // Only official templates (UserId == null), not custom templates
        var availablePremiumPlan = await _context.WorkoutTemplates
            .Where(t => t.IsPremium && t.UserId == null && !unlockedPlanIds.Contains(t.Id))
            .OrderBy(t => t.Id) // Deterministic order
            .FirstOrDefaultAsync();

        if (availablePremiumPlan == null)
        {
            return null; // All plans already unlocked
        }

        // Create unlock record
        var unlock = new UnlockedPlan
        {
            UserId = userId,
            WorkoutTemplateId = availablePremiumPlan.Id,
            UnlockedAtLevel = newLevel,
            UnlockedAt = DateTime.UtcNow
        };

        _context.UnlockedPlans.Add(unlock);
        await _context.SaveChangesAsync();

        return new PlanUnlockResult
        {
            PlanId = availablePremiumPlan.Id,
            PlanName = availablePremiumPlan.Name,
            UnlockedAtLevel = newLevel
        };
    }

    /// <summary>
    /// Check if a user can access a specific workout template
    /// Premium users can access everything, free users can access free plans + unlocked plans
    /// </summary>
    public async Task<bool> CanAccessPlan(int userId, int templateId, bool isPremiumUser)
    {
        if (isPremiumUser)
        {
            return true;
        }

        var template = await _context.WorkoutTemplates.FindAsync(templateId);
        if (template == null)
        {
            return false;
        }

        // Free plans are accessible to everyone
        if (!template.IsPremium)
        {
            return true;
        }

        // Check if this premium plan was unlocked via leveling
        return await _context.UnlockedPlans
            .AnyAsync(up => up.UserId == userId && up.WorkoutTemplateId == templateId);
    }

    /// <summary>
    /// Get the next level at which a plan unlock happens
    /// </summary>
    public static int GetNextUnlockLevel(int currentLevel)
    {
        return UNLOCK_LEVELS.FirstOrDefault(l => l > currentLevel);
    }

    /// <summary>
    /// Get XP required to reach a specific level
    /// Formula: XP = (level - 1)^2 * 100
    /// </summary>
    public static int GetXpForLevel(int level)
    {
        return (level - 1) * (level - 1) * 100;
    }

    /// <summary>
    /// Get the user's unlock progress info
    /// </summary>
    public async Task<UnlockProgressInfo> GetUnlockProgress(int userId, int currentLevel, int totalXp)
    {
        var unlockedCount = await _context.UnlockedPlans
            .Where(up => up.UserId == userId)
            .CountAsync();

        var nextUnlockLevel = GetNextUnlockLevel(currentLevel);
        var xpForNextUnlock = nextUnlockLevel > 0 ? GetXpForLevel(nextUnlockLevel) : 0;

        return new UnlockProgressInfo
        {
            CurrentLevel = currentLevel,
            NextUnlockLevel = nextUnlockLevel,
            XpToNextUnlock = Math.Max(0, xpForNextUnlock - totalXp),
            UnlockedPlansCount = unlockedCount,
            TotalUnlockablePlans = UNLOCK_LEVELS.Length
        };
    }

    /// <summary>
    /// Get list of plans unlocked by the user
    /// </summary>
    public async Task<List<UnlockedPlanInfo>> GetUnlockedPlans(int userId)
    {
        return await _context.UnlockedPlans
            .Where(up => up.UserId == userId)
            .Include(up => up.WorkoutTemplate)
            .Select(up => new UnlockedPlanInfo
            {
                PlanId = up.WorkoutTemplateId,
                PlanName = up.WorkoutTemplate.Name,
                UnlockedAtLevel = up.UnlockedAtLevel,
                UnlockedAt = up.UnlockedAt
            })
            .ToListAsync();
    }
}

public class UnlockProgressInfo
{
    public int CurrentLevel { get; set; }
    public int NextUnlockLevel { get; set; }
    public int XpToNextUnlock { get; set; }
    public int UnlockedPlansCount { get; set; }
    public int TotalUnlockablePlans { get; set; }
}

public class UnlockedPlanInfo
{
    public int PlanId { get; set; }
    public string PlanName { get; set; } = "";
    public int UnlockedAtLevel { get; set; }
    public DateTime UnlockedAt { get; set; }
}
