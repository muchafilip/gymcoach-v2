namespace GymCoach.Api.Models;

public class UserWorkoutPlan
{
    public int Id { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int DurationWeeks { get; set; } = 4;
    public bool IsActive { get; set; } = true;

    // Foreign keys
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int WorkoutTemplateId { get; set; }
    public WorkoutTemplate WorkoutTemplate { get; set; } = null!;

    // Navigation
    public ICollection<UserWorkoutDay> WorkoutDays { get; set; } = [];
}

public class UserWorkoutDay
{
    public int Id { get; set; }
    public int DayNumber { get; set; }
    public int WeekNumber { get; set; } = 1;
    public int DayTypeId { get; set; }  // References WorkoutDayTemplateId for same-day progression
    public DateTime? ScheduledDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Foreign key
    public int UserWorkoutPlanId { get; set; }
    public UserWorkoutPlan UserWorkoutPlan { get; set; } = null!;

    // Reference to the template day (for the name, etc.)
    public int WorkoutDayTemplateId { get; set; }
    public WorkoutDayTemplate WorkoutDayTemplate { get; set; } = null!;

    // Navigation
    public ICollection<UserExerciseLog> ExerciseLogs { get; set; } = [];
}

public class UserExerciseLog
{
    public int Id { get; set; }
    public int OrderIndex { get; set; }

    // Superset grouping (null if not in a superset)
    public int? SupersetGroupId { get; set; }
    public int? SupersetOrder { get; set; }  // 1 = first exercise, 2 = second

    // Foreign keys
    public int UserWorkoutDayId { get; set; }
    public UserWorkoutDay UserWorkoutDay { get; set; } = null!;

    public int ExerciseId { get; set; }
    public Exercise Exercise { get; set; } = null!;

    // Navigation
    public ICollection<ExerciseSet> Sets { get; set; } = [];
}

public class ExerciseSet
{
    public int Id { get; set; }
    public int SetNumber { get; set; }
    public int TargetReps { get; set; }
    public int? ActualReps { get; set; }
    public decimal? Weight { get; set; }
    public bool Completed { get; set; }

    // Rep scheme (optional - uses default progression if null)
    public int? RepSchemeId { get; set; }
    public RepScheme? RepScheme { get; set; }

    // For time-based sets (EMOM, AMRAP, etc.)
    public int? DurationSeconds { get; set; }
    public int? ActualDurationSeconds { get; set; }

    // Foreign key
    public int UserExerciseLogId { get; set; }
    public UserExerciseLog UserExerciseLog { get; set; } = null!;
}
