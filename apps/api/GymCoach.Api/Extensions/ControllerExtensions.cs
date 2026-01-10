using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace GymCoach.Api.Extensions;

public static class ControllerExtensions
{
    /// <summary>
    /// Get the authenticated user's ID from JWT claims
    /// </summary>
    public static int GetUserId(this ControllerBase controller)
    {
        var userIdClaim = controller.User.FindFirst("userId")
            ?? controller.User.FindFirst(ClaimTypes.NameIdentifier);

        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            throw new UnauthorizedAccessException("User ID not found in token");

        return userId;
    }
}
