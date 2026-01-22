namespace GymCoach.Api.Models;

public class Quest
{
    public int Id { get; set; }
    public string Code { get; set; } = "";           // "daily_complete_workout"
    public string Title { get; set; } = "";          // "Complete a Workout"
    public string Description { get; set; } = "";    // "Finish any workout today"
    public QuestType Type { get; set; }              // Daily, Weekly, Onboarding, Achievement
    public int XpReward { get; set; }
    public string Icon { get; set; } = "";           // Emoji: "💪"

    // Completion criteria
    public string TargetType { get; set; } = "";     // "workout_complete", "sets_logged", "rest_day"
    public int TargetValue { get; set; }             // 1, 10, 7
    public int? RequiredLevel { get; set; }          // Unlock at level X (null = always)
    public bool IsActive { get; set; } = true;       // Can disable quests without deleting

    // Navigation
    public ICollection<UserQuest> UserQuests { get; set; } = new List<UserQuest>();
}

public class UserQuest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int QuestId { get; set; }
    public Quest Quest { get; set; } = null!;

    public int Progress { get; set; }                // Current count toward target
    public bool Completed { get; set; }              // Target reached
    public bool Claimed { get; set; }                // XP collected
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }         // Null for achievements, set for daily/weekly
    public DateTime? LastRefreshedAt { get; set; }   // Track when daily quests were last refreshed
}

public enum QuestType
{
    Daily = 1,
    Weekly = 2,
    Onboarding = 3,
    Achievement = 4
}
