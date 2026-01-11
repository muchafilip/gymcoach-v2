using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GymCoach.Api.Services;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupersetsController : ControllerBase
{
    private readonly SupersetService _supersetService;

    public SupersetsController(SupersetService supersetService)
    {
        _supersetService = supersetService;
    }

    /// <summary>
    /// Get superset suggestions for a workout day
    /// </summary>
    [HttpGet("suggestions/{dayId}")]
    public async Task<ActionResult<List<SupersetSuggestionDto>>> GetSuggestions(int dayId)
    {
        var suggestions = await _supersetService.GetSuggestions(dayId);
        return suggestions.Select(s => new SupersetSuggestionDto
        {
            TemplateId = s.TemplateId,
            TemplateName = s.TemplateName,
            ExerciseAId = s.ExerciseAId,
            ExerciseAName = s.ExerciseAName,
            ExerciseBId = s.ExerciseBId,
            ExerciseBName = s.ExerciseBName
        }).ToList();
    }

    /// <summary>
    /// Get all superset templates
    /// </summary>
    [HttpGet("templates")]
    public async Task<ActionResult<List<SupersetTemplateDto>>> GetTemplates()
    {
        var templates = await _supersetService.GetTemplates();
        return templates.Select(t => new SupersetTemplateDto
        {
            Id = t.Id,
            Name = t.Name,
            IsAntagonist = t.IsAntagonist,
            MuscleGroupA = t.MuscleGroupA.Name,
            MuscleGroupB = t.MuscleGroupB.Name
        }).ToList();
    }

    /// <summary>
    /// Create a superset/giant set between multiple exercises
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SupersetGroupDto>> Create([FromBody] CreateSupersetRequest request)
    {
        try
        {
            // Support both old API (exerciseLogAId + exerciseLogBId) and new API (exerciseLogIds array)
            List<int> exerciseIds;
            if (request.ExerciseLogIds != null && request.ExerciseLogIds.Count >= 2)
            {
                exerciseIds = request.ExerciseLogIds;
            }
            else if (request.ExerciseLogAId > 0 && request.ExerciseLogBId > 0)
            {
                exerciseIds = [request.ExerciseLogAId, request.ExerciseLogBId];
            }
            else
            {
                return BadRequest("Must provide at least 2 exercises");
            }

            var groupId = await _supersetService.CreateSupersetGroup(exerciseIds, request.IsManual);

            return new SupersetGroupDto
            {
                GroupId = groupId,
                ExerciseCount = exerciseIds.Count,
                IsGiantSet = exerciseIds.Count > 2
            };
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Remove a superset
    /// </summary>
    [HttpDelete("{supersetId}")]
    public async Task<IActionResult> Remove(int supersetId)
    {
        await _supersetService.RemoveSuperset(supersetId);
        return NoContent();
    }
}

public class SupersetSuggestionDto
{
    public int TemplateId { get; set; }
    public string TemplateName { get; set; } = "";
    public int ExerciseAId { get; set; }
    public string ExerciseAName { get; set; } = "";
    public int ExerciseBId { get; set; }
    public string ExerciseBName { get; set; } = "";
}

public class SupersetTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public bool IsAntagonist { get; set; }
    public string MuscleGroupA { get; set; } = "";
    public string MuscleGroupB { get; set; } = "";
}

public class SupersetDto
{
    public int Id { get; set; }
    public int ExerciseLogAId { get; set; }
    public int ExerciseLogBId { get; set; }
    public bool IsManual { get; set; }
}

public class SupersetGroupDto
{
    public int GroupId { get; set; }
    public int ExerciseCount { get; set; }
    public bool IsGiantSet { get; set; }
}

public class CreateSupersetRequest
{
    // New API: array of exercise log IDs (supports 2+ for superset/giant set)
    public List<int>? ExerciseLogIds { get; set; }

    // Legacy API: two exercise IDs
    public int ExerciseLogAId { get; set; }
    public int ExerciseLogBId { get; set; }

    public bool IsManual { get; set; } = true;
}
