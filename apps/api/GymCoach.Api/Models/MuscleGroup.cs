namespace GymCoach.Api.Models;

public class MuscleGroup
{
    public int Id { get; set; }
    public required string Name { get; set; }

    // Navigation
    public ICollection<Exercise> PrimaryExercises { get; set; } = [];
    public ICollection<ExerciseSecondaryMuscle> SecondaryExercises { get; set; } = [];
}
