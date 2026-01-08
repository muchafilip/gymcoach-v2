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

    // Templates
    public DbSet<WorkoutTemplate> WorkoutTemplates => Set<WorkoutTemplate>();
    public DbSet<WorkoutDayTemplate> WorkoutDayTemplates => Set<WorkoutDayTemplate>();

    // User data
    public DbSet<User> Users => Set<User>();
    public DbSet<UserWorkoutPlan> UserWorkoutPlans => Set<UserWorkoutPlan>();
    public DbSet<UserWorkoutDay> UserWorkoutDays => Set<UserWorkoutDay>();
    public DbSet<UserExerciseLog> UserExerciseLogs => Set<UserExerciseLog>();
    public DbSet<ExerciseSet> ExerciseSets => Set<ExerciseSet>();

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

        // User unique email
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

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

        // Seed data
        SeedData.Seed(modelBuilder);
    }
}
