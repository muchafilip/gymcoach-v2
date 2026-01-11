namespace GymCoach.Api.Models;

public class WorkoutTemplate
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsPremium { get; set; }
    public bool HasSupersets { get; set; } = false;

    // User ownership - null means system template, filled means user-created custom template
    public int? UserId { get; set; }
    public User? User { get; set; }

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

    // Navigation for target muscle groups (used by system templates)
    public ICollection<WorkoutDayTemplateMuscle> TargetMuscles { get; set; } = [];

    // Navigation for custom template exercises (used by user templates)
    public ICollection<CustomTemplateExercise> Exercises { get; set; } = [];
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

// Custom template exercise - stores specific exercises with their configuration
public class CustomTemplateExercise
{
    public int Id { get; set; }
    public int WorkoutDayTemplateId { get; set; }
    public int ExerciseId { get; set; }
    public int OrderIndex { get; set; }
    public int Sets { get; set; } = 3;
    public int TargetReps { get; set; } = 10;
    public decimal? DefaultWeight { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public WorkoutDayTemplate WorkoutDayTemplate { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
