using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using GymCoach.Api.Services;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkoutsController : ControllerBase
{
    private readonly GymCoachDbContext _context;
    private readonly WorkoutGeneratorService _generator;
    private readonly ProgressionService _progression;

    public WorkoutsController(
        GymCoachDbContext context,
        WorkoutGeneratorService generator,
        ProgressionService progression)
    {
        _context = context;
        _generator = generator;
        _progression = progression;
    }

    /// <summary>
    /// Generate a new workout plan for a user from a template
    /// </summary>
    [HttpPost("generate")]
    public async Task<ActionResult<UserWorkoutPlanDto>> GeneratePlan(GeneratePlanRequest request)
    {
        try
        {
            Console.WriteLine($"[Generate] UserId={request.UserId}, TemplateId={request.TemplateId}, DurationWeeks={request.DurationWeeks}");
            var plan = await _generator.GenerateWorkoutPlan(request.UserId, request.TemplateId, request.DurationWeeks);
            Console.WriteLine($"[Generate] Created plan {plan.Id} with {plan.DurationWeeks} weeks");
            return await GetPlanDto(plan.Id);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get home screen data (stats + next workout)
    /// </summary>
    [HttpGet("user/{userId}/home")]
    public async Task<ActionResult<HomeDataDto>> GetHomeData(int userId)
    {
        // Get active plan with next incomplete day
        var activePlan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.WorkoutDayTemplate)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive);

        NextWorkoutDto? nextWorkout = null;
        if (activePlan != null)
        {
            var nextDay = activePlan.WorkoutDays
                .Where(d => d.CompletedAt == null)
                .OrderBy(d => d.WeekNumber)
                .ThenBy(d => d.DayNumber)
                .FirstOrDefault();

            if (nextDay != null)
            {
                nextWorkout = new NextWorkoutDto
                {
                    DayId = nextDay.Id,
                    PlanId = activePlan.Id,
                    DayName = nextDay.WorkoutDayTemplate.Name,
                    PlanName = activePlan.WorkoutTemplate.Name,
                    WeekNumber = nextDay.WeekNumber
                };
            }
        }

        // Get stats
        var completedDays = await _context.UserWorkoutDays
            .Where(d => d.UserWorkoutPlan.UserId == userId && d.CompletedAt != null)
            .CountAsync();

        var totalWeight = await _context.ExerciseSets
            .Where(s => s.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId == userId
                && s.Completed && s.Weight != null && s.ActualReps != null)
            .SumAsync(s => (s.Weight ?? 0) * (s.ActualReps ?? 0));

        // Recent workouts
        var recentWorkouts = await _context.UserWorkoutDays
            .Include(d => d.WorkoutDayTemplate)
            .Include(d => d.ExerciseLogs)
            .Where(d => d.UserWorkoutPlan.UserId == userId && d.CompletedAt != null)
            .OrderByDescending(d => d.CompletedAt)
            .Take(5)
            .Select(d => new RecentWorkoutDto
            {
                Id = d.Id,
                Name = d.WorkoutDayTemplate.Name,
                CompletedAt = d.CompletedAt!.Value,
                ExerciseCount = d.ExerciseLogs.Count
            })
            .ToListAsync();

        return new HomeDataDto
        {
            TotalWeightLifted = totalWeight,
            WorkoutsCompleted = completedDays,
            NextWorkout = nextWorkout,
            RecentWorkouts = recentWorkouts
        };
    }

    /// <summary>
    /// Get user's active workout plan
    /// </summary>
    [HttpGet("user/{userId}/active-plan")]
    public async Task<ActionResult<UserWorkoutPlanDetailDto>> GetActivePlan(int userId)
    {
        var plan = await _generator.GetActivePlan(userId);
        if (plan == null) return NotFound();

        return await GetPlanDetailDto(plan.Id);
    }

    /// <summary>
    /// Activate a specific plan (deactivates all others)
    /// </summary>
    [HttpPost("plans/{planId:int}/activate")]
    public async Task<IActionResult> ActivatePlan([FromRoute] int planId, [FromBody] ActivatePlanRequest request)
    {
        var success = await _generator.ActivatePlan(planId, request.UserId);
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Deactivate a specific plan (no active plan after this)
    /// </summary>
    [HttpPost("plans/{planId:int}/deactivate")]
    public async Task<IActionResult> DeactivatePlan([FromRoute] int planId)
    {
        var plan = await _context.UserWorkoutPlans.FindAsync(planId);
        if (plan == null) return NotFound();

        plan.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Delete a workout plan
    /// </summary>
    [HttpDelete("plans/{planId:int}/delete")]
    public async Task<IActionResult> DeletePlan([FromRoute] int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return NotFound();

        // Delete all related data
        foreach (var day in plan.WorkoutDays)
        {
            foreach (var log in day.ExerciseLogs)
            {
                _context.ExerciseSets.RemoveRange(log.Sets);
            }
            _context.UserExerciseLogs.RemoveRange(day.ExerciseLogs);
        }
        _context.UserWorkoutDays.RemoveRange(plan.WorkoutDays);
        _context.UserWorkoutPlans.Remove(plan);

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Get alternative exercises for substitution
    /// </summary>
    [HttpGet("exercises/alternatives/{exerciseId}")]
    public async Task<ActionResult<List<ExerciseAlternativeDto>>> GetExerciseAlternatives(int exerciseId, [FromQuery] int userId)
    {
        var alternatives = await _generator.GetExerciseAlternatives(exerciseId, userId);
        return alternatives.Select(e => new ExerciseAlternativeDto
        {
            Id = e.Id,
            Name = e.Name,
            Description = e.Description
        }).ToList();
    }

    /// <summary>
    /// Substitute an exercise in a workout
    /// </summary>
    [HttpPost("exercises/{exerciseLogId}/substitute/{newExerciseId}")]
    public async Task<IActionResult> SubstituteExercise(int exerciseLogId, int newExerciseId, [FromQuery] int userId)
    {
        var success = await _generator.SubstituteExercise(exerciseLogId, newExerciseId, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Get user's workout plans
    /// </summary>
    [HttpGet("user/{userId}/plans")]
    public async Task<ActionResult<IEnumerable<UserWorkoutPlanDto>>> GetUserPlans(int userId)
    {
        var plans = await _context.UserWorkoutPlans
            .Where(p => p.UserId == userId)
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        return plans.Select(p => new UserWorkoutPlanDto
        {
            Id = p.Id,
            TemplateName = p.WorkoutTemplate.Name,
            StartDate = p.StartDate,
            CompletedDays = p.WorkoutDays.Count(d => d.CompletedAt != null),
            TotalDays = p.WorkoutDays.Count,
            IsActive = p.IsActive
        }).ToList();
    }

    /// <summary>
    /// Get current/next workout day for a plan
    /// </summary>
    [HttpGet("plans/{planId}/current")]
    public async Task<ActionResult<UserWorkoutDayDto>> GetCurrentWorkout(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.WorkoutDayTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Exercise)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return NotFound();

        // Find the first incomplete day with exercises (weeks 2+ might not have exercises yet)
        var currentDay = plan.WorkoutDays
            .Where(d => d.CompletedAt == null && d.ExerciseLogs.Any())
            .OrderBy(d => d.DayNumber)
            .FirstOrDefault();

        if (currentDay == null)
        {
            // Check if there are incomplete days without exercises (need to generate)
            var nextIncomplete = plan.WorkoutDays
                .Where(d => d.CompletedAt == null && !d.ExerciseLogs.Any())
                .OrderBy(d => d.DayNumber)
                .FirstOrDefault();

            if (nextIncomplete != null)
            {
                // Generate exercises for the next week
                await _generator.CheckAndGenerateNextWeek(planId);

                // Reload the day
                currentDay = await _context.UserWorkoutDays
                    .Include(d => d.WorkoutDayTemplate)
                    .Include(d => d.ExerciseLogs)
                        .ThenInclude(el => el.Exercise)
                    .Include(d => d.ExerciseLogs)
                        .ThenInclude(el => el.Sets)
                    .FirstOrDefaultAsync(d => d.Id == nextIncomplete.Id);

                if (currentDay == null || !currentDay.ExerciseLogs.Any())
                {
                    return NotFound("No more workout days available");
                }
            }
            else
            {
                // All days completed - plan is finished
                return NotFound("Workout plan completed");
            }
        }

        return MapToDto(currentDay);
    }

    /// <summary>
    /// Get full workout plan with all days, exercises, and sets
    /// </summary>
    [HttpGet("plans/{planId}")]
    public async Task<ActionResult<UserWorkoutPlanDetailDto>> GetWorkoutPlan(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.WorkoutDayTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Exercise)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(p => p.Id == planId);

        if (plan == null) return NotFound();

        return new UserWorkoutPlanDetailDto
        {
            Id = plan.Id,
            UserId = plan.UserId,
            TemplateId = plan.WorkoutTemplateId,
            TemplateName = plan.WorkoutTemplate.Name,
            StartDate = plan.StartDate,
            DurationWeeks = plan.DurationWeeks,
            IsActive = plan.IsActive,
            Days = plan.WorkoutDays.OrderBy(d => d.DayNumber).Select(MapToDto).ToList()
        };
    }

    /// <summary>
    /// Get a specific workout day
    /// </summary>
    [HttpGet("days/{dayId}")]
    public async Task<ActionResult<UserWorkoutDayDto>> GetWorkoutDay(int dayId)
    {
        var day = await _context.UserWorkoutDays
            .Include(d => d.WorkoutDayTemplate)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Exercise)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(d => d.Id == dayId);

        if (day == null) return NotFound();
        return MapToDto(day);
    }

    /// <summary>
    /// Update a set (log reps, weight, mark complete)
    /// </summary>
    [HttpPut("sets/{setId}")]
    public async Task<IActionResult> UpdateSet(int setId, UpdateSetRequest request)
    {
        var set = await _context.ExerciseSets.FindAsync(setId);
        if (set == null) return NotFound();

        if (request.ActualReps.HasValue)
            set.ActualReps = request.ActualReps;
        if (request.Weight.HasValue)
            set.Weight = request.Weight;
        if (request.Completed.HasValue)
            set.Completed = request.Completed.Value;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Mark a workout day as complete
    /// </summary>
    [HttpPost("days/{dayId}/complete")]
    public async Task<IActionResult> CompleteDay(int dayId)
    {
        var day = await _context.UserWorkoutDays.FindAsync(dayId);
        if (day == null) return NotFound();

        day.CompletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Check if we need to generate next week's exercises
        await _generator.CheckAndGenerateNextWeek(day.UserWorkoutPlanId);

        return NoContent();
    }

    /// <summary>
    /// Add an extra set to an exercise
    /// </summary>
    [HttpPost("exercises/{exerciseLogId}/sets")]
    public async Task<ActionResult<ExerciseSetDto>> AddSet(int exerciseLogId)
    {
        var exerciseLog = await _context.UserExerciseLogs
            .Include(el => el.Sets)
            .FirstOrDefaultAsync(el => el.Id == exerciseLogId);

        if (exerciseLog == null) return NotFound();

        var lastSet = exerciseLog.Sets.OrderByDescending(s => s.SetNumber).FirstOrDefault();
        var newSetNumber = (lastSet?.SetNumber ?? 0) + 1;

        var set = new ExerciseSet
        {
            UserExerciseLogId = exerciseLogId,
            SetNumber = newSetNumber,
            TargetReps = lastSet?.TargetReps ?? 12,
            Weight = lastSet?.Weight,
            Completed = false
        };

        _context.ExerciseSets.Add(set);
        await _context.SaveChangesAsync();

        return new ExerciseSetDto
        {
            Id = set.Id,
            SetNumber = set.SetNumber,
            TargetReps = set.TargetReps,
            ActualReps = set.ActualReps,
            Weight = set.Weight,
            Completed = set.Completed
        };
    }

    /// <summary>
    /// Get progression suggestion for an exercise
    /// </summary>
    [HttpGet("progression/{userId}/{exerciseId}")]
    public async Task<ActionResult<SetTarget>> GetProgression(int userId, int exerciseId)
    {
        return await _progression.CalculateNextTarget(userId, exerciseId);
    }

    /// <summary>
    /// Get workout history for a user
    /// </summary>
    [HttpGet("user/{userId}/history")]
    public async Task<ActionResult<List<WorkoutHistoryDto>>> GetWorkoutHistory(int userId)
    {
        var history = await _context.UserWorkoutDays
            .Include(d => d.WorkoutDayTemplate)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Sets)
            .Where(d => d.UserWorkoutPlan.UserId == userId && d.CompletedAt != null)
            .OrderByDescending(d => d.CompletedAt)
            .Select(d => new WorkoutHistoryDto
            {
                Id = d.Id,
                DayName = d.WorkoutDayTemplate.Name,
                CompletedAt = d.CompletedAt!.Value,
                ExerciseCount = d.ExerciseLogs.Count,
                TotalSets = d.ExerciseLogs.SelectMany(el => el.Sets).Count(s => s.Completed)
            })
            .ToListAsync();

        return history;
    }

    private async Task<UserWorkoutPlanDto> GetPlanDto(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
            .FirstAsync(p => p.Id == planId);

        return new UserWorkoutPlanDto
        {
            Id = plan.Id,
            TemplateName = plan.WorkoutTemplate.Name,
            StartDate = plan.StartDate,
            CompletedDays = plan.WorkoutDays.Count(d => d.CompletedAt != null),
            TotalDays = plan.WorkoutDays.Count
        };
    }

    private async Task<UserWorkoutPlanDetailDto> GetPlanDetailDto(int planId)
    {
        var plan = await _context.UserWorkoutPlans
            .Include(p => p.WorkoutTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.WorkoutDayTemplate)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Exercise)
            .Include(p => p.WorkoutDays)
                .ThenInclude(d => d.ExerciseLogs)
                    .ThenInclude(el => el.Sets)
            .FirstAsync(p => p.Id == planId);

        return new UserWorkoutPlanDetailDto
        {
            Id = plan.Id,
            UserId = plan.UserId,
            TemplateId = plan.WorkoutTemplateId,
            TemplateName = plan.WorkoutTemplate.Name,
            StartDate = plan.StartDate,
            DurationWeeks = plan.DurationWeeks,
            IsActive = plan.IsActive,
            Days = plan.WorkoutDays.OrderBy(d => d.DayNumber).Select(MapToDto).ToList()
        };
    }

    private static UserWorkoutDayDto MapToDto(UserWorkoutDay day)
    {
        return new UserWorkoutDayDto
        {
            Id = day.Id,
            DayNumber = day.DayNumber,
            WeekNumber = day.WeekNumber,
            DayTemplateId = day.WorkoutDayTemplateId,
            Name = day.WorkoutDayTemplate.Name,
            ScheduledDate = day.ScheduledDate,
            CompletedAt = day.CompletedAt,
            Exercises = day.ExerciseLogs.OrderBy(el => el.OrderIndex).Select(el => new UserExerciseDto
            {
                Id = el.Id,
                ExerciseId = el.ExerciseId,
                ExerciseName = el.Exercise.Name,
                Sets = el.Sets.OrderBy(s => s.SetNumber).Select(s => new ExerciseSetDto
                {
                    Id = s.Id,
                    SetNumber = s.SetNumber,
                    TargetReps = s.TargetReps,
                    ActualReps = s.ActualReps,
                    Weight = s.Weight,
                    Completed = s.Completed
                }).ToList()
            }).ToList()
        };
    }
}

// Request/Response DTOs
public class GeneratePlanRequest
{
    [System.Text.Json.Serialization.JsonPropertyName("userId")]
    public int UserId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("templateId")]
    public int TemplateId { get; set; }

    [System.Text.Json.Serialization.JsonPropertyName("durationWeeks")]
    public int DurationWeeks { get; set; } = 4;
}

