using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkoutTemplatesController : ControllerBase
{
    private readonly GymCoachDbContext _context;

    public WorkoutTemplatesController(GymCoachDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkoutTemplateDto>>> GetAll([FromQuery] bool? includePremium)
    {
        // Only return system templates (UserId is null)
        var query = _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
            .Where(t => t.UserId == null)
            .AsQueryable();

        if (includePremium == false)
        {
            query = query.Where(t => !t.IsPremium);
        }

        var templates = await query.ToListAsync();

        return templates.Select(t => new WorkoutTemplateDto
        {
            Id = t.Id,
            Name = t.Name,
            Description = t.Description,
            IsPremium = t.IsPremium,
            DayCount = t.DayTemplates.Count
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WorkoutTemplateDetailDto>> Get(int id)
    {
        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.TargetMuscles)
                    .ThenInclude(tm => tm.MuscleGroup)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) return NotFound();

        return new WorkoutTemplateDetailDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            IsPremium = template.IsPremium,
            Days = template.DayTemplates.OrderBy(d => d.DayNumber).Select(d => new WorkoutDayTemplateDto
            {
                Id = d.Id,
                DayNumber = d.DayNumber,
                Name = d.Name,
                TargetMuscles = d.TargetMuscles.Select(tm => new TargetMuscleDto
                {
                    MuscleGroupId = tm.MuscleGroupId,
                    MuscleGroupName = tm.MuscleGroup.Name,
                    ExerciseCount = tm.ExerciseCount
                }).ToList()
            }).ToList()
        };
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutTemplate>> Create(CreateWorkoutTemplateDto dto)
    {
        var template = new WorkoutTemplate
        {
            Name = dto.Name,
            Description = dto.Description,
            IsPremium = dto.IsPremium
        };

        _context.WorkoutTemplates.Add(template);
        await _context.SaveChangesAsync();

        // Add day templates
        if (dto.Days != null)
        {
            foreach (var dayDto in dto.Days)
            {
                var day = new WorkoutDayTemplate
                {
                    WorkoutTemplateId = template.Id,
                    DayNumber = dayDto.DayNumber,
                    Name = dayDto.Name
                };
                _context.WorkoutDayTemplates.Add(day);
                await _context.SaveChangesAsync();

                // Add target muscles
                if (dayDto.TargetMuscles != null)
                {
                    foreach (var muscle in dayDto.TargetMuscles)
                    {
                        _context.Set<WorkoutDayTemplateMuscle>().Add(new WorkoutDayTemplateMuscle
                        {
                            WorkoutDayTemplateId = day.Id,
                            MuscleGroupId = muscle.MuscleGroupId,
                            ExerciseCount = muscle.ExerciseCount
                        });
                    }
                }
            }
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(Get), new { id = template.Id }, template);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateWorkoutTemplateDto dto)
    {
        var template = await _context.WorkoutTemplates.FindAsync(id);
        if (template == null) return NotFound();

        template.Name = dto.Name;
        template.Description = dto.Description;
        template.IsPremium = dto.IsPremium;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var template = await _context.WorkoutTemplates.FindAsync(id);
        if (template == null) return NotFound();

        _context.WorkoutTemplates.Remove(template);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ==========================================
    // CUSTOM TEMPLATE ENDPOINTS
    // ==========================================

    /// <summary>
    /// Get user's custom templates
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<List<CustomTemplateDto>>> GetMyTemplates()
    {
        var userId = this.GetUserId();

        var templates = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.Exercises)
                    .ThenInclude(e => e.Exercise)
                        .ThenInclude(ex => ex.PrimaryMuscleGroup)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Id)
            .ToListAsync();

        return templates.Select(MapToCustomTemplateDto).ToList();
    }

    /// <summary>
    /// Get a specific custom template
    /// </summary>
    [HttpGet("custom/{id}")]
    public async Task<ActionResult<CustomTemplateDto>> GetCustomTemplate(int id)
    {
        var userId = this.GetUserId();

        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.Exercises)
                    .ThenInclude(e => e.Exercise)
                        .ThenInclude(ex => ex.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return NotFound();

        return MapToCustomTemplateDto(template);
    }

    /// <summary>
    /// Create a new custom template
    /// </summary>
    [HttpPost("custom")]
    public async Task<ActionResult<CustomTemplateDto>> CreateCustomTemplate([FromBody] CreateCustomTemplateRequest request)
    {
        var userId = this.GetUserId();

        var template = new WorkoutTemplate
        {
            Name = request.Name,
            Description = request.Description,
            IsPremium = false,
            UserId = userId
        };

        _context.WorkoutTemplates.Add(template);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomTemplate), new { id = template.Id }, MapToCustomTemplateDto(template));
    }

    /// <summary>
    /// Update a custom template
    /// </summary>
    [HttpPut("custom/{id}")]
    public async Task<ActionResult<CustomTemplateDto>> UpdateCustomTemplate(int id, [FromBody] UpdateCustomTemplateRequest request)
    {
        var userId = this.GetUserId();

        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
                .ThenInclude(d => d.Exercises)
                    .ThenInclude(e => e.Exercise)
                        .ThenInclude(ex => ex.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return NotFound();

        template.Name = request.Name;
        template.Description = request.Description;
        await _context.SaveChangesAsync();

        return MapToCustomTemplateDto(template);
    }

    /// <summary>
    /// Delete a custom template
    /// </summary>
    [HttpDelete("custom/{id}")]
    public async Task<IActionResult> DeleteCustomTemplate(int id)
    {
        var userId = this.GetUserId();

        var template = await _context.WorkoutTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return NotFound();

        _context.WorkoutTemplates.Remove(template);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Add a day to a custom template
    /// </summary>
    [HttpPost("custom/{templateId}/days")]
    public async Task<ActionResult<CustomTemplateDayDto>> AddTemplateDay(int templateId, [FromBody] AddTemplateDayRequest request)
    {
        var userId = this.GetUserId();

        var template = await _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
            .FirstOrDefaultAsync(t => t.Id == templateId && t.UserId == userId);

        if (template == null) return NotFound();

        var dayNumber = template.DayTemplates.Any() ? template.DayTemplates.Max(d => d.DayNumber) + 1 : 1;

        var day = new WorkoutDayTemplate
        {
            WorkoutTemplateId = templateId,
            DayNumber = dayNumber,
            Name = request.Name
        };

        _context.WorkoutDayTemplates.Add(day);
        await _context.SaveChangesAsync();

        return new CustomTemplateDayDto
        {
            Id = day.Id,
            DayNumber = day.DayNumber,
            Name = day.Name,
            Exercises = []
        };
    }

    /// <summary>
    /// Update a template day
    /// </summary>
    [HttpPut("custom/days/{dayId}")]
    public async Task<ActionResult<CustomTemplateDayDto>> UpdateTemplateDay(int dayId, [FromBody] UpdateTemplateDayRequest request)
    {
        var userId = this.GetUserId();

        var day = await _context.WorkoutDayTemplates
            .Include(d => d.WorkoutTemplate)
            .Include(d => d.Exercises)
                .ThenInclude(e => e.Exercise)
                    .ThenInclude(ex => ex.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(d => d.Id == dayId && d.WorkoutTemplate.UserId == userId);

        if (day == null) return NotFound();

        day.Name = request.Name;
        await _context.SaveChangesAsync();

        return MapToDayDto(day);
    }

    /// <summary>
    /// Delete a template day
    /// </summary>
    [HttpDelete("custom/days/{dayId}")]
    public async Task<IActionResult> DeleteTemplateDay(int dayId)
    {
        var userId = this.GetUserId();

        var day = await _context.WorkoutDayTemplates
            .Include(d => d.WorkoutTemplate)
            .FirstOrDefaultAsync(d => d.Id == dayId && d.WorkoutTemplate.UserId == userId);

        if (day == null) return NotFound();

        _context.WorkoutDayTemplates.Remove(day);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Add an exercise to a template day
    /// </summary>
    [HttpPost("custom/days/{dayId}/exercises")]
    public async Task<ActionResult<CustomTemplateExerciseDto>> AddTemplateExercise(int dayId, [FromBody] AddTemplateExerciseRequest request)
    {
        var userId = this.GetUserId();

        var day = await _context.WorkoutDayTemplates
            .Include(d => d.WorkoutTemplate)
            .Include(d => d.Exercises)
            .FirstOrDefaultAsync(d => d.Id == dayId && d.WorkoutTemplate.UserId == userId);

        if (day == null) return NotFound();

        var exercise = await _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(e => e.Id == request.ExerciseId);

        if (exercise == null) return BadRequest("Exercise not found");

        var orderIndex = day.Exercises.Any() ? day.Exercises.Max(e => e.OrderIndex) + 1 : 0;

        var templateExercise = new CustomTemplateExercise
        {
            WorkoutDayTemplateId = dayId,
            ExerciseId = request.ExerciseId,
            OrderIndex = orderIndex,
            Sets = request.Sets,
            TargetReps = request.TargetReps,
            DefaultWeight = request.DefaultWeight,
            Notes = request.Notes
        };

        _context.CustomTemplateExercises.Add(templateExercise);
        await _context.SaveChangesAsync();

        return new CustomTemplateExerciseDto
        {
            Id = templateExercise.Id,
            ExerciseId = exercise.Id,
            ExerciseName = exercise.Name,
            PrimaryMuscleGroup = exercise.PrimaryMuscleGroup?.Name ?? "",
            OrderIndex = templateExercise.OrderIndex,
            Sets = templateExercise.Sets,
            TargetReps = templateExercise.TargetReps,
            DefaultWeight = templateExercise.DefaultWeight,
            Notes = templateExercise.Notes
        };
    }

    /// <summary>
    /// Update a template exercise
    /// </summary>
    [HttpPut("custom/exercises/{exerciseId}")]
    public async Task<ActionResult<CustomTemplateExerciseDto>> UpdateTemplateExercise(int exerciseId, [FromBody] UpdateTemplateExerciseRequest request)
    {
        var userId = this.GetUserId();

        var templateExercise = await _context.CustomTemplateExercises
            .Include(e => e.WorkoutDayTemplate)
                .ThenInclude(d => d.WorkoutTemplate)
            .Include(e => e.Exercise)
                .ThenInclude(ex => ex.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(e => e.Id == exerciseId && e.WorkoutDayTemplate.WorkoutTemplate.UserId == userId);

        if (templateExercise == null) return NotFound();

        templateExercise.Sets = request.Sets;
        templateExercise.TargetReps = request.TargetReps;
        templateExercise.DefaultWeight = request.DefaultWeight;
        templateExercise.Notes = request.Notes;
        await _context.SaveChangesAsync();

        return new CustomTemplateExerciseDto
        {
            Id = templateExercise.Id,
            ExerciseId = templateExercise.ExerciseId,
            ExerciseName = templateExercise.Exercise.Name,
            PrimaryMuscleGroup = templateExercise.Exercise.PrimaryMuscleGroup?.Name ?? "",
            OrderIndex = templateExercise.OrderIndex,
            Sets = templateExercise.Sets,
            TargetReps = templateExercise.TargetReps,
            DefaultWeight = templateExercise.DefaultWeight,
            Notes = templateExercise.Notes
        };
    }

    /// <summary>
    /// Delete a template exercise
    /// </summary>
    [HttpDelete("custom/exercises/{exerciseId}")]
    public async Task<IActionResult> DeleteTemplateExercise(int exerciseId)
    {
        var userId = this.GetUserId();

        var templateExercise = await _context.CustomTemplateExercises
            .Include(e => e.WorkoutDayTemplate)
                .ThenInclude(d => d.WorkoutTemplate)
            .FirstOrDefaultAsync(e => e.Id == exerciseId && e.WorkoutDayTemplate.WorkoutTemplate.UserId == userId);

        if (templateExercise == null) return NotFound();

        _context.CustomTemplateExercises.Remove(templateExercise);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Reorder exercises in a template day
    /// </summary>
    [HttpPut("custom/days/{dayId}/reorder")]
    public async Task<IActionResult> ReorderExercises(int dayId, [FromBody] ReorderExercisesRequest request)
    {
        var userId = this.GetUserId();

        var day = await _context.WorkoutDayTemplates
            .Include(d => d.WorkoutTemplate)
            .Include(d => d.Exercises)
            .FirstOrDefaultAsync(d => d.Id == dayId && d.WorkoutTemplate.UserId == userId);

        if (day == null) return NotFound();

        // Update order indices based on the new order
        for (int i = 0; i < request.ExerciseIds.Count; i++)
        {
            var exercise = day.Exercises.FirstOrDefault(e => e.Id == request.ExerciseIds[i]);
            if (exercise != null)
            {
                exercise.OrderIndex = i;
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Helper methods
    private static CustomTemplateDto MapToCustomTemplateDto(WorkoutTemplate template)
    {
        return new CustomTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Days = template.DayTemplates
                .OrderBy(d => d.DayNumber)
                .Select(MapToDayDto)
                .ToList()
        };
    }

    private static CustomTemplateDayDto MapToDayDto(WorkoutDayTemplate day)
    {
        return new CustomTemplateDayDto
        {
            Id = day.Id,
            DayNumber = day.DayNumber,
            Name = day.Name,
            Exercises = day.Exercises
                .OrderBy(e => e.OrderIndex)
                .Select(e => new CustomTemplateExerciseDto
                {
                    Id = e.Id,
                    ExerciseId = e.ExerciseId,
                    ExerciseName = e.Exercise.Name,
                    PrimaryMuscleGroup = e.Exercise.PrimaryMuscleGroup?.Name ?? "",
                    OrderIndex = e.OrderIndex,
                    Sets = e.Sets,
                    TargetReps = e.TargetReps,
                    DefaultWeight = e.DefaultWeight,
                    Notes = e.Notes
                })
                .ToList()
        };
    }
}

// DTOs
public class WorkoutTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsPremium { get; set; }
    public int DayCount { get; set; }
}

public class WorkoutTemplateDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsPremium { get; set; }
    public List<WorkoutDayTemplateDto> Days { get; set; } = [];
}

public class WorkoutDayTemplateDto
{
    public int Id { get; set; }
    public int DayNumber { get; set; }
    public string Name { get; set; } = "";
    public List<TargetMuscleDto> TargetMuscles { get; set; } = [];
}

public class TargetMuscleDto
{
    public int MuscleGroupId { get; set; }
    public string MuscleGroupName { get; set; } = "";
    public int ExerciseCount { get; set; }
}

public class CreateWorkoutTemplateDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsPremium { get; set; }
    public List<CreateWorkoutDayDto>? Days { get; set; }
}

public class CreateWorkoutDayDto
{
    public int DayNumber { get; set; }
    public required string Name { get; set; }
    public List<CreateTargetMuscleDto>? TargetMuscles { get; set; }
}

public class CreateTargetMuscleDto
{
    public int MuscleGroupId { get; set; }
    public int ExerciseCount { get; set; } = 1;
}

// Custom Template DTOs
public class CustomTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public List<CustomTemplateDayDto> Days { get; set; } = [];
}

public class CustomTemplateDayDto
{
    public int Id { get; set; }
    public int DayNumber { get; set; }
    public string Name { get; set; } = "";
    public List<CustomTemplateExerciseDto> Exercises { get; set; } = [];
}

public class CustomTemplateExerciseDto
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = "";
    public string PrimaryMuscleGroup { get; set; } = "";
    public int OrderIndex { get; set; }
    public int Sets { get; set; }
    public int TargetReps { get; set; }
    public decimal? DefaultWeight { get; set; }
    public string? Notes { get; set; }
}

// Request DTOs for custom templates
public class CreateCustomTemplateRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}

public class UpdateCustomTemplateRequest
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}

public class AddTemplateDayRequest
{
    public required string Name { get; set; }
}

public class UpdateTemplateDayRequest
{
    public required string Name { get; set; }
}

public class AddTemplateExerciseRequest
{
    public int ExerciseId { get; set; }
    public int Sets { get; set; } = 3;
    public int TargetReps { get; set; } = 10;
    public decimal? DefaultWeight { get; set; }
    public string? Notes { get; set; }
}

public class UpdateTemplateExerciseRequest
{
    public int Sets { get; set; }
    public int TargetReps { get; set; }
    public decimal? DefaultWeight { get; set; }
    public string? Notes { get; set; }
}

public class ReorderExercisesRequest
{
    public List<int> ExerciseIds { get; set; } = [];
}
