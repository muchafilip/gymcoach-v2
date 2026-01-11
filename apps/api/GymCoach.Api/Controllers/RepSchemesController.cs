using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymCoach.Api.Services;
using GymCoach.Api.Models;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RepSchemesController : ControllerBase
{
    private readonly RepSchemeService _repSchemeService;

    public RepSchemesController(RepSchemeService repSchemeService)
    {
        _repSchemeService = repSchemeService;
    }

    /// <summary>
    /// Get all system rep schemes (available to everyone)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<RepSchemeDto>>> GetAll()
    {
        var schemes = await _repSchemeService.GetSystemSchemes();
        return schemes.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Get all rep schemes for current user (system + custom)
    /// </summary>
    [HttpGet("mine")]
    [Authorize]
    public async Task<ActionResult<List<RepSchemeDto>>> GetMine()
    {
        var userId = this.GetUserId();
        var schemes = await _repSchemeService.GetSchemesForUser(userId);
        return schemes.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Create a custom rep scheme
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<RepSchemeDto>> Create([FromBody] CreateRepSchemeRequest request)
    {
        var userId = this.GetUserId();
        var scheme = await _repSchemeService.CreateCustomScheme(
            userId,
            request.Name,
            request.MinReps,
            request.MaxReps,
            request.TargetSets,
            request.DurationSeconds
        );
        return MapToDto(scheme);
    }

    private static RepSchemeDto MapToDto(RepScheme scheme)
    {
        return new RepSchemeDto
        {
            Id = scheme.Id,
            Name = scheme.Name,
            Type = scheme.Type.ToString(),
            MinReps = scheme.MinReps,
            MaxReps = scheme.MaxReps,
            TargetSets = scheme.TargetSets,
            DurationSeconds = scheme.DurationSeconds,
            RestSeconds = scheme.RestSeconds,
            IsSystem = scheme.IsSystem
        };
    }
}

public class RepSchemeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public int? MinReps { get; set; }
    public int? MaxReps { get; set; }
    public int? TargetSets { get; set; }
    public int? DurationSeconds { get; set; }
    public int? RestSeconds { get; set; }
    public bool IsSystem { get; set; }
}

public class CreateRepSchemeRequest
{
    public required string Name { get; set; }
    public int? MinReps { get; set; }
    public int? MaxReps { get; set; }
    public int? TargetSets { get; set; }
    public int? DurationSeconds { get; set; }
}
