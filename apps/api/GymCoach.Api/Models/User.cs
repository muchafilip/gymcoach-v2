namespace GymCoach.Api.Models;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public SubscriptionStatus SubscriptionStatus { get; set; } = SubscriptionStatus.Free;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<UserEquipment> OwnedEquipment { get; set; } = [];
    public ICollection<UserWorkoutPlan> WorkoutPlans { get; set; } = [];
    public int? ActiveWorkoutPlanId { get; set; }
}

public enum SubscriptionStatus
{
    Free,
    Premium,
    Cancelled
}

// Join table for User <-> Equipment
public class UserEquipment
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}
