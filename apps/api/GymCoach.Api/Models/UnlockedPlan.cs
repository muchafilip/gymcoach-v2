namespace GymCoach.Api.Models;

/// <summary>
/// Tracks which premium workout plans a free user has unlocked through leveling up
/// </summary>
public class UnlockedPlan
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int WorkoutTemplateId { get; set; }
    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;

    /// <summary>
    /// The level at which this plan was unlocked
    /// </summary>
    public int UnlockedAtLevel { get; set; }

    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}
