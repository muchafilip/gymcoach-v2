using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using System.Security.Claims;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly GymCoachDbContext _db;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(GymCoachDbContext db, ILogger<NotificationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Register a device push token
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult> RegisterToken([FromBody] RegisterTokenRequest request)
    {
        var userId = GetUserId();

        // Check if token already exists for this user
        var existing = await _db.DevicePushTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Token == request.Token);

        if (existing != null)
        {
            // Update last used time
            existing.LastUsedAt = DateTime.UtcNow;
            existing.IsActive = true;
            existing.DeviceName = request.DeviceName ?? existing.DeviceName;
        }
        else
        {
            // Deactivate old tokens for same device (if any based on device name)
            if (!string.IsNullOrEmpty(request.DeviceName))
            {
                var oldTokens = await _db.DevicePushTokens
                    .Where(t => t.UserId == userId && t.DeviceName == request.DeviceName && t.Token != request.Token)
                    .ToListAsync();

                foreach (var old in oldTokens)
                {
                    old.IsActive = false;
                }
            }

            // Add new token
            _db.DevicePushTokens.Add(new DevicePushToken
            {
                UserId = userId,
                Token = request.Token,
                Platform = request.Platform,
                DeviceName = request.DeviceName
            });
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("[Notifications] Registered token for user {UserId}, platform: {Platform}", userId, request.Platform);

        return Ok(new { message = "Token registered" });
    }

    /// <summary>
    /// Unregister a device push token
    /// </summary>
    [HttpDelete("token")]
    public async Task<ActionResult> UnregisterToken([FromQuery] string token)
    {
        var userId = GetUserId();

        var existing = await _db.DevicePushTokens
            .FirstOrDefaultAsync(t => t.UserId == userId && t.Token == token);

        if (existing != null)
        {
            existing.IsActive = false;
            await _db.SaveChangesAsync();
        }

        return Ok(new { message = "Token unregistered" });
    }

    /// <summary>
    /// Get notification preferences
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> GetPreferences()
    {
        var userId = GetUserId();

        var prefs = await _db.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs == null)
        {
            // Return defaults
            return Ok(new NotificationPreferencesDto
            {
                Enabled = true,
                WorkoutReminder = true,
                WorkoutReminderTime = "09:00",
                StreakReminder = true,
                StreakReminderTime = "19:00",
                QuestReminder = true,
                WeeklyGoalReminder = true,
                RestDayReminder = false
            });
        }

        return Ok(new NotificationPreferencesDto
        {
            Enabled = prefs.Enabled,
            WorkoutReminder = prefs.WorkoutReminder,
            WorkoutReminderTime = prefs.WorkoutReminderTime.ToString("HH:mm"),
            StreakReminder = prefs.StreakReminder,
            StreakReminderTime = prefs.StreakReminderTime.ToString("HH:mm"),
            QuestReminder = prefs.QuestReminder,
            WeeklyGoalReminder = prefs.WeeklyGoalReminder,
            RestDayReminder = prefs.RestDayReminder
        });
    }

    /// <summary>
    /// Update notification preferences
    /// </summary>
    [HttpPut("preferences")]
    public async Task<ActionResult> UpdatePreferences([FromBody] NotificationPreferencesDto request)
    {
        var userId = GetUserId();

        var prefs = await _db.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs == null)
        {
            prefs = new NotificationPreferences { UserId = userId };
            _db.NotificationPreferences.Add(prefs);
        }

        prefs.Enabled = request.Enabled;
        prefs.WorkoutReminder = request.WorkoutReminder;
        prefs.WorkoutReminderTime = TimeOnly.Parse(request.WorkoutReminderTime);
        prefs.StreakReminder = request.StreakReminder;
        prefs.StreakReminderTime = TimeOnly.Parse(request.StreakReminderTime);
        prefs.QuestReminder = request.QuestReminder;
        prefs.WeeklyGoalReminder = request.WeeklyGoalReminder;
        prefs.RestDayReminder = request.RestDayReminder;
        prefs.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("[Notifications] Updated preferences for user {UserId}", userId);

        return Ok(new { message = "Preferences updated" });
    }

    /// <summary>
    /// Get all active tokens for current user (for debugging)
    /// </summary>
    [HttpGet("tokens")]
    public async Task<ActionResult<List<DeviceTokenDto>>> GetTokens()
    {
        var userId = GetUserId();

        var tokens = await _db.DevicePushTokens
            .Where(t => t.UserId == userId && t.IsActive)
            .Select(t => new DeviceTokenDto
            {
                Id = t.Id,
                Platform = t.Platform,
                DeviceName = t.DeviceName,
                CreatedAt = t.CreatedAt,
                LastUsedAt = t.LastUsedAt
            })
            .ToListAsync();

        return Ok(tokens);
    }
}

public class RegisterTokenRequest
{
    public required string Token { get; set; }
    public required string Platform { get; set; }
    public string? DeviceName { get; set; }
}

public class NotificationPreferencesDto
{
    public bool Enabled { get; set; }
    public bool WorkoutReminder { get; set; }
    public string WorkoutReminderTime { get; set; } = "09:00";
    public bool StreakReminder { get; set; }
    public string StreakReminderTime { get; set; } = "19:00";
    public bool QuestReminder { get; set; }
    public bool WeeklyGoalReminder { get; set; }
    public bool RestDayReminder { get; set; }
}

public class DeviceTokenDto
{
    public int Id { get; set; }
    public string Platform { get; set; } = "";
    public string? DeviceName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}
