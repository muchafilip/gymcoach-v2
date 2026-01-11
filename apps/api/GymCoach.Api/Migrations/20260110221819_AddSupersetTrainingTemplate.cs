using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupersetTrainingTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasSupersets",
                table: "WorkoutTemplates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 1,
                column: "HasSupersets",
                value: false);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 2,
                column: "HasSupersets",
                value: false);

            migrationBuilder.UpdateData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 3,
                column: "HasSupersets",
                value: false);

            migrationBuilder.InsertData(
                table: "WorkoutTemplates",
                columns: new[] { "Id", "Description", "HasSupersets", "IsPremium", "Name" },
                values: new object[] { 4, "High-intensity 3-day program with antagonist supersets for efficient workouts.", true, true, "Superset Training" });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplates",
                columns: new[] { "Id", "DayNumber", "Name", "WorkoutTemplateId" },
                values: new object[,]
                {
                    { 14, 1, "Chest + Back", 4 },
                    { 15, 2, "Arms (Bi + Tri)", 4 },
                    { 16, 3, "Legs (Quads + Hams)", 4 }
                });

            migrationBuilder.InsertData(
                table: "WorkoutDayTemplateMuscle",
                columns: new[] { "MuscleGroupId", "WorkoutDayTemplateId", "ExerciseCount" },
                values: new object[,]
                {
                    { 1, 14, 3 },
                    { 2, 14, 3 },
                    { 4, 15, 3 },
                    { 5, 15, 3 },
                    { 6, 16, 3 },
                    { 7, 16, 3 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 1, 14 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 2, 14 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 4, 15 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 5, 15 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 6, 16 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplateMuscle",
                keyColumns: new[] { "MuscleGroupId", "WorkoutDayTemplateId" },
                keyValues: new object[] { 7, 16 });

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "WorkoutDayTemplates",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "WorkoutTemplates",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DropColumn(
                name: "HasSupersets",
                table: "WorkoutTemplates");
        }
    }
}
