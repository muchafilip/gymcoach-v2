using GymCoach.Api.Data;
using GymCoach.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymCoach.Api.Services;

public class PersonalRecordService
{
    private readonly GymCoachDbContext _context;

    public PersonalRecordService(GymCoachDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Check and update PR after a set is completed
    /// </summary>
    public async Task<PersonalRecord?> CheckAndUpdatePR(int userId, int exerciseId, int reps, decimal weight)
    {
        if (weight <= 0 || reps <= 0) return null;

        var pr = await _context.PersonalRecords
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ExerciseId == exerciseId);

        var now = DateTime.UtcNow;
        var updated = false;

        if (pr == null)
        {
            // First record for this exercise
            pr = new PersonalRecord
            {
                UserId = userId,
                ExerciseId = exerciseId,
                MaxWeight = weight,
                MaxWeightDate = now,
                BestSetReps = reps,
                BestSetWeight = weight,
                BestSetDate = now
            };
            _context.PersonalRecords.Add(pr);
            updated = true;
        }
        else
        {
            // Check if new max weight
            if (weight > pr.MaxWeight)
            {
                pr.MaxWeight = weight;
                pr.MaxWeightDate = now;
                updated = true;
            }

            // Check if new best set (by volume = reps * weight)
            var currentVolume = reps * weight;
            if (currentVolume > pr.BestSetVolume)
            {
                pr.BestSetReps = reps;
                pr.BestSetWeight = weight;
                pr.BestSetDate = now;
                updated = true;
            }
        }

        if (updated)
        {
            await _context.SaveChangesAsync();
        }

        return pr;
    }

    /// <summary>
    /// Get PR for a specific exercise
    /// </summary>
    public async Task<PersonalRecord?> GetPR(int userId, int exerciseId)
    {
        return await _context.PersonalRecords
            .Include(p => p.Exercise)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ExerciseId == exerciseId);
    }

    /// <summary>
    /// Get all PRs for a user
    /// </summary>
    public async Task<List<PersonalRecord>> GetAllPRs(int userId)
    {
        return await _context.PersonalRecords
            .Include(p => p.Exercise)
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.Exercise.Name)
            .ToListAsync();
    }

    /// <summary>
    /// Get PRs for specific exercises (useful for workout day)
    /// </summary>
    public async Task<Dictionary<int, PersonalRecord>> GetPRsForExercises(int userId, IEnumerable<int> exerciseIds)
    {
        var prs = await _context.PersonalRecords
            .Where(p => p.UserId == userId && exerciseIds.Contains(p.ExerciseId))
            .ToListAsync();

        return prs.ToDictionary(p => p.ExerciseId, p => p);
    }
}
