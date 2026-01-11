using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class RepSchemeService
{
    private readonly GymCoachDbContext _context;

    public RepSchemeService(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all system rep schemes
    /// </summary>
    public async Task<List<RepScheme>> GetSystemSchemes()
    {
        return await _context.RepSchemes
            .Where(r => r.IsSystem)
            .OrderBy(r => r.Id)
            .ToListAsync();
    }

    /// <summary>
    /// Get all schemes available to a user (system + their custom)
    /// </summary>
    public async Task<List<RepScheme>> GetSchemesForUser(int userId)
    {
        return await _context.RepSchemes
            .Where(r => r.IsSystem || r.UserId == userId)
            .OrderBy(r => r.IsSystem ? 0 : 1)
            .ThenBy(r => r.Id)
            .ToListAsync();
    }

    /// <summary>
    /// Get target reps/duration for a rep scheme
    /// </summary>
    public SetTarget GetTargetForScheme(RepScheme scheme, decimal? lastWeight = null)
    {
        return scheme.Type switch
        {
            RepSchemeType.Power => new SetTarget
            {
                TargetReps = scheme.MaxReps ?? 3,
                Weight = lastWeight ?? 0,
                Suggestion = "Heavy weight, focus on power"
            },
            RepSchemeType.Strength => new SetTarget
            {
                TargetReps = scheme.MinReps ?? 5,
                Weight = lastWeight ?? 0,
                Suggestion = "Heavy weight, controlled reps"
            },
            RepSchemeType.Hypertrophy => new SetTarget
            {
                TargetReps = 10,
                Weight = lastWeight ?? 0,
                Suggestion = "Moderate weight, feel the muscle"
            },
            RepSchemeType.MuscularEndurance => new SetTarget
            {
                TargetReps = scheme.MinReps ?? 15,
                Weight = lastWeight ?? 0,
                Suggestion = "Light weight, high reps"
            },
            RepSchemeType.CardioHiit => new SetTarget
            {
                TargetReps = scheme.MinReps ?? 20,
                Weight = lastWeight ?? 0,
                Suggestion = "Light weight, maximum reps"
            },
            RepSchemeType.EMOM => new SetTarget
            {
                TargetReps = 10,
                Weight = lastWeight ?? 0,
                DurationSeconds = scheme.DurationSeconds ?? 60,
                Suggestion = $"Complete reps every {scheme.DurationSeconds ?? 60}s"
            },
            RepSchemeType.AMRAP => new SetTarget
            {
                TargetReps = 0,
                Weight = lastWeight ?? 0,
                DurationSeconds = scheme.DurationSeconds ?? 60,
                Suggestion = $"As many reps as possible in {scheme.DurationSeconds ?? 60}s"
            },
            RepSchemeType.TimedSet => new SetTarget
            {
                TargetReps = 0,
                Weight = lastWeight ?? 0,
                DurationSeconds = scheme.DurationSeconds ?? 30,
                Suggestion = $"Hold/work for {scheme.DurationSeconds ?? 30}s"
            },
            _ => new SetTarget
            {
                TargetReps = 10,
                Weight = lastWeight ?? 0,
                Suggestion = "Standard set"
            }
        };
    }

    /// <summary>
    /// Get recommended set count based on rep scheme
    /// </summary>
    public int GetSetCountForScheme(RepScheme? scheme)
    {
        if (scheme == null) return 3;
        return scheme.TargetSets ?? 3;
    }

    /// <summary>
    /// Create a custom rep scheme for a user
    /// </summary>
    public async Task<RepScheme> CreateCustomScheme(int userId, string name, int? minReps, int? maxReps, int? targetSets, int? durationSeconds)
    {
        var scheme = new RepScheme
        {
            Name = name,
            Type = RepSchemeType.Custom,
            MinReps = minReps,
            MaxReps = maxReps,
            TargetSets = targetSets,
            DurationSeconds = durationSeconds,
            IsSystem = false,
            UserId = userId
        };

        _context.RepSchemes.Add(scheme);
        await _context.SaveChangesAsync();
        return scheme;
    }
}

public class SetTarget
{
    public int TargetReps { get; set; }
    public decimal Weight { get; set; }
    public int? DurationSeconds { get; set; }
    public string Suggestion { get; set; } = "";
}
