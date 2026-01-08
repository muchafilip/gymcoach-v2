namespace GymCoach.Api.Models;

public class ProgressionRule
{
    public int Id { get; set; }
    public required string Name { get; set; }

    // Rep range
    public int MinReps { get; set; } = 8;
    public int MaxReps { get; set; } = 15;

    // Increments
    public int RepIncrement { get; set; } = 1;
    public decimal WeightIncrement { get; set; } = 2.5m;

    // How many times user can miss target before suggesting decrease
    public int FailureThreshold { get; set; } = 2;

    // Is this the default rule?
    public bool IsDefault { get; set; }

    // Optional: link to specific exercise (null = global rule)
    public int? ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }
}
