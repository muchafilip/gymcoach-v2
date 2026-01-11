namespace GymCoach.Api.Models;

/// <summary>
/// Classification of exercise movement pattern
/// </summary>
public enum ExerciseType
{
    /// <summary>Multi-joint movements (squat, bench, deadlift)</summary>
    Compound = 1,

    /// <summary>Single-joint movements (curls, raises)</summary>
    Isolation = 2
}

/// <summary>
/// Role of exercise within a workout (determines ordering)
/// </summary>
public enum ExerciseRole
{
    /// <summary>Primary focus, done first, heavier loads</summary>
    MainMover = 1,

    /// <summary>Supporting exercises</summary>
    Accessory = 2,

    /// <summary>Isolation, pump work, done last</summary>
    Finisher = 3
}
