using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Data;
using GymCoach.Api.Models;
using GymCoach.Api.Services;
using GymCoach.Api.Extensions;

namespace GymCoach.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkoutsController : ControllerBase
{
    private readonly GymCoachDbContext _context;
    private readonly WorkoutGeneratorService _generator;
    private readonly ProgressionService _progression;
    private readonly PersonalRecordService _prService;
    private readonly XpService _xpService;
    private readonly QuestService _questService;

    public WorkoutsController(
        GymCoachDbContext context,
        WorkoutGeneratorService generator,
        ProgressionService progression,
        PersonalRecordService prService,
        XpService xpService,
        QuestService questService)
    {
        _context = context;
        _generator = generator;
        _progression = progression;
        _prService = prService;
        _xpService = xpService;
        _questService = questService;
    }

    /// <summary>
    /// Generate a new workout plan for a user from a template
    /// </summary>
    [HttpPost("generate")]
    public async Task<ActionResult<UserWorkoutPlanDto>> GeneratePlan(GeneratePlanRequest request)
    {
        try
        {
            var userId = this.GetUserId();
            Console.WriteLine($"[Generate] UserId={userId}, TemplateId={request.TemplateId}, PriorityMuscles={string.Join(",", request.PriorityMuscleIds ?? [])}");
            var plan = await _generator.GenerateWorkoutPlan(userId, request.TemplateId, request.PriorityMuscleIds);
            Console.WriteLine($"[Generate] Created plan {plan.Id}");
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
    [HttpGet("home")]
    public async Task<ActionResult<HomeDataDto>> GetHomeData()
    {
        var userId = this.GetUserId();
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

        // Top personal records (by max weight, limit to 5)
        var topPRs = await _context.PersonalRecords
            .Include(pr => pr.Exercise)
            .Where(pr => pr.UserId == userId)
            .OrderByDescending(pr => pr.MaxWeight)
            .Take(5)
            .Select(pr => new PersonalRecordDto
            {
                ExerciseId = pr.ExerciseId,
                ExerciseName = pr.Exercise.Name,
                MaxWeight = pr.MaxWeight,
                BestSetReps = pr.BestSetReps,
                BestSetWeight = pr.BestSetWeight
            })
            .ToListAsync();

        return new HomeDataDto
        {
            TotalWeightLifted = totalWeight,
            WorkoutsCompleted = completedDays,
            NextWorkout = nextWorkout,
            RecentWorkouts = recentWorkouts,
            PersonalRecords = topPRs
        };
    }

    /// <summary>
    /// Get user's active workout plan
    /// </summary>
    [HttpGet("active-plan")]
    public async Task<ActionResult<UserWorkoutPlanDetailDto>> GetActivePlan()
    {
        var userId = this.GetUserId();
        var plan = await _generator.GetActivePlan(userId);
        if (plan == null) return NotFound();

        return await GetPlanDetailDto(plan.Id);
    }

    /// <summary>
    /// Activate a specific plan (deactivates all others)
    /// </summary>
    [HttpPost("plans/{planId:int}/activate")]
    public async Task<IActionResult> ActivatePlan([FromRoute] int planId)
    {
        var userId = this.GetUserId();
        var success = await _generator.ActivatePlan(planId, userId);
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
    public async Task<ActionResult<List<ExerciseAlternativeDto>>> GetExerciseAlternatives(int exerciseId)
    {
        var userId = this.GetUserId();
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
    public async Task<IActionResult> SubstituteExercise(int exerciseLogId, int newExerciseId)
    {
        var userId = this.GetUserId();
        var success = await _generator.SubstituteExercise(exerciseLogId, newExerciseId, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    /// <summary>
    /// Get user's workout plans
    /// </summary>
    [HttpGet("plans")]
    public async Task<ActionResult<IEnumerable<UserWorkoutPlanDto>>> GetUserPlans()
    {
        var userId = this.GetUserId();
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
                        .ThenInclude(e => e.PrimaryMuscleGroup)
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
                            .ThenInclude(e => e.PrimaryMuscleGroup)
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
                        .ThenInclude(e => e.PrimaryMuscleGroup)
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
                    .ThenInclude(e => e.PrimaryMuscleGroup)
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
    public async Task<ActionResult<UpdateSetResponse>> UpdateSet(int setId, UpdateSetRequest request)
    {
        var userId = this.GetUserId();

        var set = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
            .FirstOrDefaultAsync(s => s.Id == setId);
        if (set == null) return NotFound();

        if (request.ActualReps.HasValue)
            set.ActualReps = request.ActualReps;
        if (request.Weight.HasValue)
            set.Weight = request.Weight;
        if (request.Completed.HasValue)
            set.Completed = request.Completed.Value;

        await _context.SaveChangesAsync();

        // Check for new PR when set is completed with weight and reps
        PersonalRecordDto? newPR = null;
        if (set.Completed && set.ActualReps.HasValue && set.Weight.HasValue && set.Weight > 0)
        {
            var pr = await _prService.CheckAndUpdatePR(
                userId,
                set.UserExerciseLog.ExerciseId,
                set.ActualReps.Value,
                set.Weight.Value
            );

            if (pr != null)
            {
                newPR = new PersonalRecordDto
                {
                    ExerciseId = pr.ExerciseId,
                    MaxWeight = pr.MaxWeight,
                    BestSetReps = pr.BestSetReps,
                    BestSetWeight = pr.BestSetWeight
                };
            }
        }

        return new UpdateSetResponse { PersonalRecord = newPR };
    }

    /// <summary>
    /// Start a workout (record start time)
    /// </summary>
    [HttpPost("days/{dayId}/start")]
    public async Task<IActionResult> StartWorkoutDay(int dayId)
    {
        var userId = this.GetUserId();
        var day = await _context.UserWorkoutDays
            .Include(d => d.UserWorkoutPlan)
            .FirstOrDefaultAsync(d => d.Id == dayId);

        if (day == null) return NotFound();
        if (day.UserWorkoutPlan.UserId != userId) return Forbid();

        day.StartedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Mark a workout day as complete
    /// </summary>
    [HttpPost("days/{dayId}/complete")]
    public async Task<IActionResult> CompleteDay(int dayId, [FromBody] CompleteDayRequest? request = null)
    {
        var userId = this.GetUserId();

        var day = await _context.UserWorkoutDays
            .Include(d => d.UserWorkoutPlan)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(d => d.Id == dayId);

        if (day == null) return NotFound();
        if (day.UserWorkoutPlan.UserId != userId) return Forbid();

        // If already completed, return success (idempotent) - check FIRST before daily limit
        if (day.CompletedAt.HasValue)
        {
            // Just return a minimal success response
            var progress = await _xpService.GetOrCreateProgress(userId);
            return Ok(new WorkoutCompleteResponse
            {
                XpAwarded = 0,
                TotalXp = progress.TotalXp,
                Level = progress.Level,
                LeveledUp = false,
                CurrentStreak = progress.CurrentStreak,
                WorkoutsThisWeek = progress.WorkoutsThisWeek,
                WeeklyGoalReached = progress.WorkoutsThisWeek >= progress.WeeklyGoal,
                XpToNextLevel = XpService.GetXpForLevel(progress.Level + 1) - progress.TotalXp,
                NextUnlockLevel = 0,
                QuestXpAwarded = 0,
                AutoClaimedQuests = new List<AutoClaimedQuestDto>(),
                WeekComplete = false,
                WeeksCompleted = 0,
                IsMilestone = false,
                MilestoneWeeks = 0
            });
        }

        // Check daily workout limit for free users (max 2 per day)
        var user = await _context.Users.FindAsync(userId);
        var isFreeUser = user?.SubscriptionStatus == SubscriptionStatus.Free;
        Console.WriteLine($"[CompleteDay] User {userId} subscription status: {user?.SubscriptionStatus}, isFree: {isFreeUser}");
        if (isFreeUser)
        {
            var today = DateTime.UtcNow.Date;
            var completedToday = await _context.UserWorkoutDays
                .Where(d => d.UserWorkoutPlan.UserId == userId
                    && d.CompletedAt.HasValue
                    && d.CompletedAt.Value.Date == today)
                .CountAsync();

            Console.WriteLine($"[CompleteDay] Free user completed {completedToday} workouts today");
            if (completedToday >= 2)
            {
                return BadRequest(new
                {
                    error = "daily_limit_reached",
                    message = "Free users can complete up to 2 workouts per day. Upgrade to Premium for unlimited workouts!"
                });
            }
        }

        day.CompletedAt = DateTime.UtcNow;
        if (request?.DurationSeconds.HasValue == true)
        {
            day.DurationSeconds = request.DurationSeconds;
        }
        else if (day.StartedAt.HasValue)
        {
            day.DurationSeconds = (int)(DateTime.UtcNow - day.StartedAt.Value).TotalSeconds;
        }

        await _context.SaveChangesAsync();

        // Record exercise performance history
        foreach (var log in day.ExerciseLogs)
        {
            var completedSets = log.Sets.Where(s => s.Completed).ToList();
            if (completedSets.Any())
            {
                var history = new ExercisePerformanceHistory
                {
                    UserId = userId,
                    ExerciseId = log.ExerciseId,
                    UserWorkoutDayId = dayId,
                    TotalSets = completedSets.Count,
                    TotalReps = completedSets.Sum(s => s.ActualReps ?? 0),
                    MaxWeight = completedSets.Max(s => s.Weight ?? 0),
                    TotalVolume = completedSets.Sum(s => (s.Weight ?? 0) * (s.ActualReps ?? 0)),
                    PerformedAt = DateTime.UtcNow
                };
                _context.ExercisePerformanceHistories.Add(history);
            }
        }
        await _context.SaveChangesAsync();

        // Check if we need to generate next week's exercises
        await _generator.CheckAndGenerateNextWeek(day.UserWorkoutPlanId);

        // Award XP for workout completion
        var completedSetsCount = day.ExerciseLogs.Sum(el => el.Sets.Count(s => s.Completed));
        var newPRsCount = 0; // TODO: Count new PRs from PR service if available

        var xpResult = await _xpService.OnWorkoutCompleted(userId, dayId, completedSetsCount, newPRsCount);

        // Update quest progress and collect auto-claimed quest results
        var questClaimResults = new List<QuestClaimResult>();
        questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "workout_complete", 1));
        questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "sets_logged", completedSetsCount));
        questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "total_workouts", 1));
        questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "workouts_this_week", 1));
        if (newPRsCount > 0)
        {
            questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "pr_achieved", newPRsCount));
        }
        // Check if weekly goal just reached for onboarding quest
        if (xpResult.WeeklyGoalJustReached)
        {
            questClaimResults.AddRange(await _questService.UpdateQuestProgress(userId, "weeks_completed", 1));
        }

        // Calculate total quest XP
        var questXpAwarded = questClaimResults.Sum(r => r.XpAwarded);
        var autoClaimedQuests = questClaimResults.Select(r => new AutoClaimedQuestDto
        {
            Title = r.QuestTitle,
            XpAwarded = r.XpAwarded
        }).ToList();

        // Calculate milestone progress (every 4 weeks)
        var allPlanDays = await _context.UserWorkoutDays
            .Where(d => d.UserWorkoutPlanId == day.UserWorkoutPlanId)
            .ToListAsync();

        var daysByWeek = allPlanDays.GroupBy(d => d.WeekNumber);
        var completedWeeks = daysByWeek
            .Where(g => g.All(d => d.CompletedAt != null))
            .Select(g => g.Key)
            .ToList();

        var weeksCompleted = completedWeeks.Count;
        var thisWeekDays = allPlanDays.Where(d => d.WeekNumber == day.WeekNumber).ToList();
        var weekJustCompleted = thisWeekDays.All(d => d.CompletedAt != null);
        var isMilestone = weekJustCompleted && weeksCompleted > 0 && weeksCompleted % 4 == 0;

        return Ok(new WorkoutCompleteResponse
        {
            XpAwarded = xpResult.TotalXpAwarded,
            TotalXp = xpResult.TotalXp + questXpAwarded, // Include quest XP in total
            Level = xpResult.Level,
            LeveledUp = xpResult.LeveledUp || questClaimResults.Any(r => r.LeveledUp),
            CurrentStreak = xpResult.CurrentStreak,
            WorkoutsThisWeek = xpResult.WorkoutsThisWeek,
            WeeklyGoalReached = xpResult.WeeklyGoalReached,
            XpToNextLevel = xpResult.XpToNextLevel,
            NextUnlockLevel = xpResult.NextUnlockLevel,
            QuestXpAwarded = questXpAwarded,
            AutoClaimedQuests = autoClaimedQuests,
            UnlockedPlan = xpResult.UnlockedPlan != null
                ? new UnlockedPlanDto
                {
                    PlanId = xpResult.UnlockedPlan.PlanId,
                    PlanName = xpResult.UnlockedPlan.PlanName,
                    UnlockedAtLevel = xpResult.UnlockedPlan.UnlockedAtLevel
                }
                : null,
            WeekComplete = weekJustCompleted,
            WeeksCompleted = weeksCompleted,
            IsMilestone = isMilestone,
            MilestoneWeeks = isMilestone ? weeksCompleted : 0
        });
    }

    /// <summary>
    /// Get exercise performance history
    /// </summary>
    [HttpGet("exercises/{exerciseId}/history")]
    public async Task<ActionResult<List<ExerciseHistoryDto>>> GetExerciseHistory(int exerciseId, [FromQuery] int limit = 20)
    {
        var userId = this.GetUserId();
        var history = await _context.ExercisePerformanceHistories
            .Include(h => h.UserWorkoutDay)
                .ThenInclude(d => d.WorkoutDayTemplate)
            .Where(h => h.UserId == userId && h.ExerciseId == exerciseId)
            .OrderByDescending(h => h.PerformedAt)
            .Take(limit)
            .Select(h => new ExerciseHistoryDto
            {
                Id = h.Id,
                WorkoutDayName = h.UserWorkoutDay.WorkoutDayTemplate.Name,
                TotalSets = h.TotalSets,
                TotalReps = h.TotalReps,
                MaxWeight = h.MaxWeight,
                TotalVolume = h.TotalVolume,
                PerformedAt = h.PerformedAt
            })
            .ToListAsync();

        return history;
    }

    /// <summary>
    /// Get progress stats for charts
    /// </summary>
    [HttpGet("stats/progress")]
    public async Task<ActionResult<ProgressStatsDto>> GetProgressStats([FromQuery] int days = 30)
    {
        var userId = this.GetUserId();
        var since = DateTime.UtcNow.AddDays(-days);

        // Volume over time (by day)
        var volumeByDay = await _context.ExercisePerformanceHistories
            .Where(h => h.UserId == userId && h.PerformedAt >= since)
            .GroupBy(h => h.PerformedAt.Date)
            .Select(g => new VolumeDataPoint
            {
                Date = g.Key,
                Volume = g.Sum(h => h.TotalVolume)
            })
            .OrderBy(v => v.Date)
            .ToListAsync();

        // Workout frequency by week - fetch data first, then group in memory
        var completedDays = await _context.UserWorkoutDays
            .Where(d => d.UserWorkoutPlan.UserId == userId
                && d.CompletedAt.HasValue
                && d.CompletedAt >= since)
            .Select(d => d.CompletedAt!.Value)
            .ToListAsync();

        var frequencyByWeek = completedDays
            .GroupBy(d => new { Year = d.Year, Week = GetWeekOfYear(d) })
            .Select(g => new FrequencyDataPoint
            {
                Year = g.Key.Year,
                Week = g.Key.Week,
                Count = g.Count()
            })
            .OrderBy(f => f.Year)
            .ThenBy(f => f.Week)
            .ToList();

        // Top exercises by volume
        var topExercises = await _context.ExercisePerformanceHistories
            .Include(h => h.Exercise)
            .Where(h => h.UserId == userId && h.PerformedAt >= since)
            .GroupBy(h => new { h.ExerciseId, h.Exercise.Name })
            .Select(g => new TopExerciseDto
            {
                ExerciseId = g.Key.ExerciseId,
                ExerciseName = g.Key.Name,
                TotalVolume = g.Sum(h => h.TotalVolume),
                SessionCount = g.Count()
            })
            .OrderByDescending(e => e.TotalVolume)
            .Take(10)
            .ToListAsync();

        // Total stats for period
        var totalVolume = volumeByDay.Sum(v => v.Volume);
        var workoutCount = await _context.UserWorkoutDays
            .CountAsync(d => d.UserWorkoutPlan.UserId == userId
                && d.CompletedAt.HasValue
                && d.CompletedAt >= since);

        return new ProgressStatsDto
        {
            VolumeOverTime = volumeByDay,
            FrequencyByWeek = frequencyByWeek,
            TopExercises = topExercises,
            TotalVolume = totalVolume,
            WorkoutCount = workoutCount,
            Days = days
        };
    }

    private static int GetWeekOfYear(DateTime date)
    {
        return System.Globalization.CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
            date,
            System.Globalization.CalendarWeekRule.FirstFourDayWeek,
            DayOfWeek.Monday);
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
    /// Delete a set from an exercise
    /// </summary>
    [HttpDelete("sets/{setId}")]
    public async Task<IActionResult> DeleteSet(int setId)
    {
        var userId = this.GetUserId();

        var set = await _context.ExerciseSets
            .Include(s => s.UserExerciseLog)
                .ThenInclude(el => el.UserWorkoutDay)
                    .ThenInclude(d => d.UserWorkoutPlan)
            .FirstOrDefaultAsync(s => s.Id == setId);

        if (set == null) return NotFound();

        // Verify ownership
        if (set.UserExerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId != userId)
            return Forbid();

        // Don't allow deleting if it's the last set
        var setsCount = await _context.ExerciseSets
            .CountAsync(s => s.UserExerciseLogId == set.UserExerciseLogId);

        if (setsCount <= 1)
            return BadRequest("Cannot delete the last set of an exercise");

        _context.ExerciseSets.Remove(set);
        await _context.SaveChangesAsync();

        // Renumber remaining sets
        var remainingSets = await _context.ExerciseSets
            .Where(s => s.UserExerciseLogId == set.UserExerciseLogId)
            .OrderBy(s => s.SetNumber)
            .ToListAsync();

        for (int i = 0; i < remainingSets.Count; i++)
        {
            remainingSets[i].SetNumber = i + 1;
        }
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Add an exercise to a workout day
    /// </summary>
    [HttpPost("days/{dayId}/exercises")]
    public async Task<ActionResult<UserExerciseDto>> AddExerciseToDay(int dayId, [FromBody] AddExerciseRequest request)
    {
        var userId = this.GetUserId();

        var day = await _context.UserWorkoutDays
            .Include(d => d.UserWorkoutPlan)
            .Include(d => d.ExerciseLogs)
            .FirstOrDefaultAsync(d => d.Id == dayId);

        if (day == null) return NotFound();

        // Verify ownership
        if (day.UserWorkoutPlan.UserId != userId)
            return Forbid();

        // Check if day is already completed
        if (day.CompletedAt != null)
            return BadRequest("Cannot add exercises to a completed workout");

        // Verify exercise exists
        var exercise = await _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .FirstOrDefaultAsync(e => e.Id == request.ExerciseId);
        if (exercise == null)
            return BadRequest("Exercise not found");

        // Get next order index
        var maxOrder = day.ExerciseLogs.Any() ? day.ExerciseLogs.Max(el => el.OrderIndex) : -1;

        var exerciseLog = new UserExerciseLog
        {
            UserWorkoutDayId = dayId,
            ExerciseId = request.ExerciseId,
            OrderIndex = maxOrder + 1
        };

        _context.UserExerciseLogs.Add(exerciseLog);
        await _context.SaveChangesAsync();

        // Add default sets (3 sets of 10 reps)
        var sets = new List<ExerciseSet>();
        for (int i = 1; i <= request.Sets; i++)
        {
            sets.Add(new ExerciseSet
            {
                UserExerciseLogId = exerciseLog.Id,
                SetNumber = i,
                TargetReps = request.TargetReps,
                Completed = false
            });
        }
        _context.ExerciseSets.AddRange(sets);
        await _context.SaveChangesAsync();

        return new UserExerciseDto
        {
            Id = exerciseLog.Id,
            ExerciseId = exercise.Id,
            ExerciseName = exercise.Name,
            PrimaryMuscleGroup = exercise.PrimaryMuscleGroup?.Name,
            ExerciseType = exercise.Type.ToString(),
            ExerciseRole = exercise.DefaultRole.ToString(),
            SupersetGroupId = null,
            SupersetOrder = null,
            Sets = sets.Select(s => new ExerciseSetDto
            {
                Id = s.Id,
                SetNumber = s.SetNumber,
                TargetReps = s.TargetReps,
                ActualReps = null,
                Weight = null,
                Completed = false
            }).ToList()
        };
    }

    /// <summary>
    /// Delete an exercise from a workout day
    /// </summary>
    [HttpDelete("exercises/{exerciseLogId}")]
    public async Task<IActionResult> DeleteExercise(int exerciseLogId)
    {
        var userId = this.GetUserId();

        var exerciseLog = await _context.UserExerciseLogs
            .Include(el => el.Sets)
            .Include(el => el.UserWorkoutDay)
                .ThenInclude(d => d.UserWorkoutPlan)
            .FirstOrDefaultAsync(el => el.Id == exerciseLogId);

        if (exerciseLog == null) return NotFound();

        // Verify ownership
        if (exerciseLog.UserWorkoutDay.UserWorkoutPlan.UserId != userId)
            return Forbid();

        // Check if day is already completed
        if (exerciseLog.UserWorkoutDay.CompletedAt != null)
            return BadRequest("Cannot delete exercises from a completed workout");

        // Delete all sets first
        _context.ExerciseSets.RemoveRange(exerciseLog.Sets);
        _context.UserExerciseLogs.Remove(exerciseLog);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Get progression suggestion for an exercise
    /// </summary>
    [HttpGet("progression/{exerciseId}")]
    public async Task<ActionResult<SetTarget>> GetProgression(int exerciseId)
    {
        var userId = this.GetUserId();
        return await _progression.CalculateNextTarget(userId, exerciseId);
    }

    /// <summary>
    /// Get workout history for a user with pagination
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<PaginatedWorkoutHistoryResponse>> GetWorkoutHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = this.GetUserId();

        var query = _context.UserWorkoutDays
            .Include(d => d.WorkoutDayTemplate)
            .Where(d => d.UserWorkoutPlan.UserId == userId && d.CompletedAt != null)
            .OrderByDescending(d => d.CompletedAt);

        var totalCount = await query.CountAsync();

        // Paginated without exercise details (lazy load later)
        var history = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(d => d.ExerciseLogs)
            .Select(d => new WorkoutHistoryDto
            {
                Id = d.Id,
                DayName = d.WorkoutDayTemplate.Name,
                CompletedAt = d.CompletedAt!.Value,
                ExerciseCount = d.ExerciseLogs.Count,
                TotalSets = d.ExerciseLogs.SelectMany(el => el.Sets).Count(s => s.Completed),
                Exercises = null // Lazy loaded via separate endpoint
            })
            .ToListAsync();

        return new PaginatedWorkoutHistoryResponse
        {
            Items = history,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    /// <summary>
    /// Get exercise details for a specific completed workout (lazy load)
    /// </summary>
    [HttpGet("history/{dayId}/exercises")]
    public async Task<ActionResult<List<HistoryExerciseDetailDto>>> GetWorkoutHistoryExercises(int dayId)
    {
        var userId = this.GetUserId();

        var day = await _context.UserWorkoutDays
            .Include(d => d.UserWorkoutPlan)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Exercise)
            .Include(d => d.ExerciseLogs)
                .ThenInclude(el => el.Sets)
            .FirstOrDefaultAsync(d => d.Id == dayId && d.UserWorkoutPlan.UserId == userId);

        if (day == null)
            return NotFound();

        var exercises = day.ExerciseLogs.Select(el =>
        {
            var completedSets = el.Sets.Where(s => s.Completed).OrderBy(s => s.SetNumber).ToList();
            return new HistoryExerciseDetailDto
            {
                ExerciseLogId = el.Id,
                Name = el.Exercise.Name,
                Sets = completedSets.Select(s => new HistorySetDto
                {
                    SetNumber = s.SetNumber,
                    Reps = s.ActualReps ?? s.TargetReps,
                    Weight = s.Weight ?? 0
                }).ToList()
            };
        }).ToList();

        return exercises;
    }

    /// <summary>
    /// Get all personal records for the user
    /// </summary>
    [HttpGet("personal-records")]
    public async Task<ActionResult<List<PersonalRecordDto>>> GetPersonalRecords()
    {
        var userId = this.GetUserId();
        var prs = await _prService.GetAllPRs(userId);

        return prs.Select(pr => new PersonalRecordDto
        {
            ExerciseId = pr.ExerciseId,
            ExerciseName = pr.Exercise.Name,
            MaxWeight = pr.MaxWeight,
            BestSetReps = pr.BestSetReps,
            BestSetWeight = pr.BestSetWeight
        }).ToList();
    }

    /// <summary>
    /// Get personal record for a specific exercise
    /// </summary>
    [HttpGet("personal-records/{exerciseId}")]
    public async Task<ActionResult<PersonalRecordDto>> GetPersonalRecord(int exerciseId)
    {
        var userId = this.GetUserId();
        var pr = await _prService.GetPR(userId, exerciseId);

        if (pr == null) return NotFound();

        return new PersonalRecordDto
        {
            ExerciseId = pr.ExerciseId,
            ExerciseName = pr.Exercise.Name,
            MaxWeight = pr.MaxWeight,
            BestSetReps = pr.BestSetReps,
            BestSetWeight = pr.BestSetWeight
        };
    }

    /// <summary>
    /// Log a rest day (for quest completion)
    /// </summary>
    [HttpPost("rest-day")]
    public async Task<IActionResult> LogRestDay()
    {
        var userId = this.GetUserId();
        var questResults = await _questService.UpdateQuestProgress(userId, "rest_day", 1);
        var questXpAwarded = questResults.Sum(r => r.XpAwarded);
        return Ok(new
        {
            message = "Rest day logged",
            questXpAwarded,
            autoClaimedQuests = questResults.Select(r => new { r.QuestTitle, r.XpAwarded })
        });
    }

    /// <summary>
    /// Get all exercises available to the user (filtered by their equipment)
    /// </summary>
    [HttpGet("exercises")]
    public async Task<ActionResult<List<ExerciseListDto>>> GetAllExercises()
    {
        var userId = this.GetUserId();

        // Get user's equipment
        var userEquipmentIds = await _context.Set<UserEquipment>()
            .Where(ue => ue.UserId == userId)
            .Select(ue => ue.EquipmentId)
            .ToListAsync();

        // Always include bodyweight
        if (!userEquipmentIds.Contains(1))
            userEquipmentIds.Add(1);

        var exercises = await _context.Exercises
            .Include(e => e.PrimaryMuscleGroup)
            .Include(e => e.RequiredEquipment)
            .Where(e => e.RequiredEquipment.All(re => userEquipmentIds.Contains(re.EquipmentId)))
            .OrderBy(e => e.PrimaryMuscleGroup!.Name)
            .ThenBy(e => e.Name)
            .Select(e => new ExerciseListDto
            {
                Id = e.Id,
                Name = e.Name,
                PrimaryMuscleGroup = e.PrimaryMuscleGroup!.Name,
                ExerciseType = e.Type.ToString()
            })
            .ToListAsync();

        return exercises;
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
                        .ThenInclude(e => e.PrimaryMuscleGroup)
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
                PrimaryMuscleGroup = el.Exercise.PrimaryMuscleGroup?.Name,
                ExerciseType = el.Exercise.Type.ToString(),
                ExerciseRole = el.Exercise.DefaultRole.ToString(),
                SupersetGroupId = el.SupersetGroupId,
                SupersetOrder = el.SupersetOrder,
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
    [System.Text.Json.Serialization.JsonPropertyName("templateId")]
    public int TemplateId { get; set; }

    /// <summary>
    /// Optional: 1-2 muscle group IDs to prioritize (adds +1 exercise per workout for each)
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("priorityMuscleIds")]
    public List<int>? PriorityMuscleIds { get; set; }
}

public class ExerciseAlternativeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
}

