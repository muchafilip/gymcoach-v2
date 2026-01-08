using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;

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
        var query = _context.WorkoutTemplates
            .Include(t => t.DayTemplates)
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
