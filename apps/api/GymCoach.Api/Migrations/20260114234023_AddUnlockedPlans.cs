using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GymCoach.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUnlockedPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UnlockedPlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    WorkoutTemplateId = table.Column<int>(type: "integer", nullable: false),
                    UnlockedAtLevel = table.Column<int>(type: "integer", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnlockedPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UnlockedPlans_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UnlockedPlans_WorkoutTemplates_WorkoutTemplateId",
                        column: x => x.WorkoutTemplateId,
                        principalTable: "WorkoutTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "CustomTemplateExercises",
                columns: new[] { "Id", "DefaultWeight", "ExerciseId", "Notes", "OrderIndex", "Sets", "TargetReps", "WorkoutDayTemplateId" },
                values: new object[,]
                {
                    { 1, null, 45, null, 0, 4, 5, 17 },
                    { 2, null, 31, null, 1, 3, 10, 17 },
                    { 3, null, 44, null, 2, 3, 12, 17 },
                    { 4, null, 15, null, 0, 4, 5, 18 },
                    { 5, null, 11, null, 1, 3, 10, 18 },
                    { 6, null, 23, null, 2, 3, 12, 18 },
                    { 7, null, 28, null, 0, 4, 5, 19 },
                    { 8, null, 46, null, 1, 3, 8, 19 },
                    { 9, null, 47, null, 2, 3, 12, 19 },
                    { 10, null, 5, null, 0, 4, 5, 20 },
                    { 11, null, 3, null, 1, 3, 10, 20 },
                    { 12, null, 24, null, 2, 3, 12, 20 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_UnlockedPlans_UserId",
                table: "UnlockedPlans",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UnlockedPlans_WorkoutTemplateId",
                table: "UnlockedPlans",
                column: "WorkoutTemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UnlockedPlans");

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "CustomTemplateExercises",
                keyColumn: "Id",
                keyValue: 12);
        }
    }
}
