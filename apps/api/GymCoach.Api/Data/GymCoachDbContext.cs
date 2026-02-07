using Microsoft.EntityFrameworkCore;
using GymCoach.Api.Models;

namespace GymCoach.Api.Data;

public class GymCoachDbContext : DbContext
{
    public GymCoachDbContext(DbContextOptions<GymCoachDbContext> options) : base(options) { }

    // Core entities
    public DbSet<Equipment> Equipment => Set<Equipment>();
    public DbSet<MuscleGroup> MuscleGroups => Set<MuscleGroup>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<ProgressionRule> ProgressionRules => Set<ProgressionRule>();
    public DbSet<RepScheme> RepSchemes => Set<RepScheme>();

    // Templates
    public DbSet<WorkoutTemplate> WorkoutTemplates => Set<WorkoutTemplate>();
    public DbSet<WorkoutDayTemplate> WorkoutDayTemplates => Set<WorkoutDayTemplate>();
    public DbSet<CustomTemplateExercise> CustomTemplateExercises => Set<CustomTemplateExercise>();
    public DbSet<SupersetTemplate> SupersetTemplates => Set<SupersetTemplate>();

    // User data
    public DbSet<User> Users => Set<User>();
    public DbSet<UserWorkoutPlan> UserWorkoutPlans => Set<UserWorkoutPlan>();
    public DbSet<UserWorkoutPlanPriorityMuscle> UserWorkoutPlanPriorityMuscles => Set<UserWorkoutPlanPriorityMuscle>();
    public DbSet<UserWorkoutDay> UserWorkoutDays => Set<UserWorkoutDay>();
    public DbSet<UserExerciseLog> UserExerciseLogs => Set<UserExerciseLog>();
    public DbSet<ExerciseSet> ExerciseSets => Set<ExerciseSet>();
    public DbSet<UserSuperset> UserSupersets => Set<UserSuperset>();
    public DbSet<PersonalRecord> PersonalRecords => Set<PersonalRecord>();
    public DbSet<ExercisePerformanceHistory> ExercisePerformanceHistories => Set<ExercisePerformanceHistory>();
    public DbSet<UserProgress> UserProgress => Set<UserProgress>();
    public DbSet<XpEvent> XpEvents => Set<XpEvent>();
    public DbSet<UnlockedPlan> UnlockedPlans => Set<UnlockedPlan>();

    // Quests
    public DbSet<Quest> Quests => Set<Quest>();
    public DbSet<UserQuest> UserQuests => Set<UserQuest>();

    // Notifications
    public DbSet<DevicePushToken> DevicePushTokens => Set<DevicePushToken>();
    public DbSet<NotificationPreferences> NotificationPreferences => Set<NotificationPreferences>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Exercise <-> MuscleGroup (secondary muscles) - many-to-many
        modelBuilder.Entity<ExerciseSecondaryMuscle>()
            .HasKey(e => new { e.ExerciseId, e.MuscleGroupId });

        modelBuilder.Entity<ExerciseSecondaryMuscle>()
            .HasOne(e => e.Exercise)
            .WithMany(e => e.SecondaryMuscles)
            .HasForeignKey(e => e.ExerciseId);

        modelBuilder.Entity<ExerciseSecondaryMuscle>()
            .HasOne(e => e.MuscleGroup)
            .WithMany(m => m.SecondaryExercises)
            .HasForeignKey(e => e.MuscleGroupId);

        // Exercise <-> Equipment - many-to-many
        modelBuilder.Entity<ExerciseEquipment>()
            .HasKey(e => new { e.ExerciseId, e.EquipmentId });

        modelBuilder.Entity<ExerciseEquipment>()
            .HasOne(e => e.Exercise)
            .WithMany(e => e.RequiredEquipment)
            .HasForeignKey(e => e.ExerciseId);

        modelBuilder.Entity<ExerciseEquipment>()
            .HasOne(e => e.Equipment)
            .WithMany(e => e.ExerciseEquipments)
            .HasForeignKey(e => e.EquipmentId);

        // WorkoutDayTemplate <-> MuscleGroup - many-to-many
        modelBuilder.Entity<WorkoutDayTemplateMuscle>()
            .HasKey(w => new { w.WorkoutDayTemplateId, w.MuscleGroupId });

        // User <-> Equipment - many-to-many
        modelBuilder.Entity<UserEquipment>()
            .HasKey(u => new { u.UserId, u.EquipmentId });

        // UserWorkoutPlan <-> MuscleGroup (priority muscles) - many-to-many
        modelBuilder.Entity<UserWorkoutPlanPriorityMuscle>()
            .HasKey(p => new { p.UserWorkoutPlanId, p.MuscleGroupId });

        modelBuilder.Entity<UserWorkoutPlanPriorityMuscle>()
            .HasOne(p => p.UserWorkoutPlan)
            .WithMany(plan => plan.PriorityMuscles)
            .HasForeignKey(p => p.UserWorkoutPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserWorkoutPlanPriorityMuscle>()
            .HasOne(p => p.MuscleGroup)
            .WithMany()
            .HasForeignKey(p => p.MuscleGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        // User indexes
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.GoogleId)
            .IsUnique()
            .HasFilter("\"GoogleId\" IS NOT NULL");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.AppleId)
            .IsUnique()
            .HasFilter("\"AppleId\" IS NOT NULL");

