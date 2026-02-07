namespace GymCoach.Api.Models;

/// <summary>
/// Stores device push tokens for sending notifications
/// </summary>
public class DevicePushToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string Token { get; set; }  // Expo push token
    public required string Platform { get; set; }  // "ios" or "android"
    public string? DeviceName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// User notification preferences
/// </summary>
public class NotificationPreferences
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Master toggle
    public bool Enabled { get; set; } = true;

    // Workout reminders
    public bool WorkoutReminder { get; set; } = true;
    public TimeOnly WorkoutReminderTime { get; set; } = new TimeOnly(9, 0);  // Default 9:00 AM

    // Streak reminders (don't lose your streak!)
    public bool StreakReminder { get; set; } = true;
    public TimeOnly StreakReminderTime { get; set; } = new TimeOnly(19, 0);  // Default 7:00 PM

    // Quest reminders
    public bool QuestReminder { get; set; } = true;

    // Weekly goal reminders
    public bool WeeklyGoalReminder { get; set; } = true;

    // Rest day reminders
    public bool RestDayReminder { get; set; } = false;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Log of sent notifications (for debugging and analytics)
/// </summary>
public class NotificationLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string Type { get; set; }  // "workout_reminder", "streak_warning", "quest_expiring", etc.
    public required string Title { get; set; }
    public required string Body { get; set; }

    public bool Sent { get; set; }
    public string? Error { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
