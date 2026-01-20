using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExercisesController : ControllerBase
{
    private readonly GymCoachDbContext _context;

    public ExercisesController(GymCoachDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExerciseDto>>> GetAll(
        [FromQuery] int? muscleGroupId,
        [FromQuery] int[]? equipmentIds)
    {
        var query = _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .Include(e => e.SecondaryMuscles).ThenInclude(sm => sm.MuscleGroup)
            .Include(e => e.RequiredEquipment).ThenInclude(re => re.Equipment)
            .AsQueryable();

        if (muscleGroupId.HasValue)
        {
            query = query.Where(e =>
                e.PrimaryMuscleGroupId == muscleGroupId ||
                e.SecondaryMuscles.Any(sm => sm.MuscleGroupId == muscleGroupId));
        }

        if (equipmentIds != null && equipmentIds.Length > 0)
        {
            // Filter to exercises where ALL required equipment is in the user's list
            query = query.Where(e =>
                e.RequiredEquipment.All(re => equipmentIds.Contains(re.EquipmentId)));
        }

        var exercises = await query.ToListAsync();

        return exercises.Select(e => new ExerciseDto
        {
            Id = e.Id,
            Name = e.Name,
            Description = e.Description,
            Instructions = e.Instructions,
            VideoUrl = e.VideoUrl,
            PrimaryMuscleGroup = e.PrimaryMuscleGroup.Name,
            SecondaryMuscleGroups = e.SecondaryMuscles.Select(sm => sm.MuscleGroup.Name).ToList(),
            RequiredEquipment = e.RequiredEquipment.Select(re => re.Equipment.Name).ToList()
        }).ToList();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExerciseDto>> Get(int id)
    {
        var exercise = await _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .Include(e => e.SecondaryMuscles).ThenInclude(sm => sm.MuscleGroup)
            .Include(e => e.RequiredEquipment).ThenInclude(re => re.Equipment)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (exercise == null) return NotFound();

        return new ExerciseDto
        {
            Id = exercise.Id,
            Name = exercise.Name,
            Description = exercise.Description,
            Instructions = exercise.Instructions,
            VideoUrl = exercise.VideoUrl,
            PrimaryMuscleGroup = exercise.PrimaryMuscleGroup.Name,
            SecondaryMuscleGroups = exercise.SecondaryMuscles.Select(sm => sm.MuscleGroup.Name).ToList(),
            RequiredEquipment = exercise.RequiredEquipment.Select(re => re.Equipment.Name).ToList()
        };
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Exercise>> Create(CreateExerciseDto dto)
    {
        var exercise = new Exercise
        {
            Name = dto.Name,
            Description = dto.Description,
            Instructions = dto.Instructions,
            VideoUrl = dto.VideoUrl,
            PrimaryMuscleGroupId = dto.PrimaryMuscleGroupId
        };

        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();

        // Add secondary muscles
        if (dto.SecondaryMuscleGroupIds != null)
        {
            foreach (var muscleId in dto.SecondaryMuscleGroupIds)
            {
                _context.Set<ExerciseSecondaryMuscle>().Add(new ExerciseSecondaryMuscle
                {
                    ExerciseId = exercise.Id,
                    MuscleGroupId = muscleId
                });
            }
        }

        // Add required equipment
        if (dto.RequiredEquipmentIds != null)
        {
            foreach (var equipmentId in dto.RequiredEquipmentIds)
            {
                _context.Set<ExerciseEquipment>().Add(new ExerciseEquipment
                {
                    ExerciseId = exercise.Id,
                    EquipmentId = equipmentId
                });
            }
        }

        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = exercise.Id }, exercise);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, CreateExerciseDto dto)
    {
        var exercise = await _context.Exercises
            .Include(e => e.SecondaryMuscles)
            .Include(e => e.RequiredEquipment)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (exercise == null) return NotFound();

        exercise.Name = dto.Name;
        exercise.Description = dto.Description;
        exercise.Instructions = dto.Instructions;
        exercise.VideoUrl = dto.VideoUrl;
        exercise.PrimaryMuscleGroupId = dto.PrimaryMuscleGroupId;

        // Update secondary muscles
        _context.Set<ExerciseSecondaryMuscle>().RemoveRange(exercise.SecondaryMuscles);
        if (dto.SecondaryMuscleGroupIds != null)
        {
            foreach (var muscleId in dto.SecondaryMuscleGroupIds)
            {
                _context.Set<ExerciseSecondaryMuscle>().Add(new ExerciseSecondaryMuscle
                {
                    ExerciseId = exercise.Id,
                    MuscleGroupId = muscleId
                });
            }
        }

        // Update required equipment
        _context.Set<ExerciseEquipment>().RemoveRange(exercise.RequiredEquipment);
        if (dto.RequiredEquipmentIds != null)
        {
            foreach (var equipmentId in dto.RequiredEquipmentIds)
            {
                _context.Set<ExerciseEquipment>().Add(new ExerciseEquipment
                {
                    ExerciseId = exercise.Id,
                    EquipmentId = equipmentId
                });
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var exercise = await _context.Exercises.FindAsync(id);
        if (exercise == null) return NotFound();

        _context.Exercises.Remove(exercise);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

// DTOs
public class ExerciseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public string? VideoUrl { get; set; }
    public string PrimaryMuscleGroup { get; set; } = "";
    public List<string> SecondaryMuscleGroups { get; set; } = [];
    public List<string> RequiredEquipment { get; set; } = [];
}

public class CreateExerciseDto
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? Instructions { get; set; }
    public string? VideoUrl { get; set; }
    public int PrimaryMuscleGroupId { get; set; }
    public int[]? SecondaryMuscleGroupIds { get; set; }
    public int[]? RequiredEquipmentIds { get; set; }
}
