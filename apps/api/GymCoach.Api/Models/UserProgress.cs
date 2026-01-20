namespace GymCoach.Api.Models;

public class UserProgress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // XP & Level
    public int TotalXp { get; set; } = 0;
    public int Level { get; set; } = 1;

    // Streaks
    public int CurrentStreak { get; set; } = 0;
    public int LongestStreak { get; set; } = 0;
    public DateTime? LastWorkoutDate { get; set; }

    // Weekly tracking
    public int WorkoutsThisWeek { get; set; } = 0;
    public int WeeklyGoal { get; set; } = 3;
    public DateTime? WeekStartDate { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// XP event log for tracking history
public class XpEvent
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public XpEventType EventType { get; set; }
    public int XpAmount { get; set; }
    public string? Description { get; set; }
    public int? RelatedEntityId { get; set; } // e.g., WorkoutDayId for workout completion

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum XpEventType
{
    WorkoutComplete = 1,
    SetComplete = 2,
    NewPersonalRecord = 3,
    StreakMaintained = 4,
    WeeklyGoalComplete = 5,
    FirstWorkoutOfWeek = 6,
    LevelUp = 7
}
