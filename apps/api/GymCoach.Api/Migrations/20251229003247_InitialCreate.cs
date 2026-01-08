using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Equipment",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Icon = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipment", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MuscleGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MuscleGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: true),
                    SubscriptionStatus = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActiveWorkoutPlanId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsPremium = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Exercises",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Instructions = table.Column<string>(type: "text", nullable: true),
                    VideoUrl = table.Column<string>(type: "text", nullable: true),
                    PrimaryMuscleGroupId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Exercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Exercises_MuscleGroups_PrimaryMuscleGroupId",
                        column: x => x.PrimaryMuscleGroupId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserEquipment",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    EquipmentId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserEquipment", x => new { x.UserId, x.EquipmentId });
                    table.ForeignKey(
                        name: "FK_UserEquipment_Equipment_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipment",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserEquipment_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserWorkoutPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutTemplateId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserWorkoutPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserWorkoutPlans_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserWorkoutPlans_WorkoutTemplates_WorkoutTemplateId",
                        column: x => x.WorkoutTemplateId,
                        principalTable: "WorkoutTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutDayTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DayNumber = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    WorkoutTemplateId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutDayTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutDayTemplates_WorkoutTemplates_WorkoutTemplateId",
                        column: x => x.WorkoutTemplateId,
                        principalTable: "WorkoutTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseEquipment",
                columns: table => new
                {
                    ExerciseId = table.Column<int>(type: "integer", nullable: false),
                    EquipmentId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseEquipment", x => new { x.ExerciseId, x.EquipmentId });
                    table.ForeignKey(
                        name: "FK_ExerciseEquipment_Equipment_EquipmentId",
                        column: x => x.EquipmentId,
                        principalTable: "Equipment",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExerciseEquipment_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseSecondaryMuscle",
                columns: table => new
                {
                    ExerciseId = table.Column<int>(type: "integer", nullable: false),
                    MuscleGroupId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseSecondaryMuscle", x => new { x.ExerciseId, x.MuscleGroupId });
                    table.ForeignKey(
                        name: "FK_ExerciseSecondaryMuscle_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExerciseSecondaryMuscle_MuscleGroups_MuscleGroupId",
                        column: x => x.MuscleGroupId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProgressionRules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    MinReps = table.Column<int>(type: "integer", nullable: false),
                    MaxReps = table.Column<int>(type: "integer", nullable: false),
                    RepIncrement = table.Column<int>(type: "integer", nullable: false),
                    WeightIncrement = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    FailureThreshold = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    ExerciseId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressionRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgressionRules_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserWorkoutDays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DayNumber = table.Column<int>(type: "integer", nullable: false),
                    ScheduledDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UserWorkoutPlanId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutDayTemplateId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserWorkoutDays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserWorkoutDays_UserWorkoutPlans_UserWorkoutPlanId",
                        column: x => x.UserWorkoutPlanId,
                        principalTable: "UserWorkoutPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserWorkoutDays_WorkoutDayTemplates_WorkoutDayTemplateId",
                        column: x => x.WorkoutDayTemplateId,
                        principalTable: "WorkoutDayTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutDayTemplateMuscle",
                columns: table => new
                {
                    WorkoutDayTemplateId = table.Column<int>(type: "integer", nullable: false),
                    MuscleGroupId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutDayTemplateMuscle", x => new { x.WorkoutDayTemplateId, x.MuscleGroupId });
                    table.ForeignKey(
                        name: "FK_WorkoutDayTemplateMuscle_MuscleGroups_MuscleGroupId",
                        column: x => x.MuscleGroupId,
                        principalTable: "MuscleGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkoutDayTemplateMuscle_WorkoutDayTemplates_WorkoutDayTemp~",
                        column: x => x.WorkoutDayTemplateId,
                        principalTable: "WorkoutDayTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserExerciseLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    UserWorkoutDayId = table.Column<int>(type: "integer", nullable: false),
                    ExerciseId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserExerciseLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserExerciseLogs_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserExerciseLogs_UserWorkoutDays_UserWorkoutDayId",
                        column: x => x.UserWorkoutDayId,
                        principalTable: "UserWorkoutDays",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseSets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SetNumber = table.Column<int>(type: "integer", nullable: false),
                    TargetReps = table.Column<int>(type: "integer", nullable: false),
                    ActualReps = table.Column<int>(type: "integer", nullable: true),
                    Weight = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Completed = table.Column<bool>(type: "boolean", nullable: false),
                    UserExerciseLogId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseSets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseSets_UserExerciseLogs_UserExerciseLogId",
                        column: x => x.UserExerciseLogId,
                        principalTable: "UserExerciseLogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Equipment",
                columns: new[] { "Id", "Icon", "Name" },
                values: new object[,]
                {
                    { 1, "body", "Bodyweight" },
                    { 2, "dumbbell", "Dumbbells" },
                    { 3, "barbell", "Barbell" },
                    { 4, "pullup", "Pull-up Bar" },
                    { 5, "cable", "Cables" },
                    { 6, "machine", "Machines" },
                    { 7, "kettlebell", "Kettlebell" },
                    { 8, "bench", "Bench" },
                    { 9, "band", "Resistance Bands" }
                });

            migrationBuilder.InsertData(
                table: "MuscleGroups",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 1, "Chest" },
                    { 2, "Back" },
                    { 3, "Shoulders" },
                    { 4, "Biceps" },
                    { 5, "Triceps" },
                    { 6, "Quadriceps" },
                    { 7, "Hamstrings" },
                    { 8, "Glutes" },
                    { 9, "Calves" },
                    { 10, "Core" },
                    { 11, "Forearms" }
                });

            migrationBuilder.InsertData(
                table: "ProgressionRules",
                columns: new[] { "Id", "ExerciseId", "FailureThreshold", "IsDefault", "MaxReps", "MinReps", "Name", "RepIncrement", "WeightIncrement" },
                values: new object[] { 1, null, 2, true, 15, 8, "Standard Progression", 1, 2.5m });

            migrationBuilder.InsertData(
                table: "WorkoutTemplates",
                columns: new[] { "Id", "Description", "IsPremium", "Name" },
                values: new object[,]
                {
                    { 1, "A complete full body workout, 3 days per week. Perfect for beginners.", false, "Full Body 3-Day" },
                    { 2, "Classic 6-day split targeting each muscle group twice per week.", true, "Push/Pull/Legs" },
                    { 3, "4-day split alternating between upper and lower body.", true, "Upper/Lower Split" }
                });

            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "Description", "Instructions", "Name", "PrimaryMuscleGroupId", "VideoUrl" },
                values: new object[,]
                {
                    { 1, "Classic bodyweight chest exercise", null, "Push-ups", 1, null },
                    { 2, "Flat bench press with dumbbells", null, "Dumbbell Bench Press", 1, null },
                    { 3, "Incline bench press with dumbbells", null, "Dumbbell Incline Press", 1, null },
                    { 4, "Chest isolation exercise", null, "Dumbbell Flyes", 1, null },
                    { 5, "Flat bench press with barbell", null, "Barbell Bench Press", 1, null },
                    { 6, "Bodyweight back exercise", null, "Pull-ups", 2, null },
                    { 7, "Single arm dumbbell row", null, "Dumbbell Rows", 2, null },
                    { 8, "Bent over barbell row", null, "Barbell Rows", 2, null },
                    { 9, "Cable lat pulldown", null, "Lat Pulldown", 2, null },
                    { 10, "Cable row for back thickness", null, "Seated Cable Row", 2, null },
                    { 11, "Overhead press with dumbbells", null, "Dumbbell Shoulder Press", 3, null },
                    { 12, "Side deltoid isolation", null, "Dumbbell Lateral Raises", 3, null },
                    { 13, "Front deltoid isolation", null, "Dumbbell Front Raises", 3, null },
                    { 14, "Rear deltoid and rotator cuff", null, "Face Pulls", 3, null },
                    { 15, "Standing overhead press", null, "Barbell Overhead Press", 3, null },
                    { 16, "Standing dumbbell curls", null, "Dumbbell Bicep Curls", 4, null },
                    { 17, "Neutral grip dumbbell curls", null, "Hammer Curls", 4, null },
                    { 18, "Standing barbell curls", null, "Barbell Curls", 4, null },
                    { 19, "Cable bicep curls", null, "Cable Curls", 4, null },
                    { 20, "Underhand pull-ups", null, "Chin-ups", 4, null },
                    { 21, "Bodyweight tricep exercise", null, "Tricep Dips", 5, null },
                    { 22, "Overhead tricep extension", null, "Dumbbell Tricep Extension", 5, null },
                    { 23, "Cable pushdowns", null, "Tricep Pushdowns", 5, null },
                    { 24, "Narrow grip bench press", null, "Close Grip Bench Press", 5, null },
                    { 25, "Narrow push-ups for triceps", null, "Diamond Push-ups", 5, null },
                    { 26, "Basic bodyweight squat", null, "Bodyweight Squats", 6, null },
                    { 27, "Dumbbell held at chest", null, "Goblet Squats", 6, null },
                    { 28, "Back squats with barbell", null, "Barbell Squats", 6, null },
                    { 29, "Machine leg press", null, "Leg Press", 6, null },
                    { 30, "Walking or stationary lunges", null, "Lunges", 6, null },
                    { 31, "Dumbbell or barbell RDL", null, "Romanian Deadlift", 7, null },
                    { 32, "Machine leg curls", null, "Leg Curls", 7, null },
                    { 33, "Barbell good mornings", null, "Good Mornings", 7, null },
                    { 34, "Bodyweight hamstring exercise", null, "Nordic Curls", 7, null },
                    { 35, "Barbell or dumbbell hip thrusts", null, "Hip Thrusts", 8, null },
                    { 36, "Bodyweight glute bridges", null, "Glute Bridges", 8, null },
                    { 37, "Rear foot elevated split squats", null, "Bulgarian Split Squats", 8, null },
                    { 38, "Dumbbell calf raises", null, "Standing Calf Raises", 9, null },
                    { 39, "Machine seated calf raises", null, "Seated Calf Raises", 9, null },
                    { 40, "Isometric core hold", null, "Plank", 10, null },
                    { 41, "Basic abdominal crunches", null, "Crunches", 10, null },
                    { 42, "Hanging from bar leg raises", null, "Hanging Leg Raises", 10, null },
                    { 43, "Rotational core exercise", null, "Russian Twists", 10, null },
                    { 44, "Anti-rotation core exercise", null, "Dead Bug", 10, null }
                });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplates",
                columns: new[] { "Id", "DayNumber", "Name", "WorkoutTemplateId" },
                values: new object[,]
                {
                    { 1, 1, "Full Body A", 1 },
                    { 2, 2, "Full Body B", 1 },
                    { 3, 3, "Full Body C", 1 },
                    { 4, 1, "Push", 2 },
                    { 5, 2, "Pull", 2 },
                    { 6, 3, "Legs", 2 },
                    { 7, 4, "Push", 2 },
                    { 8, 5, "Pull", 2 },
                    { 9, 6, "Legs", 2 },
                    { 10, 1, "Upper A", 3 },
                    { 11, 2, "Lower A", 3 },
                    { 12, 3, "Upper B", 3 },
                    { 13, 4, "Lower B", 3 }
                });

            migrationBuilder.InsertData(
                table: "ExerciseEquipment",
                columns: new[] { "EquipmentId", "ExerciseId" },
                values: new object[,]
                {
                    { 1, 1 },
                    { 2, 2 },
                    { 8, 2 },
                    { 2, 3 },
                    { 8, 3 },
                    { 2, 4 },
                    { 8, 4 },
                    { 3, 5 },
                    { 8, 5 },
                    { 4, 6 },
                    { 2, 7 },
                    { 3, 8 },
                    { 5, 9 },
                    { 5, 10 },
                    { 2, 11 },
                    { 2, 12 },
                    { 2, 13 },
                    { 5, 14 },
                    { 3, 15 },
                    { 2, 16 },
                    { 2, 17 },
                    { 3, 18 },
                    { 5, 19 },
                    { 4, 20 },
                    { 1, 21 },
                    { 2, 22 },
                    { 5, 23 },
                    { 3, 24 },
                    { 8, 24 },
                    { 1, 25 },
                    { 1, 26 },
                    { 2, 27 },
                    { 3, 28 },
                    { 6, 29 },
                    { 2, 30 },
                    { 2, 31 },
                    { 6, 32 },
                    { 3, 33 },
                    { 1, 34 },
                    { 2, 35 },
                    { 3, 35 },
                    { 1, 36 },
                    { 2, 37 },
                    { 2, 38 },
                    { 6, 39 },
                    { 1, 40 },
                    { 1, 41 },
                    { 4, 42 },
                    { 2, 43 },
                    { 1, 44 }
                });

            migrationBuilder.InsertData(
                table: "ExerciseSecondaryMuscle",
                columns: new[] { "ExerciseId", "MuscleGroupId" },
                values: new object[,]
                {
                    { 1, 3 },
                    { 1, 5 },
                    { 2, 5 },
                    { 3, 5 },
                    { 5, 5 },
                    { 6, 4 },
                    { 7, 4 },
                    { 8, 4 },
                    { 10, 4 },
                    { 11, 5 },
                    { 15, 5 },
                    { 20, 2 },
                    { 26, 8 },
                    { 27, 8 },
                    { 28, 7 },
                    { 28, 8 },
                    { 30, 8 },
                    { 31, 8 },
                    { 37, 6 }
                });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplateMuscle",
                columns: new[] { "MuscleGroupId", "WorkoutDayTemplateId", "ExerciseCount" },
                values: new object[,]
                {
                    { 1, 1, 1 },
                    { 2, 1, 1 },
                    { 3, 1, 1 },
                    { 6, 1, 1 },
                    { 10, 1, 1 },
                    { 1, 2, 1 },
                    { 2, 2, 1 },
                    { 4, 2, 1 },
                    { 7, 2, 1 },
                    { 8, 2, 1 },
                    { 2, 3, 1 },
                    { 3, 3, 1 },
                    { 5, 3, 1 },
                    { 6, 3, 1 },
                    { 9, 3, 1 },
                    { 1, 4, 2 },
                    { 3, 4, 2 },
                    { 5, 4, 1 },
                    { 2, 5, 3 },
                    { 4, 5, 2 },
                    { 6, 6, 2 },
                    { 7, 6, 1 },
                    { 8, 6, 1 },
                    { 9, 6, 1 },
                    { 1, 7, 2 },
                    { 3, 7, 2 },
                    { 5, 7, 1 },
                    { 2, 8, 3 },
                    { 4, 8, 2 },
                    { 6, 9, 2 },
                    { 7, 9, 1 },
                    { 8, 9, 1 },
                    { 9, 9, 1 },
                    { 1, 10, 2 },
                    { 2, 10, 2 },
                    { 3, 10, 1 },
                    { 4, 10, 1 },
                    { 5, 10, 1 },
                    { 6, 11, 2 },
                    { 7, 11, 1 },
                    { 8, 11, 1 },
                    { 9, 11, 1 },
                    { 10, 11, 1 },
                    { 1, 12, 2 },
                    { 2, 12, 2 },
                    { 3, 12, 1 },
                    { 4, 12, 1 },
                    { 5, 12, 1 },
                    { 6, 13, 2 },
                    { 7, 13, 1 },
                    { 8, 13, 1 },
                    { 9, 13, 1 },
                    { 10, 13, 1 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseEquipment_EquipmentId",
                table: "ExerciseEquipment",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Exercises_PrimaryMuscleGroupId",
                table: "Exercises",
                column: "PrimaryMuscleGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseSecondaryMuscle_MuscleGroupId",
                table: "ExerciseSecondaryMuscle",
                column: "MuscleGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseSets_UserExerciseLogId",
                table: "ExerciseSets",
                column: "UserExerciseLogId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressionRules_ExerciseId",
                table: "ProgressionRules",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEquipment_EquipmentId",
                table: "UserEquipment",
                column: "EquipmentId");

            migrationBuilder.CreateIndex(
                name: "IX_UserExerciseLogs_ExerciseId",
                table: "UserExerciseLogs",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_UserExerciseLogs_UserWorkoutDayId",
                table: "UserExerciseLogs",
                column: "UserWorkoutDayId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserWorkoutDays_UserWorkoutPlanId",
                table: "UserWorkoutDays",
                column: "UserWorkoutPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_UserWorkoutDays_WorkoutDayTemplateId",
                table: "UserWorkoutDays",
                column: "WorkoutDayTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_UserWorkoutPlans_UserId",
                table: "UserWorkoutPlans",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserWorkoutPlans_WorkoutTemplateId",
                table: "UserWorkoutPlans",
                column: "WorkoutTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutDayTemplateMuscle_MuscleGroupId",
                table: "WorkoutDayTemplateMuscle",
                column: "MuscleGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutDayTemplates_WorkoutTemplateId",
                table: "WorkoutDayTemplates",
                column: "WorkoutTemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExerciseEquipment");

            migrationBuilder.DropTable(
                name: "ExerciseSecondaryMuscle");

            migrationBuilder.DropTable(
                name: "ExerciseSets");

            migrationBuilder.DropTable(
                name: "ProgressionRules");

            migrationBuilder.DropTable(
                name: "UserEquipment");

            migrationBuilder.DropTable(
                name: "WorkoutDayTemplateMuscle");

            migrationBuilder.DropTable(
                name: "UserExerciseLogs");

            migrationBuilder.DropTable(
                name: "Equipment");

            migrationBuilder.DropTable(
                name: "Exercises");

            migrationBuilder.DropTable(
                name: "UserWorkoutDays");

            migrationBuilder.DropTable(
                name: "MuscleGroups");

            migrationBuilder.DropTable(
                name: "UserWorkoutPlans");

            migrationBuilder.DropTable(
                name: "WorkoutDayTemplates");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "WorkoutTemplates");
        }
    }
}