public class ActivatePlanRequest
{
    public int UserId { get; set; }
}

public class ExerciseAlternativeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public class UpdateSetRequest
{
    public int? ActualReps { get; set; }
    public decimal? Weight { get; set; }
    public bool? Completed { get; set; }
}

public class UserWorkoutPlanDto
{
    public int Id { get; set; }
    public string TemplateName { get; set; } = "";
    public DateTime StartDate { get; set; }
    public int CompletedDays { get; set; }
    public int TotalDays { get; set; }
    public bool IsActive { get; set; }
}

public class UserWorkoutPlanDetailDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TemplateId { get; set; }
    public string TemplateName { get; set; } = "";
    public DateTime StartDate { get; set; }
    public int DurationWeeks { get; set; }
    public bool IsActive { get; set; }
    public List<UserWorkoutDayDto> Days { get; set; } = [];
}

public class UserWorkoutDayDto
{
    public int Id { get; set; }
    public int DayNumber { get; set; }
    public int WeekNumber { get; set; }
    public int DayTemplateId { get; set; }
    public string Name { get; set; } = "";
    public DateTime? ScheduledDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<UserExerciseDto> Exercises { get; set; } = [];
}

public class UserExerciseDto
{
    public int Id { get; set; }
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = "";
    public List<ExerciseSetDto> Sets { get; set; } = [];
}

public class ExerciseSetDto
{
    public int Id { get; set; }
    public int SetNumber { get; set; }
    public int TargetReps { get; set; }
    public int? ActualReps { get; set; }
    public decimal? Weight { get; set; }
    public bool Completed { get; set; }
}

public class HomeDataDto
{
    public decimal TotalWeightLifted { get; set; }
    public int WorkoutsCompleted { get; set; }
    public NextWorkoutDto? NextWorkout { get; set; }
    public List<RecentWorkoutDto> RecentWorkouts { get; set; } = [];
}

public class NextWorkoutDto
{
    public int DayId { get; set; }
    public int PlanId { get; set; }
    public string DayName { get; set; } = "";
    public string PlanName { get; set; } = "";
    public int WeekNumber { get; set; }
}

public class RecentWorkoutDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CompletedAt { get; set; }
    public int ExerciseCount { get; set; }
}

public class WorkoutHistoryDto
{
    public int Id { get; set; }
    public string DayName { get; set; } = "";
    public DateTime CompletedAt { get; set; }
    public int ExerciseCount { get; set; }
    public int TotalSets { get; set; }
}
