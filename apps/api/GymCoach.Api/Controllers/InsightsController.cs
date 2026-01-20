using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymCoach.Api.Services;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InsightsController : ControllerBase
{
    private readonly InsightsService _insightsService;

    public InsightsController(InsightsService insightsService)
    {
        _insightsService = insightsService;
    }

    /// <summary>
    /// Get weekly insights for the authenticated user
    /// Returns personalized insights about plateaus, progress, volume, consistency, and streaks
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<Insight>>> GetInsights()
    {
        var userId = this.GetUserId();
        var insights = await _insightsService.GetInsights(userId);
        return Ok(insights);
    }
}