public class ExerciseListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string PrimaryMuscleGroup { get; set; } = "";
    public string ExerciseType { get; set; } = "";
}

public class UpdateSetRequest
{
    public int? ActualReps { get; set; }
    public decimal? Weight { get; set; }
    public bool? Completed { get; set; }
}

public class AddExerciseRequest
{
    public int ExerciseId { get; set; }
    public int Sets { get; set; } = 3;
    public int TargetReps { get; set; } = 10;
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
    public string? PrimaryMuscleGroup { get; set; }
    public string? ExerciseType { get; set; }
    public string? ExerciseRole { get; set; }
    public int? SupersetGroupId { get; set; }
    public int? SupersetOrder { get; set; }
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
    public List<PersonalRecordDto> PersonalRecords { get; set; } = [];
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
    public List<HistoryExerciseDto>? Exercises { get; set; } // Nullable for lazy loading
}

public class PaginatedWorkoutHistoryResponse
{
    public List<WorkoutHistoryDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}

public class HistoryExerciseDto
{
    public string Name { get; set; } = "";
    public int Sets { get; set; }
    public int Reps { get; set; }
    public decimal Weight { get; set; }
}

public class HistoryExerciseDetailDto
{
    public int ExerciseLogId { get; set; }
    public string Name { get; set; } = "";
    public List<HistorySetDto> Sets { get; set; } = new();
}

