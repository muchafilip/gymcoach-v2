namespace GymCoach.Api.Models;

/// <summary>
/// Types of rep schemes available
/// </summary>
public enum RepSchemeType
{
    // Standard rep-based schemes (1-99)
    Power = 1,              // 1-3 reps, heavy weight
    Strength = 2,           // 4-6 reps
    Hypertrophy = 3,        // 8-12 reps
    MuscularEndurance = 4,  // 15-20 reps
    CardioHiit = 5,         // 20+ reps

    // Special time-based schemes (100+)
    EMOM = 100,             // Every Minute On the Minute
    AMRAP = 101,            // As Many Reps As Possible
    TimedSet = 102,         // Duration-based set

    // User-defined
    Custom = 200
}

/// <summary>
/// Defines a rep scheme with target reps, sets, and timing
/// </summary>
public class RepScheme
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public RepSchemeType Type { get; set; }

    // For standard rep-based schemes
    public int? MinReps { get; set; }
    public int? MaxReps { get; set; }
    public int? TargetSets { get; set; }

    // For time-based schemes
    public int? DurationSeconds { get; set; }
    public int? RestSeconds { get; set; }

    // For custom schemes (JSON configuration)
    public string? Configuration { get; set; }

    // System vs user-created
    public bool IsSystem { get; set; } = true;

    // User-created schemes belong to a user
    public int? UserId { get; set; }
    public User? User { get; set; }
}
