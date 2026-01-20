using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymCoach.Api.Services;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController : ControllerBase
{
    private readonly XpService _xpService;

    public ProgressController(XpService xpService)
    {
        _xpService = xpService;
    }

    /// <summary>
    /// Get user's XP and level progress
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ProgressSummary>> GetProgress()
    {
        var userId = this.GetUserId();
        var summary = await _xpService.GetProgressSummary(userId);
        return Ok(summary);
    }

    /// <summary>
    /// Get recent XP events
    /// </summary>
    [HttpGet("events")]
    public async Task<ActionResult<List<XpEventDto>>> GetRecentEvents([FromQuery] int count = 20)
    {
        var userId = this.GetUserId();
        var events = await _xpService.GetRecentXpEvents(userId, count);
        return Ok(events);
    }
}
