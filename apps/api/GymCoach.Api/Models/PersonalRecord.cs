namespace GymCoach.Api.Models;

/// <summary>
/// Stores the personal record (best lift) for each user/exercise combination
/// </summary>
public class PersonalRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ExerciseId { get; set; }

    // Max weight ever lifted for this exercise
    public decimal MaxWeight { get; set; }
    public DateTime MaxWeightDate { get; set; }

    // Best set (highest weight x reps combination)
    public int BestSetReps { get; set; }
    public decimal BestSetWeight { get; set; }
    public DateTime BestSetDate { get; set; }

    // Calculated: best set volume (reps * weight)
    public decimal BestSetVolume => BestSetReps * BestSetWeight;

    // Navigation
    public Exercise Exercise { get; set; } = null!;
}
