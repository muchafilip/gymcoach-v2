namespace GymCoach.Api.Models;

public class ExercisePerformanceHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ExerciseId { get; set; }
    public int UserWorkoutDayId { get; set; }
    public int TotalSets { get; set; }
    public int TotalReps { get; set; }
    public decimal MaxWeight { get; set; }
    public decimal TotalVolume { get; set; } // Sets * Reps * Weight
    public DateTime PerformedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
    public UserWorkoutDay UserWorkoutDay { get; set; } = null!;
}
