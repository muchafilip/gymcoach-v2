using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using System.Net.Http.Json;

namespace GymCoach.Api.Services;

public interface INotificationService
{
    Task SendPushNotification(int userId, string title, string body, string type, Dictionary<string, object>? data = null);
    Task SendStreakWarning(int userId, int currentStreak);
    Task SendWorkoutReminder(int userId);
    Task SendQuestCompleted(int userId, string questName, int xpReward);
    Task SendLevelUp(int userId, int newLevel);
    Task SendPRNotification(int userId, string exerciseName, decimal weight);
}

public class NotificationService : INotificationService
{
    private readonly GymCoachDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NotificationService> _logger;

    private const string EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    public NotificationService(
        GymCoachDbContext db,
        IHttpClientFactory httpClientFactory,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendPushNotification(int userId, string title, string body, string type, Dictionary<string, object>? data = null)
    {
        // Check user preferences
        var prefs = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs != null && !prefs.Enabled)
        {
            _logger.LogDebug("[Notifications] User {UserId} has notifications disabled", userId);
            return;
        }

        // Get active tokens for user
        var tokens = await _db.DevicePushTokens
            .Where(t => t.UserId == userId && t.IsActive)
            .Select(t => t.Token)
            .ToListAsync();

        if (tokens.Count == 0)
        {
            _logger.LogDebug("[Notifications] No active tokens for user {UserId}", userId);
            return;
        }

        // Send to each token
        foreach (var token in tokens)
        {
            await SendToExpo(token, title, body, type, data);
        }

        // Log the notification
        _db.NotificationLogs.Add(new NotificationLog
        {
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            Sent = true
        });
        await _db.SaveChangesAsync();
    }

    private async Task SendToExpo(string token, string title, string body, string type, Dictionary<string, object>? data)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();

            var payload = new
            {
                to = token,
                title = title,
                body = body,
                data = data ?? new Dictionary<string, object> { { "type", type } },
                sound = "default",
                badge = 1
            };

            var response = await client.PostAsJsonAsync(EXPO_PUSH_URL, payload);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Notifications] Failed to send to Expo: {Error}", error);
            }
            else
            {
                _logger.LogInformation("[Notifications] Sent notification to token: {Token}", token[..20] + "...");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Notifications] Error sending push notification");
        }
    }

    public async Task SendStreakWarning(int userId, int currentStreak)
    {
        var prefs = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs != null && !prefs.StreakReminder) return;

        await SendPushNotification(
            userId,
            "Don't lose your streak!",
            $"You're on a {currentStreak} day streak. Keep it going with a quick workout today!",
            "streak_warning",
            new Dictionary<string, object> { { "streak", currentStreak } }
        );
    }

    public async Task SendWorkoutReminder(int userId)
    {
        var prefs = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs != null && !prefs.WorkoutReminder) return;

        await SendPushNotification(
            userId,
            "Time to train!",
            "Your workout is waiting. Let's crush it today!",
            "workout_reminder"
        );
    }

    public async Task SendQuestCompleted(int userId, string questName, int xpReward)
    {
        var prefs = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs != null && !prefs.QuestReminder) return;

        await SendPushNotification(
            userId,
            "Quest Completed!",
            $"{questName} complete! Claim your {xpReward} XP reward.",
            "quest_completed",
            new Dictionary<string, object> { { "questName", questName }, { "xp", xpReward } }
        );
    }

    public async Task SendLevelUp(int userId, int newLevel)
    {
        await SendPushNotification(
            userId,
            "Level Up!",
            $"Congratulations! You've reached level {newLevel}!",
            "level_up",
            new Dictionary<string, object> { { "level", newLevel } }
        );
    }

    public async Task SendPRNotification(int userId, string exerciseName, decimal weight)
    {
        await SendPushNotification(
            userId,
            "New PR!",
            $"You've set a new personal record on {exerciseName}: {weight}kg!",
            "new_pr",
            new Dictionary<string, object> { { "exercise", exerciseName }, { "weight", weight } }
        );
    }
}
