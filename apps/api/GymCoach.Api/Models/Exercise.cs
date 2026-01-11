namespace GymCoach.Api.Models;

public class Exercise
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public string? VideoUrl { get; set; }

    // Exercise classification
    public ExerciseType Type { get; set; } = ExerciseType.Compound;
    public ExerciseRole DefaultRole { get; set; } = ExerciseRole.Accessory;

    // Primary muscle group
    public int PrimaryMuscleGroupId { get; set; }
    public MuscleGroup PrimaryMuscleGroup { get; set; } = null!;

    // Navigation for many-to-many relationships
    public ICollection<ExerciseSecondaryMuscle> SecondaryMuscles { get; set; } = [];
    public ICollection<ExerciseEquipment> RequiredEquipment { get; set; } = [];
}

// Join table for Exercise <-> MuscleGroup (secondary muscles)
public class ExerciseSecondaryMuscle
{
    public int ExerciseId { get; set; }
    public Exercise Exercise { get; set; } = null!;

    public int MuscleGroupId { get; set; }
    public MuscleGroup MuscleGroup { get; set; } = null!;
}

// Join table for Exercise <-> Equipment
public class ExerciseEquipment
{
    public int ExerciseId { get; set; }
    public Exercise Exercise { get; set; } = null!;

    public int EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}
