namespace GymCoach.Api.Models;

public class Equipment
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Icon { get; set; }

    // Navigation
    public ICollection<ExerciseEquipment> ExerciseEquipments { get; set; } = [];
}