public class HistorySetDto
{
    public int SetNumber { get; set; }
    public int Reps { get; set; }
    public decimal Weight { get; set; }
}

public class UpdateSetResponse
{
    public PersonalRecordDto? PersonalRecord { get; set; }
}

public class PersonalRecordDto
{
    public int ExerciseId { get; set; }
    public string? ExerciseName { get; set; }
    public decimal MaxWeight { get; set; }
    public int BestSetReps { get; set; }
    public decimal BestSetWeight { get; set; }
}

public class CompleteDayRequest
{
    public int? DurationSeconds { get; set; }
}

public class WorkoutCompleteResponse
{
    public int XpAwarded { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; }
    public bool LeveledUp { get; set; }
    public int CurrentStreak { get; set; }
    public int WorkoutsThisWeek { get; set; }
    public bool WeeklyGoalReached { get; set; }
    public int XpToNextLevel { get; set; }

    // Auto-claimed quest rewards
    public int QuestXpAwarded { get; set; }
    public List<AutoClaimedQuestDto> AutoClaimedQuests { get; set; } = new();

    // Plan unlock info
    public UnlockedPlanDto? UnlockedPlan { get; set; }
    public int NextUnlockLevel { get; set; }

    // Milestone celebration (every 4 weeks)
    public bool WeekComplete { get; set; }
    public int WeeksCompleted { get; set; }
    public bool IsMilestone { get; set; }
    public int MilestoneWeeks { get; set; }
}

