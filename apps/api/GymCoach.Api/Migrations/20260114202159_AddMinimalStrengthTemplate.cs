using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMinimalStrengthTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "DefaultRole", "Description", "Instructions", "Name", "PrimaryMuscleGroupId", "Type", "VideoUrl" },
                values: new object[,]
                {
                    { 45, 1, "Full-body compound lift from the floor", null, "Conventional Deadlift", 2, 1, null },
                    { 46, 2, "Barbell squat with front rack position", null, "Front Squat", 6, 1, null },
                    { 47, 1, "Barbell loaded hip thrust", null, "Barbell Hip Thrust", 8, 1, null }
                });

            migrationBuilder.InsertData(
                table: "WorkoutTemplates",
                columns: new[] { "Id", "Description", "HasSupersets", "IsPremium", "Name", "UserId" },
                values: new object[] { 5, "Efficient 4-day strength program. Each day focuses on one main lift (Deadlift, OHP, Squat, Bench) with volume work and accessories.", false, true, "Minimal Strength 4-Day", null });

            migrationBuilder.InsertData(
                table: "ExerciseEquipment",
                columns: new[] { "EquipmentId", "ExerciseId" },
                values: new object[,]
                {
                    { 3, 45 },
                    { 3, 46 },
                    { 3, 47 },
                    { 8, 47 }
                });

            migrationBuilder.InsertData(
                table: "ExerciseSecondaryMuscle",
                columns: new[] { "ExerciseId", "MuscleGroupId" },
                values: new object[,]
                {
                    { 45, 7 },
                    { 45, 8 },
                    { 45, 10 },
                    { 46, 8 },
                    { 46, 10 },
                    { 47, 7 }
                });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplates",
                columns: new[] { "Id", "DayNumber", "Name", "WorkoutTemplateId" },
                values: new object[,]
                {
                    { 17, 1, "Deadlift Day", 5 },
                    { 18, 2, "OHP Day", 5 },
                    { 19, 3, "Squat Day", 5 },
                    { 20, 4, "Bench Day", 5 }
                });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplateMuscle",
                columns: new[] { "MuscleGroupId", "WorkoutDayTemplateId", "ExerciseCount" },
                values: new object[,]
                {
                    { 2, 17, 1 },
                    { 7, 17, 1 },
                    { 10, 17, 1 },
                    { 3, 18, 2 },
                    { 5, 18, 1 },
                    { 6, 19, 2 },
                    { 8, 19, 1 },
                    { 1, 20, 2 },
                    { 5, 20, 1 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ExerciseEquipment",
                keyColumns: new[] { "EquipmentId", "ExerciseId" },
                keyValues: new object[] { 3, 45 });

            migrationBuilder.DeleteData(
                table: "ExerciseEquipment",
                keyColumns: new[] { "EquipmentId", "ExerciseId" },
                keyValues: new object[] { 3, 46 });

            migrationBuilder.DeleteData(
                table: "ExerciseEquipment",
                keyColumns: new[] { "EquipmentId", "ExerciseId" },
                keyValues: new object[] { 3, 47 });

            migrationBuilder.DeleteData(
                table: "ExerciseEquipment",
                keyColumns: new[] { "EquipmentId", "ExerciseId" },
                keyValues: new object[] { 8, 47 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 45, 7 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 45, 8 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 45, 10 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 46, 8 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 46, 10 });

            migrationBuilder.DeleteData(
                table: "ExerciseSecondaryMuscle",
                keyColumns: new[] { "ExerciseId", "MuscleGroupId" },
                keyValues: new object[] { 47, 7 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 2, 17 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 7, 17 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 10, 17 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 3, 18 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 5, 18 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 6, 19 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 8, 19 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 1, 20 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 5, 20 });

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 45);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 46);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 47);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 5);
        }
    }
}
