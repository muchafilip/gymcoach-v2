using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly GymCoachDbContext _context;

    public UsersController(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get user preferences
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<UserPreferencesDto>> GetPreferences()
    {
        var userId = this.GetUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user == null) return NotFound();

        return new UserPreferencesDto
        {
            WeightUnit = user.WeightUnit
        };
    }

    /// <summary>
    /// Update user preferences
    /// </summary>
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        var userId = this.GetUserId();
        var user = await _context.Users.FindAsync(userId);

        if (user == null) return NotFound();

        if (!string.IsNullOrEmpty(request.WeightUnit))
        {
            if (request.WeightUnit != "kg" && request.WeightUnit != "lbs")
                return BadRequest("Weight unit must be 'kg' or 'lbs'");

            user.WeightUnit = request.WeightUnit;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Get current user profile
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetCurrentUser()
    {
        var userId = this.GetUserId();
        var user = await _context.Users
            .Include(u => u.OwnedEquipment)
                .ThenInclude(ue => ue.Equipment)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound();

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            SubscriptionStatus = user.SubscriptionStatus.ToString(),
            WeightUnit = user.WeightUnit,
            CreatedAt = user.CreatedAt,
            EquipmentCount = user.OwnedEquipment.Count
        };
    }
}

public class UserPreferencesDto
{
    public string WeightUnit { get; set; } = "kg";
}

public class UpdatePreferencesRequest
{
    public string? WeightUnit { get; set; }
}

public class UserProfileDto
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string? DisplayName { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string SubscriptionStatus { get; set; } = "Free";
    public string WeightUnit { get; set; } = "kg";
    public DateTime CreatedAt { get; set; }
    public int EquipmentCount { get; set; }
}