        // Exercise -> PrimaryMuscleGroup
        modelBuilder.Entity<Exercise>()
            .HasOne(e => e.PrimaryMuscleGroup)
            .WithMany(m => m.PrimaryExercises)
            .HasForeignKey(e => e.PrimaryMuscleGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        // Decimal precision for Weight
        modelBuilder.Entity<ExerciseSet>()
            .Property(s => s.Weight)
            .HasPrecision(10, 2);

        modelBuilder.Entity<ProgressionRule>()
            .Property(p => p.WeightIncrement)
            .HasPrecision(10, 2);

        // RepScheme -> User (for custom schemes)
        modelBuilder.Entity<RepScheme>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SupersetTemplate -> MuscleGroups
        modelBuilder.Entity<SupersetTemplate>()
            .HasOne(s => s.MuscleGroupA)
            .WithMany()
            .HasForeignKey(s => s.MuscleGroupAId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SupersetTemplate>()
            .HasOne(s => s.MuscleGroupB)
            .WithMany()
            .HasForeignKey(s => s.MuscleGroupBId)
            .OnDelete(DeleteBehavior.Restrict);

        // UserSuperset -> UserExerciseLogs
        modelBuilder.Entity<UserSuperset>()
            .HasOne(s => s.ExerciseLogA)
            .WithMany()
            .HasForeignKey(s => s.ExerciseLogAId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserSuperset>()
            .HasOne(s => s.ExerciseLogB)
            .WithMany()
            .HasForeignKey(s => s.ExerciseLogBId)
            .OnDelete(DeleteBehavior.Cascade);

        // ExerciseSet -> RepScheme
        modelBuilder.Entity<ExerciseSet>()
            .HasOne(s => s.RepScheme)
            .WithMany()
            .HasForeignKey(s => s.RepSchemeId)
            .OnDelete(DeleteBehavior.SetNull);

        // PersonalRecord configuration
        modelBuilder.Entity<PersonalRecord>()
            .HasIndex(pr => new { pr.UserId, pr.ExerciseId })
            .IsUnique();

        modelBuilder.Entity<PersonalRecord>()
            .Property(pr => pr.MaxWeight)
            .HasPrecision(10, 2);

        modelBuilder.Entity<PersonalRecord>()
            .Property(pr => pr.BestSetWeight)
            .HasPrecision(10, 2);

        modelBuilder.Entity<PersonalRecord>()
            .HasOne(pr => pr.Exercise)
            .WithMany()
            .HasForeignKey(pr => pr.ExerciseId)
            .OnDelete(DeleteBehavior.Cascade);

        // WorkoutTemplate -> User (for custom templates)
        modelBuilder.Entity<WorkoutTemplate>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WorkoutTemplate>()
            .HasIndex(t => t.UserId);

        // CustomTemplateExercise configuration
        modelBuilder.Entity<CustomTemplateExercise>()
            .HasOne(e => e.WorkoutDayTemplate)
            .WithMany(d => d.Exercises)
            .HasForeignKey(e => e.WorkoutDayTemplateId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CustomTemplateExercise>()
            .HasOne(e => e.Exercise)
            .WithMany()
            .HasForeignKey(e => e.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CustomTemplateExercise>()
            .Property(e => e.DefaultWeight)
            .HasPrecision(10, 2);

        // ExercisePerformanceHistory configuration
        modelBuilder.Entity<ExercisePerformanceHistory>()
            .HasIndex(h => new { h.UserId, h.ExerciseId, h.PerformedAt });

        modelBuilder.Entity<ExercisePerformanceHistory>()
            .Property(h => h.MaxWeight)
            .HasPrecision(10, 2);

        modelBuilder.Entity<ExercisePerformanceHistory>()
            .Property(h => h.TotalVolume)
            .HasPrecision(12, 2);

        modelBuilder.Entity<ExercisePerformanceHistory>()
            .HasOne(h => h.User)
            .WithMany()
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExercisePerformanceHistory>()
            .HasOne(h => h.Exercise)
            .WithMany()
            .HasForeignKey(h => h.ExerciseId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExercisePerformanceHistory>()
            .HasOne(h => h.UserWorkoutDay)
            .WithMany()
            .HasForeignKey(h => h.UserWorkoutDayId)
            .OnDelete(DeleteBehavior.Cascade);

        // UserProgress configuration
        modelBuilder.Entity<UserProgress>()
            .HasIndex(p => p.UserId)
            .IsUnique();

        modelBuilder.Entity<UserProgress>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // XpEvent configuration
        modelBuilder.Entity<XpEvent>()
            .HasIndex(e => new { e.UserId, e.CreatedAt });

        modelBuilder.Entity<XpEvent>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // UserQuest configuration
        modelBuilder.Entity<UserQuest>()
            .HasOne(uq => uq.User)
            .WithMany()
            .HasForeignKey(uq => uq.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserQuest>()
            .HasOne(uq => uq.Quest)
            .WithMany(q => q.UserQuests)
            .HasForeignKey(uq => uq.QuestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserQuest>()
            .HasIndex(uq => new { uq.UserId, uq.QuestId, uq.AssignedAt });

        // DevicePushToken configuration
        modelBuilder.Entity<DevicePushToken>()
            .HasIndex(t => new { t.UserId, t.Token })
            .IsUnique();

        modelBuilder.Entity<DevicePushToken>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // NotificationPreferences configuration (one per user)
        modelBuilder.Entity<NotificationPreferences>()
            .HasIndex(p => p.UserId)
            .IsUnique();

        modelBuilder.Entity<NotificationPreferences>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // NotificationLog configuration
        modelBuilder.Entity<NotificationLog>()
            .HasIndex(l => new { l.UserId, l.CreatedAt });

        modelBuilder.Entity<NotificationLog>()
            .HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed data
        SeedData.Seed(modelBuilder);
    }
}