public class AutoClaimedQuestDto
{
    public string Title { get; set; } = "";
    public int XpAwarded { get; set; }
}

public class UnlockedPlanDto
{
    public int PlanId { get; set; }
    public string PlanName { get; set; } = "";
    public int UnlockedAtLevel { get; set; }
}

public class ExerciseHistoryDto
{
    public int Id { get; set; }
    public string WorkoutDayName { get; set; } = "";
    public int TotalSets { get; set; }
    public int TotalReps { get; set; }
    public decimal MaxWeight { get; set; }
    public decimal TotalVolume { get; set; }
    public DateTime PerformedAt { get; set; }
}

public class ProgressStatsDto
{
    public List<VolumeDataPoint> VolumeOverTime { get; set; } = [];
    public List<FrequencyDataPoint> FrequencyByWeek { get; set; } = [];
    public List<TopExerciseDto> TopExercises { get; set; } = [];
    public decimal TotalVolume { get; set; }
    public int WorkoutCount { get; set; }
    public int Days { get; set; }
}

public class VolumeDataPoint
{
    public DateTime Date { get; set; }
    public decimal Volume { get; set; }
}

public class FrequencyDataPoint
{
    public int Year { get; set; }
    public int Week { get; set; }
    public int Count { get; set; }
}

public class TopExerciseDto
{
    public int ExerciseId { get; set; }
    public string ExerciseName { get; set; } = "";
    public decimal TotalVolume { get; set; }
    public int SessionCount { get; set; }
}
