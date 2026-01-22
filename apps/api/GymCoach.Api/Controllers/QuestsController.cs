using GymCoach.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuestsController : ControllerBase
{
    private readonly QuestService _questService;

    public QuestsController(QuestService questService)
    {
        _questService = questService;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return int.Parse(userIdClaim!);
    }

    /// <summary>
    /// Get user's active quests with progress
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<UserQuestDto>>> GetQuests()
    {
        var userId = GetUserId();
        var quests = await _questService.GetActiveQuests(userId);
        return Ok(quests);
    }

    /// <summary>
    /// Claim completed quest reward
    /// </summary>
    [HttpPost("{id}/claim")]
    public async Task<ActionResult<QuestClaimResult>> ClaimQuest(int id)
    {
        try
        {
            var userId = GetUserId();
            var result = await _questService.ClaimQuestReward(userId, id);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
