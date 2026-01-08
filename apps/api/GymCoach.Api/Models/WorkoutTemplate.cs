namespace GymCoach.Api.Models;

public class WorkoutTemplate
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsPremium { get; set; }

    // Navigation
    public ICollection<WorkoutDayTemplate> DayTemplates { get; set; } = [];
}

public class WorkoutDayTemplate
{
    public int Id { get; set; }
    public int DayNumber { get; set; }
    public required string Name { get; set; }

    // Foreign key to WorkoutTemplate
    public int WorkoutTemplateId { get; set; }
    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;

    // Navigation for target muscle groups
    public ICollection<WorkoutDayTemplateMuscle> TargetMuscles { get; set; } = [];
}

// Join table for WorkoutDayTemplate <-> MuscleGroup
public class WorkoutDayTemplateMuscle
{
    public int WorkoutDayTemplateId { get; set; }
    public WorkoutDayTemplate WorkoutDayTemplate { get; set; } = null!;

    public int MuscleGroupId { get; set; }
    public MuscleGroup MuscleGroup { get; set; } = null!;

    // How many exercises for this muscle group on this day
    public int ExerciseCount { get; set; } = 1;
}
