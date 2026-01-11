namespace GymCoach.Api.Models;

/// <summary>
/// Template for antagonist muscle group pairings (system-defined)
/// </summary>
public class SupersetTemplate
{
    public int Id { get; set; }
    public required string Name { get; set; }

    /// <summary>True if muscles are antagonist pairs (chest+back, biceps+triceps)</summary>
    public bool IsAntagonist { get; set; }

    // First muscle group in the pair
    public int MuscleGroupAId { get; set; }
    public MuscleGroup MuscleGroupA { get; set; } = null!;

    // Second muscle group in the pair
    public int MuscleGroupBId { get; set; }
    public MuscleGroup MuscleGroupB { get; set; } = null!;
}

/// <summary>
/// User-created superset linking two exercises in a workout
/// </summary>
public class UserSuperset
{
    public int Id { get; set; }

    // First exercise in the superset
    public int ExerciseLogAId { get; set; }
    public UserExerciseLog ExerciseLogA { get; set; } = null!;

    // Second exercise in the superset
    public int ExerciseLogBId { get; set; }
    public UserExerciseLog ExerciseLogB { get; set; } = null!;

    /// <summary>True if manually created by user, false if auto-suggested</summary>
    public bool IsManual { get; set; }
}
