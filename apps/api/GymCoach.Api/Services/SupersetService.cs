using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class SupersetService
{
    private readonly GymCoachDbContext _context;

    public SupersetService(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get superset suggestions for a workout day based on antagonist muscle groups
    /// </summary>
    public async Task<List<SupersetSuggestion>> GetSuggestions(int workoutDayId)
    {
        // Get exercises for this workout day that aren't already in a superset
        var exercises = await _context.UserExerciseLogs
            .Include(el => el.Exercise)
                .ThenInclude(e => e.PrimaryMuscleGroup)
            .Where(el => el.UserWorkoutDayId == workoutDayId && el.SupersetGroupId == null)
            .ToListAsync();

        if (exercises.Count < 2) return [];

        var templates = await _context.SupersetTemplates.ToListAsync();
        var suggestions = new List<SupersetSuggestion>();

        foreach (var template in templates)
        {
            var exerciseA = exercises.FirstOrDefault(e =>
                e.Exercise.PrimaryMuscleGroupId == template.MuscleGroupAId);
            var exerciseB = exercises.FirstOrDefault(e =>
                e.Exercise.PrimaryMuscleGroupId == template.MuscleGroupBId &&
                e.Id != exerciseA?.Id);

            if (exerciseA != null && exerciseB != null)
            {
                suggestions.Add(new SupersetSuggestion
                {
                    TemplateId = template.Id,
                    TemplateName = template.Name,
                    ExerciseAId = exerciseA.Id,
                    ExerciseAName = exerciseA.Exercise.Name,
                    ExerciseBId = exerciseB.Id,
                    ExerciseBName = exerciseB.Exercise.Name
                });
            }
        }

        return suggestions;
    }

    /// <summary>
    /// Create a superset/giant set with multiple exercises
    /// </summary>
    public async Task<int> CreateSupersetGroup(List<int> exerciseLogIds, bool isManual = false)
    {
        if (exerciseLogIds.Count < 2)
        {
            throw new ArgumentException("At least 2 exercises required");
        }

        var exercises = await _context.UserExerciseLogs
            .Where(el => exerciseLogIds.Contains(el.Id))
            .ToListAsync();

        if (exercises.Count != exerciseLogIds.Count)
        {
            throw new ArgumentException("One or more exercises not found");
        }

        // Verify all exercises are from the same workout day
        var dayIds = exercises.Select(e => e.UserWorkoutDayId).Distinct().ToList();
        if (dayIds.Count > 1)
        {
            throw new ArgumentException("Exercises must be from the same workout day");
        }

        // Generate a new superset group ID
        var maxGroupId = await _context.UserExerciseLogs
            .Where(el => el.SupersetGroupId != null)
            .MaxAsync(el => (int?)el.SupersetGroupId) ?? 0;
        var groupId = maxGroupId + 1;

        // Update exercise logs in the order they were provided
        for (int i = 0; i < exerciseLogIds.Count; i++)
        {
            var exercise = exercises.First(e => e.Id == exerciseLogIds[i]);
            exercise.SupersetGroupId = groupId;
            exercise.SupersetOrder = i + 1;
        }

        // Create superset record (for first two - legacy compatibility)
        var superset = new UserSuperset
        {
            ExerciseLogAId = exerciseLogIds[0],
            ExerciseLogBId = exerciseLogIds[1],
            IsManual = isManual
        };

        _context.UserSupersets.Add(superset);
        await _context.SaveChangesAsync();

        return groupId;
    }

    /// <summary>
    /// Create a superset between two exercises (legacy method)
    /// </summary>
    public async Task<UserSuperset> CreateSuperset(int exerciseLogAId, int exerciseLogBId, bool isManual = false)
    {
        await CreateSupersetGroup([exerciseLogAId, exerciseLogBId], isManual);

        return await _context.UserSupersets
            .OrderByDescending(s => s.Id)
            .FirstAsync();
    }

    /// <summary>
    /// Remove a superset
    /// </summary>
    public async Task RemoveSuperset(int supersetId)
    {
        var superset = await _context.UserSupersets
            .Include(s => s.ExerciseLogA)
            .Include(s => s.ExerciseLogB)
            .FirstOrDefaultAsync(s => s.Id == supersetId);

        if (superset == null) return;

        // Clear superset info from exercise logs
        superset.ExerciseLogA.SupersetGroupId = null;
        superset.ExerciseLogA.SupersetOrder = null;
        superset.ExerciseLogB.SupersetGroupId = null;
        superset.ExerciseLogB.SupersetOrder = null;

        _context.UserSupersets.Remove(superset);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Get all superset templates
    /// </summary>
    public async Task<List<SupersetTemplate>> GetTemplates()
    {
        return await _context.SupersetTemplates
            .Include(t => t.MuscleGroupA)
            .Include(t => t.MuscleGroupB)
            .ToListAsync();
    }
}

public class SupersetSuggestion
{
    public int TemplateId { get; set; }
    public string TemplateName { get; set; } = "";
    public int ExerciseAId { get; set; }
    public string ExerciseAName { get; set; } = "";
    public int ExerciseBId { get; set; }
    public string ExerciseBName { get; set; } = "";
}
